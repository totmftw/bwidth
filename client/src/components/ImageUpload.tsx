import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Image as ImageIcon,
  Link,
  Plus,
  Loader2,
  Camera,
  AlertCircle,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadedImage {
  id: number;
  url: string;
  filename?: string;
}

export interface ImageUploadProps {
  entityType: string;
  entityId: number;
  maxImages?: number;
  existingImages?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
  label?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.gif,.webp,.svg";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageUpload({
  entityType,
  entityId,
  maxImages = 10,
  existingImages = [],
  onImagesChange,
  label,
  description,
  className,
  compact = false,
}: ImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- local state ---
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Stable callback to propagate changes
  const propagate = useCallback(
    (next: UploadedImage[]) => {
      setImages(next);
      onImagesChange?.(next);
    },
    [onImagesChange],
  );

  // --- validation ---
  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const errs: string[] = [];
      const valid: File[] = [];
      const existingNames = new Set(images.map((img) => img.filename));

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errs.push(
            `"${file.name}" is not a supported image type. Use JPEG, PNG, GIF, WebP, or SVG.`,
          );
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errs.push(
            `"${file.name}" exceeds the 20 MB limit (${formatFileSize(file.size)}).`,
          );
          continue;
        }
        if (existingNames.has(file.name)) {
          errs.push(`"${file.name}" has already been added.`);
          continue;
        }
        valid.push(file);
        existingNames.add(file.name);
      }

      const slotsAvailable = maxImages - images.length;
      if (valid.length > slotsAvailable) {
        errs.push(
          `Only ${slotsAvailable} more image${slotsAvailable === 1 ? "" : "s"} can be added (max ${maxImages}).`,
        );
        valid.splice(slotsAvailable);
      }

      return { valid, errors: errs };
    },
    [images, maxImages],
  );

  // --- mutations ---
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      formData.append("entityType", entityType);
      formData.append("entityId", String(entityId));
      for (const file of files) {
        formData.append("images", file);
      }
      setUploadProgress(30);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      setUploadProgress(80);
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      const data: UploadedImage[] = await res.json();
      setUploadProgress(100);
      return data;
    },
    onSuccess: (newImages) => {
      const next = [...images, ...newImages];
      propagate(next);
      setUploadProgress(null);
      toast({
        title: "Upload complete",
        description: `${newImages.length} image${newImages.length === 1 ? "" : "s"} uploaded successfully.`,
      });
    },
    onError: (err: Error) => {
      setUploadProgress(null);
      setErrors((prev) => [...prev, err.message]);
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const urlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/media/url", {
        url,
        entityType,
        entityId,
      });
      const data: UploadedImage = await res.json();
      return data;
    },
    onSuccess: (newImage) => {
      const next = [...images, newImage];
      propagate(next);
      setUrlInput("");
      setShowUrlInput(false);
      toast({
        title: "Image added",
        description: "Image from URL added successfully.",
      });
    },
    onError: (err: Error) => {
      setErrors((prev) => [...prev, err.message]);
      toast({
        title: "Failed to add image",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      await apiRequest("DELETE", `/api/media/${imageId}`);
      return imageId;
    },
    onSuccess: (removedId) => {
      const next = images.filter((img) => img.id !== removedId);
      propagate(next);
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // --- handlers ---
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      setErrors([]);
      const filesArr = Array.from(fileList);
      const { valid, errors: validationErrors } = validateFiles(filesArr);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }
      if (valid.length > 0) {
        uploadMutation.mutate(valid);
      }
    },
    [validateFiles, uploadMutation],
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleUrlSubmit = () => {
    setErrors([]);
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setErrors(["Please enter a valid URL (starting with http:// or https://)."]);
      return;
    }
    if (images.length >= maxImages) {
      setErrors([`Maximum of ${maxImages} images reached.`]);
      return;
    }
    urlMutation.mutate(trimmed);
  };

  const handleRemove = (imageId: number) => {
    deleteMutation.mutate(imageId);
  };

  const isUploading = uploadMutation.isPending;
  const isAddingUrl = urlMutation.isPending;
  const isFull = images.length >= maxImages;

  // --- compact layout (single avatar / logo) ---
  if (compact) {
    const currentImage = images[0];
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {label && (
          <Label className="text-sm font-medium text-foreground">{label}</Label>
        )}

        <div className="relative group">
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={isUploading}
            className={cn(
              "relative w-24 h-24 rounded-xl overflow-hidden",
              "border-2 border-dashed transition-all duration-200",
              "flex items-center justify-center",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              currentImage
                ? "border-white/10 hover:border-primary/50"
                : "border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10",
            )}
          >
            {currentImage ? (
              <>
                <img
                  src={currentImage.url}
                  alt={currentImage.filename || "Uploaded image"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px]">Upload</span>
                  </>
                )}
              </div>
            )}
          </button>

          {currentImage && (
            <button
              type="button"
              onClick={() => handleRemove(currentImage.id)}
              disabled={deleteMutation.isPending}
              className={cn(
                "absolute -top-1.5 -right-1.5 z-10",
                "w-5 h-5 rounded-full",
                "bg-destructive text-destructive-foreground",
                "flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "hover:bg-destructive/80",
              )}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        {/* Errors */}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  {err}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    );
  }

  // --- full layout ---
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      {(label || description) && (
        <div className="flex items-start justify-between">
          <div>
            {label && (
              <Label className="text-sm font-medium text-foreground">
                {label}
              </Label>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {images.length} / {maxImages}
          </Badge>
        </div>
      )}

      {/* Drop zone */}
      {!isFull && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
            "flex flex-col items-center justify-center gap-2 py-8 px-4",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            isDragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]",
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isDragOver
                ? "bg-primary/20 text-primary"
                : "bg-white/5 text-muted-foreground",
            )}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-foreground/80">
              {isDragOver
                ? "Drop images here"
                : "Drop images here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, GIF, WebP, SVG up to 20 MB
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple={maxImages > 1}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Upload progress */}
      <AnimatePresence>
        {uploadProgress !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <Progress value={uploadProgress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {uploadProgress}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL input toggle + field */}
      {!isFull && (
        <div className="flex flex-col gap-2">
          {!showUrlInput ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(true)}
              className="self-start text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Link className="w-3.5 h-3.5" />
              Add from URL
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUrlSubmit();
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="pl-8 h-8 text-xs bg-white/[0.03] border-white/10"
                  disabled={isAddingUrl}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleUrlSubmit}
                disabled={isAddingUrl || !urlInput.trim()}
                className="h-8 text-xs"
              >
                {isAddingUrl ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInput("");
                }}
                className="h-8 px-2 text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Image preview grid */}
      <AnimatePresence mode="popLayout">
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            {images.map((image) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative"
              >
                <div
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden",
                    "border border-white/10 bg-white/[0.02]",
                    "transition-all duration-200",
                    "group-hover:border-white/20 group-hover:shadow-lg",
                  )}
                >
                  <img
                    src={image.url}
                    alt={image.filename || "Uploaded image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Hover overlay with delete */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(image.id)}
                      disabled={deleteMutation.isPending}
                      className={cn(
                        "w-8 h-8 rounded-full",
                        "bg-destructive/90 text-destructive-foreground",
                        "flex items-center justify-center",
                        "hover:bg-destructive transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                      )}
                      aria-label={`Remove ${image.filename || "image"}`}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Filename */}
                {image.filename && (
                  <p
                    className="text-[10px] text-muted-foreground mt-1 truncate px-0.5"
                    title={image.filename}
                  >
                    {image.filename}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full indicator */}
      {isFull && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          Maximum of {maxImages} images reached. Remove an image to add more.
        </p>
      )}

      {/* Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-1 overflow-hidden"
          >
            {errors.map((err, i) => (
              <p
                key={i}
                className="text-xs text-destructive flex items-start gap-1.5"
              >
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {err}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
