import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, CheckCircle, X, ChevronRight, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DynamicActionPanelProps {
    conversationId: number;
    workflowInstance: any; // Type from schema
    booking: any;
    userId: number;
    onActionComplete: () => void;
}

export function DynamicActionPanel({ conversationId, workflowInstance, booking, userId, onActionComplete }: DynamicActionPanelProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [offerAmount, setOfferAmount] = useState<string>(booking.offerAmount);

    const { mutate: performAction, isPending } = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", `/api/conversations/${conversationId}/actions`, data);
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/bookings/${booking.id}`] }); // Refresh booking too
            setActiveAction(null);
            setNote("");
            onActionComplete();
            toast({ title: "Action completed" });
        },
        onError: (error: any) => {
            toast({
                title: "Action failed",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleAction = (actionKey: string, inputs: any = {}) => {
        performAction({
            actionKey,
            clientMsgId: crypto.randomUUID(),
            inputs: { ...inputs, note }
        });
    };

    const isMyTurn = workflowInstance.awaitingUserId === userId;
    const isLocked = workflowInstance.locked || workflowInstance.round >= workflowInstance.maxRounds;
    const currentNode = workflowInstance.currentNodeKey;

    if (!isMyTurn) {
        return (
            <div className="p-4 bg-muted/30 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle className="w-5 h-5 text-muted-foreground/50" />
                Waiting for the other party to respond...
            </div>
        );
    }

    // Define actions based on state (simplified for negotiation)
    // Ideally this config comes from backend or state mapping
    const availableActions = [];

    if (['AWAITING_ARTIST', 'AWAITING_ORGANIZER', 'WAITING_FIRST_MOVE'].includes(currentNode)) {
        availableActions.push({ key: 'ACCEPT', label: 'Accept Offer', variant: 'default', color: 'bg-green-600 hover:bg-green-700' });

        if (!isLocked) {
            availableActions.push({ key: 'PROPOSE_CHANGE', label: 'Counter Offer', variant: 'outline', icon: DollarSign });
        }

        availableActions.push({ key: 'DECLINE', label: 'Decline', variant: 'destructive' });
        // availableActions.push({ key: 'ASK_PRESET', label: 'Ask Question', variant: 'ghost', icon: MessageSquare });
    }

    // Render Active Form (if selected)
    if (activeAction === 'PROPOSE_CHANGE') {
        return (
            <div className="p-4 space-y-3 bg-muted/20 animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm">Propose New Terms</h4>
                    <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)}><X className="w-4 h-4" /></Button>
                </div>

                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <Input
                        type="number"
                        value={offerAmount}
                        onChange={e => setOfferAmount(e.target.value)}
                        placeholder="New Amount"
                        className="flex-1"
                    />
                    <span className="text-sm font-semibold">{booking.offerCurrency}</span>
                </div>

                <Textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note explaining your proposal..."
                    className="text-sm resize-none"
                    rows={2}
                />

                <Button
                    className="w-full"
                    onClick={() => handleAction('PROPOSE_CHANGE', { offerAmount: Number(offerAmount) })}
                    disabled={isPending}
                >
                    {isPending ? 'Sending...' : 'Send Counter Offer'}
                </Button>
            </div>
        );
    }

    if (activeAction === 'DECLINE') {
        return (
            <div className="p-4 space-y-3 bg-red-500/10 animate-in slide-in-from-bottom">
                <p className="text-sm font-medium text-red-500">Are you sure you want to decline this booking?</p>
                <Textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Optional reason..."
                    className="text-sm resize-none bg-background"
                    rows={2}
                />
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setActiveAction(null)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleAction('DECLINE')} disabled={isPending}>
                        Confirm Decline
                    </Button>
                </div>
            </div>
        )
    }

    // Default List of Buttons
    return (
        <div className="p-4 grid grid-cols-1 gap-2">
            <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Available Actions</div>
            {availableActions.map((action: any) => (
                <Button
                    key={action.key}
                    variant={action.variant as any}
                    className={`justify-start ${action.color || ''}`}
                    onClick={() => {
                        if (['PROPOSE_CHANGE', 'DECLINE', 'ASK_PRESET'].includes(action.key)) {
                            setActiveAction(action.key);
                        } else {
                            handleAction(action.key);
                        }
                    }}
                    disabled={isPending}
                >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </Button>
            ))}
        </div>
    );
}
