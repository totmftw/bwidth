import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenRouterModel {
  id: string;
  name: string;
  contextLength?: number;
  promptPrice?: string;
  completionPrice?: string;
  isFree: boolean;
}

interface OpenRouterModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const RECENTLY_USED_KEY = "openrouter_recently_used_models";
const MAX_RECENT = 5;

export function OpenRouterModelSelector({ value, onValueChange, className }: OpenRouterModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [manualInput, setManualInput] = useState(value);
  const [recentModels, setRecentModels] = useState<OpenRouterModel[]>([]);

  // Load recently used models from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENTLY_USED_KEY);
    if (stored) {
      try {
        setRecentModels(JSON.parse(stored));
      } catch {
        setRecentModels([]);
      }
    }
  }, []);

  const { data: models = [], isLoading, isError } = useQuery({
    queryKey: ["openrouter-models"],
    queryFn: async () => {
      const res = await fetch("/api/agents/openrouter-models");
      if (!res.ok) throw new Error("Failed to fetch models");
      return await res.json() as OpenRouterModel[];
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  const filteredModels = useMemo(() => {
    if (freeOnly) return models.filter((m) => m.isFree);
    return models;
  }, [models, freeOnly]);

  const selectedModel = models.find((m) => m.id === value);

  const handleSelectModel = (modelId: string) => {
    const selectedModel = models.find((m) => m.id === modelId);
    const modelName = selectedModel?.name || modelId;
    const isFree = selectedModel?.isFree || false;

    onValueChange(modelId);
    setManualInput(modelId);

    // Add to recently used
    const updated = [
      { id: modelId, name: modelName, isFree },
      ...recentModels.filter((m) => m.id !== modelId),
    ].slice(0, MAX_RECENT);
    setRecentModels(updated);
    localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(updated));
    setOpen(false);
  };

  const handleManualInputChange = (newValue: string) => {
    setManualInput(newValue);
    onValueChange(newValue);
  };

  const formatPrice = (price: string | undefined) => {
    if (!price || price === "0") return "Free";
    const perMillion = parseFloat(price) * 1_000_000;
    if (perMillion < 0.01) return "<$0.01/M";
    return `$${perMillion.toFixed(2)}/M`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Model</Label>
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Free only</Label>
          <Switch
            checked={freeOnly}
            onCheckedChange={setFreeOnly}
            className="scale-75 origin-right"
          />
        </div>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background/60 font-normal text-sm h-9"
          >
            <span className="truncate">
              {selectedModel ? selectedModel.name : value || "Select model..."}
            </span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          {isError && !isLoading ? (
            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Failed to load models. Enter model ID manually:</p>
              <Input
                placeholder="e.g., openai/gpt-4o"
                value={manualInput}
                onChange={(e) => handleManualInputChange(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">Popular OpenRouter models: openai/gpt-4o, anthropic/claude-sonnet-4, google/gemini-2.0-flash</p>
            </div>
          ) : (
            <Command>
              <CommandInput placeholder="Search models..." />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Loading models..." : "No models found."}
                </CommandEmpty>

                {/* Recently used models */}
                {recentModels.length > 0 && (
                  <CommandGroup heading="Recently Used">
                    {recentModels.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={`${model.name} ${model.id}`}
                        onSelect={() => handleSelectModel(model.id)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Check
                            className={cn(
                              "h-3 w-3 shrink-0",
                              value === model.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate text-sm">{model.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {model.isFree && (
                            <Badge variant="outline" className="text-[10px] py-0 text-green-700 bg-green-50 border-green-200">
                              Free
                            </Badge>
                          )}
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* All models */}
                <CommandGroup heading="All Models">
                  {filteredModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.name} ${model.id}`}
                      onSelect={() => handleSelectModel(model.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check
                          className={cn(
                            "h-3 w-3 shrink-0",
                            value === model.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate text-sm">{model.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {model.isFree ? (
                          <Badge variant="outline" className="text-[10px] py-0 text-green-700 bg-green-50 border-green-200">
                            Free
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {formatPrice(model.promptPrice)}
                          </span>
                        )}
                        {model.contextLength && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(model.contextLength / 1000)}k
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      {freeOnly && (
        <p className="text-[10px] text-muted-foreground">
          Showing {filteredModels.length} free model{filteredModels.length !== 1 ? "s" : ""} of {models.length} total
        </p>
      )}
    </div>
  );
}
