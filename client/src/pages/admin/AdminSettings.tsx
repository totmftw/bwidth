import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings,
  AlertCircle,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  Sliders,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy?: number;
}

interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  updatedAt?: string;
}

// ─── Workflow Toggle Keys ─────────────────────────────────────────────────────

const TOGGLE_SETTINGS = [
  {
    key: "require_contract_admin_approval",
    label: "Require Admin Contract Approval",
    description: "All contracts must be reviewed by an admin before being finalized.",
  },
  {
    key: "require_event_approval",
    label: "Require Event Approval",
    description: "New events must be approved by an admin before going live.",
  },
  {
    key: "enable_trust_score",
    label: "Enable Trust Score System",
    description: "Show trust scores for artists and organizers across the platform.",
  },
  {
    key: "maintenance_mode",
    label: "Maintenance Mode",
    description: "Temporarily disable the platform for non-admin users.",
  },
];

// ─── Platform Config Keys ─────────────────────────────────────────────────────

const NUMERIC_SETTINGS: {
  key: string;
  label: string;
  subKeys?: string[];
  subLabels?: string[];
  isNested?: boolean;
  description?: string;
}[] = [
  {
    key: "platform.commission_rate",
    label: "Platform Commission Rate",
    isNested: true,
    subKeys: ["default", "min", "max"],
    subLabels: ["Default (decimal)", "Min (decimal)", "Max (decimal)"],
    description: "Enter as decimal ratio — e.g. 0.05 means 5%. Typical range: 0.02–0.05",
  },
  { key: "default_commission_pct", label: "Default Commission (decimal)", description: "Enter as decimal, e.g. 0.03 = 3%. Applies to all bookings unless overridden." },
  { key: "artist_commission_pct", label: "Artist Commission Override (decimal)", description: "Enter as decimal, e.g. 0.03 = 3%. Overrides platform default for artist side." },
  { key: "organizer_commission_pct", label: "Organizer Commission Override (decimal)", description: "Enter as decimal, e.g. 0.02 = 2%. Overrides platform default for organizer side." },
  { key: "booking.max_negotiation_rounds", label: "Max Negotiation Rounds" },
  { key: "booking.negotiation_response_hours", label: "Negotiation Response Hours" },
  { key: "contract.signing_deadline_hours", label: "Contract Signing Deadline Hours" },
  { key: "payment.default_deposit_percent", label: "Default Deposit %" },
];

function formatDate(iso: string | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Toggle Card ──────────────────────────────────────────────────────────────

function ToggleCard({
  setting,
  appSettings,
  onToggle,
  isLoading,
}: {
  setting: (typeof TOGGLE_SETTINGS)[0];
  appSettings: AppSetting[];
  onToggle: (key: string, newValue: boolean) => void;
  isLoading: boolean;
}) {
  const record = appSettings.find((s) => s.key === setting.key);
  const isOn = record?.value === "true" || record?.value === "1";

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{setting.label}</p>
          {isOn ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px]">
              ON
            </Badge>
          ) : (
            <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 text-[10px]">
              OFF
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
        {record?.updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Last updated: {formatDate(record.updatedAt)}
          </p>
        )}
      </div>
      <button
        onClick={() => !isLoading && onToggle(setting.key, !isOn)}
        className="shrink-0 focus:outline-none"
        disabled={isLoading}
      >
        {isOn ? (
          <ToggleRight className="w-8 h-8 text-primary transition-colors" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-muted-foreground transition-colors" />
        )}
      </button>
    </div>
  );
}

// ─── Numeric Setting Row (controlled — no own Save button) ───────────────────

function NumericSettingRow({
  config,
  scalarVal,
  nestedVals,
  onScalarChange,
  onNestedChange,
}: {
  config: (typeof NUMERIC_SETTINGS)[0];
  scalarVal: string;
  nestedVals: Record<string, string>;
  onScalarChange: (val: string) => void;
  onNestedChange: (subKey: string, val: string) => void;
}) {
  return (
    <div className="py-4 space-y-3">
      <div>
        <p className="text-sm font-medium">{config.label}</p>
        {config.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        )}
      </div>

      {config.isNested ? (
        <div className="grid grid-cols-3 gap-3">
          {(config.subKeys ?? []).map((subKey, i) => (
            <div key={subKey} className="space-y-1">
              <Label className="text-xs">{config.subLabels?.[i] ?? subKey}</Label>
              <Input
                type="number"
                value={nestedVals[subKey] ?? ""}
                onChange={(e) => onNestedChange(subKey, e.target.value)}
                className="bg-card/40 border-white/10 focus:border-primary/40 h-8 text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <Input
          type="number"
          value={scalarVal}
          onChange={(e) => onScalarChange(e.target.value)}
          className="bg-card/40 border-white/10 focus:border-primary/40 h-8 text-sm max-w-[160px]"
        />
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for all numeric settings (controlled)
  const [localScalars, setLocalScalars] = useState<Record<string, string>>({});
  const [localNested, setLocalNested] = useState<Record<string, Record<string, string>>>({});

  const appQuery = useQuery<AppSetting[]>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const sysQuery = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/settings/system"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings/system", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value: String(value) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({ title: `Setting updated` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

  const saveSysMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await fetch("/api/admin/settings/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/system"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

  // Initialize local values when system settings load
  useEffect(() => {
    if (!sysQuery.data) return;
    const scalars: Record<string, string> = {};
    const nested: Record<string, Record<string, string>> = {};
    for (const config of NUMERIC_SETTINGS) {
      const record = sysQuery.data.find((s) => s.key === config.key);
      if (!record) continue;
      if (config.isNested && typeof record.value === "object" && record.value !== null) {
        nested[config.key] = Object.fromEntries(
          Object.entries(record.value).map(([k, v]) => [k, String(v)])
        );
      } else {
        scalars[config.key] = String(record.value ?? "");
      }
    }
    setLocalScalars(scalars);
    setLocalNested(nested);
  }, [sysQuery.data]);

  const handleSaveAll = async () => {
    try {
      for (const config of NUMERIC_SETTINGS) {
        if (config.isNested) {
          const val = localNested[config.key];
          if (val && Object.keys(val).length > 0) {
            await saveSysMutation.mutateAsync({ key: config.key, value: val });
          }
        } else {
          const val = localScalars[config.key];
          if (val !== undefined && val !== "") {
            await saveSysMutation.mutateAsync({ key: config.key, value: Number(val) });
          }
        }
      }
      toast({ title: "All configuration saved" });
    } catch {
      // individual mutation already shows error toast
    }
  };

  const isLoading = appQuery.isLoading || sysQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure workflow rules and platform behaviour
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Workflow Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ToggleRight className="w-4 h-4 text-primary" />
                  Workflow Settings
                </CardTitle>
                <CardDescription>
                  Toggle core platform workflows on or off.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appQuery.isError ? (
                  <div className="flex items-center gap-2 text-destructive py-4">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Failed to load settings.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {TOGGLE_SETTINGS.map((setting) => (
                      <ToggleCard
                        key={setting.key}
                        setting={setting}
                        appSettings={appQuery.data ?? []}
                        onToggle={(key, value) =>
                          toggleMutation.mutate({ key, value })
                        }
                        isLoading={toggleMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Platform Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Platform Configuration
                </CardTitle>
                <CardDescription>
                  Numeric parameters for commissions, negotiations, and payments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sysQuery.isError ? (
                  <div className="flex items-center gap-2 text-destructive py-4">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Failed to load system settings.</span>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-white/5">
                      {NUMERIC_SETTINGS.map((config) => (
                        <NumericSettingRow
                          key={config.key}
                          config={config}
                          scalarVal={localScalars[config.key] ?? ""}
                          nestedVals={localNested[config.key] ?? {}}
                          onScalarChange={(val) =>
                            setLocalScalars((prev) => ({ ...prev, [config.key]: val }))
                          }
                          onNestedChange={(subKey, val) =>
                            setLocalNested((prev) => ({
                              ...prev,
                              [config.key]: { ...(prev[config.key] ?? {}), [subKey]: val },
                            }))
                          }
                        />
                      ))}
                    </div>
                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={handleSaveAll}
                        disabled={saveSysMutation.isPending}
                        size="sm"
                        className="gap-2"
                      >
                        {saveSysMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Configuration
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
