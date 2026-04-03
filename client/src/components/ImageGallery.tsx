import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GalleryImage {
  id: number;
  url: string;
  filename?: string;
  altText?: string;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
  columns?: 2 | 3 | 4;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMN_CLASS_MAP: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageGallery({
  images,
  className,
  columns = 3,
}: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOpen = lightboxIndex !== null;
  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "Escape") closeLightbox();
  };

  // Empty state
  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No images to display</p>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className={cn("grid gap-3", COLUMN_CLASS_MAP[columns], className)}>
        {images.map((image, index) => (
          <motion.button
            key={image.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            onClick={() => openLightbox(index)}
            className={cn(
              "group relative flex flex-col text-left",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              "rounded-lg",
            )}
          >
            <div
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden",
                "border border-white/10 bg-white/[0.02]",
                "transition-all duration-200",
                "group-hover:border-white/20 group-hover:shadow-lg group-hover:scale-[1.02]",
              )}
            >
              <img
                src={image.url}
                alt={image.altText || image.filename || "Gallery image"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Filename label */}
            {image.filename && (
              <p
                className="text-[10px] text-muted-foreground mt-1 truncate px-0.5"
                title={image.filename}
              >
                {image.filename}
              </p>
            )}
          </motion.button>
        ))}
      </div>

      {/* Lightbox dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent
          className={cn(
            "sm:max-w-[90vw] md:max-w-[80vw] max-h-[92vh]",
            "p-0 gap-0 bg-black/95 border-white/10 overflow-hidden",
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Accessible but visually hidden title */}
          <DialogTitle className="sr-only">
            {currentImage?.altText ||
              currentImage?.filename ||
              "Image preview"}
          </DialogTitle>

          {currentImage && (
            <div className="relative flex items-center justify-center w-full h-[80vh]">
              {/* Image */}
              <img
                src={currentImage.url}
                alt={
                  currentImage.altText ||
                  currentImage.filename ||
                  "Full size image"
                }
                className="max-w-full max-h-full object-contain select-none"
              />

              {/* Navigation arrows (only if > 1 image) */}
              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevious();
                    }}
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2",
                      "w-9 h-9 rounded-full",
                      "bg-white/10 hover:bg-white/20 text-white",
                      "backdrop-blur-sm border border-white/10",
                    )}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2",
                      "w-9 h-9 rounded-full",
                      "bg-white/10 hover:bg-white/20 text-white",
                      "backdrop-blur-sm border border-white/10",
                    )}
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* Bottom bar: filename + counter */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                <p className="text-sm text-white/80 truncate max-w-[70%]">
                  {currentImage.filename || ""}
                </p>
                {images.length > 1 && (
                  <span className="text-xs text-white/50 tabular-nums shrink-0">
                    {(lightboxIndex ?? 0) + 1} / {images.length}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
