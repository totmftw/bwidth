import React, { useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, isValid } from "date-fns";
import {
    Calendar as CalendarIcon,
    Plus,
    Trash2,
    Loader2,
    Check,
    ChevronsUpDown,
    X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollableTimePicker } from "@/components/ScrollableTimePicker";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// DatePickerInput — combines a text input (DD/MM/YYYY) with a calendar popover
// ---------------------------------------------------------------------------
interface DatePickerInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  optional?: boolean;
}

function DatePickerInput({ value, onChange, placeholder, optional }: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const inputFocused = useRef(false);

  // Controlled text value — derived from the Date when not focused
  const displayText = value ? format(value, "dd/MM/yyyy") : "";
  const [inputText, setInputText] = React.useState(displayText);

  // Sync text when value changes externally (e.g. calendar click)
  React.useEffect(() => {
    if (!inputFocused.current) {
      setInputText(value ? format(value, "dd/MM/yyyy") : "");
    }
  }, [value]);

  const commitText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    // Try DD/MM/YYYY and YYYY-MM-DD
    const formats = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"];
    for (const fmt of formats) {
      try {
        const parsed = parse(trimmed, fmt, new Date());
        if (isValid(parsed)) {
          onChange(parsed);
          return;
        }
      } catch {
        // continue
      }
    }
    // Not parseable — revert display
    setInputText(value ? format(value, "dd/MM/yyyy") : "");
  }, [onChange, value]);

  return (
    <div className="flex items-center gap-1 w-full">
      <div className="relative flex-1">
        <Input
          value={inputText}
          placeholder={placeholder ?? "DD/MM/YYYY"}
          className="pl-3 pr-3 bg-background/80 h-11"
          onFocus={() => { inputFocused.current = true; }}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={(e) => {
            inputFocused.current = false;
            commitText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputFocused.current = false;
              commitText((e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 bg-background/80"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4 text-primary" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date ?? undefined);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------

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
  visibility: z.enum(["public", "private"]).default("public"),
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
        visibility: "public",
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
            visibility: initialData.visibility || "public",
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
                    {/* Step 1: Visibility Selection */}
                    <div className="p-5 rounded-xl border border-primary/20 bg-primary/20 space-y-4 mb-6 shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80">Step 1: Visibility</h3>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="visibility" className="text-base font-bold text-primary">Target Audience</Label>
                                <p className="text-sm text-muted-foreground">Who should be able to see and apply for this event?</p>
                            </div>
                            <Select
                                value={form.watch("visibility")}
                                onValueChange={(value: "public" | "private") => form.setValue("visibility", value)}
                            >
                                <SelectTrigger className="bg-background/80 h-12 w-full md:w-[280px] border-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Public (Visible in Find Gigs feed)</SelectItem>
                                    <SelectItem value="private">Private (Invite only / Unpublished)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Step 2: Basic Info */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">2</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Step 2: Basic Info</h3>
                        </div>
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
                                <DatePickerInput
                                    value={form.watch("startDate")}
                                    onChange={(date) => form.setValue("startDate", date as Date, { shouldValidate: true })}
                                    placeholder="DD/MM/YYYY"
                                />
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
                                <DatePickerInput
                                    value={form.watch("endDate")}
                                    onChange={(date) => form.setValue("endDate", date, { shouldValidate: true })}
                                    placeholder="DD/MM/YYYY (optional)"
                                    optional
                                />
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

                    {/* Step 3: Venue Selection */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">3</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Step 3: Location</h3>
                        </div>
                        <Label className="text-base font-semibold">Where is the event? <span className="text-destructive">*</span></Label>
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


                        {/* Helper link — only shown when NOT in custom mode */}
                        {!form.watch("isCustomVenue") && (
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("isCustomVenue", true);
                                    form.setValue("venueId", undefined);
                                }}
                                className="mt-1 text-sm text-primary/80 hover:text-primary underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                Can't find the venue? Click here to add a custom venue and details.
                            </button>
                        )}

                        {form.watch("isCustomVenue") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border border-primary/20 bg-primary/5 mt-4">
                                <div className="flex items-center justify-between md:col-span-2 mb-1">
                                    <Label className="text-base text-primary font-medium">Custom Venue Details</Label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setValue("isCustomVenue", false);
                                            form.setValue("temporaryVenue", undefined);
                                        }}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" /> Remove custom venue
                                    </button>
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

                    {/* Step 4: Stages */}
                    <div className="space-y-6 pt-4 border-t border-white/10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">4</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Step 4: Performance Stages</h3>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addStage}
                                className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Stage
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-4">Define different performance areas or timeslots for your event.</p>

                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-end border border-white/10 p-3 rounded-lg bg-black/20">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Stage Name</Label>
                                    <Input
                                        {...form.register(`stages.${index}.name`)}
                                        placeholder="e.g. Main Stage"
                                        className="bg-background/80"
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">Start Time</Label>
                                    <ScrollableTimePicker
                                        value={form.watch(`stages.${index}.startTimeStr`) || ""}
                                        onChange={(val) => form.setValue(`stages.${index}.startTimeStr`, val)}
                                        className="h-10 bg-background/80"
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">End Time</Label>
                                    <ScrollableTimePicker
                                        value={form.watch(`stages.${index}.endTimeStr`) || ""}
                                        onChange={(val) => form.setValue(`stages.${index}.endTimeStr`, val)}
                                        className="h-10 bg-background/80"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive shrink-0"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
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
