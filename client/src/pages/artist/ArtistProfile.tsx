import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateArtist } from "@/hooks/use-artists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
    Loader2,
    User,
    Music,
    DollarSign,
    Link2,
    FileText,
    Camera,
    Instagram,
    Globe,
    Verified,
    Shield,
    Star,
    MapPin,
    Clock,
    IndianRupee,
    Save,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle,
    Upload,
    X
} from "lucide-react";

const GENRES = [
    "Techno", "House", "EDM", "Trance", "Dubstep", "Drum & Bass",
    "Hip Hop", "R&B", "Pop", "Rock", "Indie", "Jazz",
    "Classical", "Bollywood", "Folk", "Reggae", "Ambient", "Other"
];

// Helper to extract artist extended data from metadata
function getArtistData(artist: any) {
    const metadata = artist?.metadata as any || {};
    return {
        id: artist?.id,
        name: artist?.name || metadata?.stageName || "",
        stageName: artist?.name || metadata?.stageName || "",
        bio: artist?.bio || "",
        primaryGenre: metadata?.primaryGenre || "",
        secondaryGenres: metadata?.secondaryGenres || [],
        location: artist?.baseLocation?.name || metadata?.location || "",
        yearsOfExperience: metadata?.yearsOfExperience || 0,
        feeMin: Number(artist?.priceFrom) || 0,
        feeMax: Number(artist?.priceTo) || 0,
        currency: artist?.currency || "INR",
        performanceDurations: metadata?.performanceDurations || [],
        soundcloud: metadata?.soundcloud || "",
        mixcloud: metadata?.mixcloud || "",
        instagram: metadata?.instagram || "",
        website: metadata?.website || "",
        spotify: metadata?.spotify || "",
        youtube: metadata?.youtube || "",
        achievements: metadata?.achievements || "",
        technicalRider: metadata?.technicalRider || "",
        equipmentRequirements: metadata?.equipmentRequirements || "",
        equipmentBrings: metadata?.equipmentBrings || "",
        travelPreferences: metadata?.travelPreferences || "national",

        // Hospitality & Pricing Switches
        hasTravelExpenses: metadata?.hasTravelExpenses || false,
        hasAccommodation: metadata?.hasAccommodation || false,
        hasEquipmentRental: metadata?.hasEquipmentRental || false,
        hasExtraHours: metadata?.hasExtraHours || false,
        hasGreenRoom: metadata?.hasGreenRoom || false,
        hasAirportPickup: metadata?.hasAirportPickup || false,
        hasGuestList: metadata?.hasGuestList || true,
        hasMeals: metadata?.hasMeals || false,

        trustScore: metadata?.trustScore || 50,
        verified: metadata?.verified || false,
        bankVerified: metadata?.bankVerified || false,
        profileImage: metadata?.profileImage || "",
        profileComplete: metadata?.profileComplete || false,
        ratingAvg: artist?.ratingAvg || "0",
        ratingCount: artist?.ratingCount || 0,
    };
}




export default function ArtistProfile() {
    const { user } = useAuth();
    const { toast } = useToast();
    const updateArtist = useUpdateArtist();
    const [activeTab, setActiveTab] = useState("profile");

    if (!user) return null;

    const rawArtist = user.artist;
    const artist = rawArtist ? getArtistData(rawArtist) : null;
    const isArtist = user.role === "artist";

    // Calculate profile completion
    const profileFields = [
        artist?.bio,
        artist?.primaryGenre,
        artist?.feeMin,
        artist?.feeMax,
        artist?.instagram || artist?.soundcloud,
        artist?.technicalRider,
    ];
    const filledFields = profileFields.filter(f => f).length;
    const profileCompletion = Math.round((filledFields / profileFields.length) * 100);


    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your artist profile and preferences</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-muted-foreground">Profile Strength</p>
                        <p className="font-semibold text-primary">{profileCompletion}%</p>
                    </div>
                    <div className="w-20">
                        <Progress value={profileCompletion} className="h-2" />
                    </div>
                </div>
            </div>

            {/* Profile Completion Alert */}
            {profileCompletion < 100 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">Complete your profile to get more bookings</p>
                                <p className="text-sm text-muted-foreground">
                                    Artists with complete profiles get 3x more booking requests
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                {artist?.primaryGenre && (
                                    <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 transition-colors">{artist?.primaryGenre}</Badge>
                                )}
                                <Badge variant="outline" className="bg-primary/20 text-primary">
                                    {profileCompletion}% Complete
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Avatar & Quick Info */}
                <div className="space-y-6">
                    {/* Avatar Card */}
                    <Card className="glass-card border-white/5">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center">
                                <div className="relative mb-4">
                                    <Avatar className="w-32 h-32 border-4 border-primary/20">
                                        <AvatarImage src={artist?.profileImage} />
                                        <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-violet-500 text-white">
                                            {user.name?.[0] || "A"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute bottom-0 right-0 rounded-full shadow-lg"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </Button>
                                </div>
                                <h3 className="text-xl font-bold">{artist?.stageName || user.name}</h3>
                                <p className="text-muted-foreground">{artist?.primaryGenre || "Artist"}</p>

                                {artist?.verified && (
                                    <Badge className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">
                                        <Verified className="w-3 h-3 mr-1" />
                                        Verified Artist
                                    </Badge>
                                )}
                            </div>

                            <Separator className="my-6 bg-white/10" />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Star className="w-4 h-4 text-yellow-500" />
                                        Trust Score
                                    </span>
                                    <span className="font-semibold">{artist?.trustScore || 50}/100</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Location
                                    </span>
                                    <span className="font-semibold">{artist?.location || "Not set"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4" />
                                        Fee Range
                                    </span>
                                    <span className="font-semibold">
                                        {artist?.feeMin && artist?.feeMax
                                            ? `₹${artist.feeMin.toLocaleString('en-IN')} - ₹${artist.feeMax.toLocaleString('en-IN')}`
                                            : "Not set"
                                        }
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                Verification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm">Email verified</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-sm">Phone verified</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {artist?.verified ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    )}
                                    <span className="text-sm">ID verification</span>
                                </div>
                                {!artist?.verified && (
                                    <Button size="sm" variant="outline" className="text-xs h-7">
                                        Verify
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {artist?.bankVerified ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                                    )}
                                    <span className="text-sm">Bank account</span>
                                </div>
                                {!artist?.bankVerified && (
                                    <Button size="sm" variant="outline" className="text-xs h-7">
                                        Add
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Main Content */}
                <div className="lg:col-span-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="bg-background/60 border border-white/10 mb-6">
                            <TabsTrigger value="profile" className="gap-2">
                                <User className="w-4 h-4" />
                                Profile
                            </TabsTrigger>
                            <TabsTrigger value="pricing" className="gap-2">
                                <IndianRupee className="w-4 h-4" />
                                Pricing
                            </TabsTrigger>
                            <TabsTrigger value="portfolio" className="gap-2">
                                <Link2 className="w-4 h-4" />
                                Portfolio
                            </TabsTrigger>
                            <TabsTrigger value="technical" className="gap-2">
                                <FileText className="w-4 h-4" />
                                Technical
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile">
                            {isArtist && artist && (
                                <ProfileTab artist={artist} updateMutation={updateArtist} />
                            )}
                        </TabsContent>

                        <TabsContent value="pricing">
                            {isArtist && artist && (
                                <PricingTab artist={artist} updateMutation={updateArtist} />
                            )}
                        </TabsContent>

                        <TabsContent value="portfolio">
                            {isArtist && artist && (
                                <PortfolioTab artist={artist} updateMutation={updateArtist} />
                            )}
                        </TabsContent>

                        <TabsContent value="technical">
                            {isArtist && artist && (
                                <TechnicalTab artist={artist} updateMutation={updateArtist} />
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Account Settings */}
                    <Card className="glass-card border-white/5 mt-6">
                        <CardHeader>
                            <CardTitle>Account Settings</CardTitle>
                            <CardDescription>Your personal information (Private)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={user.name || ""} disabled className="bg-white/5" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={user.email || ""} disabled className="bg-white/5" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={user.phone || ""} disabled className="bg-white/5" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input value={user.username || ""} disabled className="bg-white/5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ProfileTab({ artist, updateMutation }: { artist: any; updateMutation: any }) {
    const form = useForm({
        defaultValues: {
            stageName: artist.stageName || "",
            bio: artist.bio || "",
            primaryGenre: artist.primaryGenre || "",
            secondaryGenres: artist.secondaryGenres || [],
            location: artist.location || "",
            yearsOfExperience: artist.yearsOfExperience || 0,
        }
    });

    const [secondaryGenres, setSecondaryGenres] = useState<string[]>(artist.secondaryGenres || []);

    const onSubmit = (data: any) => {
        updateMutation.mutate({
            id: artist.id,
            ...data,
            secondaryGenres,
        });
    };

    const toggleSecondaryGenre = (genre: string) => {
        if (genre === form.getValues("primaryGenre")) return;
        setSecondaryGenres(prev => {
            if (prev.includes(genre)) {
                return prev.filter(g => g !== genre);
            }
            if (prev.length >= 3) return prev;
            return [...prev, genre];
        });
    };

    return (
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle>Artist Details</CardTitle>
                <CardDescription>This information is visible to organizers</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Stage Name</Label>
                            <Input
                                {...form.register("stageName")}
                                placeholder="Your artist/band name"
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                {...form.register("location")}
                                placeholder="City, Country"
                                className="bg-background/60"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                            {...form.register("bio")}
                            placeholder="Tell organizers about your musical journey..."
                            className="bg-background/60 min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">
                            {(form.watch("bio") || "").length}/500 characters
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Primary Genre</Label>
                            <Select
                                value={form.watch("primaryGenre")}
                                onValueChange={(value) => form.setValue("primaryGenre", value)}
                            >
                                <SelectTrigger className="bg-background/60">
                                    <SelectValue placeholder="Select genre" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GENRES.map(genre => (
                                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Years of Experience</Label>
                            <Input
                                type="number"
                                {...form.register("yearsOfExperience")}
                                min="0"
                                max="50"
                                className="bg-background/60"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Secondary Genres (up to 3)</Label>
                        <div className="flex flex-wrap gap-2">
                            {GENRES.filter(g => g !== form.watch("primaryGenre")).map(genre => (
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
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateMutation.isPending} className="bg-primary gap-2">
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function PricingTab({ artist, updateMutation }: { artist: any; updateMutation: any }) {
    const form = useForm({
        defaultValues: {
            feeMin: artist.feeMin || 5000,
            feeMax: artist.feeMax || 50000,
            currency: artist.currency || "INR",
            hasTravelExpenses: artist.hasTravelExpenses || false,
            hasAccommodation: artist.hasAccommodation || false,
            hasEquipmentRental: artist.hasEquipmentRental || false,
            hasExtraHours: artist.hasExtraHours || false,
        }
    });

    const [durations, setDurations] = useState<string[]>(artist.performanceDurations || ["60 min"]);
    const DURATIONS = ["30 min", "60 min", "90 min", "120 min", "180 min"];

    const onSubmit = (data: any) => {
        updateMutation.mutate({
            id: artist.id,
            ...data,
            performanceDurations: durations,
        });
    };

    return (
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle>Pricing & Rates</CardTitle>
                <CardDescription>Set your fee range for bookings</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm text-muted-foreground">
                            💡 <strong>Tip:</strong> Artists similar to you typically charge between ₹5,000 - ₹50,000 per gig.
                            You can negotiate individual rates during booking discussions.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Minimum Fee (₹)</Label>
                            <Input
                                type="number"
                                {...form.register("feeMin")}
                                placeholder="5000"
                                className="bg-background/60"
                            />
                            <p className="text-xs text-muted-foreground">
                                Lowest fee you'd accept
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Maximum Fee (₹)</Label>
                            <Input
                                type="number"
                                {...form.register("feeMax")}
                                placeholder="50000"
                                className="bg-background/60"
                            />
                            <p className="text-xs text-muted-foreground">
                                Premium rate for bigger events
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Performance Durations You Offer</Label>
                        <div className="flex flex-wrap gap-2">
                            {DURATIONS.map(duration => (
                                <Badge
                                    key={duration}
                                    variant={durations.includes(duration) ? "default" : "outline"}
                                    className={`cursor-pointer transition-all ${durations.includes(duration)
                                        ? "bg-primary hover:bg-primary/80"
                                        : "hover:bg-primary/10 hover:border-primary"
                                        }`}
                                    onClick={() => {
                                        setDurations(prev =>
                                            prev.includes(duration)
                                                ? prev.filter(d => d !== duration)
                                                : [...prev, duration]
                                        );
                                    }}
                                >
                                    {duration}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="space-y-4">
                        <h4 className="font-semibold">Additional Charges</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Travel expenses</span>
                                <Switch
                                    checked={form.watch("hasTravelExpenses")}
                                    onCheckedChange={(val) => form.setValue("hasTravelExpenses", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Accommodation</span>
                                <Switch
                                    checked={form.watch("hasAccommodation")}
                                    onCheckedChange={(val) => form.setValue("hasAccommodation", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Equipment rental</span>
                                <Switch
                                    checked={form.watch("hasEquipmentRental")}
                                    onCheckedChange={(val) => form.setValue("hasEquipmentRental", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Extra hours</span>
                                <Switch
                                    checked={form.watch("hasExtraHours")}
                                    onCheckedChange={(val) => form.setValue("hasExtraHours", val)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateMutation.isPending} className="bg-primary gap-2">
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function PortfolioTab({ artist, updateMutation }: { artist: any; updateMutation: any }) {
    const form = useForm({
        defaultValues: {
            soundcloud: artist.soundcloud || "",
            mixcloud: artist.mixcloud || "",
            instagram: artist.instagram || "",
            website: artist.website || "",
            spotify: artist.spotify || "",
            youtube: artist.youtube || "",
            achievements: artist.achievements || "",
        }
    });

    const onSubmit = (data: any) => {
        updateMutation.mutate({
            id: artist.id,
            ...data,
        });
    };

    return (
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle>Portfolio & Social Links</CardTitle>
                <CardDescription>Showcase your work and connect your profiles</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-orange-500" />
                                SoundCloud
                            </Label>
                            <Input
                                {...form.register("soundcloud")}
                                placeholder="https://soundcloud.com/..."
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-purple-500" />
                                Mixcloud
                            </Label>
                            <Input
                                {...form.register("mixcloud")}
                                placeholder="https://mixcloud.com/..."
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Instagram className="w-4 h-4 text-pink-500" />
                                Instagram
                            </Label>
                            <Input
                                {...form.register("instagram")}
                                placeholder="@yourusername"
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" />
                                Website
                            </Label>
                            <Input
                                {...form.register("website")}
                                placeholder="https://yourwebsite.com"
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-green-500" />
                                Spotify
                            </Label>
                            <Input
                                {...form.register("spotify")}
                                placeholder="https://open.spotify.com/artist/..."
                                className="bg-background/60"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-red-500" />
                                YouTube
                            </Label>
                            <Input
                                {...form.register("youtube")}
                                placeholder="https://youtube.com/@..."
                                className="bg-background/60"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Achievements & Awards</Label>
                        <Textarea
                            {...form.register("achievements")}
                            placeholder="List notable performances, awards, festival appearances..."
                            className="bg-background/60 min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Photos</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors flex items-center justify-center cursor-pointer bg-background/40"
                                >
                                    <Upload className="w-6 h-6 text-muted-foreground" />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Upload up to 10 photos. JPG, PNG, max 5MB each.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateMutation.isPending} className="bg-primary gap-2">
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function TechnicalTab({ artist, updateMutation }: { artist: any; updateMutation: any }) {
    const form = useForm({
        defaultValues: {
            technicalRider: artist.technicalRider || "",
            equipmentRequirements: artist.equipmentRequirements || "",
            equipmentBrings: artist.equipmentBrings || "",
            travelPreferences: artist.travelPreferences || "national",
            hasGreenRoom: artist.hasGreenRoom || false,
            hasAirportPickup: artist.hasAirportPickup || false,
            hasGuestList: artist.hasGuestList !== undefined ? artist.hasGuestList : true,
            hasMeals: artist.hasMeals || false,
        }
    });

    const onSubmit = (data: any) => {
        updateMutation.mutate({
            id: artist.id,
            ...data,
        });
    };

    return (
        <Card className="glass-card border-white/5">
            <CardHeader>
                <CardTitle>Technical Requirements</CardTitle>
                <CardDescription>Equipment and technical specifications for your performances</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Technical Rider</Label>
                        <Textarea
                            {...form.register("technicalRider")}
                            placeholder="Describe your complete technical requirements: PA system specs, DJ equipment, monitors, lighting, etc."
                            className="bg-background/60 min-h-[120px]"
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <Button type="button" variant="outline" size="sm" className="gap-2">
                                <Upload className="w-4 h-4" />
                                Upload PDF
                            </Button>
                            <span className="text-xs text-muted-foreground">Or upload a technical rider document</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Equipment Requirements (Venue Must Provide)</Label>
                        <Textarea
                            {...form.register("equipmentRequirements")}
                            placeholder="List what the venue needs to have: CDJs, mixer, monitors, etc."
                            className="bg-background/60 min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Equipment You Bring</Label>
                        <Textarea
                            {...form.register("equipmentBrings")}
                            placeholder="List any equipment you bring to gigs: controllers, instruments, etc."
                            className="bg-background/60 min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Travel Preferences</Label>
                        <Select
                            value={form.watch("travelPreferences")}
                            onValueChange={(value) => form.setValue("travelPreferences", value)}
                        >
                            <SelectTrigger className="bg-background/60">
                                <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="local">Local gigs only (same city)</SelectItem>
                                <SelectItem value="regional">Regional (within state)</SelectItem>
                                <SelectItem value="national">National (pan-India)</SelectItem>
                                <SelectItem value="international">International</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="bg-white/10" />

                    <div className="space-y-4">
                        <h4 className="font-semibold">Hospitality Requirements</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Green room required</span>
                                <Switch
                                    checked={form.watch("hasGreenRoom")}
                                    onCheckedChange={(val) => form.setValue("hasGreenRoom", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Airport pickup</span>
                                <Switch
                                    checked={form.watch("hasAirportPickup")}
                                    onCheckedChange={(val) => form.setValue("hasAirportPickup", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Guest list (5 passes)</span>
                                <Switch
                                    checked={form.watch("hasGuestList")}
                                    onCheckedChange={(val) => form.setValue("hasGuestList", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                                <span className="text-sm">Meals provided</span>
                                <Switch
                                    checked={form.watch("hasMeals")}
                                    onCheckedChange={(val) => form.setValue("hasMeals", val)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateMutation.isPending} className="bg-primary gap-2">
                            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
