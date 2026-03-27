import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarPlus, MapPin, Star, TrendingUp, Music, Play, ExternalLink, Download } from "lucide-react";

interface ArtistProfileModalProps {
  artist: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistProfileModal({ artist, open, onOpenChange }: ArtistProfileModalProps) {
  if (!artist) return null;

  const metadata = artist.metadata || {};
  const trustScore = metadata.trustScore || 50;
  const city = metadata.city || metadata.location || "Unknown";
  const genres = metadata.genres || [];
  const photos = metadata.photos || [];
  const videos = metadata.videos || [];
  const pastVenues = metadata.pastVenues || [];
  const portfolioLinks = metadata.portfolioLinks || {};
  const techRider = metadata.techRider; // Should be URL or text

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{artist.name || artist.stageName}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {city} • {artist.isBand ? "Band" : "Solo Artist"}
              </DialogDescription>
            </div>
            <Badge variant={trustScore >= 70 ? "default" : trustScore >= 50 ? "secondary" : "outline"} className="text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              Trust Score: {trustScore}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">
                {Number(artist.ratingAvg || 0).toFixed(1)} <Star className="inline w-4 h-4 text-yellow-500 fill-yellow-500 mb-1" />
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{artist.ratingCount || 0}</div>
              <div className="text-xs text-muted-foreground">Reviews</div>
            </div>
          </div>

          {/* Bio */}
          {artist.bio && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{artist.bio}</p>
            </div>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Music className="w-4 h-4" /> Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: string) => (
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
            <p className="text-lg font-medium text-primary">
              ₹{Number(artist.priceFrom || 0).toLocaleString()} - ₹{Number(artist.priceTo || 0).toLocaleString()}
            </p>
          </div>

          {/* Tech Rider */}
          {techRider && (
            <div>
              <h3 className="font-semibold mb-2">Tech Rider</h3>
              {typeof techRider === 'string' && techRider.startsWith('http') ? (
                <Button variant="outline" asChild size="sm">
                  <a href={techRider} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download Tech Rider
                  </a>
                </Button>
              ) : (
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {techRider}
                </div>
              )}
            </div>
          )}

          {/* Past Venues */}
          {pastVenues.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Past Venues</h3>
              <div className="flex flex-wrap gap-2">
                {pastVenues.map((venue: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-background">
                    {venue}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Links */}
          {Object.keys(portfolioLinks).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Portfolio Links</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(portfolioLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 w-fit"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="capitalize">{platform}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((photo: string, idx: number) => (
                  <div key={idx} className="aspect-square bg-muted rounded-md overflow-hidden relative group">
                    <img src={photo} alt={`${artist.name || artist.stageName} ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Play className="w-4 h-4" /> Videos</h3>
              <div className="flex flex-col gap-2">
                {videos.map((vid: string, idx: number) => (
                  <a key={idx} href={vid} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                    Video Link {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
