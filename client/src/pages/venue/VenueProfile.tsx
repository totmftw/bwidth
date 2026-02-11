import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Building2, MapPin, Music2, Settings, Camera,
    Save, Loader2, Globe, Instagram, Mail, Phone, X, Check
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

interface VenueQueryData {
    venue?: {
        id: number;
        name: string;
        description?: string;
        address?: any;
        capacity?: number;
        capacitySeated?: number;
        capacityStanding?: number;
        amenities?: string[];
        metadata?: any;
    };
}

const venueProfileSchema = z.object({
    name: z.string().min(2, "Venue name is required"),
    description: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    website: z.string().optional(),
    instagramHandle: z.string().optional(),
    bookingEmail: z.string().email().optional().or(z.literal("")),
    bookingPhone: z.string().optional(),
    capacity: z.coerce.number().optional(),
    capacitySeated: z.coerce.number().optional(),
    capacityStanding: z.coerce.number().optional(),
});

type VenueProfileForm = z.infer<typeof venueProfileSchema>;

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VenueProfile() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch venue profile
    const { data: venueData, isLoading } = useQuery<VenueQueryData>({
        queryKey: ["/api/venues/profile"],
        enabled: !!user,
    });

    const venue = venueData?.venue;
    const metadata = venue?.metadata || {};

    // State for editable sections
    const [preferredGenres, setPreferredGenres] = useState<string[]>(
        metadata?.musicPolicy?.preferredGenres || []
    );
    const [amenities, setAmenities] = useState<string[]>(venue?.amenities || []);
    const [equipment, setEquipment] = useState<string[]>(metadata?.equipment || []);

    // Form setup
    const form = useForm<VenueProfileForm>({
        resolver: zodResolver(venueProfileSchema),
        defaultValues: {
            name: venue?.name || "",
            description: venue?.description || "",
            address: typeof venue?.address === 'string' ? venue.address : "",
            city: "",
            website: metadata?.website || "",
            instagramHandle: metadata?.instagramHandle || "",
            bookingEmail: metadata?.bookingEmail || "",
            bookingPhone: metadata?.bookingPhone || "",
            capacity: venue?.capacity || 0,
            capacitySeated: venue?.capacitySeated || 0,
            capacityStanding: venue?.capacityStanding || 0,
        },
    });

    // Update form when data loads
    useEffect(() => {
        if (venue) {
            form.reset({
                name: venue.name || "",
                description: venue.description || "",
                address: typeof venue.address === 'string' ? venue.address : "",
                city: "",
                website: metadata?.website || "",
                instagramHandle: metadata?.instagramHandle || "",
                bookingEmail: metadata?.bookingEmail || "",
                bookingPhone: metadata?.bookingPhone || "",
                capacity: venue.capacity || 0,
                capacitySeated: venue.capacitySeated || 0,
                capacityStanding: venue.capacityStanding || 0,
            });
            setPreferredGenres(metadata?.musicPolicy?.preferredGenres || []);
            setAmenities(venue?.amenities || []);
            setEquipment(metadata?.equipment || []);
        }
    }, [venue]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch("/api/venues/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error("Failed to update profile");
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Profile updated successfully" });
            queryClient.invalidateQueries({ queryKey: ["/api/venues/profile"] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: VenueProfileForm) => {
        updateMutation.mutate({
            ...data,
            amenities,
            metadata: {
                ...metadata,
                equipment,
                musicPolicy: {
                    ...metadata?.musicPolicy,
                    preferredGenres,
                },
            },
        });
    };

    const toggleGenre = (genre: string) => {
        setPreferredGenres(prev =>
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const toggleAmenity = (item: string) => {
        setAmenities(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const toggleEquipment = (item: string) => {
        setEquipment(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    if (!user) return null;

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold">Venue Profile</h1>
                    <p className="text-muted-foreground">Manage your venue details and preferences</p>
                </div>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={updateMutation.isPending}
                    className="bg-primary"
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="bg-background/50">
                    <TabsTrigger value="basic">
                        <Building2 className="mr-2 w-4 h-4" /> Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="music">
                        <Music2 className="mr-2 w-4 h-4" /> Music Policy
                    </TabsTrigger>
                    <TabsTrigger value="amenities">
                        <Settings className="mr-2 w-4 h-4" /> Amenities
                    </TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Avatar Section */}
                        <Card className="glass-card border-white/5">
                            <CardHeader>
                                <CardTitle>Cover Image</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <Avatar className="w-32 h-32 border-4 border-primary/20">
                                    <AvatarImage src={metadata?.photos?.coverImageUrl} />
                                    <AvatarFallback className="text-4xl bg-secondary">
                                        <Building2 className="w-12 h-12" />
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="outline" className="w-full">
                                    <Camera className="mr-2 w-4 h-4" /> Change Photo
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Main Form */}
                        <Card className="md:col-span-2 glass-card border-white/5">
                            <CardHeader>
                                <CardTitle>Venue Details</CardTitle>
                                <CardDescription>Basic information about your venue</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Venue Name</Label>
                                        <Input {...form.register("name")} className="bg-background" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            {...form.register("description")}
                                            className="bg-background min-h-[100px]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Address</Label>
                                        <Textarea
                                            {...form.register("address")}
                                            className="bg-background"
                                        />
                                    </div>

                                    <Separator className="bg-white/10" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Globe className="w-4 h-4" /> Website
                                            </Label>
                                            <Input {...form.register("website")} className="bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Instagram className="w-4 h-4" /> Instagram
                                            </Label>
                                            <Input {...form.register("instagramHandle")} className="bg-background" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> Booking Email
                                            </Label>
                                            <Input {...form.register("bookingEmail")} className="bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Phone className="w-4 h-4" /> Phone
                                            </Label>
                                            <Input {...form.register("bookingPhone")} className="bg-background" />
                                        </div>
                                    </div>

                                    <Separator className="bg-white/10" />

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Total Capacity</Label>
                                            <Input type="number" {...form.register("capacity")} className="bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Seated</Label>
                                            <Input type="number" {...form.register("capacitySeated")} className="bg-background" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Standing</Label>
                                            <Input type="number" {...form.register("capacityStanding")} className="bg-background" />
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Music Policy Tab */}
                <TabsContent value="music">
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle>Music Policy</CardTitle>
                            <CardDescription>Define your venue's music preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Preferred Genres (Click to toggle)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {GENRES.map(genre => (
                                        <Badge
                                            key={genre}
                                            variant={preferredGenres.includes(genre) ? "default" : "outline"}
                                            className="cursor-pointer px-3 py-1 hover:bg-primary/20 transition-colors"
                                            onClick={() => toggleGenre(genre)}
                                        >
                                            {genre}
                                            {preferredGenres.includes(genre) && <Check className="ml-1 w-3 h-3" />}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Amenities Tab */}
                <TabsContent value="amenities" className="space-y-6">
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle>Venue Amenities</CardTitle>
                            <CardDescription>Facilities available at your venue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {AMENITIES_LIST.map(item => (
                                    <Badge
                                        key={item}
                                        variant={amenities.includes(item) ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1"
                                        onClick={() => toggleAmenity(item)}
                                    >
                                        {item}
                                        {amenities.includes(item) && <X className="ml-1 w-3 h-3" />}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle>Technical Equipment</CardTitle>
                            <CardDescription>Equipment you provide for performances</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {EQUIPMENT_LIST.map(item => (
                                    <Badge
                                        key={item}
                                        variant={equipment.includes(item) ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1"
                                        onClick={() => toggleEquipment(item)}
                                    >
                                        {item}
                                        {equipment.includes(item) && <X className="ml-1 w-3 h-3" />}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
