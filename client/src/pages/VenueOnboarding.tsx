import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, ChevronLeft, Building2, MapPin, Users, Phone, X, Sparkles } from "lucide-react";

// Schemas
const basicInfoSchema = z.object({
    name: z.string().min(2, "Venue name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters").max(1000),
    website: z.string().url().optional().or(z.literal("")),
    instagramHandle: z.string().optional(),
});

const locationSchema = z.object({
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City is required"),
});

const capacitySchema = z.object({
    capacity: z.coerce.number().min(1, "Total capacity is required"),
    capacitySeated: z.coerce.number().optional(),
    capacityStanding: z.coerce.number().optional(),
});

const contactSchema = z.object({
    bookingEmail: z.string().email().optional().or(z.literal("")),
    bookingPhone: z.string().optional(),
});

const amenitiesSchema = z.object({
    amenities: z.array(z.string()).optional(),
});

type BasicInfo = z.infer<typeof basicInfoSchema>;
type LocationInfo = z.infer<typeof locationSchema>;
type CapacityInfo = z.infer<typeof capacitySchema>;
type ContactInfo = z.infer<typeof contactSchema>;
type AmenitiesInfo = z.infer<typeof amenitiesSchema>;

const AMENITIES_LIST = [
    "Green Room", "Sound System", "Lighting Rig", "Projector", "Backline",
    "Parking", "Wheelchair Access", "Bar", "Kitchen", "Security",
    "Ticketing Box Office", "VIP Area", "Outdoor Area", "Air Conditioning", "WiFi"
];

const STEPS = [
    { id: 1, title: "Basic Info", icon: Building2, description: "Tell us about your venue" },
    { id: 2, title: "Location", icon: MapPin, description: "Where are you located?" },
    { id: 3, title: "Capacity", icon: Users, description: "Size and layout" },
    { id: 4, title: "Contact", icon: Phone, description: "Booking details" },
    { id: 5, title: "Amenities", icon: Sparkles, description: "What do you offer?" },
];

export default function VenueOnboarding() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        website: "",
        instagramHandle: "",
        address: "",
        city: "",
        capacity: 0,
        capacitySeated: 0,
        capacityStanding: 0,
        bookingEmail: "",
        bookingPhone: "",
        amenities: [] as string[],
    });

    const progress = (currentStep / STEPS.length) * 100;

    const updateFormData = (data: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const nextStep = () => {
        if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            console.log("Submitting venue profile:", formData);
            const response = await fetch("/api/venues/profile/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save profile");
            }

            toast({
                title: "🎉 Profile Complete!",
                description: "Your venue profile has been set up successfully.",
            });

            setLocation("/dashboard");
        } catch (error: any) {
            console.error("Profile submission error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        sessionStorage.setItem("skippedOnboarding", "true");
        setLocation("/dashboard");
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center pt-8 px-4">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[128px]" />
            </div>

            <div className="relative z-10 w-full max-w-3xl">
                {/* Skip Button */}
                <div className="absolute top-0 right-0">
                    <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
                        Skip for now
                    </Button>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Venue Setup</h1>
                    <p className="text-muted-foreground">Let's get your venue ready for bookings</p>
                </div>

                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span>Step {currentStep} of {STEPS.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Steps Icons */}
                <div className="flex justify-center gap-4 mb-8">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <div
                                key={step.id}
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${isActive ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" :
                                        isCompleted ? "bg-green-500 border-green-500 text-white" : "bg-card border-border text-muted-foreground"}`}
                            >
                                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </div>
                        );
                    })}
                </div>

                {/* Card */}
                <Card className="glass-card backdrop-blur-xl border-white/10">
                    <CardHeader>
                        <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                        <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentStep === 1 && <BasicInfoStep data={formData} onUpdate={updateFormData} onNext={nextStep} />}
                                {currentStep === 2 && <LocationStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 3 && <CapacityStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 4 && <ContactStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 5 && <AmenitiesStep data={formData} onUpdate={updateFormData} onSubmit={handleSubmit} onBack={prevStep} isSubmitting={isSubmitting} />}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function BasicInfoStep({ data, onUpdate, onNext }: any) {
    const form = useForm<BasicInfo>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: { name: data.name, description: data.description, website: data.website, instagramHandle: data.instagramHandle }
    });

    return (
        <form onSubmit={form.handleSubmit((v) => { onUpdate(v); onNext(); })} className="space-y-4">
            <div className="space-y-2">
                <Label>Venue Name</Label>
                <Input {...form.register("name")} placeholder="The Grand Hall" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...form.register("description")} placeholder="Describe the vibe..." />
                {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Website (Optional)</Label>
                    <Input {...form.register("website")} placeholder="https://..." />
                    {form.formState.errors.website && <p className="text-xs text-destructive">{form.formState.errors.website.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label>Instagram (Optional)</Label>
                    <Input {...form.register("instagramHandle")} placeholder="@venue" />
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
            </div>
        </form>
    );
}

function LocationStep({ data, onUpdate, onNext, onBack }: any) {
    const form = useForm<LocationInfo>({
        resolver: zodResolver(locationSchema),
        defaultValues: { address: data.address, city: data.city }
    });

    return (
        <form onSubmit={form.handleSubmit((v) => { onUpdate(v); onNext(); })} className="space-y-4">
            <div className="space-y-2">
                <Label>Street Address</Label>
                <Input {...form.register("address")} placeholder="123 Music St" />
                {form.formState.errors.address && <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>City</Label>
                <Input {...form.register("city")} placeholder="New York" />
                {form.formState.errors.city && <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>}
            </div>
            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
                <Button type="submit">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
            </div>
        </form>
    );
}

function CapacityStep({ data, onUpdate, onNext, onBack }: any) {
    const form = useForm<CapacityInfo>({
        resolver: zodResolver(capacitySchema),
        defaultValues: { capacity: data.capacity, capacitySeated: data.capacitySeated, capacityStanding: data.capacityStanding }
    });

    return (
        <form onSubmit={form.handleSubmit((v) => { onUpdate(v); onNext(); })} className="space-y-4">
            <div className="space-y-2">
                <Label>Total Capacity</Label>
                <Input type="number" {...form.register("capacity")} />
                {form.formState.errors.capacity && <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Seated</Label>
                    <Input type="number" {...form.register("capacitySeated")} />
                </div>
                <div className="space-y-2">
                    <Label>Standing</Label>
                    <Input type="number" {...form.register("capacityStanding")} />
                </div>
            </div>
            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
                <Button type="submit">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
            </div>
        </form>
    );
}

function ContactStep({ data, onUpdate, onNext, onBack }: any) {
    const form = useForm<ContactInfo>({
        resolver: zodResolver(contactSchema),
        defaultValues: { bookingEmail: data.bookingEmail, bookingPhone: data.bookingPhone }
    });

    return (
        <form onSubmit={form.handleSubmit((v) => { onUpdate(v); onNext(); })} className="space-y-4">
            <div className="space-y-2">
                <Label>Booking Email (Optional)</Label>
                <Input {...form.register("bookingEmail")} placeholder="bookings@venue.com" />
                {form.formState.errors.bookingEmail && <p className="text-xs text-destructive">{form.formState.errors.bookingEmail.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>Booking Phone (Optional)</Label>
                <Input {...form.register("bookingPhone")} placeholder="+1234567890" />
            </div>
            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
                <Button type="submit">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
            </div>
        </form>
    );
}

function AmenitiesStep({ data, onUpdate, onSubmit, onBack, isSubmitting }: any) {
    const [selected, setSelected] = useState<string[]>(data.amenities || []);

    const toggle = (item: string) => {
        setSelected(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const handleFinish = () => {
        onUpdate({ amenities: selected });
        onSubmit();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {AMENITIES_LIST.map(item => (
                    <Badge
                        key={item}
                        variant={selected.includes(item) ? "default" : "outline"}
                        className="cursor-pointer px-3 py-1"
                        onClick={() => toggle(item)}
                    >
                        {item} {selected.includes(item) && <X className="ml-1 w-3 h-3" />}
                    </Badge>
                ))}
            </div>
            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
                <Button onClick={handleFinish} disabled={isSubmitting} className="bg-primary">
                    {isSubmitting ? "Completing Setup..." : "Complete Setup"}
                </Button>
            </div>
        </div>
    );
}
