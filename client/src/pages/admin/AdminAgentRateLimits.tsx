import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function AdminAgentRateLimits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    agentType: "event_wizard",
    maxRequestsPerHour: "20",
    maxRequestsPerDay: "100",
    maxTokensPerDay: "100000",
  });

  const limits = useQuery({
    queryKey: [api.agents.admin.rateLimits.list.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.rateLimits.list.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        id: number;
        userId: number;
        agentType: string;
        maxRequestsPerHour: number | null;
        maxRequestsPerDay: number | null;
        maxTokensPerDay: number | null;
      }>;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.agents.admin.rateLimits.upsert.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(form.userId),
          agentType: form.agentType,
          maxRequestsPerHour: form.maxRequestsPerHour ? Number(form.maxRequestsPerHour) : undefined,
          maxRequestsPerDay: form.maxRequestsPerDay ? Number(form.maxRequestsPerDay) : undefined,
          maxTokensPerDay: form.maxTokensPerDay ? Number(form.maxTokensPerDay) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.rateLimits.list.path] });
      toast({ title: "Saved", description: "Rate limit updated." });
      setShowForm(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${api.agents.admin.rateLimits.list.path}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.rateLimits.list.path] });
      toast({ title: "Deleted", description: "Rate limit removed." });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Rate Limits</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add Override
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Rate Limit Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>User ID</Label>
                <Input type="number" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
              </div>
              <div>
                <Label>Agent Type</Label>
                <Select value={form.agentType} onValueChange={(v) => setForm((f) => ({ ...f, agentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event_wizard">Event Wizard</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Max/Hour</Label>
                <Input type="number" value={form.maxRequestsPerHour} onChange={(e) => setForm((f) => ({ ...f, maxRequestsPerHour: e.target.value }))} />
              </div>
              <div>
                <Label>Max/Day</Label>
                <Input type="number" value={form.maxRequestsPerDay} onChange={(e) => setForm((f) => ({ ...f, maxRequestsPerDay: e.target.value }))} />
              </div>
              <div>
                <Label>Max Tokens/Day</Label>
                <Input type="number" value={form.maxTokensPerDay} onChange={(e) => setForm((f) => ({ ...f, maxTokensPerDay: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={() => upsert.mutate()} disabled={upsert.isPending || !form.userId}>
              {upsert.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Max/Hour</TableHead>
                <TableHead>Max/Day</TableHead>
                <TableHead>Max Tokens/Day</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.data?.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell>{limit.userId}</TableCell>
                  <TableCell className="capitalize">{limit.agentType.replace("_", " ")}</TableCell>
                  <TableCell>{limit.maxRequestsPerHour ?? "—"}</TableCell>
                  <TableCell>{limit.maxRequestsPerDay ?? "—"}</TableCell>
                  <TableCell>{limit.maxTokensPerDay?.toLocaleString() ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(limit.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!limits.data || limits.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No rate limit overrides set.
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
