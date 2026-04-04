import { useState } from "react";
import { useLocation, Redirect, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Music2,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  FileText,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  Menu,
  ChevronRight,
  Bell,
  Lock,
  Bot,
  Gauge,
  BarChart3,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

// ─── Navigation definition ────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "OVERVIEW",
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "PLATFORM DATA",
    items: [
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Roles", path: "/admin/roles", icon: Shield },
      { label: "Artists", path: "/admin/artists", icon: Music2 },
      { label: "Organizers", path: "/admin/organizers", icon: Building2 },
      { label: "Venues", path: "/admin/venues", icon: MapPin },
    ],
  },
  {
    heading: "WORKFLOW",
    items: [
      { label: "Events", path: "/admin/events", icon: Calendar },
      { label: "Bookings", path: "/admin/bookings", icon: ClipboardList },
      { label: "Contracts", path: "/admin/contracts", icon: FileText },
      { label: "Negotiations", path: "/admin/chats", icon: MessageSquare },
    ],
  },
  {
    heading: "AI AGENTS",
    items: [
      { label: "Agents", path: "/admin/agents", icon: Bot },
      { label: "Rate Limits", path: "/admin/agents/rate-limits", icon: Gauge },
      { label: "Prompts", path: "/admin/agents/prompts", icon: FileText },
      { label: "Usage", path: "/admin/agents/usage", icon: BarChart3 },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Notifications", path: "/admin/notification-types", icon: Bell },
      { label: "Settings", path: "/admin/settings", icon: Settings },
      { label: "Audit Log", path: "/admin/audit", icon: Lock },
    ],
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function isAdminRole(role: string): boolean {
  return role === "admin" || role === "platform_admin";
}

// ─── Sidebar content (shared between desktop & mobile sheet) ──────────────────

interface SidebarContentProps {
  currentPath: string;
  displayName: string;
  onLogout: () => void;
  loggingOut: boolean;
  onNavigate?: () => void; // called after a nav link click (closes mobile sheet)
}

function SidebarContent({
  currentPath,
  displayName,
  onLogout,
  loggingOut,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gradient-primary tracking-tight">
            BANDWIDTH
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30"
          >
            Admin
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 tracking-widest uppercase">
          Control Panel
        </p>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase px-2 mb-1.5">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === "/admin/dashboard"
                      ? currentPath === item.path
                      : currentPath.startsWith(item.path);

                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        onClick={onNavigate}
                        className={[
                          "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all duration-150 group",
                          isActive
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          ].join(" ")}
                        />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-primary/60" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5 space-y-2">
        <p className="text-xs text-muted-foreground px-2 truncate">{displayName}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          Log Out
        </Button>
      </div>
    </div>
  );
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = (user?.metadata as Record<string, string> | null)?.role ?? "";
  if (!user || !isAdminRole(role)) {
    return <Redirect to="/admin" />;
  }

  const displayName =
    user.displayName || user.firstName || user.username || "Admin";

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/admin";
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col glass-card border-r border-white/5 z-30"
      >
        <SidebarContent
          currentPath={location}
          displayName={displayName}
          onLogout={handleLogout}
          loggingOut={logoutMutation.isPending}
        />
      </motion.aside>

      {/* ── Mobile Header + Sheet ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-3 glass-card border-b border-white/5">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 glass-card border-r border-white/5">
            <SidebarContent
              currentPath={location}
              displayName={displayName}
              onLogout={handleLogout}
              loggingOut={logoutMutation.isPending}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-gradient-primary tracking-tight">
          BANDWIDTH
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30"
        >
          Admin
        </Badge>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 md:ml-60 pt-16 md:pt-0 min-h-screen overflow-y-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
