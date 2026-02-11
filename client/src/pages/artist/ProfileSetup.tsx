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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Check,
    User,
    Music,
    DollarSign,
    Link2,
    FileText,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Instagram,
    Globe,
    Upload,
    X
} from "lucide-react";

// Step schemas
const basicInfoSchema = z.object({
    stageName: z.string().min(2, "Stage name must be at least 2 characters"),
    bio: z.string().min(50, "Bio should be at least 50 characters").max(500, "Bio cannot exceed 500 characters"),
    location: z.string().min(2, "Please enter your location"),
    yearsOfExperience: z.coerce.number().min(0).max(50),
});

const genreSchema = z.object({
    primaryGenre: z.string().min(1, "Please select a primary genre"),
    secondaryGenres: z.array(z.string()).max(3, "Maximum 3 secondary genres"),
});

const pricingSchema = z.object({
    feeMin: z.coerce.number().min(100, "Minimum fee must be at least ₹100"),
    feeMax: z.coerce.number().min(100, "Maximum fee must be at least ₹100"),
    currency: z.string().default("INR"),
    performanceDurations: z.array(z.string()).min(1, "Select at least one duration"),
});

const portfolioSchema = z.object({
    soundcloudUrl: z.string().url().optional().or(z.literal("")),
    mixcloudUrl: z.string().url().optional().or(z.literal("")),
    instagramHandle: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal("")),
    achievements: z.string().optional(),
});

const technicalSchema = z.object({
    technicalRider: z.string().optional(),
    equipmentRequirements: z.string().optional(),
    travelPreferences: z.string().optional(),
});

type BasicInfo = z.infer<typeof basicInfoSchema>;
type GenreInfo = z.infer<typeof genreSchema>;
type PricingInfo = z.infer<typeof pricingSchema>;
type PortfolioInfo = z.infer<typeof portfolioSchema>;
type TechnicalInfo = z.infer<typeof technicalSchema>;

const GENRES = [
    "Techno", "House", "EDM", "Trance", "Dubstep", "Drum & Bass",
    "Hip Hop", "R&B", "Pop", "Rock", "Indie", "Jazz",
    "Classical", "Bollywood", "Folk", "Reggae", "Ambient", "Other"
];

const DURATIONS = ["30 min", "60 min", "90 min", "120 min", "180 min"];

const STEPS = [
    { id: 1, title: "Basic Info", icon: User, description: "Tell us about yourself" },
    { id: 2, title: "Genre & Style", icon: Music, description: "Your musical identity" },
    { id: 3, title: "Pricing", icon: DollarSign, description: "Set your rates" },
    { id: 4, title: "Portfolio", icon: Link2, description: "Showcase your work" },
    { id: 5, title: "Technical", icon: FileText, description: "Requirements & preferences" },
];

export default function ArtistProfileSetup() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form data storage
    const [formData, setFormData] = useState({
        // Basic Info
        stageName: "",
        bio: "",
        location: "",
        yearsOfExperience: 0,
        // Genre
        primaryGenre: "",
        secondaryGenres: [] as string[],
        // Pricing
        feeMin: 5000,
        feeMax: 20000,
        currency: "INR",
        performanceDurations: ["60 min"],
        // Portfolio
        soundcloudUrl: "",
        mixcloudUrl: "",
        instagramHandle: "",
        websiteUrl: "",
        achievements: "",
        // Technical
        technicalRider: "",
        equipmentRequirements: "",
        travelPreferences: "",
    });

    const progress = (currentStep / STEPS.length) * 100;

    const updateFormData = (data: Partial<typeof formData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const nextStep = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async (finalData?: any) => {
        setIsSubmitting(true);
        try {
            // Use provided final data or fallback to state
            const dataToSubmit = finalData || formData;

            console.log("Submitting profile data:", dataToSubmit);

            const response = await fetch("/api/artists/profile/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(dataToSubmit),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save profile");
            }

            toast({
                title: "🎉 Profile Complete!",
                description: "Your artist profile has been set up successfully.",
            });

            // Redirect to dashboard
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


    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[128px] animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[128px] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-[50%] left-[50%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
            </div>

            <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
                <div className="absolute top-8 right-8 z-20">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            sessionStorage.setItem("skippedOnboarding", "true");
                            setLocation("/dashboard");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Skip for now
                    </Button>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Complete Your Artist Profile</span>
                    </motion.div>
                    <h1 className="text-4xl font-display font-bold mb-2">
                        Let's Set Up Your Profile
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Complete these steps to start receiving booking requests and grow your career.
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
                        <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2 mb-8">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div
                                key={step.id}
                                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${isActive
                                        ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                                        : isCompleted
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "bg-secondary/50 border-border text-muted-foreground"
                                    }
                `}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <Icon className="w-4 h-4" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Form Card */}
                <Card className="glass-card border-white/10 shadow-2xl backdrop-blur-xl">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            {(() => {
                                const Icon = STEPS[currentStep - 1].icon;
                                return <Icon className="w-5 h-5 text-primary" />;
                            })()}
                            {STEPS[currentStep - 1].title}
                        </CardTitle>
                        <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentStep === 1 && (
                                    <BasicInfoStep
                                        data={formData}
                                        onUpdate={updateFormData}
                                        onNext={nextStep}
                                    />
                                )}
                                {currentStep === 2 && (
                                    <GenreStep
                                        data={formData}
                                        onUpdate={updateFormData}
                                        onNext={nextStep}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 3 && (
                                    <PricingStep
                                        data={formData}
                                        onUpdate={updateFormData}
                                        onNext={nextStep}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 4 && (
                                    <PortfolioStep
                                        data={formData}
                                        onUpdate={updateFormData}
                                        onNext={nextStep}
                                        onBack={prevStep}
                                    />
                                )}
                                {currentStep === 5 && (
                                    <TechnicalStep
                                        data={formData}
                                        onUpdate={updateFormData}
                                        onSubmit={handleSubmit}
                                        onBack={prevStep}
                                        isSubmitting={isSubmitting}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                </Card>

                {/* Skip for now option - only first time setup */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                    You can update these details later from your Profile settings
                </p>
            </div>
        </div>
    );
}

// Step Components
function BasicInfoStep({
    data,
    onUpdate,
    onNext
}: {
    data: any;
    onUpdate: (data: any) => void;
    onNext: () => void;
}) {
    const form = useForm<BasicInfo>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            stageName: data.stageName,
            bio: data.bio,
            location: data.location,
            yearsOfExperience: data.yearsOfExperience,
        },
    });

    const handleSubmit = (values: BasicInfo) => {
        onUpdate(values);
        onNext();
    };

    const bioLength = form.watch("bio")?.length || 0;

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="stageName">Stage Name / Artist Name</Label>
                <Input
                    id="stageName"
                    {...form.register("stageName")}
                    placeholder="DJ Cosmic, The Midnight Band, etc."
                    className="bg-background/60"
                />
                {form.formState.errors.stageName && (
                    <p className="text-xs text-destructive">{form.formState.errors.stageName.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                    id="bio"
                    {...form.register("bio")}
                    placeholder="Tell organizers about your musical journey, style, and what makes you unique..."
                    className="bg-background/60 min-h-[120px] resize-none"
                />
                <div className="flex justify-between text-xs">
                    {form.formState.errors.bio ? (
                        <p className="text-destructive">{form.formState.errors.bio.message}</p>
                    ) : (
                        <p className="text-muted-foreground">Minimum 50 characters</p>
                    )}
                    <p className={bioLength > 500 ? "text-destructive" : "text-muted-foreground"}>
                        {bioLength}/500
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="location">Base Location</Label>
                    <Input
                        id="location"
                        {...form.register("location")}
                        placeholder="Mumbai, Delhi, Bangalore..."
                        className="bg-background/60"
                    />
                    {form.formState.errors.location && (
                        <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                    <Input
                        id="yearsOfExperience"
                        type="number"
                        {...form.register("yearsOfExperience")}
                        placeholder="5"
                        min="0"
                        max="50"
                        className="bg-background/60"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-primary gap-2">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function GenreStep({
    data,
    onUpdate,
    onNext,
    onBack,
}: {
    data: any;
    onUpdate: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [primaryGenre, setPrimaryGenre] = useState(data.primaryGenre);
    const [secondaryGenres, setSecondaryGenres] = useState<string[]>(data.secondaryGenres || []);

    const toggleSecondaryGenre = (genre: string) => {
        if (genre === primaryGenre) return;

        setSecondaryGenres(prev => {
            if (prev.includes(genre)) {
                return prev.filter(g => g !== genre);
            }
            if (prev.length >= 3) {
                return prev;
            }
            return [...prev, genre];
        });
    };

    const handleNext = () => {
        if (!primaryGenre) return;
        onUpdate({ primaryGenre, secondaryGenres });
        onNext();
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Primary Genre</Label>
                <Select value={primaryGenre} onValueChange={setPrimaryGenre}>
                    <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Select your main genre" />
                    </SelectTrigger>
                    <SelectContent>
                        {GENRES.map(genre => (
                            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!primaryGenre && (
                    <p className="text-xs text-muted-foreground">This helps organizers find you</p>
                )}
            </div>

            <div className="space-y-3">
                <Label>Secondary Genres (up to 3)</Label>
                <div className="flex flex-wrap gap-2">
                    {GENRES.filter(g => g !== primaryGenre).map(genre => (
                        <Badge
                            key={genre}
                            variant={secondaryGenres.includes(genre) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${secondaryGenres.includes(genre)
                                ? "bg-primary hover:bg-primary/80"
                                : "hover:bg-primary/10 hover:border-primary"
                                }`}
                            onClick={() => toggleSecondaryGenre(genre)}
                        >
                            {genre}
                            {secondaryGenres.includes(genre) && (
                                <X className="w-3 h-3 ml-1" />
                            )}
                        </Badge>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Selected: {secondaryGenres.length}/3
                </p>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack} className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!primaryGenre}
                    className="bg-primary gap-2"
                >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function PricingStep({
    data,
    onUpdate,
    onNext,
    onBack,
}: {
    data: any;
    onUpdate: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const form = useForm<PricingInfo>({
        resolver: zodResolver(pricingSchema),
        defaultValues: {
            feeMin: data.feeMin,
            feeMax: data.feeMax,
            currency: data.currency,
            performanceDurations: data.performanceDurations,
        },
    });

    const [durations, setDurations] = useState<string[]>(data.performanceDurations || ["60 min"]);

    const toggleDuration = (duration: string) => {
        setDurations(prev => {
            if (prev.includes(duration)) {
                return prev.filter(d => d !== duration);
            }
            return [...prev, duration];
        });
    };

    const handleSubmit = (values: PricingInfo) => {
        onUpdate({ ...values, performanceDurations: durations });
        onNext();
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Set a range that reflects your experience. You can adjust rates for individual bookings later.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="feeMin">Minimum Fee (₹)</Label>
                    <Input
                        id="feeMin"
                        type="number"
                        {...form.register("feeMin")}
                        placeholder="5000"
                        className="bg-background/60"
                    />
                    {form.formState.errors.feeMin && (
                        <p className="text-xs text-destructive">{form.formState.errors.feeMin.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="feeMax">Maximum Fee (₹)</Label>
                    <Input
                        id="feeMax"
                        type="number"
                        {...form.register("feeMax")}
                        placeholder="50000"
                        className="bg-background/60"
                    />
                    {form.formState.errors.feeMax && (
                        <p className="text-xs text-destructive">{form.formState.errors.feeMax.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <Label>Performance Durations</Label>
                <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(duration => (
                        <Badge
                            key={duration}
                            variant={durations.includes(duration) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${durations.includes(duration)
                                ? "bg-primary hover:bg-primary/80"
                                : "hover:bg-primary/10 hover:border-primary"
                                }`}
                            onClick={() => toggleDuration(duration)}
                        >
                            {duration}
                        </Badge>
                    ))}
                </div>
                {durations.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one duration</p>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack} className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button
                    type="submit"
                    disabled={durations.length === 0}
                    className="bg-primary gap-2"
                >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function PortfolioStep({
    data,
    onUpdate,
    onNext,
    onBack,
}: {
    data: any;
    onUpdate: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const form = useForm<PortfolioInfo>({
        resolver: zodResolver(portfolioSchema),
        defaultValues: {
            soundcloudUrl: data.soundcloudUrl,
            mixcloudUrl: data.mixcloudUrl,
            instagramHandle: data.instagramHandle,
            websiteUrl: data.websiteUrl,
            achievements: data.achievements,
        },
    });

    const handleSubmit = (values: PortfolioInfo) => {
        onUpdate(values);
        onNext();
    };

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="soundcloudUrl" className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-orange-500" />
                        SoundCloud URL
                    </Label>
                    <Input
                        id="soundcloudUrl"
                        {...form.register("soundcloudUrl")}
                        placeholder="https://soundcloud.com/..."
                        className="bg-background/60"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mixcloudUrl" className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-purple-500" />
                        Mixcloud URL
                    </Label>
                    <Input
                        id="mixcloudUrl"
                        {...form.register("mixcloudUrl")}
                        placeholder="https://mixcloud.com/..."
                        className="bg-background/60"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="instagramHandle" className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        Instagram Handle
                    </Label>
                    <Input
                        id="instagramHandle"
                        {...form.register("instagramHandle")}
                        placeholder="@yourusername"
                        className="bg-background/60"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-500" />
                        Website
                    </Label>
                    <Input
                        id="websiteUrl"
                        {...form.register("websiteUrl")}
                        placeholder="https://yourwebsite.com"
                        className="bg-background/60"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="achievements">Major Achievements</Label>
                <Textarea
                    id="achievements"
                    {...form.register("achievements")}
                    placeholder="Awards, notable performances, festivals played..."
                    className="bg-background/60 min-h-[80px] resize-none"
                />
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack} className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button type="submit" className="bg-primary gap-2">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}

function TechnicalStep({
    data,
    onUpdate,
    onSubmit,
    onBack,
    isSubmitting,
}: {
    data: any;
    onUpdate: (data: any) => void;
    onSubmit: (finalData?: any) => void;
    onBack: () => void;
    isSubmitting: boolean;
}) {

    const form = useForm<TechnicalInfo>({
        resolver: zodResolver(technicalSchema),
        defaultValues: {
            technicalRider: data.technicalRider,
            equipmentRequirements: data.equipmentRequirements,
            travelPreferences: data.travelPreferences,
        },
    });

    const handleSubmit = (values: TechnicalInfo) => {
        onUpdate(values);
        // Pass the fully merged data to the final submit
        onSubmit({ ...data, ...values });
    };


    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="technicalRider">Technical Rider</Label>
                <Textarea
                    id="technicalRider"
                    {...form.register("technicalRider")}
                    placeholder="Describe your technical requirements: PA system, DJ equipment, monitors, etc."
                    className="bg-background/60 min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    Or upload a PDF later in your profile settings
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="equipmentRequirements">Equipment You Bring</Label>
                <Textarea
                    id="equipmentRequirements"
                    {...form.register("equipmentRequirements")}
                    placeholder="List any equipment you bring to gigs (controllers, instruments, etc.)"
                    className="bg-background/60 min-h-[80px] resize-none"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="travelPreferences">Travel Preferences</Label>
                <Select
                    defaultValue={data.travelPreferences || "local"}
                    onValueChange={(value) => form.setValue("travelPreferences", value)}
                >
                    <SelectTrigger className="bg-background/60">
                        <SelectValue placeholder="Select travel preference" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="local">Local gigs only (same city)</SelectItem>
                        <SelectItem value="regional">Regional (within state)</SelectItem>
                        <SelectItem value="national">National (pan-India)</SelectItem>
                        <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <strong>Almost done!</strong> Your profile will be live once you submit.
                </p>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" variant="ghost" onClick={onBack} className="gap-2" disabled={isSubmitting}>
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-violet-500 gap-2">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Complete Profile
                            <Sparkles className="w-4 h-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
