import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@shared/routes";
import { AgentStatusBadge } from "@/components/agents/AgentStatusBadge";

export default function AdminAgentUsage() {
  const usage = useQuery({
    queryKey: [api.agents.admin.usage.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.usage.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        id: number;
        userId: number;
        agentType: string;
        date: string;
        sessionCount: number;
        requestCount: number;
        inputTokens: number;
        outputTokens: number;
        positiveRatings: number;
        negativeRatings: number;
      }>;
    },
  });

  const sessions = useQuery({
    queryKey: [api.agents.admin.sessions.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.sessions.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        id: number;
        userId: number;
        agentType: string;
        status: string;
        provider: string;
        model: string;
        requestCount: number;
        inputTokensUsed: number;
        outputTokensUsed: number;
        startedAt: string;
        completedAt: string | null;
      }>;
    },
  });

  const totalInput = usage.data?.reduce((sum, u) => sum + (u.inputTokens ?? 0), 0) ?? 0;
  const totalOutput = usage.data?.reduce((sum, u) => sum + (u.outputTokens ?? 0), 0) ?? 0;
  const totalSessions = usage.data?.reduce((sum, u) => sum + (u.sessionCount ?? 0), 0) ?? 0;
  const totalRequests = usage.data?.reduce((sum, u) => sum + (u.requestCount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agent Usage Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sessions</CardDescription>
            <CardTitle className="text-2xl">{totalSessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>LLM Requests</CardDescription>
            <CardTitle className="text-2xl">{totalRequests}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Input Tokens</CardDescription>
            <CardTitle className="text-2xl">{totalInput.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Output Tokens</CardDescription>
            <CardTitle className="text-2xl">{totalOutput.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Daily Usage */}
      {usage.data && usage.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Tokens (In/Out)</TableHead>
                  <TableHead>Ratings (+/-)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.date}</TableCell>
                    <TableCell>#{u.userId}</TableCell>
                    <TableCell className="capitalize">{u.agentType.replace("_", " ")}</TableCell>
                    <TableCell>{u.sessionCount}</TableCell>
                    <TableCell>{u.requestCount}</TableCell>
                    <TableCell>{u.inputTokens.toLocaleString()} / {u.outputTokens.toLocaleString()}</TableCell>
                    <TableCell>
                      {u.positiveRatings > 0 && <span className="text-green-600 mr-1">+{u.positiveRatings}</span>}
                      {u.negativeRatings > 0 && <span className="text-red-600">-{u.negativeRatings}</span>}
                      {u.positiveRatings === 0 && u.negativeRatings === 0 && "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.data?.slice(0, 50).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>#{s.id}</TableCell>
                  <TableCell>#{s.userId}</TableCell>
                  <TableCell className="capitalize">{s.agentType.replace("_", " ")}</TableCell>
                  <TableCell><AgentStatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-xs">{s.provider}/{s.model}</TableCell>
                  <TableCell>{s.requestCount}</TableCell>
                  <TableCell className="text-xs">
                    {((s.inputTokensUsed ?? 0) + (s.outputTokensUsed ?? 0)).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs">{s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
              {(!sessions.data || sessions.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No sessions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
