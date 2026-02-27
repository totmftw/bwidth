import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createEventSchema } from "@shared/routes";
import { useCreateEvent } from "@/hooks/use-organizer-events";
import { useVenues } from "@/hooks/use-venues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Calendar, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function OrganizerEventCreate() {
  const [location, setLocation] = useLocation();
  const createMutation = useCreateEvent();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const [prefilledVenueId, setPrefilledVenueId] = useState<number | null>(null);

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      doorTime: "",
      venueId: undefined,
      capacityTotal: undefined,
      currency: "INR",
      visibility: "private",
      stages: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stages",
  });

  // Handle pre-filled venue from discovery page
  useEffect(() => {
    // Check URL query params
    const params = new URLSearchParams(window.location.search);
    const venueIdParam = params.get("venueId");
    
    // Check location state (from wouter navigation)
    const state = (window.history.state as any)?.usr;
    const venueIdFromState = state?.venueId;

    const venueId = venueIdParam ? parseInt(venueIdParam, 10) : venueIdFromState;
    
    if (venueId && !isNaN(venueId)) {
      setPrefilledVenueId(venueId);
      form.setValue("venueId", venueId);
    }
  }, [form]);

  const onSubmit = (data: CreateEventFormData) => {
    // Convert datetime-local format to ISO 8601
    const payload = {
      ...data,
      startTime: data.startTime ? new Date(data.startTime).toISOString() : "",
      endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
      doorTime: data.doorTime ? new Date(data.doorTime).toISOString() : undefined,
      stages: data.stages?.map(stage => ({
        ...stage,
        startTime: stage.startTime ? new Date(stage.startTime).toISOString() : undefined,
        endTime: stage.endTime ? new Date(stage.endTime).toISOString() : undefined,
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setLocation("/organizer/events");
      },
    });
  };

  const addStage = () => {
    append({
      name: "",
      startTime: undefined,
      endTime: undefined,
      capacity: undefined,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/organizer/events")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Create Event
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up a new event and invite artists
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Fill in the information about your event. Events start as drafts and can be published later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="e.g. Friday Night Techno"
                  className="bg-background/50"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Describe your event..."
                  rows={4}
                  className="bg-background/50 resize-none"
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Date & Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...form.register("startTime")}
                  className="bg-background/50"
                />
                {form.formState.errors.startTime && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Date & Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...form.register("endTime")}
                  className="bg-background/50"
                />
                {form.formState.errors.endTime && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="doorTime">Door Time</Label>
                <Input
                  id="doorTime"
                  type="datetime-local"
                  {...form.register("doorTime")}
                  className="bg-background/50"
                />
                {form.formState.errors.doorTime && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.doorTime.message}
                  </p>
                )}
              </div>
            </div>

            {/* Venue Selection */}
            <div className="space-y-2">
              <Label htmlFor="venueId">Venue</Label>
              {venuesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading venues...
                </div>
              ) : (
                <Select
                  value={form.watch("venueId")?.toString() || ""}
                  onValueChange={(value) => {
                    form.setValue("venueId", value ? parseInt(value, 10) : undefined);
                  }}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select a venue or leave blank for manual entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues?.map((venue: any) => (
                      <SelectItem key={venue.id} value={venue.id.toString()}>
                        {venue.name} - {venue.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {prefilledVenueId && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled from discovery page
                </p>
              )}
              {form.formState.errors.venueId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.venueId.message}
                </p>
              )}
            </div>

            {/* Capacity and Currency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacityTotal">Total Capacity</Label>
                <Input
                  id="capacityTotal"
                  type="number"
                  {...form.register("capacityTotal", { valueAsNumber: true })}
                  placeholder="e.g. 500"
                  className="bg-background/50"
                />
                {form.formState.errors.capacityTotal && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.capacityTotal.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={form.watch("currency")}
                  onValueChange={(value) => form.setValue("currency", value)}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.currency && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.currency.message}
                  </p>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={form.watch("visibility")}
                onValueChange={(value: "public" | "private") => form.setValue("visibility", value)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (Invite-only)</SelectItem>
                  <SelectItem value="public">Public (Visible to artists)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Public events appear in artist discovery feed
              </p>
              {form.formState.errors.visibility && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.visibility.message}
                </p>
              )}
            </div>

            {/* Stages Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Stages (Optional)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add multiple stages for complex event setups
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStage}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Stage
                </Button>
              </div>

              {fields.length > 0 && (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="bg-background/30 border-white/5">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">
                              Stage {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`stages.${index}.name`}>Stage Name *</Label>
                            <Input
                              {...form.register(`stages.${index}.name`)}
                              placeholder="e.g. Main Stage, Terrace"
                              className="bg-background/50"
                            />
                            {form.formState.errors.stages?.[index]?.name && (
                              <p className="text-xs text-destructive">
                                {form.formState.errors.stages[index]?.name?.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`stages.${index}.startTime`}>Start Time</Label>
                              <Input
                                type="datetime-local"
                                {...form.register(`stages.${index}.startTime`)}
                                className="bg-background/50"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`stages.${index}.endTime`}>End Time</Label>
                              <Input
                                type="datetime-local"
                                {...form.register(`stages.${index}.endTime`)}
                                className="bg-background/50"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`stages.${index}.capacity`}>Capacity</Label>
                              <Input
                                type="number"
                                {...form.register(`stages.${index}.capacity`, { valueAsNumber: true })}
                                placeholder="e.g. 200"
                                className="bg-background/50"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/organizer/events")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary"
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
