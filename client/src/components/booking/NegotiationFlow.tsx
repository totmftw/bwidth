import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, X, CheckCircle, Ban, History } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { OfferComparison } from "./OfferComparison";
import { CounterOfferForm } from "./CounterOfferForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface NegotiationFlowProps {
    booking: any;
    onClose: () => void;
}

export function NegotiationFlow({ booking, onClose }: NegotiationFlowProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<"view" | "counter">("view");
    const [conversationId, setConversationId] = useState<number | null>(null);

    // 1. Open/Retrieve Conversation
    const { mutate: openConversation } = useMutation({
        mutationFn: async () => {
            const res = await apiRequest(
                "POST",
                `/api/entities/booking/${booking.id}/conversation/negotiation/open`
            );
            return await res.json();
        },
        onSuccess: (data) => {
            setConversationId(data.id);
        }
    });

    useEffect(() => {
        openConversation();
    }, [booking.id]);

    // 2. Fetch Conversation Details
    const { data: conversation } = useQuery<any>({
        queryKey: [`/api/conversations/${conversationId}`],
        enabled: !!conversationId,
    });

    // 3. Fetch Messages
    const { data: messages = [] } = useQuery<any[]>({
        queryKey: [`/api/conversations/${conversationId}/messages`],
        enabled: !!conversationId,
        refetchInterval: 5000
    });

    const workflowInstance = conversation?.workflowInstance || {};
    const round = workflowInstance.round || 0;
    const MAX_ROUNDS = workflowInstance.maxRounds || 3;
    const isLocked = workflowInstance.locked || round >= MAX_ROUNDS;
    const isMyTurn = workflowInstance.awaitingUserId === user?.id;

    // --- Mutations ---
    const { mutate: performAction, isPending } = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", `/api/conversations/${conversationId}/actions`, data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}`] });
            setMode("view");
        },
    });

    const handleAction = (actionKey: string, inputs: any = {}) => {
        performAction({
            actionKey,
            clientMsgId: crypto.randomUUID(),
            inputs
        });
    };

    const handleCounter = (data: { offerAmount: number; slotTime?: string; message: string }) => {
        handleAction('PROPOSE_CHANGE', {
            offerAmount: data.offerAmount,
            note: data.message
        });
    };

    const isTerminal = ['confirmed', 'cancelled', 'declined', 'completed'].includes(booking.status);

    const currentOffer = {
        offerAmount: booking.offerAmount,
        currency: booking.offerCurrency,
        eventDate: booking.eventDate,
        slotTime: booking.meta?.slotTime,
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-card border rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        Negotiation with {user?.role === 'artist'
                            ? (booking.organizer?.organizationName || "Organizer")
                            : (booking.artist?.user?.name || booking.artist?.stageName || "Artist")}
                        {isTerminal && <Badge variant={booking.status === 'confirmed' ? 'default' : 'destructive'}>{booking.status}</Badge>}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline">Round {round}/{MAX_ROUNDS}</Badge>
                        <span>•</span>
                        <span>Started {format(new Date(booking.createdAt), "MMM d")}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>

            {/* Main Content Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {/* 1. History Timeline */}
                    <div className="space-y-4">
                        {messages.map((msg: any, i: number) => {
                            if (msg.messageType === 'system') return null; // Or render differently

                            const isMe = msg.senderId === user?.id;
                            const payload = msg.payload || {};
                            const actionName = msg.actionKey || msg.messageType;

                            return (
                                <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        <History className="w-4 h-4" />
                                    </div>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${isMe ? 'bg-primary/10 border border-primary/20' : 'bg-muted border'}`}>
                                        <div className="font-semibold mb-1 flex justify-between gap-4">
                                            <span>{actionName.toUpperCase().replace('_', ' ')}</span>
                                            <span className="text-xs font-normal opacity-70">
                                                {msg.createdAt && format(new Date(msg.createdAt), "p")}
                                            </span>
                                        </div>
                                        {payload.offerAmount && (
                                            <div className="mb-2 font-mono bg-background/50 p-1 rounded px-2">
                                                {booking.offerCurrency} {Number(payload.offerAmount).toLocaleString()}
                                            </div>
                                        )}
                                        {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                                        {payload.note && <p className="whitespace-pre-wrap italic mt-1">"{payload.note}"</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <Separator />

                    {/* 2. Active State UI */}
                    {!isTerminal && conversationId && (
                        <div className="bg-accent/50 p-4 rounded-xl border border-accent">
                            {isMyTurn ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-medium">
                                        <CheckCircle className="w-5 h-5" />
                                        Your Turn to Respond
                                    </div>

                                    {/* Only show comparison if we have a last offer? Simplified for now */}
                                    <OfferComparison
                                        currentOffer={currentOffer}
                                        newOffer={currentOffer}
                                        userRole={user?.role as any}
                                    />

                                    {/* Action Buttons */}
                                    {mode === 'view' && (
                                        <div className="flex gap-3 pt-2">
                                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction('ACCEPT')} disabled={isPending}>
                                                Accept Offer
                                            </Button>

                                            {!isLocked && (
                                                <Button className="flex-1" variant="outline" onClick={() => setMode('counter')} disabled={isPending}>
                                                    Counter Offer
                                                </Button>
                                            )}

                                            <Button className="flex-1" variant="destructive" onClick={() => handleAction('DECLINE')} disabled={isPending}>
                                                Decline
                                            </Button>
                                        </div>
                                    )}

                                    {/* Max Round Warning */}
                                    {isLocked && mode === 'view' && (
                                        <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-2 rounded">
                                            <Ban className="w-4 h-4" />
                                            Max negotiation rounds reached. You must Accept or Decline.
                                        </div>
                                    )}

                                    {/* Counter Form */}
                                    {mode === 'counter' && (
                                        <CounterOfferForm
                                            currentAmount={Number(booking.offerAmount)}
                                            currency={booking.offerCurrency}
                                            currentSlot={booking.meta?.slotTime}
                                            onSubmit={handleCounter}
                                            onCancel={() => setMode('view')}
                                            isPending={isPending}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p>Waiting for response...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
