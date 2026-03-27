import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useOrganizerEvent, useUpdateEvent } from "@/hooks/use-organizer-events";
import { useVenues } from "@/hooks/use-venues";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { EventForm, EventFormValues } from "@/components/EventForm";
import { format } from "date-fns";

export default function OrganizerEventEdit() {
  const [, params] = useRoute("/organizer/events/:id/edit");
  const eventId = params?.id ? parseInt(params.id, 10) : null;
  const [location, setLocation] = useLocation();

  const { data: event, isLoading: eventLoading } = useOrganizerEvent(eventId!);
  const updateMutation = useUpdateEvent();
  const { data: venues, isLoading: venuesLoading } = useVenues();

  if (eventLoading || !event) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onSubmit = (data: EventFormValues) => {
    // Convert separate date and time to ISO 8601
    const startDateFormatted = format(data.startDate, 'yyyy-MM-dd');
    const startDateTime = new Date(`${startDateFormatted}T${data.startTimeStr}`).toISOString();
    
    let endDateTime = undefined;
    if (data.endDate && data.endTimeStr) {
      const endDateFormatted = format(data.endDate, 'yyyy-MM-dd');
      endDateTime = new Date(`${endDateFormatted}T${data.endTimeStr}`).toISOString();
    }

    const payload = {
      title: data.title,
      description: data.description,
      startTime: startDateTime,
      endTime: endDateTime,
      venueId: data.isCustomVenue ? undefined : data.venueId,
      temporaryVenue: data.isCustomVenue ? data.temporaryVenue : undefined,
      capacityTotal: data.capacityTotal,
      currency: data.currency,
      visibility: data.visibility,
      stages: data.stages?.map(stage => {
        let st = undefined;
        let et = undefined;
        if (stage.startDate && stage.startTimeStr) {
          st = new Date(`${format(stage.startDate, 'yyyy-MM-dd')}T${stage.startTimeStr}`).toISOString();
        }
        if (stage.endDate && stage.endTimeStr) {
          et = new Date(`${format(stage.endDate, 'yyyy-MM-dd')}T${stage.endTimeStr}`).toISOString();
        }
        return {
          ...stage,
          startTime: st,
          endTime: et,
        };
      }),
    };

    updateMutation.mutate({ id: eventId!, data: payload as any }, {
      onSuccess: () => {
        setLocation("/organizer/events");
      },
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/organizer/events")}
          className="rounded-full bg-white/5 hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Edit Event
          </h1>
          <p className="text-muted-foreground mt-1">
            Update the details for "{event.title}"
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <EventForm 
          mode="edit"
          initialData={event}
          venues={venues || []}
          venuesLoading={venuesLoading}
          onSubmit={onSubmit}
          onCancel={() => setLocation("/organizer/events")}
          isSubmitting={updateMutation.isPending}
        />
      </motion.div>
    </div>
  );
}
