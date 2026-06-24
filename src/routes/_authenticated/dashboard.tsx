import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ListChecks,
  FileText,
  CalendarRange,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  createConversation,
  listConversations,
} from "@/lib/chat.functions";
import { toast } from "sonner";
import logo from "@/assets/study-logo.png";
import { cn } from "@/lib/utils";

type Mode = "explain" | "quiz" | "summarize" | "plan";

const STATS_KEY = "athena:stats:v1";
type Stats = Record<Mode, number>;
const ZERO: Stats = { explain: 0, quiz: 0, summarize: 0, plan: 0 };

function readStats(): Stats {
  if (typeof window === "undefined") return ZERO;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return ZERO;
    return { ...ZERO, ...(JSON.parse(raw) as Partial<Stats>) };
  } catch {
    return ZERO;
  }
}

export function bumpStat(mode: Mode) {
  if (typeof window === "undefined") return;
  const s = readStats();
  s[mode] = (s[mode] ?? 0) + 1;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Athena" },
      {
        name: "description",
        content:
          "Your Athena study dashboard — explain topics, generate quizzes, summarize notes, and build study plans.",
      },
    ],
  }),
  component: DashboardPage,
});

const ACTIONS: Array<{
  mode: Mode;
  title: string;
  description: string;
  icon: typeof BookOpen;
  accent: string;
}> = [
  {
    mode: "explain",
    title: "Explain Topic",
    description: "Get a clear, step-by-step explanation of any subject.",
    icon: BookOpen,
    accent: "from-indigo-500/20 to-indigo-500/0 text-indigo-300",
  },
  {
    mode: "quiz",
    title: "Generate Quiz",
    description: "Practice with custom multiple-choice questions.",
    icon: ListChecks,
    accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
  },
  {
    mode: "summarize",
    title: "Summarize Notes",
    description: "Turn long notes into concise, exam-ready summaries.",
    icon: FileText,
    accent: "from-amber-500/20 to-amber-500/0 text-amber-300",
  },
  {
    mode: "plan",
    title: "Create Study Plan",
    description: "Build a personalized roadmap toward your goals.",
    icon: CalendarRange,
    accent: "from-sky-500/20 to-sky-500/0 text-sky-300",
  },
];

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Shimmer>Loading…</Shimmer>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties
      }
    >
      <AppSidebar userEmail={user.email ?? ""} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
        <header className="h-14 border-b border-border/60 flex items-center gap-2 px-3 sticky top-0 bg-background/80 backdrop-blur z-20">
          <SidebarTrigger />
          <div className="text-sm font-medium">Dashboard</div>
        </header>
        <DashboardBody />
      </div>
    </SidebarProvider>
  );
}

function DashboardBody() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(ZERO);
  useEffect(() => setStats(readStats()), []);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });

  const startMut = useMutation({
    mutationFn: async (mode: Mode) => {
      const conv = await createConversation({ data: {} });
      return { conv, mode };
    },
    onSuccess: ({ conv, mode }) => {
      bumpStat(mode);
      setStats(readStats());
      qc.invalidateQueries({ queryKey: ["conversations"] });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.id },
        search: { mode },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalChats = conversations.length;
  const isNewUser = totalChats === 0;
  const recent = conversations.slice(0, 6);

  const statCards = [
    { label: "Topics Learned", value: stats.explain, icon: BookOpen },
    { label: "Quizzes Generated", value: stats.quiz, icon: ListChecks },
    { label: "Notes Summarized", value: stats.summarize, icon: FileText },
    { label: "Study Plans Created", value: stats.plan, icon: CalendarRange },
  ];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
        <section className="flex items-center gap-4">
          <img
            src={logo}
            alt=""
            width={56}
            height={56}
            className="rounded-2xl shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome to Athena
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Your AI Study Companion
            </p>
          </div>
        </section>

        {isNewUser && (
          <section className="rounded-2xl border border-border bg-card/50 p-6 text-center">
            <h2 className="text-lg font-medium">Start learning with Athena</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick an action below to begin your first study session.
            </p>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Quick actions
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ACTIONS.map((a) => (
              <button
                key={a.mode}
                onClick={() => startMut.mutate(a.mode)}
                disabled={startMut.isPending}
                className="group text-left rounded-2xl border border-border bg-card hover:bg-accent/5 hover:border-primary/40 transition-all p-5 disabled:opacity-60"
              >
                <div
                  className={cn(
                    "size-10 rounded-xl bg-gradient-to-br grid place-items-center mb-3",
                    a.accent,
                  )}
                >
                  <a.icon className="size-5" />
                </div>
                <div className="flex items-center gap-2 font-medium">
                  {a.title}
                  <ArrowRight className="size-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {a.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Your stats
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <s.icon className="size-4" />
                  <span className="text-xs">{s.label}</span>
                </div>
                <div className="text-2xl font-semibold mt-2 tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Recent activity
            </h2>
            <div className="text-xs text-muted-foreground">
              {totalChats} total {totalChats === 1 ? "chat" : "chats"}
            </div>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Your recent study sessions will appear here.
            </div>
          ) : (
            <ul className="rounded-2xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/5 transition-colors"
                  >
                    <MessageSquare className="size-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm">
                      {c.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
