import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    Loader2,
    Check,
    ChevronsUpDown
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollableTimePicker } from "@/components/ScrollableTimePicker";
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
  venueId: z.number().optional().nullable(),
  temporaryVenue: z.object({
    name: z.string().min(1, "Venue name is required").optional(),
    location: z.string().min(1, "Location is required").optional(),
    mapsLink: z.string().optional(),
    directions: z.string().optional(),
    landmark: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
  }).optional().nullable(),
  capacityTotal: z.number().optional().nullable(),
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

export type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
    mode: "create" | "edit";
    initialData?: any; // The Event object from DB
    venues: any[]; // The list of venues
    venuesLoading: boolean;
    prefilledVenueId?: number | null;
    onSubmit: (data: EventFormValues) => void;
    isSubmitting: boolean;
    onCancel: () => void;
}

export function EventForm({ 
    mode, 
    initialData, 
    venues, 
    venuesLoading, 
    prefilledVenueId, 
    onSubmit, 
    isSubmitting, 
    onCancel 
}: EventFormProps) {
    const [openVenue, setOpenVenue] = React.useState(false);

    // Initial defaults
    let defaultValues: Partial<EventFormValues> = {
        title: "",
        description: "",
        startDate: undefined,
        startTimeStr: "",
        endDate: undefined,
        endTimeStr: "",
        isCustomVenue: false,
        venueId: prefilledVenueId || undefined,
        temporaryVenue: undefined,
        capacityTotal: undefined,
        currency: "INR",
        visibility: "private",
        stages: [],
    };

    // If edit mode and initialData exists, map it to form values
    if (initialData) {
        const start = new Date(initialData.startTime);
        const end = initialData.endTime ? new Date(initialData.endTime) : undefined;
        
        let hasCustomVenue = false;
        if (initialData.temporaryVenue) {
            hasCustomVenue = true;
        }

        defaultValues = {
            title: initialData.title || "",
            description: initialData.description || "",
            startDate: start,
            startTimeStr: format(start, "HH:mm"),
            endDate: end,
            endTimeStr: end ? format(end, "HH:mm") : "",
            isCustomVenue: hasCustomVenue,
            venueId: initialData.venueId,
            temporaryVenue: initialData.temporaryVenue || undefined,
            capacityTotal: initialData.capacityTotal || undefined,
            currency: initialData.currency || "INR",
            visibility: initialData.visibility || "private",
            stages: (initialData.stages || []).map((s: any) => {
                const sStart = s.startTime ? new Date(s.startTime) : undefined;
                const sEnd = s.endTime ? new Date(s.endTime) : undefined;
                return {
                    name: s.name,
                    startDate: sStart,
                    startTimeStr: sStart ? format(sStart, "HH:mm") : "",
                    endDate: sEnd,
                    endTimeStr: sEnd ? format(sEnd, "HH:mm") : "",
                    capacity: s.capacity || undefined,
                };
            }),
        };
    }

    const form = useForm<EventFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "stages",
    });

    const addStage = () => {
        append({
            name: "",
            startDate: undefined,
            startTimeStr: "",
            endDate: undefined,
            endTimeStr: "",
            capacity: undefined,
        });
    };

    // Derived flags for edit locks
    const isEdit = mode === "edit";
    const hasBookings = isEdit && initialData?.status !== 'draft'; // Simplified lock condition: locked if not draft basically, or let the server reject it. We can disable venue/time if locked.

    return (
        <Card className="glass-card border-white/5 shadow-2xl">
            <CardHeader className="bg-white/5 border-b border-white/5 rounded-t-xl">
                <CardTitle className="text-xl">{isEdit ? "Update Event Details" : "Event Details"}</CardTitle>
                <CardDescription>
                    {isEdit 
                        ? "Modify the details of your event." 
                        : "Fill in the information about your event. Events start as drafts and can be published later."}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-semibold">Event Title <span className="text-destructive">*</span></Label>
                            <Input
                                id="title"
                                {...form.register("title")}
                                placeholder="e.g. Friday Night Techno"
                                className="bg-background/50 h-11 text-lg"
                            />
                            {form.formState.errors.title && (
                                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Textarea
                                id="description"
                                {...form.register("description")}
                                placeholder="Describe your event..."
                                rows={5}
                                className="bg-background/50 resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-4">
                        <h3 className="font-semibold text-primary flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Schedule
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Start Date *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal bg-background/80 h-11",
                                                !form.watch("startDate") && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                            {form.watch("startDate") ? format(form.watch("startDate"), "dd MMM yyyy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={form.watch("startDate")}
                                            onSelect={(date) => {
                                                if (date) form.setValue("startDate", date, { shouldValidate: true });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {form.formState.errors.startDate && (
                                    <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                <Label htmlFor="startTimeStr" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Start Time *</Label>
                                <ScrollableTimePicker 
                                    value={form.watch("startTimeStr")}
                                    onChange={(val) => form.setValue("startTimeStr", val, { shouldValidate: true })}
                                    className="h-11 bg-background/80"
                                />
                                {form.formState.errors.startTimeStr && (
                                    <p className="text-xs text-destructive">{form.formState.errors.startTimeStr.message}</p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal bg-background/80 h-11",
                                                !form.watch("endDate") && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary opacity-50" />
                                            {form.watch("endDate") ? format(form.watch("endDate") as Date, "dd MMM yyyy") : <span>(Optional)</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={form.watch("endDate")}
                                            onSelect={(date) => {
                                                if (date) form.setValue("endDate", date);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <div className="space-y-3">
                                <Label htmlFor="endTimeStr" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">End Time</Label>
                                <ScrollableTimePicker 
                                    value={form.watch("endTimeStr") || ""}
                                    onChange={(val) => form.setValue("endTimeStr", val)}
                                    className="h-11 bg-background/80"
                                    disabled={!form.watch("endDate")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Venue Selection */}
                    <div className="space-y-4 pt-2 border-t border-white/5">
                        <Label className="text-base">Location</Label>
                        {!form.watch("isCustomVenue") && (
                            <div className="space-y-2">
                                {venuesLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground my-4">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading registered venues...
                                    </div>
                                ) : (
                                    <Popover open={openVenue} onOpenChange={setOpenVenue}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openVenue}
                                                className="w-full justify-between bg-background/50 h-12 text-base"
                                            >
                                                {form.watch("venueId")
                                                    ? venues?.find((venue: any) => venue.id === form.watch("venueId"))?.name
                                                    : "Search for a registered venue..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]">
                                            <Command>
                                                <CommandInput placeholder="Type venue name or city..." />
                                                <CommandList>
                                                    <CommandEmpty>No venue found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {venues?.map((venue: any) => (
                                                            <CommandItem
                                                                key={venue.id}
                                                                value={`${venue.name} ${venue.location || ''}`}
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
                                                                <div className="flex flex-col">
                                                                    <span>{venue.name}</span>
                                                                    {venue.location && <span className="text-xs text-muted-foreground">{venue.location}</span>}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                            <Label htmlFor="isCustomVenue" className="cursor-pointer">Venue isn't registered on platform yet</Label>
                        </div>

                        {form.watch("isCustomVenue") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border border-primary/20 bg-primary/5 mt-4">
                                <div className="space-y-2 mb-2 md:col-span-2">
                                    <Label className="text-base text-primary font-medium">Temporary Venue Details</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tempVenueName">Venue Name <span className="text-destructive">*</span></Label>
                                    <Input id="tempVenueName" {...form.register("temporaryVenue.name")} className="bg-background/80" />
                                    {form.formState.errors.temporaryVenue?.name && (
                                        <p className="text-xs text-destructive">{form.formState.errors.temporaryVenue.name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tempVenueLocation">Location / Address <span className="text-destructive">*</span></Label>
                                    <Input id="tempVenueLocation" {...form.register("temporaryVenue.location")} className="bg-background/80" />
                                    {form.formState.errors.temporaryVenue?.location && (
                                        <p className="text-xs text-destructive">{form.formState.errors.temporaryVenue.location.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="tempVenueMapsLink">Google Maps Link</Label>
                                    <Input id="tempVenueMapsLink" {...form.register("temporaryVenue.mapsLink")} className="bg-background/80" placeholder="https://goo.gl/maps/..." />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Capacity and Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                        <div className="space-y-2">
                            <Label htmlFor="capacityTotal">Total Capacity (Pax)</Label>
                            <Input
                                id="capacityTotal"
                                type="number"
                                {...form.register("capacityTotal", { valueAsNumber: true })}
                                placeholder="e.g. 500"
                                className="bg-background/50 h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Budget Currency</Label>
                            <Select
                                value={form.watch("currency")}
                                onValueChange={(value) => form.setValue("currency", value)}
                            >
                                <SelectTrigger className="bg-background/50 h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="visibility">Event Visibility</Label>
                            <Select
                                value={form.watch("visibility")}
                                onValueChange={(value: "public" | "private") => form.setValue("visibility", value)}
                            >
                                <SelectTrigger className="bg-background/50 h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public (Find Gigs feed)</SelectItem>
                                    <SelectItem value="private">Private (Invite only)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Submit Area */}
                    <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-8 border-t border-white/5 mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="h-12 px-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {isEdit ? "Saving..." : "Creating..."}
                                </>
                            ) : (
                                isEdit ? "Save Changes" : "Create Event"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
