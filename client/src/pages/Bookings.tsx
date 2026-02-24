import { useBookings, useUpdateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Bookings() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useBookings();
  const updateMutation = useUpdateBooking();

  if (!user) return null;
  const isArtist = user.role === "artist";

  const handleStatusUpdate = (id: number, status: 'confirmed' | 'cancelled') => {
    updateMutation.mutate({ id, status });
  };

  const isPending = (status: string | null) => ['inquiry', 'offered', 'negotiating'].includes(status || '');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Bookings</h1>
        <p className="text-muted-foreground">Manage your gigs and contracts</p>
      </div>

      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Event Info</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Offer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.map((booking) => (
                  <TableRow key={booking.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div className="font-medium">
                        {isArtist ? booking.organizer.organizationName || booking.organizer.user.displayName : booking.artist.user.displayName || booking.artist.user.username}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {booking.notes || "No notes"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(booking.eventDate), "MMM d, yyyy")}</span>
                        <span className="text-xs text-muted-foreground">{booking.slotTime || 'TBD'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status || 'inquiry'} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${booking.offerAmount}
                    </TableCell>
                    <TableCell className="text-right">
                      {isArtist && isPending(booking.status) && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                            disabled={updateMutation.isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-500 text-white"
                            onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {(!isArtist || !isPending(booking.status)) && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-8">
                          Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    inquiry: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    offered: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    negotiating: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
    completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    scheduled: "bg-green-500/10 text-green-500 border-green-500/20",
    paid_deposit: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  const label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  const style = styles[status] || styles.inquiry;

  return (
    <Badge variant="outline" className={`${style} font-medium`}>
      {['inquiry', 'offered', 'negotiating'].includes(status) && <Clock className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}
