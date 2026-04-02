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
}[] = [
  {
    key: "platform.commission_rate",
    label: "Platform Commission Rate",
    isNested: true,
    subKeys: ["default", "min", "max"],
    subLabels: ["Default %", "Min %", "Max %"],
  },
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

// ─── Numeric Setting Row ──────────────────────────────────────────────────────

function NumericSettingRow({
  config,
  systemSettings,
  onSave,
}: {
  config: (typeof NUMERIC_SETTINGS)[0];
  systemSettings: SystemSetting[];
  onSave: (key: string, value: any) => Promise<void>;
}) {
  const record = systemSettings.find((s) => s.key === config.key);
  const [saving, setSaving] = useState(false);

  // For nested (object) values
  const [nestedVals, setNestedVals] = useState<Record<string, string>>({});
  // For scalar values
  const [scalarVal, setScalarVal] = useState("");

  useEffect(() => {
    if (!record) return;
    if (config.isNested && typeof record.value === "object" && record.value !== null) {
      const obj: Record<string, string> = {};
      (config.subKeys ?? []).forEach((k) => {
        obj[k] = String(record.value[k] ?? "");
      });
      setNestedVals(obj);
    } else {
      setScalarVal(String(record.value ?? ""));
    }
  }, [record]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let val: any;
      if (config.isNested) {
        val = {};
        (config.subKeys ?? []).forEach((k) => {
          val[k] = Number(nestedVals[k] ?? 0);
        });
      } else {
        val = Number(scalarVal);
      }
      await onSave(config.key, val);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4 space-y-3">
      <div>
        <p className="text-sm font-medium">{config.label}</p>
        {record?.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{record.description}</p>
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
                onChange={(e) =>
                  setNestedVals((prev) => ({ ...prev, [subKey]: e.target.value }))
                }
                className="bg-card/40 border-white/10 focus:border-primary/40 h-8 text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <Input
          type="number"
          value={scalarVal}
          onChange={(e) => setScalarVal(e.target.value)}
          className="bg-card/40 border-white/10 focus:border-primary/40 h-8 text-sm max-w-[160px]"
        />
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={saving}
        className="gap-1.5 border-white/10 hover:border-primary/30 hover:bg-primary/5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      toast({ title: "System setting saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/system"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

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
                  <div className="divide-y divide-white/5">
                    {NUMERIC_SETTINGS.map((config) => (
                      <NumericSettingRow
                        key={config.key}
                        config={config}
                        systemSettings={sysQuery.data ?? []}
                        onSave={async (key, value) => {
                          await saveSysMutation.mutateAsync({ key, value });
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
