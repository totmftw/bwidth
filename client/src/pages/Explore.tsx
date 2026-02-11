import { useState } from "react";
import { useArtists } from "@/hooks/use-artists";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingModal } from "@/components/BookingModal";
import { Search, SlidersHorizontal, MapPin, Music2, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Explore() {
  const [search, setSearch] = useState("");
  const { data: artists, isLoading } = useArtists({ genre: search || undefined });
  const { user } = useAuth();

  // Allow organizers and venue managers to access
  const isOrganizer = !!user?.organizer;
  const isVenue = user?.role === 'venue' || user?.role === 'venue_manager';

  if (!isOrganizer && !isVenue) return <div className="p-8">Access Denied</div>;

  // For venues without an organizer record, we'll use the user id as a reference
  const organizerId = user?.organizer?.id || user?.id || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Find Talent</h1>
          <p className="text-muted-foreground">Discover verified artists for your next event</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by genre (e.g. Techno, House)..."
              className="pl-9 bg-card border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="border-white/10">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <ArtistSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists?.map((artist) => (
            <Card key={artist.id} className="group overflow-hidden border-white/5 bg-card/40 hover:bg-card/60 transition-all duration-300 hover:border-primary/30">
              {/* Cover Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900 relative">
                <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                    {artist.user.name}
                    {artist.verified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </h3>
                  <p className="text-sm text-gray-300 flex items-center gap-1">
                    <Music2 className="w-3 h-3" /> {artist.genre}
                  </p>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {artist.secondaryGenres?.slice(0, 3).map(g => (
                    <Badge key={g} variant="secondary" className="bg-white/5 hover:bg-white/10 text-xs">
                      {g}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fee Range</span>
                  <span className="font-semibold">₹{artist.feeMin} - ₹{artist.feeMax}</span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {artist.bio || "No bio available."}
                </p>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <BookingModal
                  artistId={artist.id}
                  artistName={artist.user.name}
                  organizerId={organizerId}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-card/40 overflow-hidden space-y-3">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
