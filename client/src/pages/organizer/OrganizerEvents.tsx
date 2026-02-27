import { useState } from "react";
import { useOrganizerEvents, usePublishEvent, useDeleteEvent } from "@/hooks/use-organizer-events";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash2,
  Send,
  Plus,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EventStatus = "draft" | "published" | "completed" | "cancelled";

export default function OrganizerEvents() {
  const { data: allEvents, isLoading } = useOrganizerEvents();
  const publishEvent = usePublishEvent();
  const deleteEvent = useDeleteEvent();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  // Group events by status
  const groupedEvents = {
    draft: allEvents?.filter((e) => e.status === "draft") || [],
    published: allEvents?.filter((e) => e.status === "published") || [],
    completed: allEvents?.filter((e) => e.status === "completed") || [],
    cancelled: allEvents?.filter((e) => e.status === "cancelled") || [],
  };

  const handlePublish = (eventId: number) => {
    publishEvent.mutate(eventId);
  };

  const handleDeleteClick = (eventId: number) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      deleteEvent.mutate(eventToDelete);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            My Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your events and bookings
          </p>
        </div>
        <Link href="/organizer/events/create">
          <Button className="bg-primary gap-2">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </Link>
      </motion.div>

      {/* Event Groups */}
      <div className="space-y-8">
        {/* Draft Events */}
        <EventGroup
          title="Draft Events"
          description="Events not yet published"
          events={groupedEvents.draft}
          status="draft"
          onPublish={handlePublish}
          onDelete={handleDeleteClick}
          emptyMessage="No draft events"
        />

        {/* Published Events */}
        <EventGroup
          title="Published Events"
          description="Live events visible to artists"
          events={groupedEvents.published}
          status="published"
          onDelete={handleDeleteClick}
          emptyMessage="No published events"
        />

        {/* Completed Events */}
        <EventGroup
          title="Completed Events"
          description="Past events that have finished"
          events={groupedEvents.completed}
          status="completed"
          emptyMessage="No completed events"
        />

        {/* Cancelled Events */}
        <EventGroup
          title="Cancelled Events"
          description="Events that were cancelled"
          events={groupedEvents.cancelled}
          status="cancelled"
          emptyMessage="No cancelled events"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
              Events with active bookings cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface EventGroupProps {
  title: string;
  description: string;
  events: any[];
  status: EventStatus;
  onPublish?: (id: number) => void;
  onDelete?: (id: number) => void;
  emptyMessage: string;
}

function EventGroup({
  title,
  description,
  events,
  status,
  onPublish,
  onDelete,
  emptyMessage,
}: EventGroupProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline" className="ml-2">
            {events.length}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              status={status}
              index={index}
              onPublish={onPublish}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface EventCardProps {
  event: any;
  status: EventStatus;
  index: number;
  onPublish?: (id: number) => void;
  onDelete?: (id: number) => void;
}

function EventCard({ event, status, index, onPublish, onDelete }: EventCardProps) {
  const statusColors = {
    draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    published: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  // Mock booking count - in real implementation, this would come from the API
  const bookingCount: number = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-white/5 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Date Badge */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10 shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {format(new Date(event.startTime), "MMM")}
          </span>
          <span className="text-xl font-bold">
            {format(new Date(event.startTime), "dd")}
          </span>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
              {event.title}
            </h3>
            <Badge variant="outline" className={statusColors[status]}>
              {status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(event.startTime), "h:mm a")}
            </span>
            {event.venueId && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Venue #{event.venueId}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {bookingCount} {bookingCount === 1 ? "booking" : "bookings"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Edit button for draft and published events */}
          {(status === "draft" || status === "published") && (
            <Link href={`/organizer/events/${event.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
          )}

          {/* Publish button for draft events only */}
          {status === "draft" && onPublish && (
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-blue-500 hover:bg-blue-600"
              onClick={() => onPublish(event.id)}
            >
              <Send className="w-4 h-4" />
              Publish
            </Button>
          )}

          {/* Delete button (only if no active bookings) */}
          {onDelete && bookingCount === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}

          {/* View Details Arrow */}
          <Link href={`/organizer/events/${event.id}`}>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
