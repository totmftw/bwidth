import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Eye, FileText, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContractViewer } from "@/components/booking/ContractViewer";
import { format } from "date-fns";

export default function AdminContracts() {
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

    // For now, we only have the 'pending' endpoint. 
    // Ideally we'd have a general search/filter endpoint for all contracts.
    const { data: pendingContracts, isLoading } = useQuery({
        queryKey: ["/admin/contracts/pending"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/admin/contracts/pending");
            if (!res.ok) throw new Error("Failed to fetch contracts");
            return await res.json();
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Contract Review</h1>
                <p className="text-muted-foreground">Review and approve contracts before bookings are confirmed.</p>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Booking Ref</TableHead>
                            <TableHead>Parties</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted</TableHead>
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
                        ) : pendingContracts?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No pending contracts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pendingContracts?.map((contract: any) => (
                                <TableRow key={contract.id}>
                                    <TableCell className="font-mono text-xs">{contract.id}</TableCell>
                                    <TableCell>#{contract.bookingId}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="font-medium">Artist ID: {contract.artistId}</span>
                                            <span className="text-muted-foreground">Promoter ID: {contract.promoterId}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                            {contract.status.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {contract.updatedAt ? format(new Date(contract.updatedAt), 'MMM d, HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => setSelectedBookingId(contract.bookingId)}>
                                            <Eye className="w-4 h-4 mr-2" /> Review
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedBookingId} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Contract Review</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        {selectedBookingId && (
                            <ContractViewer
                                bookingId={selectedBookingId}
                                onClose={() => setSelectedBookingId(null)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
