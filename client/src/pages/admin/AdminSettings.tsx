import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, ShieldAlert, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ["/api/admin/settings"],
        queryFn: async () => {
            const res = await fetch("/api/admin/settings", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to load settings");
            return await res.json();
        }
    });

    const { mutate: updateSetting, isPending } = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: any }) => {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to update setting");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
            toast({ title: "Setting updated successfully" });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Transform array to key-value map
    const settingsMap = (settings || []).reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Workflow Toggles</h1>
                <p className="text-muted-foreground mt-2">
                    Global configuration settings to bypass or require admin approvals.
                </p>
            </div>

            <div className="grid gap-6 max-w-2xl">
                {/* Contract Approval Toggle */}
                <div className="flex items-center justify-between p-5 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-1">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <Label htmlFor="contract_approval" className="text-base font-semibold">Require Admin Contract Approval</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                When enabled, all fully signed contracts must be reviewed and approved by an Admin before the booking is confirmed.
                            </p>
                        </div>
                    </div>
                    <Switch
                        id="contract_approval"
                        checked={settingsMap['require_contract_admin_approval'] !== false}
                        disabled={isPending}
                        onCheckedChange={(checked) => updateSetting({ key: 'require_contract_admin_approval', value: checked })}
                    />
                </div>

                {/* Additional Toggles can be added here */}
                <div className="flex items-center justify-between p-5 rounded-xl border border-white/10 bg-white/5 opacity-50 pointer-events-none">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-1">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <Label className="text-base font-semibold">Require Event Approval</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                (Coming Soon) All newly created events require admin approval before going live.
                            </p>
                        </div>
                    </div>
                    <Switch disabled checked={true} />
                </div>
            </div>
        </div>
    );
}
