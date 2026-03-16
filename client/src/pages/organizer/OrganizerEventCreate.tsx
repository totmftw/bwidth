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
import { Loader2, Plus, Trash2, Calendar as CalendarIcon, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  startTimeStr: z.string().min(1, "Start time is required"),
  endDate: z.date().optional(),
  endTimeStr: z.string().optional(),
  isCustomVenue: z.boolean().default(false),
  venueId: z.number().optional(),
  temporaryVenue: z.object({
    name: z.string().min(1, "Venue name is required").optional(),
    location: z.string().min(1, "Location is required").optional(),
    mapsLink: z.string().optional(),
    directions: z.string().optional(),
    landmark: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
  }).optional(),
  capacityTotal: z.number().optional(),
  currency: z.string(),
  visibility: z.enum(["public", "private"]),
  stages: z.array(z.any()).optional()
}).refine(data => {
  if (data.isCustomVenue) {
    return !!data.temporaryVenue?.name && !!data.temporaryVenue?.location;
  }
  return true;
}, {
  message: "Custom venue name and location are required",
  path: ["temporaryVenue", "name"]
});

type EventFormValues = z.infer<typeof formSchema>;

export default function OrganizerEventCreate() {
  const [location, setLocation] = useLocation();
  const createMutation = useCreateEvent();
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const [prefilledVenueId, setPrefilledVenueId] = useState<number | null>(null);
  const [openVenue, setOpenVenue] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: undefined,
      startTimeStr: "",
      endDate: undefined,
      endTimeStr: "",
      isCustomVenue: false,
      venueId: undefined,
      temporaryVenue: undefined,
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
      visibility: data.visibility as "public" | "private",
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

    createMutation.mutate(payload as any, {
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
            <CalendarIcon className="w-8 h-8 text-primary" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <div className="block">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !form.watch("startDate") && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("startDate") ? format(form.watch("startDate"), "dd-MM-yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("startDate")}
                        onSelect={(date) => form.setValue("startDate", date as Date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {form.formState.errors.startDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTimeStr">Start Time *</Label>
                <Input
                  id="startTimeStr"
                  type="time"
                  {...form.register("startTimeStr")}
                  className="bg-background/50"
                  step="60"
                />
                {form.formState.errors.startTimeStr && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startTimeStr.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="block">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !form.watch("endDate") && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("endDate") ? format(form.watch("endDate") as Date, "dd-MM-yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("endDate")}
                        onSelect={(date) => form.setValue("endDate", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTimeStr">End Time</Label>
                <Input
                  id="endTimeStr"
                  type="time"
                  {...form.register("endTimeStr")}
                  className="bg-background/50"
                  step="60"
                />
              </div>
            </div>

            {/* Venue Selection */}
            <div className="space-y-4">
              {!form.watch("isCustomVenue") && (
                <div className="space-y-2">
                  <Label htmlFor="venueId">Registered Venue</Label>
                  {venuesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading venues...
                    </div>
                  ) : (
                    <Popover open={openVenue} onOpenChange={setOpenVenue}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openVenue}
                          className="w-full justify-between bg-background/50"
                        >
                          {form.watch("venueId")
                            ? venues?.find((venue: any) => venue.id === form.watch("venueId"))?.name
                            : "Select a venue..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search venues..." />
                          <CommandList>
                            <CommandEmpty>No venue found.</CommandEmpty>
                            <CommandGroup>
                              {venues?.map((venue: any) => (
                                <CommandItem
                                  key={venue.id}
                                  value={venue.name}
                                  onSelect={() => {
                                    form.setValue("venueId", venue.id);
                                    setOpenVenue(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.watch("venueId") === venue.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {venue.name} - {venue.location}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  {prefilledVenueId && (
                    <p className="text-xs text-muted-foreground">
                      Pre-filled from discovery page
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="isCustomVenue" 
                  checked={form.watch("isCustomVenue")}
                  onCheckedChange={(checked) => {
                    form.setValue("isCustomVenue", !!checked);
                    if (checked) {
                      form.setValue("venueId", undefined);
                    }
                  }}
                />
                <Label htmlFor="isCustomVenue">Add Temporary Venue</Label>
              </div>

              {form.watch("isCustomVenue") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md border-white/10 bg-background/20 mt-4">
                  <div className="space-y-2 mb-2 md:col-span-2">
                    <Label className="text-base text-primary">Custom Venue Details</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueName">Venue Name *</Label>
                    <Input id="tempVenueName" {...form.register("temporaryVenue.name")} className="bg-background/50" />
                    {form.formState.errors.temporaryVenue?.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.temporaryVenue.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueLocation">Location / Address *</Label>
                    <Input id="tempVenueLocation" {...form.register("temporaryVenue.location")} className="bg-background/50" />
                    {form.formState.errors.temporaryVenue?.location && (
                      <p className="text-xs text-destructive">{form.formState.errors.temporaryVenue.location.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueMapsLink">Google Maps Link</Label>
                    <Input id="tempVenueMapsLink" {...form.register("temporaryVenue.mapsLink")} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueLandmark">Landmark</Label>
                    <Input id="tempVenueLandmark" {...form.register("temporaryVenue.landmark")} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueContactName">Contact Person Name</Label>
                    <Input id="tempVenueContactName" {...form.register("temporaryVenue.contactName")} className="bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tempVenueContactPhone">Contact Phone</Label>
                    <Input id="tempVenueContactPhone" {...form.register("temporaryVenue.contactPhone")} className="bg-background/50" />
                  </div>
                </div>
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
                            {(form.formState.errors.stages as any)?.[index]?.name && (
                              <p className="text-xs text-destructive">
                                {(form.formState.errors.stages as any)[index]?.name?.message as string}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <div className="block">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal bg-background/50",
                                        !form.watch(`stages.${index}.startDate`) && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {form.watch(`stages.${index}.startDate`) ? format(form.watch(`stages.${index}.startDate`), "dd-MM-yyyy") : <span>Pick a date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={form.watch(`stages.${index}.startDate`)}
                                      onSelect={(date) => form.setValue(`stages.${index}.startDate`, date)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`stages.${index}.startTimeStr`}>Start Time</Label>
                              <Input
                                type="time"
                                {...form.register(`stages.${index}.startTimeStr`)}
                                className="bg-background/50"
                                step="60"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <div className="block">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal bg-background/50",
                                        !form.watch(`stages.${index}.endDate`) && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {form.watch(`stages.${index}.endDate`) ? format(form.watch(`stages.${index}.endDate`), "dd-MM-yyyy") : <span>Pick a date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={form.watch(`stages.${index}.endDate`)}
                                      onSelect={(date) => form.setValue(`stages.${index}.endDate`, date)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`stages.${index}.endTimeStr`}>End Time</Label>
                              <Input
                                type="time"
                                {...form.register(`stages.${index}.endTimeStr`)}
                                className="bg-background/50"
                                step="60"
                              />
                            </div>

                            <div className="space-y-2 md:col-span-2">
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
