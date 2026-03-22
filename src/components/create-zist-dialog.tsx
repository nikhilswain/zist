import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createZist } from "@/lib/db";
import type { ZistType } from "@/lib/types";
import { toast } from "sonner";
import { X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/image-utils";

interface CreateZistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string | null;
  boardId: string;
  onZistCreated?: (zist: ZistType) => void;
}

export function CreateZistDialog({
  open,
  onOpenChange,
  columnId,
  boardId,
  onZistCreated,
}: CreateZistDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("=== FORM SUBMIT START ===");
    console.log("Form data:", { columnId, boardId, title, description });

    if (!columnId) {
      console.error("No column selected");
      toast.error("No column selected");
      return;
    }

    if (!title.trim()) {
      console.error("No title provided");
      toast.error("Please enter a title");
      return;
    }

    console.log("Validation passed, starting creation...");
    setLoading(true);

    try {
      console.log("Calling createZist...");
      const zist = await createZist(
        columnId,
        boardId,
        title.trim(),
        description.trim(),
        uploadedImages
      );

      console.log("Zist created successfully:", zist);
      toast.success("Card created successfully");

      // Reset form
      console.log("Resetting form...");
      setTitle("");
      setDescription("");
      setUploadedImages([]);

      // Close dialog
      console.log("Closing dialog...");
      onOpenChange(false);

      // Notify parent
      if (onZistCreated) {
        console.log("Notifying parent component...");
        onZistCreated(zist);
      }

      console.log("=== FORM SUBMIT SUCCESS ===");
    } catch (error) {
      console.error("=== FORM SUBMIT ERROR ===");
      console.error("Error creating zist:", error);
      toast.error(
        `Failed to create card: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      console.log("Setting loading to false...");
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Compress the image
        const compressedFile = await compressImage(file);

        // Convert to base64 for storage
        const base64 = await fileToBase64(compressedFile);
        newImages.push(base64);
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDialogClose = (isOpen: boolean) => {
    console.log("Dialog close requested:", isOpen, "loading:", loading);
    if (!isOpen && !loading) {
      // Reset form when closing
      setTitle("");
      setDescription("");
      setUploadedImages([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Card</DialogTitle>
            <DialogDescription>Add a new card to your board.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter card title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter card description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary hover:text-primary/80">
                        Click to upload images
                      </span>
                      <Input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={loading || uploading}
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                  {uploading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">
                        Compressing and uploading...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading || !title.trim()}
            >
              {loading ? "Creating..." : "Create Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
