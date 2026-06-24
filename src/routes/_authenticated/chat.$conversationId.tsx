import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { loadMessages, listConversations } from "@/lib/chat.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

const MODE_VALUES = ["explain", "quiz", "summarize", "plan"] as const;
type Mode = (typeof MODE_VALUES)[number];

const MODE_META: Record<
  Mode,
  { placeholder: string; title: string }
> = {
  explain: {
    placeholder: "Enter any topic you want explained...",
    title: "Explain a topic",
  },
  quiz: {
    placeholder: "Enter a topic to be quizzed on...",
    title: "Generate a quiz",
  },
  summarize: {
    placeholder: "Paste the notes you want summarized...",
    title: "Summarize notes",
  },
  plan: {
    placeholder: "Describe your study goal and timeframe...",
    title: "Create a study plan",
  },
};

const searchSchema = z.object({
  mode: z.enum(MODE_VALUES).optional(),
});

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  validateSearch: searchSchema,
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { mode } = Route.useSearch();
  const qc = useQueryClient();

  const { data: convs } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });
  const conv = convs?.find((c) => c.id === conversationId);

  const { data: stored, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => loadMessages({ data: { conversationId } }),
  });

  // Set window title bar text
  useEffect(() => {
    const el = document.getElementById("athena-chat-title");
    if (el) el.textContent = conv?.title ?? "Athena";
  }, [conv?.title]);

  const initialMessages: UIMessage[] | null = useMemo(() => {
    if (!stored) return null;
    return stored.map((r) => ({
      id: r.id,
      role: r.role,
      parts: [{ type: "text", text: r.content }],
    })) as UIMessage[];
  }, [stored]);

  if (isLoading || initialMessages === null) {
    return (
      <div className="flex-1 grid place-items-center text-muted-foreground">
        <Shimmer>Loading conversation…</Shimmer>
      </div>
    );
  }

  return (
    <ChatInner
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      mode={mode}
      onTitleMaybeChanged={() => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      }}
    />
  );
}

function ChatInner({
  conversationId,
  initialMessages,
  mode,
  onTitleMaybeChanged,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  mode?: Mode;
  onTitleMaybeChanged: () => void;
}) {
  const meta = mode ? MODE_META[mode] : null;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [conversationId],
  );

  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
    onError: (e) => toast.error(e.message || "Something went wrong"),
    onFinish: () => onTitleMaybeChanged(),
  });

  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId, status]);

  const isFirstMessage = initialMessages.length === 0 && messages.length === 0;

  const handleSend = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setInput("");
    // On the first message in a mode-launched conversation, prefix the user
    // intent so the model knows what task to perform.
    const prefixed =
      isFirstMessage && mode
        ? `${MODE_META[mode].title}: ${value}`
        : value;
    await sendMessage({ text: prefixed });
  };

  const onSubmit = (message: { text: string }) => {
    void handleSend(message.text || input);
  };

  const busy = status === "submitted" || status === "streaming";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAttach = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").slice(0, 8000);
      setInput((v) =>
        (v ? v + "\n\n" : "") + `Attached file: ${file.name}\n\n${text}`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4 py-6">
          {messages.length === 0 && meta && (
            <div className="rounded-2xl border border-border bg-card/50 p-6 text-center">
              <div className="text-base font-medium">{meta.title}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Type your request below to get started. Athena will respond once
                you send a message.
              </div>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            return (
              <Message key={m.id} from={m.role}>
                {m.role === "assistant" ? (
                  <MessageContent className="bg-transparent px-0 py-0">
                    <MessageResponse>{text || " "}</MessageResponse>
                  </MessageContent>
                ) : (
                  <MessageContent>{text}</MessageContent>
                )}
              </Message>
            );
          })}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent className="bg-transparent px-0 py-0">
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border/60 bg-background">
        <div className="max-w-3xl w-full mx-auto px-4 py-3">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={meta?.placeholder ?? "Message Athena…"}
              autoFocus
            />
            <PromptInputFooter className="justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  className="hidden"
                  onChange={handleAttach}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a text file"
                >
                  <Paperclip className="size-4" />
                </Button>
              </div>
              <PromptInputSubmit
                status={status}
                disabled={busy || !input.trim()}
              />
            </PromptInputFooter>
          </PromptInput>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Athena can make mistakes — double-check important facts.
          </p>
        </div>
      </div>
    </div>
  );
}
