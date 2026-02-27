import { useState } from "react";
import { useArtists } from "@/hooks/use-artists";
import { useVenues } from "@/hooks/use-venues";
import { BookingModal } from "@/components/BookingModal";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Music, MapPin, Star, TrendingUp, DollarSign, Filter, X, Building2, Users } from "lucide-react";
import { Artist, User, Venue } from "@shared/schema";

type ArtistWithUser = Artist & { user: User };

const GENRES = [
  "Techno",
  "House",
  "Trance",
  "Drum & Bass",
  "Dubstep",
  "Hip Hop",
  "Jazz",
  "Rock",
  "Electronic",
  "Ambient"
];

const CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Goa",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata"
];

type SortOption = "relevance" | "price-low" | "price-high" | "rating" | "trust-score";

interface Filters {
  search: string;
  genres: string[];
  minBudget: number;
  maxBudget: number;
  location: string;
  minTrustScore: number;
}

interface VenueFilters {
  search: string;
  minCapacity: number;
  maxCapacity: number;
  location: string;
  amenities: string[];
}

const AMENITIES = [
  "Sound System",
  "Lighting",
  "Stage",
  "Bar",
  "Parking",
  "Green Room",
  "Security",
  "Outdoor Space"
];

export default function OrganizerDiscover() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"artists" | "venues">("artists");
  const [selectedArtist, setSelectedArtist] = useState<ArtistWithUser | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    search: "",
    genres: [],
    minBudget: 0,
    maxBudget: 100000,
    location: "",
    minTrustScore: 0,
  });

  const [venueFilters, setVenueFilters] = useState<VenueFilters>({
    search: "",
    minCapacity: 0,
    maxCapacity: 5000,
    location: "",
    amenities: [],
  });

  // Fetch artists with basic filters (API supports genre, minFee, maxFee)
  const { data: artists, isLoading } = useArtists({
    genre: filters.genres[0], // API currently supports single genre
    minFee: filters.minBudget,
    maxFee: filters.maxBudget,
  });

  // Fetch venues
  const { data: venues, isLoading: isLoadingVenues } = useVenues();

  // Client-side filtering and sorting
  const filteredAndSortedArtists = artists
    ? artists
        .filter((artist) => {
          // Search filter
          if (filters.search && !artist.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
          }
          
          // Location filter (checking metadata)
          if (filters.location && artist.metadata) {
            const metadata = artist.metadata as any;
            const city = metadata.city || metadata.location;
            if (!city || !city.toLowerCase().includes(filters.location.toLowerCase())) {
              return false;
            }
          }
          
          // Trust score filter (from metadata)
          if (filters.minTrustScore > 0 && artist.metadata) {
            const metadata = artist.metadata as any;
            const trustScore = metadata.trustScore || 0;
            if (trustScore < filters.minTrustScore) {
              return false;
            }
          }
          
          return true;
        })
        .sort((a, b) => {
          switch (sortBy) {
            case "price-low":
              return Number(a.priceFrom || 0) - Number(b.priceFrom || 0);
            case "price-high":
              return Number(b.priceTo || 0) - Number(a.priceTo || 0);
            case "rating":
              return Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0);
            case "trust-score": {
              const aTrust = (a.metadata as any)?.trustScore || 0;
              const bTrust = (b.metadata as any)?.trustScore || 0;
              return bTrust - aTrust;
            }
            case "relevance":
            default:
              return 0;
          }
        })
    : [];

  const toggleGenre = (genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setVenueFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      genres: [],
      minBudget: 0,
      maxBudget: 100000,
      location: "",
      minTrustScore: 0,
    });
  };

  const clearVenueFilters = () => {
    setVenueFilters({
      search: "",
      minCapacity: 0,
      maxCapacity: 5000,
      location: "",
      amenities: [],
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.genres.length > 0 || 
    filters.minBudget > 0 || 
    filters.maxBudget < 100000 || 
    filters.location || 
    filters.minTrustScore > 0;

  const hasActiveVenueFilters =
    venueFilters.search ||
    venueFilters.minCapacity > 0 ||
    venueFilters.maxCapacity < 5000 ||
    venueFilters.location ||
    venueFilters.amenities.length > 0;

  // Client-side venue filtering
  const filteredVenues = venues
    ? venues.filter((venue: Venue) => {
        // Search filter
        if (venueFilters.search && !venue.name.toLowerCase().includes(venueFilters.search.toLowerCase())) {
          return false;
        }

        // Capacity filter
        const capacity = venue.capacity || 0;
        if (capacity < venueFilters.minCapacity || capacity > venueFilters.maxCapacity) {
          return false;
        }

        // Location filter (checking address or metadata)
        if (venueFilters.location) {
          const addressStr = venue.address ? JSON.stringify(venue.address).toLowerCase() : "";
          const metadataStr = venue.metadata ? JSON.stringify(venue.metadata).toLowerCase() : "";
          if (!addressStr.includes(venueFilters.location.toLowerCase()) && 
              !metadataStr.includes(venueFilters.location.toLowerCase())) {
            return false;
          }
        }

        // Amenities filter (all selected amenities must be present)
        if (venueFilters.amenities.length > 0) {
          const venueAmenities = (venue.amenities as string[]) || [];
          const hasAllAmenities = venueFilters.amenities.every((amenity) =>
            venueAmenities.some((va) => va.toLowerCase().includes(amenity.toLowerCase()))
          );
          if (!hasAllAmenities) {
            return false;
          }
        }

        return true;
      })
    : [];

  // Get organizer ID from user metadata
  const organizerId = user?.metadata ? (user.metadata as any).organizerId : undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discover Talent</h1>
          <p className="text-muted-foreground">Find the perfect artists and venues for your events</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "artists" | "venues")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>

        <TabsContent value="artists" className="space-y-6">
          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artists by name..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2">
                        Active
                      </Badge>
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Genre Filter */}
                    <div className="space-y-2">
                      <Label>Genres</Label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map((genre) => (
                          <Badge
                            key={genre}
                            variant={filters.genres.includes(genre) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleGenre(genre)}
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Budget Range */}
                    <div className="space-y-2">
                      <Label>Budget Range (₹)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.minBudget}
                          onChange={(e) => setFilters({ ...filters, minBudget: Number(e.target.value) })}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.maxBudget}
                          onChange={(e) => setFilters({ ...filters, maxBudget: Number(e.target.value) })}
                          className="w-32"
                        />
                      </div>
                      <Slider
                        value={[filters.minBudget, filters.maxBudget]}
                        onValueChange={([min, max]) => setFilters({ ...filters, minBudget: min, maxBudget: max })}
                        min={0}
                        max={100000}
                        step={1000}
                        className="mt-2"
                      />
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select value={filters.location} onValueChange={(v) => setFilters({ ...filters, location: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Cities</SelectItem>
                          {CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Trust Score Filter */}
                    <div className="space-y-2">
                      <Label>Minimum Trust Score: {filters.minTrustScore}</Label>
                      <Slider
                        value={[filters.minTrustScore]}
                        onValueChange={([v]) => setFilters({ ...filters, minTrustScore: v })}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>

                    {hasActiveFilters && (
                      <Button variant="ghost" onClick={clearFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="trust-score">Trust Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Artist Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedArtists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No artists found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedArtists.map((artist) => {
                const metadata = artist.metadata as any;
                const trustScore = metadata?.trustScore || 50;
                const city = metadata?.city || metadata?.location || "Unknown";
                const genres = metadata?.genres || [];

                return (
                  <Card
                    key={artist.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedArtist(artist)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{artist.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {city}
                          </CardDescription>
                        </div>
                        <Badge variant={trustScore >= 70 ? "default" : trustScore >= 50 ? "secondary" : "outline"}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {trustScore}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Genres */}
                      {genres.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {genres.slice(0, 3).map((genre: string) => (
                            <Badge key={genre} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Price Range */}
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          ₹{Number(artist.priceFrom || 0).toLocaleString()} - ₹
                          {Number(artist.priceTo || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>
                          {Number(artist.ratingAvg || 0).toFixed(1)} ({artist.ratingCount || 0} reviews)
                        </span>
                      </div>

                      {/* Bio Preview */}
                      {artist.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{artist.bio}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="venues" className="space-y-6">
          {/* Search and Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search venues by name..."
                      value={venueFilters.search}
                      onChange={(e) => setVenueFilters({ ...venueFilters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveVenueFilters && (
                      <Badge variant="secondary" className="ml-2">
                        Active
                      </Badge>
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Capacity Range */}
                    <div className="space-y-2">
                      <Label>Capacity Range</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={venueFilters.minCapacity}
                          onChange={(e) => setVenueFilters({ ...venueFilters, minCapacity: Number(e.target.value) })}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={venueFilters.maxCapacity}
                          onChange={(e) => setVenueFilters({ ...venueFilters, maxCapacity: Number(e.target.value) })}
                          className="w-32"
                        />
                      </div>
                      <Slider
                        value={[venueFilters.minCapacity, venueFilters.maxCapacity]}
                        onValueChange={([min, max]) => setVenueFilters({ ...venueFilters, minCapacity: min, maxCapacity: max })}
                        min={0}
                        max={5000}
                        step={50}
                        className="mt-2"
                      />
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select value={venueFilters.location} onValueChange={(v) => setVenueFilters({ ...venueFilters, location: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Cities</SelectItem>
                          {CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amenities Filter */}
                    <div className="space-y-2">
                      <Label>Amenities</Label>
                      <div className="flex flex-wrap gap-2">
                        {AMENITIES.map((amenity) => (
                          <Badge
                            key={amenity}
                            variant={venueFilters.amenities.includes(amenity) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleAmenity(amenity)}
                          >
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {hasActiveVenueFilters && (
                      <Button variant="ghost" onClick={clearVenueFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Venue Cards Grid */}
          {isLoadingVenues ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVenues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No venues found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue: Venue) => {
                const metadata = venue.metadata as any;
                const address = venue.address as any;
                const city = address?.city || metadata?.city || "Unknown";
                const amenities = (venue.amenities as string[]) || [];

                return (
                  <Card
                    key={venue.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedVenue(venue)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{venue.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {city}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Capacity */}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          Capacity: {venue.capacity?.toLocaleString() || "N/A"}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>
                          {Number(venue.ratingAvg || 0).toFixed(1)} ({venue.ratingCount || 0} reviews)
                        </span>
                      </div>

                      {/* Amenities Preview */}
                      {amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {amenities.slice(0, 3).map((amenity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{amenities.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Description Preview */}
                      {venue.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{venue.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Artist Profile Dialog */}
      {selectedArtist && (
        <Dialog open={!!selectedArtist} onOpenChange={() => setSelectedArtist(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedArtist.name}</DialogTitle>
              <DialogDescription>
                {selectedArtist.isBand ? "Band" : "Solo Artist"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {((selectedArtist.metadata as any)?.trustScore || 50)}
                  </div>
                  <div className="text-xs text-muted-foreground">Trust Score</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {Number(selectedArtist.ratingAvg || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedArtist.ratingCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Reviews</div>
                </div>
              </div>

              {/* Bio */}
              {selectedArtist.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{selectedArtist.bio}</p>
                </div>
              )}

              {/* Genres */}
              {(selectedArtist.metadata as any)?.genres && (
                <div>
                  <h3 className="font-semibold mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {((selectedArtist.metadata as any).genres as string[]).map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <h3 className="font-semibold mb-2">Price Range</h3>
                <p className="text-lg">
                  ₹{Number(selectedArtist.priceFrom || 0).toLocaleString()} - ₹
                  {Number(selectedArtist.priceTo || 0).toLocaleString()}
                </p>
              </div>

              {/* Portfolio Links */}
              {(selectedArtist.metadata as any)?.portfolioLinks && (
                <div>
                  <h3 className="font-semibold mb-2">Portfolio</h3>
                  <div className="space-y-2">
                    {Object.entries((selectedArtist.metadata as any).portfolioLinks).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        {platform}: {url as string}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance History */}
              {(selectedArtist.metadata as any)?.pastVenues && (
                <div>
                  <h3 className="font-semibold mb-2">Past Venues</h3>
                  <div className="flex flex-wrap gap-2">
                    {((selectedArtist.metadata as any).pastVenues as string[]).map((venue, idx) => (
                      <Badge key={idx} variant="outline">
                        {venue}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking Button */}
              {organizerId && (
                <div className="pt-4 border-t">
                  <BookingModal
                    artistId={selectedArtist.id}
                    artistName={selectedArtist.name}
                    organizerId={organizerId}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Venue Profile Dialog */}
      {selectedVenue && (
        <Dialog open={!!selectedVenue} onOpenChange={() => setSelectedVenue(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedVenue.name}</DialogTitle>
              <DialogDescription>
                {((selectedVenue.address as any)?.city || (selectedVenue.metadata as any)?.city || "Venue")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedVenue.capacity?.toLocaleString() || "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Capacity</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {Number(selectedVenue.ratingAvg || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedVenue.ratingCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Reviews</div>
                </div>
              </div>

              {/* Description */}
              {selectedVenue.description && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{selectedVenue.description}</p>
                </div>
              )}

              {/* Address */}
              {selectedVenue.address && (
                <div>
                  <h3 className="font-semibold mb-2">Address</h3>
                  <p className="text-sm text-muted-foreground">
                    {typeof selectedVenue.address === 'string' 
                      ? selectedVenue.address 
                      : JSON.stringify(selectedVenue.address, null, 2).replace(/[{}"]/g, '').replace(/,/g, ', ')}
                  </p>
                </div>
              )}

              {/* Capacity Details */}
              <div>
                <h3 className="font-semibold mb-2">Capacity Details</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-semibold">{selectedVenue.capacity?.toLocaleString() || "N/A"}</div>
                  </div>
                  {selectedVenue.capacitySeated && (
                    <div>
                      <div className="text-muted-foreground">Seated</div>
                      <div className="font-semibold">{selectedVenue.capacitySeated.toLocaleString()}</div>
                    </div>
                  )}
                  {selectedVenue.capacityStanding && (
                    <div>
                      <div className="text-muted-foreground">Standing</div>
                      <div className="font-semibold">{selectedVenue.capacityStanding.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              {selectedVenue.amenities && (selectedVenue.amenities as string[]).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedVenue.amenities as string[]).map((amenity, idx) => (
                      <Badge key={idx} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {(selectedVenue.metadata as any)?.photos && (
                <div>
                  <h3 className="font-semibold mb-2">Photos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {((selectedVenue.metadata as any).photos as string[]).slice(0, 4).map((photo, idx) => (
                      <div key={idx} className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img src={photo} alt={`${selectedVenue.name} ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Event Button */}
              <div className="pt-4 border-t">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    setSelectedVenue(null);
                    setLocation(`/organizer/events/create?venueId=${selectedVenue.id}&venueName=${encodeURIComponent(selectedVenue.name)}`);
                  }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Event at this Venue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
