import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import {
    Check, ChevronRight, ChevronLeft, Building2, MapPin, Users, Music2,
    Settings, Camera, Calendar, X, Sparkles, Instagram, Globe, Mail, Phone
} from "lucide-react";

// ============================================================================
// SCHEMAS
// ============================================================================

const basicInfoSchema = z.object({
    name: z.string().min(2, "Venue name must be at least 2 characters"),
    description: z.string().min(20, "Description must be at least 20 characters").max(1000, "Max 1000 characters"),
    website: z.string().url().optional().or(z.literal("")),
    instagramHandle: z.string().optional(),
});

const locationSchema = z.object({
    address: z.string().min(5, "Full address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().optional(),
    pincode: z.string().optional(),
});

const capacitySchema = z.object({
    capacity: z.coerce.number().min(1, "Total capacity is required"),
    capacitySeated: z.coerce.number().optional(),
    capacityStanding: z.coerce.number().optional(),
    stageWidth: z.coerce.number().optional(),
    stageDepth: z.coerce.number().optional(),
    ceilingHeight: z.coerce.number().optional(),
});

const musicPolicySchema = z.object({
    preferredGenres: z.array(z.string()).min(1, "Select at least one genre"),
    targetAudience: z.string().optional(),
    eventFrequency: z.string().optional(),
    bookingMode: z.string().optional(),
});

const amenitiesSchema = z.object({
    amenities: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
});

const photosSchema = z.object({
    coverImageUrl: z.string().optional(),
    galleryUrls: z.array(z.string()).optional(),
    virtualTourUrl: z.string().optional(),
});

const preferencesSchema = z.object({
    monthlyBudgetMin: z.coerce.number().optional(),
    monthlyBudgetMax: z.coerce.number().optional(),
    operatingDays: z.array(z.string()).optional(),
    bookingEmail: z.string().email().optional().or(z.literal("")),
    bookingPhone: z.string().optional(),
});

type BasicInfo = z.infer<typeof basicInfoSchema>;
type LocationInfo = z.infer<typeof locationSchema>;
type CapacityInfo = z.infer<typeof capacitySchema>;
type MusicPolicyInfo = z.infer<typeof musicPolicySchema>;
type AmenitiesInfo = z.infer<typeof amenitiesSchema>;
type PhotosInfo = z.infer<typeof photosSchema>;
type PreferencesInfo = z.infer<typeof preferencesSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const GENRES = [
    "Techno", "House", "EDM", "Trance", "Dubstep", "Drum & Bass",
    "Hip Hop", "R&B", "Pop", "Rock", "Indie", "Jazz",
    "Classical", "Bollywood", "Folk", "Reggae", "Ambient", "Live Band"
];

const AMENITIES_LIST = [
    "Green Room", "Parking", "Wheelchair Access", "Bar", "Kitchen",
    "Security", "Box Office", "VIP Area", "Outdoor Area", "Air Conditioning",
    "WiFi", "Smoking Area", "Coat Check", "ATM"
];

const EQUIPMENT_LIST = [
    "PA System", "DJ Console", "Lighting Rig", "Projector", "LED Screens",
    "Backline", "Drum Kit", "Keyboard", "Guitar Amps", "Bass Amps",
    "Microphones", "Monitors", "Mixing Console", "Stage Risers"
];

const EVENT_FREQUENCY = [
    { value: "weekly", label: "Weekly (4+ events/month)" },
    { value: "biweekly", label: "Bi-weekly (2 events/month)" },
    { value: "monthly", label: "Monthly (1 event/month)" },
    { value: "occasional", label: "Occasional (few per year)" },
];

const BOOKING_MODES = [
    { value: "single", label: "Single Bookings", description: "Book artists for individual events" },
    { value: "programming", label: "Programming Mode", description: "3-6 month calendar planning" },
    { value: "both", label: "Both", description: "Flexible approach based on needs" },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STEPS = [
    { id: 1, title: "Basic Info", icon: Building2, description: "Tell us about your venue" },
    { id: 2, title: "Location", icon: MapPin, description: "Where are you located?" },
    { id: 3, title: "Capacity", icon: Users, description: "Space and dimensions" },
    { id: 4, title: "Music Policy", icon: Music2, description: "What's your vibe?" },
    { id: 5, title: "Amenities", icon: Settings, description: "Facilities & equipment" },
    { id: 6, title: "Photos", icon: Camera, description: "Showcase your space" },
    { id: 7, title: "Preferences", icon: Calendar, description: "Booking details" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VenueProfileSetup() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        // Basic Info
        name: "",
        description: "",
        website: "",
        instagramHandle: "",
        // Location
        address: "",
        city: "",
        state: "",
        pincode: "",
        // Capacity
        capacity: 0,
        capacitySeated: 0,
        capacityStanding: 0,
        stageWidth: 0,
        stageDepth: 0,
        ceilingHeight: 0,
        // Music Policy
        preferredGenres: [] as string[],
        targetAudience: "",
        eventFrequency: "",
        bookingMode: "both",
        // Amenities
        amenities: [] as string[],
        equipment: [] as string[],
        // Photos
        coverImageUrl: "",
        galleryUrls: [] as string[],
        virtualTourUrl: "",
        // Preferences
        monthlyBudgetMin: 0,
        monthlyBudgetMax: 0,
        operatingDays: [] as string[],
        bookingEmail: "",
        bookingPhone: "",
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
            // Transform data for API
            const apiData = {
                name: formData.name,
                description: formData.description,
                address: formData.address,
                city: formData.city,
                capacity: formData.capacity,
                capacitySeated: formData.capacitySeated || undefined,
                capacityStanding: formData.capacityStanding || undefined,
                amenities: formData.amenities,
                website: formData.website || undefined,
                instagramHandle: formData.instagramHandle || undefined,
                bookingEmail: formData.bookingEmail || undefined,
                bookingPhone: formData.bookingPhone || undefined,
                // Store additional data in metadata
                metadata: {
                    state: formData.state,
                    pincode: formData.pincode,
                    spaceDimensions: {
                        stageWidth: formData.stageWidth,
                        stageDepth: formData.stageDepth,
                        ceilingHeight: formData.ceilingHeight,
                    },
                    musicPolicy: {
                        preferredGenres: formData.preferredGenres,
                        targetAudience: formData.targetAudience,
                        eventFrequency: formData.eventFrequency,
                        bookingMode: formData.bookingMode,
                    },
                    equipment: formData.equipment,
                    photos: {
                        coverImageUrl: formData.coverImageUrl,
                        galleryUrls: formData.galleryUrls,
                        virtualTourUrl: formData.virtualTourUrl,
                    },
                    bookingPreferences: {
                        monthlyBudgetMin: formData.monthlyBudgetMin,
                        monthlyBudgetMax: formData.monthlyBudgetMax,
                        operatingDays: formData.operatingDays,
                    },
                },
            };

            const response = await fetch("/api/venues/profile/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(apiData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save profile");
            }

            toast({
                title: "🎉 Profile Complete!",
                description: "Your venue is now ready for bookings.",
            });

            setLocation("/venue/dashboard");
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
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center pt-8 px-4 pb-12">
            {/* Background Effects */}
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
                    <h1 className="text-3xl font-bold mb-2">Set Up Your Venue</h1>
                    <p className="text-muted-foreground">Complete your profile to start receiving booking requests</p>
                </div>

                {/* Progress */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Steps Icons */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <div
                                key={step.id}
                                className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300
                                    ${isActive ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" :
                                        isCompleted ? "bg-green-500 border-green-500 text-white" :
                                            "bg-card border-border text-muted-foreground"}`}
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
                                {currentStep === 4 && <MusicPolicyStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 5 && <AmenitiesStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 6 && <PhotosStep data={formData} onUpdate={updateFormData} onNext={nextStep} onBack={prevStep} />}
                                {currentStep === 7 && <PreferencesStep data={formData} onUpdate={updateFormData} onSubmit={handleSubmit} onBack={prevStep} isSubmitting={isSubmitting} />}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function BasicInfoStep({ data, onUpdate, onNext }: { data: any; onUpdate: (data: any) => void; onNext: () => void }) {
    const form = useForm<BasicInfo>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            name: data.name,
            description: data.description,
            website: data.website,
            instagramHandle: data.instagramHandle,
        },
    });

    const handleSubmit = (values: BasicInfo) => {
        onUpdate(values);
        onNext();
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Venue Name *</Label>
                <Input {...form.register("name")} placeholder="e.g., The Blue Note" className="bg-background" />
                {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                    {...form.register("description")}
                    placeholder="Describe your venue's vibe, history, and what makes it special..."
                    className="bg-background min-h-[120px]"
                />
                {form.formState.errors.description && (
                    <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Website
                    </Label>
                    <Input {...form.register("website")} placeholder="https://..." className="bg-background" />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" /> Instagram
                    </Label>
                    <Input {...form.register("instagramHandle")} placeholder="@yourvenue" className="bg-background" />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit">
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function LocationStep({ data, onUpdate, onNext, onBack }: { data: any; onUpdate: (data: any) => void; onNext: () => void; onBack: () => void }) {
    const form = useForm<LocationInfo>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
        },
    });

    const handleSubmit = (values: LocationInfo) => {
        onUpdate(values);
        onNext();
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Full Address *</Label>
                <Textarea
                    {...form.register("address")}
                    placeholder="123 Music Street, Indiranagar..."
                    className="bg-background"
                />
                {form.formState.errors.address && (
                    <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>City *</Label>
                    <Input {...form.register("city")} placeholder="Bangalore" className="bg-background" />
                    {form.formState.errors.city && (
                        <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>State</Label>
                    <Input {...form.register("state")} placeholder="Karnataka" className="bg-background" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Pincode</Label>
                <Input {...form.register("pincode")} placeholder="560038" className="bg-background" />
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button type="submit">
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function CapacityStep({ data, onUpdate, onNext, onBack }: { data: any; onUpdate: (data: any) => void; onNext: () => void; onBack: () => void }) {
    const form = useForm<CapacityInfo>({
        resolver: zodResolver(capacitySchema),
        defaultValues: {
            capacity: data.capacity,
            capacitySeated: data.capacitySeated,
            capacityStanding: data.capacityStanding,
            stageWidth: data.stageWidth,
            stageDepth: data.stageDepth,
            ceilingHeight: data.ceilingHeight,
        },
    });

    const handleSubmit = (values: CapacityInfo) => {
        onUpdate(values);
        onNext();
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label>Total Capacity *</Label>
                <Input type="number" {...form.register("capacity")} placeholder="500" className="bg-background" />
                {form.formState.errors.capacity && (
                    <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Seated Capacity</Label>
                    <Input type="number" {...form.register("capacitySeated")} placeholder="200" className="bg-background" />
                </div>
                <div className="space-y-2">
                    <Label>Standing Capacity</Label>
                    <Input type="number" {...form.register("capacityStanding")} placeholder="300" className="bg-background" />
                </div>
            </div>

            <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Stage Dimensions (Optional)</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Width (ft)</Label>
                        <Input type="number" {...form.register("stageWidth")} placeholder="20" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                        <Label>Depth (ft)</Label>
                        <Input type="number" {...form.register("stageDepth")} placeholder="15" className="bg-background" />
                    </div>
                    <div className="space-y-2">
                        <Label>Ceiling (ft)</Label>
                        <Input type="number" {...form.register("ceilingHeight")} placeholder="12" className="bg-background" />
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button type="submit">
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function MusicPolicyStep({ data, onUpdate, onNext, onBack }: { data: any; onUpdate: (data: any) => void; onNext: () => void; onBack: () => void }) {
    const [selectedGenres, setSelectedGenres] = useState<string[]>(data.preferredGenres || []);
    const [eventFrequency, setEventFrequency] = useState(data.eventFrequency || "");
    const [bookingMode, setBookingMode] = useState(data.bookingMode || "both");
    const [targetAudience, setTargetAudience] = useState(data.targetAudience || "");

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleNext = () => {
        if (selectedGenres.length === 0) return;
        onUpdate({
            preferredGenres: selectedGenres,
            eventFrequency,
            bookingMode,
            targetAudience,
        });
        onNext();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>Preferred Genres * (Select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                    {GENRES.map(genre => (
                        <Badge
                            key={genre}
                            variant={selectedGenres.includes(genre) ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1 hover:bg-primary/20 transition-colors"
                            onClick={() => toggleGenre(genre)}
                        >
                            {genre}
                            {selectedGenres.includes(genre) && <Check className="ml-1 w-3 h-3" />}
                        </Badge>
                    ))}
                </div>
                {selectedGenres.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one genre</p>
                )}
            </div>

            <div className="space-y-3">
                <Label>Target Audience</Label>
                <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Young professionals, 25-35, music enthusiasts"
                    className="bg-background"
                />
            </div>

            <div className="space-y-3">
                <Label>Event Frequency</Label>
                <div className="grid grid-cols-2 gap-2">
                    {EVENT_FREQUENCY.map(freq => (
                        <div
                            key={freq.value}
                            onClick={() => setEventFrequency(freq.value)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${eventFrequency === freq.value
                                ? "border-primary bg-primary/10"
                                : "border-white/10 hover:border-white/20"
                                }`}
                        >
                            <p className="text-sm font-medium">{freq.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label>Preferred Booking Mode</Label>
                <div className="space-y-2">
                    {BOOKING_MODES.map(mode => (
                        <div
                            key={mode.value}
                            onClick={() => setBookingMode(mode.value)}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${bookingMode === mode.value
                                ? "border-primary bg-primary/10"
                                : "border-white/10 hover:border-white/20"
                                }`}
                        >
                            <p className="font-medium">{mode.label}</p>
                            <p className="text-sm text-muted-foreground">{mode.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={handleNext} disabled={selectedGenres.length === 0}>
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function AmenitiesStep({ data, onUpdate, onNext, onBack }: { data: any; onUpdate: (data: any) => void; onNext: () => void; onBack: () => void }) {
    const [amenities, setAmenities] = useState<string[]>(data.amenities || []);
    const [equipment, setEquipment] = useState<string[]>(data.equipment || []);

    const toggleAmenity = (item: string) => {
        setAmenities(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const toggleEquipment = (item: string) => {
        setEquipment(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const handleNext = () => {
        onUpdate({ amenities, equipment });
        onNext();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>Venue Amenities</Label>
                <div className="flex flex-wrap gap-2">
                    {AMENITIES_LIST.map(item => (
                        <Badge
                            key={item}
                            variant={amenities.includes(item) ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1"
                            onClick={() => toggleAmenity(item)}
                        >
                            {item} {amenities.includes(item) && <X className="ml-1 w-3 h-3" />}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Label>Technical Equipment Available</Label>
                <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_LIST.map(item => (
                        <Badge
                            key={item}
                            variant={equipment.includes(item) ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1"
                            onClick={() => toggleEquipment(item)}
                        >
                            {item} {equipment.includes(item) && <X className="ml-1 w-3 h-3" />}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function PhotosStep({ data, onUpdate, onNext, onBack }: { data: any; onUpdate: (data: any) => void; onNext: () => void; onBack: () => void }) {
    const [coverImageUrl, setCoverImageUrl] = useState(data.coverImageUrl || "");
    const [virtualTourUrl, setVirtualTourUrl] = useState(data.virtualTourUrl || "");

    const handleNext = () => {
        onUpdate({ coverImageUrl, virtualTourUrl });
        onNext();
    };

    return (
        <div className="space-y-6">
            <div className="p-6 border-2 border-dashed border-white/20 rounded-xl text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Photo upload coming soon</p>
                <p className="text-xs text-muted-foreground">For now, you can add URLs to your photos</p>
            </div>

            <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://example.com/venue-photo.jpg"
                    className="bg-background"
                />
            </div>

            <div className="space-y-2">
                <Label>Virtual Tour URL (Optional)</Label>
                <Input
                    value={virtualTourUrl}
                    onChange={(e) => setVirtualTourUrl(e.target.value)}
                    placeholder="https://360.view/your-venue"
                    className="bg-background"
                />
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={handleNext}>
                    Continue <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function PreferencesStep({ data, onUpdate, onSubmit, onBack, isSubmitting }: { data: any; onUpdate: (data: any) => void; onSubmit: () => void; onBack: () => void; isSubmitting: boolean }) {
    const [budgetMin, setBudgetMin] = useState(data.monthlyBudgetMin || 0);
    const [budgetMax, setBudgetMax] = useState(data.monthlyBudgetMax || 0);
    const [operatingDays, setOperatingDays] = useState<string[]>(data.operatingDays || []);
    const [bookingEmail, setBookingEmail] = useState(data.bookingEmail || "");
    const [bookingPhone, setBookingPhone] = useState(data.bookingPhone || "");

    const toggleDay = (day: string) => {
        setOperatingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleFinish = () => {
        onUpdate({
            monthlyBudgetMin: budgetMin,
            monthlyBudgetMax: budgetMax,
            operatingDays,
            bookingEmail,
            bookingPhone,
        });
        onSubmit();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Label>Monthly Artist Budget Range (₹)</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Minimum</Label>
                        <Input
                            type="number"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(Number(e.target.value))}
                            placeholder="50000"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Maximum</Label>
                        <Input
                            type="number"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(Number(e.target.value))}
                            placeholder="200000"
                            className="bg-background"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Operating Days</Label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                        <Badge
                            key={day}
                            variant={operatingDays.includes(day) ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1"
                            onClick={() => toggleDay(day)}
                        >
                            {day.slice(0, 3)}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-4">
                <h4 className="text-sm font-medium">Booking Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Email
                        </Label>
                        <Input
                            value={bookingEmail}
                            onChange={(e) => setBookingEmail(e.target.value)}
                            placeholder="bookings@venue.com"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Phone
                        </Label>
                        <Input
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="bg-background"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button onClick={handleFinish} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-purple-600">
                    {isSubmitting ? (
                        <>Completing Setup...</>
                    ) : (
                        <>Complete Setup <Sparkles className="ml-2 w-4 h-4" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}
