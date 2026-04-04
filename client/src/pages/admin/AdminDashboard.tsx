import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users,
  ClipboardList,
  FileText,
  Calendar,
  Music2,
  Building2,
  MapPin,
  BarChart3,
  ChevronRight,
  Activity,
  ShieldCheck,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number;
  who: number;
  action: string;
  entityType: string;
  entityId: number;
  createdAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function actionColor(action: string) {
  if (action.includes("creat") || action.includes("add")) return "text-emerald-400";
  if (action.includes("delet") || action.includes("remov") || action.includes("cancel")) return "text-red-400";
  if (action.includes("login") || action.includes("logout")) return "text-purple-400";
  return "text-blue-400";
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  pendingVerification: number;
  totalArtists: number;
  totalOrganizers: number;
  totalVenues: number;
  totalEvents: number;
  totalBookings: number;
  activeBookings: number;
  pendingContracts: number;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconColor: string;
  delay?: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  iconColor,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="glass-card border-white/5 overflow-hidden relative">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`}
        />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div
              className={`w-9 h-9 rounded-xl bg-background/60 flex items-center justify-center ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-display">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </span>
    </div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch platform stats");
      return res.json();
    },
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit", "recent"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit?limit=6&offset=0", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-display font-bold">Control Panel</h1>
        <p className="text-muted-foreground mt-1">BANDWIDTH Admin — Platform Overview</p>
      </motion.div>

      {/* Primary Stats Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            gradient="from-violet-500/20 to-purple-500/20"
            iconColor="text-violet-400"
            delay={0}
          />
          <StatCard
            label="Active Bookings"
            value={stats?.activeBookings ?? 0}
            icon={ClipboardList}
            gradient="from-green-500/20 to-emerald-500/20"
            iconColor="text-green-400"
            delay={0.05}
          />
          <StatCard
            label="Pending Contracts"
            value={stats?.pendingContracts ?? 0}
            icon={FileText}
            gradient="from-yellow-500/20 to-orange-500/20"
            iconColor="text-yellow-400"
            delay={0.1}
          />
          <StatCard
            label="Total Events"
            value={stats?.totalEvents ?? 0}
            icon={Calendar}
            gradient="from-blue-500/20 to-cyan-500/20"
            iconColor="text-blue-400"
            delay={0.15}
          />
        </div>
      )}

      {/* Secondary Stats Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Artists"
            value={stats?.totalArtists ?? 0}
            icon={Music2}
            gradient="from-rose-500/20 to-pink-500/20"
            iconColor="text-rose-400"
            delay={0.2}
          />
          <StatCard
            label="Organizers"
            value={stats?.totalOrganizers ?? 0}
            icon={Building2}
            gradient="from-indigo-500/20 to-blue-500/20"
            iconColor="text-indigo-400"
            delay={0.25}
          />
          <StatCard
            label="Venues"
            value={stats?.totalVenues ?? 0}
            icon={MapPin}
            gradient="from-teal-500/20 to-cyan-500/20"
            iconColor="text-teal-400"
            delay={0.3}
          />
          <StatCard
            label="Platform Bookings"
            value={stats?.totalBookings ?? 0}
            icon={BarChart3}
            gradient="from-purple-500/20 to-violet-500/20"
            iconColor="text-purple-400"
            delay={0.35}
          />
        </div>
      )}

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Overview — 2/3 */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
        >
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Platform Overview
              </CardTitle>
              <CardDescription>
                Key metrics across all entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div>
                  <StatRow label="Total Users (all time)" value={stats?.totalUsers ?? 0} />
                  <StatRow label="Active Users" value={stats?.activeUsers ?? 0} />
                  <StatRow label="Pending Verification" value={stats?.pendingVerification ?? 0} />
                  <StatRow label="Artists on Platform" value={stats?.totalArtists ?? 0} />
                  <StatRow label="Organizers on Platform" value={stats?.totalOrganizers ?? 0} />
                  <StatRow label="Registered Venues" value={stats?.totalVenues ?? 0} />
                  <StatRow label="Total Events Created" value={stats?.totalEvents ?? 0} />
                  <StatRow label="Total Bookings (all time)" value={stats?.totalBookings ?? 0} />
                  <StatRow label="Active / In-Flight Bookings" value={stats?.activeBookings ?? 0} />
                  <StatRow label="Contracts Awaiting Admin Review" value={stats?.pendingContracts ?? 0} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.45 }}
          >
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <QuickAction
                  label="Manage Users"
                  href="/admin/users"
                  icon={Users}
                />
                <QuickAction
                  label="Review Contracts"
                  href="/admin/contracts"
                  icon={FileText}
                />
                <QuickAction
                  label="View Bookings"
                  href="/admin/bookings"
                  icon={ClipboardList}
                />
                <QuickAction
                  label="Platform Settings"
                  href="/admin/settings"
                  icon={Activity}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.5 }}
          >
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Recent Activity
                  </span>
                  <Link href="/admin/audit">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary -mr-1">
                      View all <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {logsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !recentLogs?.length ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-mono truncate ${actionColor(log.action)}`}>
                            {log.action}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {log.entityType} #{log.entityId} · User #{log.who}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                          {timeAgo(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
