import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminConversations() {
    const [selectedConversation, setSelectedConversation] = useState<any>(null);

    const { data: conversations, isLoading } = useQuery({
        queryKey: ["/admin/conversations"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/admin/conversations");
            if (!res.ok) throw new Error("Failed to fetch conversations");
            return await res.json();
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chat Oversight</h1>
                    <p className="text-muted-foreground">Monitor platform conversations and messages.</p>
                </div>
                {/* Could add search filter later */}
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Participants</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Last Message</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : conversations?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No conversations found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            conversations?.map((convo: any) => (
                                <TableRow key={convo.id}>
                                    <TableCell className="font-mono text-xs">{convo.id}</TableCell>
                                    <TableCell className="font-medium">{convo.subject}</TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={convo.participantNames}>
                                        {convo.participantNames}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{convo.conversationType}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {convo.lastMessageAt ? format(new Date(convo.lastMessageAt), 'MMM d, HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(convo)}>
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConversationDialog
                conversation={selectedConversation}
                open={!!selectedConversation}
                onOpenChange={(open) => !open && setSelectedConversation(null)}
            />
        </div>
    );
}

function ConversationDialog({ conversation, open, onOpenChange }: { conversation: any, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data: messages, isLoading } = useQuery({
        queryKey: ["/admin/conversations", conversation?.id, "messages"],
        queryFn: async () => {
            if (!conversation?.id) return [];
            const res = await apiRequest("GET", `/admin/conversations/${conversation.id}/messages`);
            if (!res.ok) throw new Error("Failed to fetch messages");
            return await res.json();
        },
        enabled: !!conversation?.id && open
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{conversation?.subject}</DialogTitle>
                    <DialogDescription>
                        Participants: {conversation?.participantNames}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-4 border rounded-md">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                    ) : messages?.length === 0 ? (
                        <div className="text-center text-muted-foreground p-4">No messages found.</div>
                    ) : (
                        <div className="space-y-4">
                            {messages?.map((msg: any) => (
                                <div key={msg.id} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-sm">
                                            {msg.sender?.displayName || msg.sender?.username || `User ${msg.senderId}`}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(msg.createdAt), 'MMM d, HH:mm')}
                                        </span>
                                    </div>
                                    <div className="bg-muted/50 p-2 rounded-md text-sm whitespace-pre-wrap">
                                        {msg.body}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
