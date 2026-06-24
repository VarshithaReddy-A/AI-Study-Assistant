import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, ListChecks, MessageSquareText, ArrowRight } from "lucide-react";
import logo from "@/assets/study-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Athena — Your AI Study Assistant" },
      { name: "description", content: "Learn faster with a patient AI tutor. Explanations, quizzes, summaries, and study plans — all in one chat." },
      { property: "og:title", content: "Athena — Your AI Study Assistant" },
      { property: "og:description", content: "Learn faster with a patient AI tutor." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <header className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Athena logo" width={32} height={32} className="rounded-md" />
          <span className="font-semibold tracking-tight">Athena</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-24">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3 text-accent" />
            Personal AI tutor — private to you
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Learn anything,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              one chat at a time.
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Athena explains concepts, drills you with quizzes, summarizes your notes,
            and builds study plans — and remembers your conversation across sessions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Start studying free <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { i: BookOpen, t: "Clear explanations", d: "Step-by-step breakdowns with analogies that stick." },
            { i: ListChecks, t: "Practice quizzes", d: "Self-test on any topic with instant feedback." },
            { i: MessageSquareText, t: "Note summaries", d: "Paste lecture notes and get a tight recap." },
            { i: Sparkles, t: "Study plans", d: "Personalized weekly plans toward your goal." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-5">
              <f.i className="size-5 text-primary" />
              <h3 className="mt-3 font-medium">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
