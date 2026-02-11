import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, History } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { DynamicActionPanel } from "./DynamicActionPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NegotiationChatProps {
    booking: any;
    onClose: () => void;
}

export function NegotiationChat({ booking, onClose }: NegotiationChatProps) {
    const { user } = useAuth();
    const [conversationId, setConversationId] = useState<number | null>(null);

    // 1. Open/Retrieve Conversation
    const { mutate: openConversation, isPending: isOpening } = useMutation({
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

    // 2. Fetch Conversation Details (Workflow State)
    const { data: conversation } = useQuery<any>({
        queryKey: [`/api/conversations/${conversationId}`],
        enabled: !!conversationId,
    });

    // 3. Fetch Messages
    const { data: messages = [], isLoading: isLoadingMessages } = useQuery<any[]>({
        queryKey: [`/api/conversations/${conversationId}/messages`],
        enabled: !!conversationId,
        refetchInterval: 5000 // Poll for updates
    });

    const isLoading = isOpening || isLoadingMessages;

    // Helper to render message content
    const renderMessageContent = (msg: any) => {
        if (msg.messageType === 'system') {
            return (
                <div className="text-center text-xs text-muted-foreground my-2 italic">
                    {msg.body}
                </div>
            );
        }

        const isMe = msg.senderId === user?.id;
        // Parse payload if action
        const payload = msg.payload || {};

        return (
            <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg max-w-[85%] text-sm ${isMe ? 'bg-primary/20 text-primary-foreground/90' : 'bg-muted/50'}`}>
                    {/* Header: Action Type */}
                    {msg.messageType === 'action' && (
                        <div className="font-semibold text-xs opacity-70 mb-1">
                            {msg.actionKey?.replace('_', ' ')}
                        </div>
                    )}

                    {/* Content */}
                    {msg.body && <p>{msg.body}</p>}

                    {/* Structured Content based on Action */}
                    {msg.actionKey === 'PROPOSE_CHANGE' && payload.offerAmount && (
                        <div className="mt-1 font-mono text-green-400">
                            Proposed: {booking.offerCurrency} {Number(payload.offerAmount).toLocaleString()}
                        </div>
                    )}

                    {/* Note/Message in payload */}
                    {payload.note && (
                        <p className="mt-2 text-xs italic border-t border-white/10 pt-1">"{payload.note}"</p>
                    )}

                    {/* Timestamp */}
                    <p className="text-[10px] opacity-50 mt-1 text-right">
                        {msg.createdAt ? format(new Date(msg.createdAt), "p") : ""}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[600px] w-full bg-card border rounded-lg shadow-xl overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center bg-muted/20">
                <div>
                    <h3 className="font-semibold text-sm">Negotiation</h3>
                    <p className="text-xs text-muted-foreground">
                        {booking.organizer?.organizationName || "Organizer"} • {booking.offerCurrency} {Number(booking.offerAmount).toLocaleString()}
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-background/50">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                Check-in to start negotiation.
                            </div>
                        )}
                        {messages.map((msg: any) => (
                            <div key={msg.id || msg.clientMsgId}>
                                {renderMessageContent(msg)}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="border-t bg-card">
                {conversation?.workflowInstance && (
                    <DynamicActionPanel
                        conversationId={conversationId!}
                        workflowInstance={conversation.workflowInstance}
                        booking={booking}
                        userId={user!.id}
                        onActionComplete={() => {
                            // Queries invalidate automatically in the component
                        }}
                    />
                )}
            </div>
        </div>
    );
}
