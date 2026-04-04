import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Check,
  Trash2,
  Bot,
  ChevronDown,
  Pencil,
  X,
  Zap,
} from "lucide-react";
import {
  useAgentConfig,
  useUpdateLlmConfig,
  useDeleteLlmConfig,
  useSetActiveLlmConfig,
  useValidateLlmConfig,
  useAgentSessions,
  type ProviderConfig,
} from "@/hooks/use-agent";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { OpenRouterModelSelector } from "./OpenRouterModelSelector";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"] },
  { id: "anthropic", label: "Anthropic (Claude)", models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"] },
  { id: "google", label: "Google (Gemini)", models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { id: "openrouter", label: "OpenRouter", models: [] },
  { id: "ollama", label: "Ollama (Local)", models: ["llama3.1", "llama3", "mistral", "codellama", "gemma2", "phi3"] },
] as const;

type ProviderId = typeof PROVIDERS[number]["id"];

interface ProviderRowProps {
  info: typeof PROVIDERS[number];
  saved: ProviderConfig | undefined;
  isActive: boolean;
  onSave: (data: { provider: string; model: string; apiKey?: string; ollamaBaseUrl?: string; openrouterModel?: string; setActive?: boolean }) => void;
  onDelete: (provider: string) => void;
  onSetActive: (provider: string) => void;
  onValidate: (provider: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
  isSettingActive: boolean;
  isValidating: boolean;
}

function ProviderRow({
  info,
  saved,
  isActive,
  onSave,
  onDelete,
  onSetActive,
  onValidate,
  isSaving,
  isDeleting,
  isSettingActive,
  isValidating,
}: ProviderRowProps) {
  const [editing, setEditing] = useState(false);
  const [model, setModel] = useState(saved?.model ?? info.models[0] ?? "");
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState(saved?.ollamaBaseUrl ?? "http://localhost:11434/api/chat");

  const handleSave = () => {
    onSave({
      provider: info.id,
      model,
      apiKey: info.id !== "ollama" ? (apiKey || undefined) : undefined,
      ollamaBaseUrl: info.id === "ollama" ? ollamaUrl : undefined,
      openrouterModel: info.id === "openrouter" ? model : undefined,
    });
    setApiKey("");
    setEditing(false);
  };

  const hasKey = saved?.hasKey ?? false;
  const isOllama = info.id === "ollama";

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${isActive ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{info.label}</span>
          {isActive && (
            <Badge variant="default" className="text-[10px] py-0 px-1.5 shrink-0">
              <Zap className="h-2.5 w-2.5 mr-0.5" /> Active
            </Badge>
          )}
          {hasKey && !isActive && (
            <Badge variant="outline" className="text-green-700 bg-green-50 text-[10px] py-0 px-1.5 shrink-0">
              <Check className="h-2.5 w-2.5 mr-0.5" /> Saved
            </Badge>
          )}
          {saved?.isValid === true && (
            <Badge variant="outline" className="text-green-700 text-[10px] py-0 px-1.5 shrink-0">Valid</Badge>
          )}
          {saved?.isValid === false && (
            <Badge variant="outline" className="text-red-600 text-[10px] py-0 px-1.5 shrink-0">Invalid</Badge>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasKey && !isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onSetActive(info.id)}
              disabled={isSettingActive}
            >
              {isSettingActive ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set Active"}
            </Button>
          )}
          {hasKey && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onValidate(info.id)}
              disabled={isValidating}
            >
              {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </Button>
          {hasKey && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(info.id)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Saved model label */}
      {!editing && saved && (
        <p className="text-xs text-muted-foreground">Model: {saved.model}</p>
      )}

      {/* Edit form */}
      {editing && (
        <div className="space-y-3 pt-1">
          {/* Model selector */}
          {info.id === "openrouter" ? (
            <div>
              <Label className="text-xs">Model</Label>
              <OpenRouterModelSelector value={model} onValueChange={setModel} />
            </div>
          ) : info.models.length > 0 ? (
            <div>
              <Label className="text-xs">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-background/60 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {info.models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* API key or Ollama URL */}
          {isOllama ? (
            <div>
              <Label className="text-xs">Ollama Base URL</Label>
              <Input
                className="bg-background/60 h-8"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434/api/chat"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                className="bg-background/60 h-8"
                placeholder={hasKey ? "Enter new key to replace" : "Enter API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={isSaving || (!isOllama && !hasKey && !apiKey)}>
              {isSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* First-time prompt */}
      {!editing && !saved && (
        <p className="text-xs text-muted-foreground">
          Not configured.{" "}
          <button className="underline text-primary" onClick={() => setEditing(true)}>Add key</button>
        </p>
      )}
    </div>
  );
}

/**
 * Reusable AI settings component — shows all 5 providers, each with
 * saved-state indicator, edit/remove, and active-provider selection.
 */
export function ProfileAiSettings() {
  const config = useAgentConfig();
  const updateConfig = useUpdateLlmConfig();
  const deleteConfig = useDeleteLlmConfig();
  const setActive = useSetActiveLlmConfig();
  const validate = useValidateLlmConfig();
  const sessions = useAgentSessions();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const providerConfigs = config.data?.providerConfigs ?? [];
  const activeProvider = config.data?.activeProvider ?? null;

  const getSaved = (id: string) => providerConfigs.find((p) => p.provider === id);

  const handle = (provider: string, action: "save" | "delete" | "setActive" | "validate") => {
    setLoadingProvider(`${provider}:${action}`);
  };

  const handleSave = (data: Parameters<typeof updateConfig.mutate>[0]) => {
    handle(data.provider, "save");
    updateConfig.mutate(data, { onSettled: () => setLoadingProvider(null) });
  };

  const handleDelete = (provider: string) => {
    handle(provider, "delete");
    deleteConfig.mutate(provider, { onSettled: () => setLoadingProvider(null) });
  };

  const handleSetActive = (provider: string) => {
    handle(provider, "setActive");
    setActive.mutate(provider, { onSettled: () => setLoadingProvider(null) });
  };

  const handleValidate = (provider: string) => {
    handle(provider, "validate");
    validate.mutate(provider, { onSettled: () => setLoadingProvider(null) });
  };

  const anyKeyConfigured = providerConfigs.some((p) => p.hasKey);

  return (
    <Card className="glass-card border-white/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" />
                <div>
                  <CardTitle className="text-base">AI Settings</CardTitle>
                  <CardDescription className="text-xs">
                    Configure your LLM provider for AI-powered features
                    {anyKeyConfigured && (
                      <Badge variant="outline" className="ml-2 text-green-700 bg-green-50 text-[10px] py-0">
                        {providerConfigs.filter((p) => p.hasKey).length} provider{providerConfigs.filter((p) => p.hasKey).length !== 1 ? "s" : ""} connected
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {config.isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!config.isLoading && PROVIDERS.map((p) => (
              <ProviderRow
                key={p.id}
                info={p}
                saved={getSaved(p.id)}
                isActive={activeProvider === p.id}
                onSave={handleSave}
                onDelete={handleDelete}
                onSetActive={handleSetActive}
                onValidate={handleValidate}
                isSaving={loadingProvider === `${p.id}:save`}
                isDeleting={loadingProvider === `${p.id}:delete`}
                isSettingActive={loadingProvider === `${p.id}:setActive`}
                isValidating={loadingProvider === `${p.id}:validate`}
              />
            ))}

            {/* Available Agents (compact) */}
            {config.data?.agents && config.data.agents.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Available AI Features</p>
                <div className="space-y-1.5">
                  {config.data.agents.map((a) => (
                    <div key={a.agentType} className="flex items-center justify-between text-sm">
                      <span>{a.displayName}</span>
                      <Badge variant={a.enabled ? "default" : "secondary"} className="text-[10px] py-0">
                        {a.enabled ? "On" : "Off"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions (compact) */}
            {sessions.data && sessions.data.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent AI Sessions</p>
                <div className="space-y-1.5">
                  {sessions.data.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize">{s.agentType.replace("_", " ")}</span>
                        <AgentStatusBadge status={s.status} />
                      </div>
                      <span className="text-muted-foreground">
                        {s.startedAt ? new Date(s.startedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
