import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, ChevronDown, Loader2, Check, X } from "lucide-react";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentFeedback } from "./AgentFeedback";
import {
  useNegotiationStart,
  useNegotiationStop,
  useNegotiationApprove,
  useNegotiationSetTargets,
  useNegotiationStatus,
} from "@/hooks/use-agent";

interface NegotiationAgentPanelProps {
  bookingId: number;
}

export function NegotiationAgentPanel({ bookingId }: NegotiationAgentPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targets, setTargets] = useState({
    targetMinPrice: "",
    targetMaxPrice: "",
    preferredSchedule: "",
    strategy: "balanced" as "aggressive" | "balanced" | "conservative",
    notes: "",
  });

  const status = useNegotiationStatus(bookingId);
  const start = useNegotiationStart(bookingId);
  const stop = useNegotiationStop(bookingId);
  const approve = useNegotiationApprove(bookingId);
  const setTargetsMutation = useNegotiationSetTargets(bookingId);

  const isActive = status.data?.active ?? false;

  const handleStart = () => {
    start.mutate({
      targetMinPrice: targets.targetMinPrice ? Number(targets.targetMinPrice) : undefined,
      targetMaxPrice: targets.targetMaxPrice ? Number(targets.targetMaxPrice) : undefined,
      preferredSchedule: targets.preferredSchedule || undefined,
      strategy: targets.strategy,
      notes: targets.notes || undefined,
    });
  };

  const handleUpdateTargets = () => {
    setTargetsMutation.mutate({
      targetMinPrice: targets.targetMinPrice ? Number(targets.targetMinPrice) : undefined,
      targetMaxPrice: targets.targetMaxPrice ? Number(targets.targetMaxPrice) : undefined,
      preferredSchedule: targets.preferredSchedule || undefined,
      strategy: targets.strategy,
      notes: targets.notes || undefined,
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-200">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium">AI Negotiation Assistant</CardTitle>
                {isActive && <AgentStatusBadge status={status.data?.status ?? "active"} />}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {!isActive ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Set your negotiation targets and let the AI analyze the deal and draft proposals for you.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Min Price (INR)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25000"
                      value={targets.targetMinPrice}
                      onChange={(e) => setTargets((p) => ({ ...p, targetMinPrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Price (INR)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={targets.targetMaxPrice}
                      onChange={(e) => setTargets((p) => ({ ...p, targetMaxPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Preferred Schedule</Label>
                  <Input
                    placeholder="e.g. Friday/Saturday evenings"
                    value={targets.preferredSchedule}
                    onChange={(e) => setTargets((p) => ({ ...p, preferredSchedule: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Strategy</Label>
                  <Select
                    value={targets.strategy}
                    onValueChange={(v) => setTargets((p) => ({ ...p, strategy: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative — prioritize relationship</SelectItem>
                      <SelectItem value="balanced">Balanced — fair for both sides</SelectItem>
                      <SelectItem value="aggressive">Aggressive — push for best terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    placeholder="Any additional context for the AI..."
                    value={targets.notes}
                    onChange={(e) => setTargets((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button onClick={handleStart} disabled={start.isPending} className="w-full" size="sm">
                  {start.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Starting...</>
                  ) : (
                    <><Bot className="h-3 w-3 mr-1" /> Start AI Assistant</>
                  )}
                </Button>
                {start.isError && (
                  <p className="text-sm text-red-600">{start.error.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending Drafts */}
                {status.data?.pendingDrafts && status.data.pendingDrafts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Pending Proposals</h4>
                    {status.data.pendingDrafts.map((draft) => (
                      <Card key={draft.id} className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-3 pb-3 space-y-2">
                          <div className="text-sm">
                            {draft.proposal?.offerAmount && (
                              <span className="font-medium">
                                Amount: {draft.proposal.currency ?? "INR"} {Number(draft.proposal.offerAmount).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {draft.reasoning && (
                            <p className="text-xs text-muted-foreground">{draft.reasoning}</p>
                          )}
                          {draft.proposal?.notes && (
                            <p className="text-xs italic">{draft.proposal.notes}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approve.mutate(draft.id)}
                              disabled={approve.isPending}
                            >
                              <Check className="h-3 w-3 mr-1" /> Approve & Send
                            </Button>
                            <Button size="sm" variant="ghost">
                              <X className="h-3 w-3 mr-1" /> Dismiss
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {status.data?.pendingDrafts?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No pending proposals. The AI is analyzing the negotiation...
                  </p>
                )}

                {status.data?.lastActivityAt && (
                  <p className="text-xs text-muted-foreground">
                    Last activity: {new Date(status.data.lastActivityAt).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateTargets}
                    disabled={setTargetsMutation.isPending}
                  >
                    Update Targets
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => stop.mutate()}
                    disabled={stop.isPending}
                  >
                    Stop Assistant
                  </Button>
                </div>

                {status.data?.sessionId && (
                  <AgentFeedback sessionId={status.data.sessionId} />
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
