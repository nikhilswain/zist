import { useState, useTransition } from "react";
import {
  Clock,
  CheckSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  ImageIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { ZistType, BoardType, ActivityType } from "@/lib/types";
import { updateZist, deleteZist } from "@/lib/db";
import { ZistDetailView } from "@/components/zist-detail-view";
import { toast } from "sonner";
import { useThemeClass } from "@/lib/hooks/use-theme-class";
import { isAfter, startOfToday } from "date-fns";

interface ZistProps {
  zist: ZistType;
  board: BoardType;
  setBoard: (board: BoardType) => void;
}

export function Zist({ zist, board, setBoard }: ZistProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [title, setTitle] = useState(zist.title);
  const [description, setDescription] = useState(zist.description);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const boardThemeClass = useThemeClass(board.theme);

  const handleDeleteZist = async () => {
    console.log("handleDeleteZist called for zist:", zist.id);
    setIsDeleting(true);

    // Use requestIdleCallback to ensure UI doesn't freeze
    const performDelete = () => {
      startTransition(async () => {
        try {
          await deleteZist(board.id, zist.columnId, zist.id);
          console.log("Zist deleted successfully:", zist.id);

          // Update the board state
          const updatedColumns = board.columns.map((column) => {
            if (column.id === zist.columnId) {
              return {
                ...column,
                zists: column.zists.filter((z) => z.id !== zist.id),
              };
            }
            return column;
          });

          setBoard({
            ...board,
            columns: updatedColumns,
          });

          toast.success("Card deleted successfully");
        } catch (error) {
          console.error("Error deleting zist:", error);
          toast.error("Failed to delete card");
        } finally {
          setIsDeleting(false);
          setDeleteDialogOpen(false);
        }
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ("requestIdleCallback" in window) {
      requestIdleCallback(performDelete, { timeout: 1000 });
    } else {
      setTimeout(performDelete, 50);
    }
  };

  const handleUpdateZist = async () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      setIsUpdating(true);
      const updatedZist = {
        ...zist,
        title,
        description,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Updated card details",
        field: "title/description",
        oldValue: `${zist.title} / ${zist.description}`,
        newValue: `${title} / ${description}`,
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      const updatedColumns = board.columns.map((column) => {
        if (column.id === zist.columnId) {
          return {
            ...column,
            zists: column.zists.map((z) =>
              z.id === zist.id ? updatedZist : z
            ),
          };
        }
        return column;
      });

      setBoard({
        ...board,
        columns: updatedColumns,
      });

      setEditOpen(false);

      toast.success("Card updated successfully");
    } catch (error) {
      console.error("Error updating zist:", error);
      toast.error("Failed to update card");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getLabelsDisplay = () => {
    if (zist.labels.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mb-2">
        {zist.labels.slice(0, 3).map((label, index) => (
          <Badge key={index} variant="outline" className="bg-primary/10">
            {label}
          </Badge>
        ))}
        {zist.labels.length > 3 && (
          <Badge variant="outline" className="bg-muted">
            +{zist.labels.length - 3}
          </Badge>
        )}
      </div>
    );
  };

  const getDueDateStatus = () => {
    if (!zist.dueDate) return null;

    const dueDate = new Date(zist.dueDate);
    const today = startOfToday();

    if (isAfter(today, dueDate)) {
      return { label: "Overdue", color: "bg-red-500" };
    } else if (
      isAfter(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), dueDate)
    ) {
      return { label: "Due Soon", color: "bg-amber-500" };
    } else {
      return { label: "Upcoming", color: "bg-green-500" };
    }
  };

  const dueDateStatus = getDueDateStatus();
  const isDisabled = isDeleting || isPending || isUpdating;

  // Get the first image for preview
  const previewImage =
    zist.images && zist.images.length > 0 ? zist.images[0] : null;

  return (
    <>
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${boardThemeClass} ${
          isDisabled ? "opacity-50 pointer-events-none" : ""
        }`}
        onClick={() => !isDisabled && setDetailOpen(true)}
      >
        {/* Cover Image or First Uploaded Image */}
        {(zist.coverImage || previewImage) && (
          <div className="relative">
            <img
              src={zist.coverImage ?? previewImage ?? undefined}
              alt="Card cover"
              className="w-full h-24 object-cover rounded-t-lg"
            />
            {zist.images && zist.images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {zist.images.length}
              </div>
            )}
          </div>
        )}

        <CardHeader className="p-3 pb-0">
          {getLabelsDisplay()}
          <CardTitle className="text-sm font-medium">{zist.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {zist.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {zist.description}
            </p>
          )}
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            {zist.dueDate && (
              <div className="flex items-center">
                <Badge
                  className={`${dueDateStatus?.color} text-white text-xs flex items-center h-5`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(zist.dueDate)}
                </Badge>
              </div>
            )}
            {zist.checklists.length > 0 && (
              <div className="flex items-center text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                {zist.checklists.reduce(
                  (acc, list) =>
                    acc + list.items.filter((item) => item.completed).length,
                  0
                )}
                /
                {zist.checklists.reduce(
                  (acc, list) => acc + list.items.length,
                  0
                )}
              </div>
            )}
            {zist.images && zist.images.length > 0 && !previewImage && (
              <div className="flex items-center text-xs">
                <ImageIcon className="h-3 w-3 mr-1" />
                {zist.images.length}
              </div>
            )}
          </div>

          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isDisabled}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setEditOpen(true)}
                  disabled={isDisabled}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Opening delete dialog for zist:", zist.id);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={isDisabled}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>

      <ZistDetailView
        open={detailOpen && !isDisabled}
        onOpenChange={setDetailOpen}
        zist={zist}
        board={board}
        setBoard={setBoard}
      />

      <Dialog open={editOpen && !isDisabled} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
            <DialogDescription>Make changes to your card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={isUpdating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateZist} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Separate Delete Dialog for Zist */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteDialogOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card "{zist.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this card and all its data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteZist();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
