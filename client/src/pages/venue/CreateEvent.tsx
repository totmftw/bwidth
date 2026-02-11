import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters.",
    }),
    description: z.string().optional(),
    date: z.date({
        required_error: "A date is required.",
    }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be a valid time (HH:MM)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Must be a valid time (HH:MM)").optional().or(z.literal("")),
    capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
    visibility: z.enum(['public', 'private']).default('private'),
    stages: z.array(z.object({
        name: z.string().min(1, "Name is required"),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
    })).optional(),
});

export default function CreateEvent() {
    const { toast } = useToast();
    const [_, setLocation] = useLocation();
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            startTime: "20:00",
            capacity: 100,
            visibility: 'private',
            stages: [],
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            // Combine date and time
            const startDateTime = new Date(values.date);
            const [startHour, startMinute] = values.startTime.split(":");
            startDateTime.setHours(parseInt(startHour), parseInt(startMinute));

            let endDateTime: Date | undefined;
            if (values.endTime) {
                endDateTime = new Date(values.date);
                const [endHour, endMinute] = values.endTime.split(":");
                endDateTime.setHours(parseInt(endHour), parseInt(endMinute));
                // Handle overnight events
                if (endDateTime <= startDateTime) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }
            }

            const payload = {
                title: values.title,
                description: values.description,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime?.toISOString(),
                capacityTotal: values.capacity,
                visibility: values.visibility,
                stages: values.stages?.map(stage => {
                    // Combine date with stage times
                    let stageStart = undefined;
                    let stageEnd = undefined;

                    if (stage.startTime) {
                        const s = new Date(values.date);
                        const [sh, sm] = stage.startTime.split(":");
                        s.setHours(parseInt(sh), parseInt(sm));
                        stageStart = s.toISOString();
                    }

                    if (stage.endTime) {
                        const e = new Date(values.date);
                        const [eh, em] = stage.endTime.split(":");
                        e.setHours(parseInt(eh), parseInt(em));
                        if (stageStart && e <= new Date(stageStart)) {
                            e.setDate(e.getDate() + 1);
                        }
                        stageEnd = e.toISOString();
                    }

                    return {
                        name: stage.name,
                        startTime: stageStart,
                        endTime: stageEnd,
                    };
                }),
                metadata: {},
            };

            const res = await fetch("/api/opportunities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to create event");
            }

            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Event created",
                description: "Your event has been successfully created and published.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/venues/events/upcoming"] });
            setLocation("/venue/dashboard");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        createMutation.mutate(values);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/venue/dashboard">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-display font-bold">Create New Event</h1>
                    <p className="text-muted-foreground">Schedule a new gig or event at your venue</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle>Event Details</CardTitle>
                            <CardDescription>Basic information about the event</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Event Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Friday Night Jazz" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    A catchy title for your event.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe the vibe, music genre, or specific requirements..."
                                                        className="min-h-[120px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="date"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Date</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full pl-3 text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(field.value, "PPP")
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) =>
                                                                    date < new Date() || date < new Date("1900-01-01")
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="startTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Start Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="endTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>End Time</FormLabel>
                                                        <FormControl>
                                                            <Input type="time" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="capacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Capacity</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Maximum attendees for this event.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="visibility"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">Public Event</FormLabel>
                                                    <FormDescription>
                                                        Make this event visible to all artists on the platform.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value === 'public'}
                                                        onCheckedChange={(checked) => field.onChange(checked ? 'public' : 'private')}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-base">Timeslots / Stages</FormLabel>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentStages = form.getValues("stages") || [];
                                                    form.setValue("stages", [
                                                        ...currentStages,
                                                        { name: `Slot ${currentStages.length + 1}`, startTime: "", endTime: "" }
                                                    ]);
                                                }}
                                            >
                                                Add Slot
                                            </Button>
                                        </div>

                                        {form.watch("stages")?.map((_, index) => (
                                            <div key={index} className="flex gap-2 items-end border p-3 rounded-md">
                                                <FormField
                                                    control={form.control}
                                                    name={`stages.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel className="text-xs">Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Opening Act" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`stages.${index}.startTime`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-24">
                                                            <FormLabel className="text-xs">Start</FormLabel>
                                                            <FormControl>
                                                                <Input type="time" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`stages.${index}.endTime`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-24">
                                                            <FormLabel className="text-xs">End</FormLabel>
                                                            <FormControl>
                                                                <Input type="time" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500"
                                                    onClick={() => {
                                                        const currentStages = form.getValues("stages") || [];
                                                        form.setValue("stages", currentStages.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            type="submit"
                                            className="bg-primary min-w-[150px]"
                                            disabled={createMutation.isPending}
                                        >
                                            {createMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Event"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="glass-card border-white/5 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg">Tips for Venues</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground">
                            <p>
                                • <strong>Be Descriptive:</strong> Artists look for clear descriptions of the vibe and music policy.
                            </p>
                            <p>
                                • <strong>Set Expectations:</strong> Be clear about capacity and timing to avoid miscommunication.
                            </p>
                            <p>
                                • <strong>Advance Planning:</strong> Creating events at least 2 weeks in advance attracts better talent.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
