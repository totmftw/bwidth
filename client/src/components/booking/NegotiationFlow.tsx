import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { api, type NegotiationSummaryResponse, type ProposalSubmitInput, type RiderConfirmationInput } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCheck, X, ThumbsUp, ArrowLeftRight, Loader2, Info, Check, LogOut, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NegotiationFlowProps {
  booking: any;
  onClose: () => void;
  onStartContract?: () => void;
}

export function NegotiationFlow({ booking, onClose, onStartContract }: NegotiationFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"view" | "propose" | "rider">("view");

  // Profile completion check
  const profileStatusEndpoint =
    user?.role === "artist" ? "/api/artists/profile/status" :
    (user?.role === "organizer" || user?.role === "promoter") ? "/api/organizer/profile/status" :
    (user?.role === "venue_manager" || user?.role === "venue") ? "/api/venues/profile/status" :
    null;

  const { data: profileStatus } = useQuery({
    queryKey: [profileStatusEndpoint],
    queryFn: async () => {
      const res = await fetch(profileStatusEndpoint!, { credentials: "include" });
      if (!res.ok) return { isComplete: true };
      return res.json();
    },
    enabled: !!profileStatusEndpoint && !!user,
    staleTime: 60000,
  });

  const isProfileComplete = profileStatus?.isComplete ?? true;

  const { data: summary, isLoading, refetch } = useQuery<NegotiationSummaryResponse>({
    queryKey: [api.bookings.negotiationSummary.path.replace(":id", booking.id.toString())],
    queryFn: async () => {
      const res = await apiRequest(
        api.bookings.negotiationSummary.method,
        api.bookings.negotiationSummary.path.replace(":id", booking.id.toString())
      );
      return res.json();
    },
    refetchInterval: 5000,
  });

  const proposeMutation = useMutation({
    mutationFn: async (payload: ProposalSubmitInput) => {
      const res = await apiRequest(
        api.bookings.submitProposal.method,
        api.bookings.submitProposal.path.replace(":id", booking.id.toString()),
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Proposal sent" });
      setMode("view");
      refetch();
    },
  });

  const confirmRiderMutation = useMutation({
    mutationFn: async (payload: RiderConfirmationInput) => {
      const res = await apiRequest(
        api.bookings.confirmRider.method,
        api.bookings.confirmRider.path.replace(":id", booking.id.toString()),
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rider confirmed" });
      setMode("view");
      refetch();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        api.bookings.finalAccept.method,
        api.bookings.finalAccept.path.replace(":id", booking.id.toString()),
        { proposalVersion: summary?.round }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Accepted proposal" });
      refetch();
    },
  });

  const walkAwayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        api.bookings.walkAway.method,
        api.bookings.walkAway.path.replace(":id", booking.id.toString()),
        { reason: "User walked away" }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Walked away" });
      onClose();
    },
  });

  const isArtist = user?.id === summary?.booking?.artistId;
  const isAgreed = summary?.status === "agreed";
  const isWalkedAway = summary?.status === "walked_away";

  // Deadline calculation
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!summary?.booking?.flowDeadlineAt || isAgreed || isWalkedAway) return;

    const deadline = new Date(summary.booking.flowDeadlineAt);
    
    const updateTime = () => {
      const now = new Date();
      if (now > deadline) {
        setIsExpired(true);
        setTimeLeft("Expired");
        return;
      }
      
      const hours = differenceInHours(deadline, now);
      const minutes = differenceInMinutes(deadline, now) % 60;
      setTimeLeft(`${hours}h ${minutes}m remaining`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [summary?.booking?.flowDeadlineAt, isAgreed, isWalkedAway]);

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading negotiation workspace...</p>
      </div>
    );
  }

  if (!isProfileComplete) {
    const setupPath =
      user?.role === "artist" ? "/profile/setup" :
      (user?.role === "organizer" || user?.role === "promoter") ? "/organizer/setup" :
      "/venue/setup";
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Profile Required</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Complete your profile to participate in negotiations. You can still view bookings and apply to gigs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation(setupPath)}>Complete Profile</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  // My acceptance state
  const myAcceptedVersion = isArtist ? summary.acceptance.artistAcceptedVersion : summary.acceptance.organizerAcceptedVersion;
  const iHaveAccepted = myAcceptedVersion === summary.round;
  const otherHasAccepted = isArtist 
    ? summary.acceptance.organizerAcceptedVersion === summary.round 
    : summary.acceptance.artistAcceptedVersion === summary.round;

  const canAccept = !isAgreed && !isWalkedAway && !isExpired && !iHaveAccepted && summary.riderConfirmation.isConfirmed;

  return (
    <div className="flex flex-col h-[80vh] bg-background">
      <div className="flex justify-between items-center px-4 py-3 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Negotiation Workspace</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">Round {summary.round}</Badge>
            <Badge variant={isAgreed ? "default" : isWalkedAway ? "destructive" : "secondary"}>
              {summary.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
            {!isAgreed && !isWalkedAway && summary.booking.flowDeadlineAt && (
              <Badge variant={isExpired ? "destructive" : "outline"} className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLeft || "Calculating..."}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left: Terms Board */}
        <ScrollArea className="flex-1 border-b lg:border-b-0 lg:border-r p-4 lg:p-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Current Terms Board</h3>
          
          {summary.currentProposal?.snapshot ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Financial</Label>
                <div className="p-3 bg-muted/40 rounded-md font-mono text-lg">
                  {summary.currentProposal.snapshot.financial?.currency || 'INR'} {summary.currentProposal.snapshot.financial?.offerAmount?.toLocaleString() || '0'}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Schedule</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm">
                  {summary.currentProposal.snapshot.schedule?.startsAt ? format(new Date(summary.currentProposal.snapshot.schedule.startsAt), "PPp") : "TBD"}
                  {" - "}
                  {summary.currentProposal.snapshot.schedule?.endsAt ? format(new Date(summary.currentProposal.snapshot.schedule.endsAt), "PPp") : "TBD"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tech Rider Requirements</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1">
                  {summary.currentProposal.snapshot.techRider?.artistRequirements?.length ? (
                    summary.currentProposal.snapshot.techRider.artistRequirements.map((req, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span>{req.quantity}x {req.item}</span>
                        <Badge variant={req.status === "confirmed" ? "default" : "secondary"}>{req.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
                {!summary.riderConfirmation.isConfirmed && !isArtist && !isAgreed && !isWalkedAway && (
                  <p className="text-xs text-amber-500 mt-1">⚠️ You must confirm rider items before final acceptance.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Artist Brings</Label>
                <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1">
                  {summary.currentProposal.snapshot.techRider?.artistBrings?.length ? (
                    summary.currentProposal.snapshot.techRider.artistBrings.map((req, i) => (
                      <div key={i}>
                        {req.quantity}x {req.item}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-md">
               No proposal snapshot available yet.
             </div>
          )}
        </ScrollArea>

        {/* Right: Activity & Actions */}
        <div className="w-full lg:w-96 flex flex-col bg-muted/10 shrink-0">
          <ScrollArea className="flex-1 p-4 lg:p-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Activity</h3>
            <div className="space-y-4">
              {summary.activity.map((act) => (
                <div key={act.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold capitalize text-xs">{act.actorRole || 'System'}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(act.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <div className="bg-background border rounded-md p-2 text-xs">
                    {act.type.replace(/_/g, " ")}
                    {act.metadata && typeof act.metadata.note === "string" && (
                      <div className="mt-1 italic opacity-80">"{act.metadata.note}"</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator />

          <div className="p-4 lg:p-6 space-y-2 shrink-0 bg-background border-t">
            {mode === "view" && !isAgreed && !isWalkedAway && (
              <>
                {otherHasAccepted && !iHaveAccepted && (
                  <div className="bg-green-500/10 text-green-600 p-2 rounded text-xs mb-2 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4" />
                    Other party accepted this version!
                  </div>
                )}
                {iHaveAccepted && !otherHasAccepted && (
                  <div className="bg-blue-500/10 text-blue-600 p-2 rounded text-xs mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Waiting for other party to accept...
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={() => acceptMutation.mutate()} 
                  disabled={!canAccept || acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  {iHaveAccepted ? "Accepted" : "Accept Final Terms"}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setMode("propose")}
                  disabled={iHaveAccepted || isExpired} // Cannot propose if already accepted this round
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  {summary.round === 0 ? 'Submit Initial Proposal' : 'Propose Changes'}
                </Button>

                {!isArtist && !summary.riderConfirmation.isConfirmed && (
                  <Button 
                    variant="outline" 
                    className="w-full text-amber-500 hover:text-amber-600" 
                    onClick={() => setMode("rider")}
                    disabled={isExpired}
                  >
                    Confirm Rider
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => walkAwayMutation.mutate()}
                  disabled={walkAwayMutation.isPending || isExpired}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Walk Away
                </Button>
              </>
            )}

            {isAgreed && onStartContract && (
              <Button className="w-full" onClick={onStartContract}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Proceed to Contract
              </Button>
            )}

            {mode === "propose" && (
              <ProposeForm 
                currentSnapshot={summary.currentProposal?.snapshot} 
                onCancel={() => setMode("view")}
                onSubmit={(payload: any) => proposeMutation.mutate(payload)}
                isPending={proposeMutation.isPending}
              />
            )}

            {mode === "rider" && (
              <RiderConfirmForm 
                currentSnapshot={summary.currentProposal?.snapshot} 
                onCancel={() => setMode("view")}
                onSubmit={(payload: any) => confirmRiderMutation.mutate(payload)}
                isPending={confirmRiderMutation.isPending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposeForm({ currentSnapshot, onCancel, onSubmit, isPending }: any) {
  const defaultAmount = currentSnapshot?.financial?.offerAmount?.toString() || "0";
  const defaultCurrency = currentSnapshot?.financial?.currency || "INR";
  
  const [amount, setAmount] = useState(defaultAmount);
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">New Offer Amount ({defaultCurrency})</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Note</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} className="h-16 text-sm" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button className="flex-1" disabled={isPending} onClick={() => {
          onSubmit({
            baseVersion: currentSnapshot?.version || 1,
            snapshot: {
              ...(currentSnapshot || {}),
              financial: {
                ...(currentSnapshot?.financial || {}),
                currency: defaultCurrency,
                offerAmount: Number(amount)
              }
            },
            note
          });
        }}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function RiderConfirmForm({ currentSnapshot, onCancel, onSubmit, isPending }: any) {
  const [note, setNote] = useState("");

  // Create a simplified confirmation flow where all pending items are marked as confirmed
  // Real implementation would let user select status per item.
  return (
    <div className="space-y-3 p-3 bg-amber-500/10 rounded-md border border-amber-500/20">
      <h4 className="text-sm font-semibold text-amber-700">Confirm Tech Rider</h4>
      <p className="text-xs text-muted-foreground">
        By clicking confirm, you agree to provide all requested technical rider items.
      </p>
      
      <div className="space-y-1">
        <Label className="text-xs">Note (Optional)</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} className="h-16 text-sm" />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" disabled={isPending} onClick={() => {
          onSubmit({
            proposalVersion: currentSnapshot?.version || 1,
            artistRequirements: (currentSnapshot?.techRider?.artistRequirements || []).map((req: any) => ({
              ...req,
              status: "confirmed"
            })),
            organizerCommitments: [],
            note
          });
        }}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm All"}
        </Button>
      </div>
    </div>
  );
}
