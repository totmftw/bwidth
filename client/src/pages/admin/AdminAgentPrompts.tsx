import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Check, Loader2 } from "lucide-react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function AdminAgentPrompts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    agentType: "event_wizard",
    version: "",
    systemPrompt: "",
    contextTemplate: "",
    notes: "",
  });

  const prompts = useQuery({
    queryKey: [api.agents.admin.prompts.list.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.prompts.list.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json() as Array<{
        id: number;
        agentType: string;
        version: string;
        isActive: boolean;
        systemPrompt: string;
        contextTemplate: string | null;
        notes: string | null;
        totalRuns: number;
        positiveCount: number;
        negativeCount: number;
        avgLatencyMs: number | null;
        createdAt: string;
      }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.agents.admin.prompts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: form.agentType,
          version: form.version,
          systemPrompt: form.systemPrompt,
          contextTemplate: form.contextTemplate || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.prompts.list.path] });
      toast({ title: "Created", description: "Prompt version created." });
      setShowForm(false);
      setForm({ agentType: "event_wizard", version: "", systemPrompt: "", contextTemplate: "", notes: "" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const activate = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${api.agents.admin.prompts.list.path}/${id}/activate`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to activate");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.prompts.list.path] });
      toast({ title: "Activated", description: "Prompt version is now active." });
    },
  });

  const approvalRate = (p: { positiveCount: number; negativeCount: number }) => {
    const total = p.positiveCount + p.negativeCount;
    return total > 0 ? Math.round((p.positiveCount / total) * 100) : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prompt Versions</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Version
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Prompt Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>Version</Label>
                <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="e.g. v1.2" />
              </div>
            </div>
            <div>
              <Label>System Prompt</Label>
              <Textarea value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} rows={6} placeholder="Enter the system prompt..." />
            </div>
            <div>
              <Label>Context Template (optional)</Label>
              <Textarea value={form.contextTemplate} onChange={(e) => setForm((f) => ({ ...f, contextTemplate: e.target.value }))} rows={3} placeholder="Use {{venues}}, {{genres}} as placeholders..." />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="What changed in this version" />
            </div>
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !form.version || !form.systemPrompt}>
              {create.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Avg Latency</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="capitalize">{p.agentType.replace("_", " ")}</TableCell>
                  <TableCell className="font-mono text-sm">{p.version}</TableCell>
                  <TableCell>
                    {p.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>{p.totalRuns}</TableCell>
                  <TableCell>
                    {approvalRate(p) !== null ? (
                      <span className={approvalRate(p)! >= 70 ? "text-green-600" : "text-yellow-600"}>
                        {approvalRate(p)}% ({p.positiveCount}/{p.positiveCount + p.negativeCount})
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{p.avgLatencyMs ? `${Math.round(Number(p.avgLatencyMs))}ms` : "—"}</TableCell>
                  <TableCell>
                    {!p.isActive && (
                      <Button size="sm" variant="ghost" onClick={() => activate.mutate(p.id)} disabled={activate.isPending}>
                        <Check className="h-3 w-3 mr-1" /> Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!prompts.data || prompts.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No prompt versions created yet.
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
