import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — Athena" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  const clearStats = () => {
    window.localStorage.removeItem("athena:stats:v1");
    toast.success("Stats cleared");
  };

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
          <div className="text-sm font-medium">Settings</div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-medium">Account</h2>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-medium">Local data</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reset your dashboard counters (Topics, Quizzes, Notes, Plans).
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={clearStats}>
                  Reset stats
                </Button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
