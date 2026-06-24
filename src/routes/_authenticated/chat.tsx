import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Athena — AI Study Assistant" },
      { name: "description", content: "Chat with your AI study partner." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
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
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to dashboard">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <ChatTitle />
        </header>
        <Outlet />
      </div>
    </SidebarProvider>
  );
}

function ChatTitle() {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate" id="athena-chat-title">
        Athena
      </div>
    </div>
  );
}
