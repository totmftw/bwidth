import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Settings } from "lucide-react";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AdminAgents() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const configs = useQuery({
    queryKey: [api.agents.admin.configs.list.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.configs.list.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        agentType: string;
        displayName: string;
        description: string | null;
        enabled: boolean;
        allowedRoles: string[];
        defaultProvider: string | null;
        defaultModel: string | null;
      }>;
    },
  });

  const usage = useQuery({
    queryKey: [api.agents.admin.usage.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.usage.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        agentType: string;
        sessionCount: number;
        requestCount: number;
        inputTokens: number;
        outputTokens: number;
      }>;
    },
  });

  const feedback = useQuery({
    queryKey: [api.agents.admin.feedback.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.feedback.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{ rating: string }>;
    },
  });

  const toggleAgent = useMutation({
    mutationFn: async ({ agentType, enabled }: { agentType: string; enabled: boolean }) => {
      const res = await fetch(`${api.agents.admin.configs.list.path}/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.configs.list.path] });
      toast({ title: "Updated", description: "Agent configuration saved." });
    },
  });

  const positiveCount = feedback.data?.filter((f) => f.rating === "positive").length ?? 0;
  const totalFeedback = feedback.data?.length ?? 0;
  const approvalRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

  const totalSessions = usage.data?.reduce((sum, u) => sum + (u.sessionCount ?? 0), 0) ?? 0;
  const totalTokens = usage.data?.reduce((sum, u) => sum + (u.inputTokens ?? 0) + (u.outputTokens ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-purple-500" />
        <h1 className="text-2xl font-bold">AI Agents</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
            <CardTitle className="text-2xl">{totalSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tokens Used</CardDescription>
            <CardTitle className="text-2xl">{totalTokens.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approval Rate</CardDescription>
            <CardTitle className="text-2xl">{approvalRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Agent List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Configurations</CardTitle>
          <CardDescription>Enable or disable agents and manage their settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.data?.map((agent) => (
              <div key={agent.agentType} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{agent.displayName || agent.agentType}</span>
                    <Badge variant={agent.enabled ? "default" : "secondary"}>
                      {agent.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  {agent.description && (
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  )}
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {agent.defaultProvider && <span>Provider: {agent.defaultProvider}</span>}
                    {agent.defaultModel && <span>Model: {agent.defaultModel}</span>}
                    <span>Roles: {(agent.allowedRoles ?? []).join(", ") || "all"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={agent.enabled}
                    onCheckedChange={(checked) => toggleAgent.mutate({ agentType: agent.agentType, enabled: checked })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation(`/admin/agents/config/${agent.agentType}`)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(!configs.data || configs.data.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No agents configured. They will appear here once the system initializes.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
