import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ListChecks,
  FileText,
  CalendarRange,
  LayoutDashboard,
} from "lucide-react";
import logo from "@/assets/study-logo.png";
import { createConversation } from "@/lib/chat.functions";
import { bumpStat } from "./dashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Mode = "explain" | "quiz" | "summarize" | "plan";

const ACTIONS: Array<{
  mode: Mode;
  label: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    mode: "explain",
    label: "Explain Topic",
    description: "Get a clear breakdown of any subject.",
    icon: BookOpen,
  },
  {
    mode: "quiz",
    label: "Generate Quiz",
    description: "Practice questions on any topic.",
    icon: ListChecks,
  },
  {
    mode: "summarize",
    label: "Summarize Notes",
    description: "Condense long notes into key points.",
    icon: FileText,
  },
  {
    mode: "plan",
    label: "Create Study Plan",
    description: "Build a personalized roadmap.",
    icon: CalendarRange,
  },
];

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatHome,
});

function ChatHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const startMut = useMutation({
    mutationFn: async (mode: Mode) => {
      const conv = await createConversation({ data: {} });
      return { conv, mode };
    },
    onSuccess: ({ conv, mode }) => {
      bumpStat(mode);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.id },
        search: { mode },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex-1 grid place-items-center px-4 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full text-center">
        <img
          src={logo}
          alt=""
          width={64}
          height={64}
          className="mx-auto rounded-2xl"
        />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          What are we studying today?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick an action below or click <span className="font-medium">New chat</span>{" "}
          to start with a blank prompt.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 mt-8 text-left">
          {ACTIONS.map((s) => (
            <button
              key={s.mode}
              disabled={startMut.isPending}
              onClick={() => startMut.mutate(s.mode)}
              className="rounded-xl border border-border bg-card hover:bg-accent/10 transition-colors p-4 flex items-start gap-3 disabled:opacity-60"
            >
              <s.icon className="size-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {s.description}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <LayoutDashboard className="size-4" /> Back to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
