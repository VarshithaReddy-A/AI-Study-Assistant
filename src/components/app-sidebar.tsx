import { useState, useMemo } from "react";
import { Link, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  LogOut,
  PanelLeftClose,
  LayoutDashboard,
  BookOpen,
  ListChecks,
  FileText,
  CalendarRange,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  type ConversationRow,
} from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/study-logo.png";
import { cn } from "@/lib/utils";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupConversations(rows: ConversationRow[]) {
  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86400_000;
  const week = today - 7 * 86400_000;
  const groups = {
    Today: [] as ConversationRow[],
    Yesterday: [] as ConversationRow[],
    "Previous 7 Days": [] as ConversationRow[],
    Older: [] as ConversationRow[],
  };
  for (const c of rows) {
    const t = new Date(c.updated_at).getTime();
    if (t >= today) groups.Today.push(c);
    else if (t >= yesterday) groups.Yesterday.push(c);
    else if (t >= week) groups["Previous 7 Days"].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const { setOpenMobile, isMobile, toggleSidebar } = useSidebar();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const activeId = params.conversationId;
  const [search, setSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<ConversationRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConversationRow | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });

  const createMut = useMutation({
    mutationFn: () => createConversation({ data: {} }),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (isMobile) setOpenMobile(false);
      navigate({ to: "/chat/$conversationId", params: { conversationId: conv.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const launchMut = useMutation({
    mutationFn: async (mode: "explain" | "quiz" | "summarize" | "plan") => {
      const conv = await createConversation({ data: {} });
      return { conv, mode };
    },
    onSuccess: ({ conv, mode }) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (isMobile) setOpenMobile(false);
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.id },
        search: { mode },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const NAV_FEATURES = [
    { mode: "explain" as const, label: "Explain Topic", icon: BookOpen },
    { mode: "quiz" as const, label: "Quiz Generator", icon: ListChecks },
    { mode: "summarize" as const, label: "Notes Summarizer", icon: FileText },
    { mode: "plan" as const, label: "Study Planner", icon: CalendarRange },
  ];

  const renameMut = useMutation({
    mutationFn: (vars: { id: string; title: string }) =>
      renameConversation({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setRenameTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConversation({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setDeleteTarget(null);
      if (activeId === id) navigate({ to: "/chat" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth" });
  };

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-2">
          <div className="flex items-center justify-between px-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="" width={24} height={24} className="rounded" />
              <span className="font-semibold tracking-tight">Athena</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="size-4" />
            New chat
          </Button>
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="pl-8 h-9 bg-sidebar-accent/40 border-transparent focus-visible:bg-background"
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/dashboard"
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      <LayoutDashboard className="size-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {NAV_FEATURES.map((f) => (
                  <SidebarMenuItem key={f.mode}>
                    <SidebarMenuButton
                      onClick={() => launchMut.mutate(f.mode)}
                      disabled={launchMut.isPending}
                    >
                      <f.icon className="size-4" />
                      <span>{f.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      to="/settings"
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      <SettingsIcon className="size-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(Object.keys(groups) as Array<keyof typeof groups>).map((label) => {
            const items = groups[label];
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={label}>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((c) => (
                      <SidebarMenuItem key={c.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeId === c.id}
                          className="group/chat pr-8"
                        >
                          <Link
                            to="/chat/$conversationId"
                            params={{ conversationId: c.id }}
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <MessageSquare className="size-4 shrink-0" />
                            <span className="truncate">{c.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center size-6 rounded hover:bg-sidebar-accent text-muted-foreground opacity-0 group-hover/chat:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
                              )}
                              aria-label="Chat actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="right">
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameValue(c.title);
                                setRenameTarget(c);
                              }}
                            >
                              <Pencil className="size-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
          {conversations.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No chats yet. Click "New chat" to start.
            </div>
          )}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-accent/30">
            <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center text-sm font-semibold">
              {(userEmail[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{userEmail}</div>
              <div className="text-[10px] text-muted-foreground">Student</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Give this conversation a clearer title.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            maxLength={120}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameTarget && renameValue.trim()) {
                renameMut.mutate({ id: renameTarget.id, title: renameValue.trim() });
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim() || renameMut.isPending}
              onClick={() =>
                renameTarget &&
                renameMut.mutate({ id: renameTarget.id, title: renameValue.trim() })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" and all of its messages will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
