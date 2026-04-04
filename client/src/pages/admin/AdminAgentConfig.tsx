import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { OpenRouterModelSelector } from "@/components/agents/OpenRouterModelSelector";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AdminAgentConfig() {
  const [, params] = useRoute("/admin/agents/config/:agentType");
  const agentType = params?.agentType ?? "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const configs = useQuery({
    queryKey: [api.agents.admin.configs.list.path],
    queryFn: async () => {
      const res = await fetch(api.agents.admin.configs.list.path);
      if (!res.ok) throw new Error("Failed");
      return await res.json() as any[];
    },
  });

  const config = configs.data?.find((c: any) => c.agentType === agentType);

  const [form, setForm] = useState({
    displayName: "",
    description: "",
    enabled: true,
    defaultProvider: "",
    defaultModel: "",
    systemApiKey: "",
    maxTokensPerRequest: 4096,
    maxRequestsPerSession: 20,
    temperatureDefault: 0.7,
  });

  useEffect(() => {
    if (config) {
      setForm({
        displayName: config.displayName ?? "",
        description: config.description ?? "",
        enabled: config.enabled ?? true,
        defaultProvider: config.defaultProvider ?? "",
        defaultModel: config.defaultModel ?? "",
        systemApiKey: "",
        maxTokensPerRequest: config.maxTokensPerRequest ?? 4096,
        maxRequestsPerSession: config.maxRequestsPerSession ?? 20,
        temperatureDefault: config.temperatureDefault ? Number(config.temperatureDefault) : 0.7,
      });
    }
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const body: any = { ...form };
      if (!body.systemApiKey) delete body.systemApiKey;
      if (!body.defaultProvider) delete body.defaultProvider;
      if (!body.defaultModel) delete body.defaultModel;
      const res = await fetch(`${api.agents.admin.configs.list.path}/${agentType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.agents.admin.configs.list.path] });
      toast({ title: "Saved", description: "Agent configuration updated." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Configure: {config?.displayName ?? agentType}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enabled</Label>
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
          <div>
            <Label>Display Name</Label>
            <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default Provider</Label>
            <Select value={form.defaultProvider} onValueChange={(v) => setForm((f) => ({ ...f, defaultProvider: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="ollama">Ollama</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.defaultProvider === "openrouter" ? (
            <OpenRouterModelSelector
              value={form.defaultModel}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultModel: v }))}
            />
          ) : (
            <div>
              <Label>Default Model</Label>
              <Input value={form.defaultModel} onChange={(e) => setForm((f) => ({ ...f, defaultModel: e.target.value }))} placeholder="e.g. gpt-4o" />
            </div>
          )}
          <div>
            <Label>System API Key</Label>
            <Input
              type="password"
              value={form.systemApiKey}
              onChange={(e) => setForm((f) => ({ ...f, systemApiKey: e.target.value }))}
              placeholder={config?.systemApiKeyEncrypted ? "Key saved (enter new to replace)" : "Optional fallback key"}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Max Tokens/Request</Label>
              <Input type="number" value={form.maxTokensPerRequest} onChange={(e) => setForm((f) => ({ ...f, maxTokensPerRequest: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Max Requests/Session</Label>
              <Input type="number" value={form.maxRequestsPerSession} onChange={(e) => setForm((f) => ({ ...f, maxRequestsPerSession: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Temperature</Label>
              <Input type="number" step="0.1" min="0" max="2" value={form.temperatureDefault} onChange={(e) => setForm((f) => ({ ...f, temperatureDefault: Number(e.target.value) }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        Save Configuration
      </Button>
    </div>
  );
}
