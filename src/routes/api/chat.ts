import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

type ChatRequestBody = { messages?: unknown; conversationId?: unknown };

const SYSTEM_PROMPT = `You are Athena, a warm, patient AI study assistant for students.
- Explain concepts step-by-step with concrete examples and analogies.
- Generate quizzes when asked, and check the student's answers with feedback.
- Summarize notes, build flashcards, and create study plans on request.
- Use markdown: headings, bullets, code blocks, and LaTeX-style math when useful.
- Remember the context of this conversation. If a question is ambiguous, ask one short clarifying question first.`;

function deriveTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 60) return clean || "New chat";
  return clean.slice(0, 57) + "…";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const conversationId =
          typeof body.conversationId === "string" ? body.conversationId : null;
        if (!Array.isArray(messages) || !conversationId) {
          return new Response("Missing messages or conversationId", { status: 400 });
        }

        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice(7)
          : undefined;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        const { data: claims, error: claimsError } =
          await supabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        // Verify ownership of the conversation
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .select("id, title")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .maybeSingle();
        if (convErr || !conv) {
          return new Response("Conversation not found", { status: 404 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const uiMessages = messages as UIMessage[];
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const text = lastUser.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          if (text) {
            await supabase
              .from("messages")
              .insert({
                conversation_id: conversationId,
                role: "user",
                content: text,
              });
            // Auto-title on first message
            if (!conv.title || conv.title === "New chat") {
              await supabase
                .from("conversations")
                .update({ title: deriveTitle(text) })
                .eq("id", conversationId);
            }
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
          onFinish: async ({ text }) => {
            if (text?.trim()) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                content: text,
              });
            }
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
      },
    },
  },
});
