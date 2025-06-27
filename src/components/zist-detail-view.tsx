import type React from "react";
import { useState, useEffect } from "react";
import {
  Calendar,
  X,
  Plus,
  Edit,
  MessageSquare,
  Tag,
  Clock,
  CheckSquare,
  ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, isBefore, startOfToday } from "date-fns";
import type {
  ZistType,
  BoardType,
  ChecklistType,
  ChecklistItemType,
  ActivityType,
} from "@/lib/types";
import { updateZist } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { useThemeClass } from "@/lib/hooks/use-theme-class";
import { compressImage } from "@/lib/image-utils";
import { toast } from "sonner";

interface ZistDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zist: ZistType;
  board: BoardType;
  setBoard: (board: BoardType) => void;
}

export function ZistDetailView({
  open,
  onOpenChange,
  zist,
  board,
  setBoard,
}: ZistDetailViewProps) {
  const [title, setTitle] = useState(zist.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(zist.description);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addingLabel, setAddingLabel] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistItemTexts, setNewChecklistItemTexts] = useState<
    Record<string, string>
  >({});
  const [addingChecklistItems, setAddingChecklistItems] = useState<
    Record<string, boolean>
  >({});
  const [comment, setComment] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [date, setDate] = useState<Date | undefined>(
    zist.dueDate ? new Date(zist.dueDate) : undefined
  );
  const [uploading, setUploading] = useState(false);

  const boardThemeClass = useThemeClass(board.theme);

  // Update local state when zist changes
  useEffect(() => {
    setTitle(zist.title);
    setDescription(zist.description);
    setDate(zist.dueDate ? new Date(zist.dueDate) : undefined);
  }, [zist]);

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

      if (newImages.length > 0) {
        const updatedZist = {
          ...zist,
          images: [...(zist.images || []), ...newImages],
        };

        const activity: ActivityType = {
          id: "",
          type: "update",
          userId: "system",
          userName: "System",
          timestamp: Date.now(),
          details: `Added ${newImages.length} image(s)`,
          field: "images",
        };

        await updateZist(board.id, zist.columnId, updatedZist, activity);
        updateBoardState(updatedZist);

        toast.success(`${newImages.length} image(s) uploaded successfully`);
      }
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

  const removeImage = async (index: number) => {
    try {
      const updatedImages = [...(zist.images || [])];
      updatedImages.splice(index, 1);

      const updatedZist = {
        ...zist,
        images: updatedImages,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Removed an image",
        field: "images",
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);
      updateBoardState(updatedZist);

      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    }
  };

  const handleUpdateTitle = async () => {
    if (!title.trim()) {
      toast.error("Error", {
        description: "Title cannot be empty",
      });
      return;
    }

    try {
      const updatedZist = {
        ...zist,
        title,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Updated title",
        field: "title",
        oldValue: zist.title,
        newValue: title,
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      setEditingTitle(false);

      toast.success("Title updated", {
        description: "The title has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Error", {
        description: "Failed to update title",
      });
    }
  };

  const handleUpdateDescription = async () => {
    try {
      const updatedZist = {
        ...zist,
        description,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Updated description",
        field: "description",
        oldValue: zist.description,
        newValue: description,
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      setEditingDescription(false);

      toast.success("Description updated", {
        description: "The description has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating description:", error);
      toast.error("Error", {
        description: "Failed to update description",
      });
    }
  };

  const handleAddLabel = async () => {
    if (!newLabel.trim()) {
      toast.error("Error", {
        description: "Label cannot be empty",
      });
      return;
    }

    try {
      const updatedZist = {
        ...zist,
        labels: [...zist.labels, newLabel],
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Added label",
        field: "labels",
        oldValue: zist.labels.join(", "),
        newValue: updatedZist.labels.join(", "),
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      setNewLabel("");
      setAddingLabel(false);

      toast.success("Label added", {
        description: "The label has been added successfully",
      });
    } catch (error) {
      console.error("Error adding label:", error);
      toast.error("Error", {
        description: "Failed to add label",
      });
    }
  };

  const handleRemoveLabel = async (labelToRemove: string) => {
    try {
      const updatedZist = {
        ...zist,
        labels: zist.labels.filter((label) => label !== labelToRemove),
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Removed label",
        field: "labels",
        oldValue: zist.labels.join(", "),
        newValue: updatedZist.labels.join(", "),
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      toast.success("Label removed", {
        description: "The label has been removed successfully",
      });
    } catch (error) {
      console.error("Error removing label:", error);
      toast.error("Error", {
        description: "Failed to remove label",
      });
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistName.trim()) {
      toast.error("Error", {
        description: "Checklist name cannot be empty",
      });
      return;
    }

    try {
      const newChecklist: ChecklistType = {
        id: uuidv4(),
        title: newChecklistName,
        items: [],
      };

      const updatedZist = {
        ...zist,
        checklists: [...zist.checklists, newChecklist],
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Added checklist",
        field: "checklists",
        newValue: newChecklistName,
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      setNewChecklistName("");
      setAddingChecklist(false);

      // Initialize the new checklist item state
      setAddingChecklistItems((prev) => ({
        ...prev,
        [newChecklist.id]: false,
      }));
      setNewChecklistItemTexts((prev) => ({
        ...prev,
        [newChecklist.id]: "",
      }));

      toast.success("Checklist added", {
        description: "The checklist has been added successfully",
      });
    } catch (error) {
      console.error("Error adding checklist:", error);
      toast.error("Error", {
        description: "Failed to add checklist",
      });
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const itemText = newChecklistItemTexts[checklistId];

    if (!itemText?.trim()) {
      toast.error("Error", {
        description: "Item text cannot be empty",
      });
      return;
    }

    try {
      const updatedZist = { ...zist };
      const checklistIndex = updatedZist.checklists.findIndex(
        (cl) => cl.id === checklistId
      );

      if (checklistIndex === -1) return;

      const newItem: ChecklistItemType = {
        id: uuidv4(),
        text: itemText,
        completed: false,
      };

      updatedZist.checklists[checklistIndex].items.push(newItem);

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: "Added checklist item",
        field: "checklist item",
        newValue: itemText,
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      // Reset the input
      setNewChecklistItemTexts((prev) => ({
        ...prev,
        [checklistId]: "",
      }));
      setAddingChecklistItems((prev) => ({
        ...prev,
        [checklistId]: false,
      }));

      toast.success("Item added", {
        description: "The checklist item has been added successfully",
      });
    } catch (error) {
      console.error("Error adding checklist item:", error);
      toast.error("Error", {
        description: "Failed to add checklist item",
      });
    }
  };

  const handleToggleChecklistItem = async (
    checklistId: string,
    itemId: string
  ) => {
    try {
      const updatedZist = { ...zist };
      const checklistIndex = updatedZist.checklists.findIndex(
        (cl) => cl.id === checklistId
      );

      if (checklistIndex === -1) return;

      const itemIndex = updatedZist.checklists[checklistIndex].items.findIndex(
        (item) => item.id === itemId
      );

      if (itemIndex === -1) return;

      const item = updatedZist.checklists[checklistIndex].items[itemIndex];
      const newStatus = !item.completed;

      updatedZist.checklists[checklistIndex].items[itemIndex] = {
        ...item,
        completed: newStatus,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: `${newStatus ? "Completed" : "Uncompleted"} checklist item`,
        field: "checklist item status",
        oldValue: item.completed ? "completed" : "incomplete",
        newValue: newStatus ? "completed" : "incomplete",
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);
    } catch (error) {
      console.error("Error toggling checklist item:", error);
      toast.error("Error", {
        description: "Failed to update checklist item",
      });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast.error("Error", {
        description: "Comment cannot be empty",
      });
      return;
    }

    try {
      const activity: ActivityType = {
        id: uuidv4(),
        type: "comment",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: comment,
      };

      const updatedZist = {
        ...zist,
        activities: [...zist.activities, activity],
      };

      await updateZist(board.id, zist.columnId, updatedZist);

      // Update the board state
      updateBoardState(updatedZist);

      setComment("");

      toast.success("Comment added", {
        description: "Your comment has been added successfully",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Error", {
        description: "Failed to add comment",
      });
    }
  };

  const handleSetDueDate = async (selectedDate: Date | undefined) => {
    try {
      const updatedZist = {
        ...zist,
        dueDate: selectedDate ? selectedDate.getTime() : undefined,
      };

      const activity: ActivityType = {
        id: "",
        type: "update",
        userId: "system",
        userName: "System",
        timestamp: Date.now(),
        details: selectedDate ? "Set due date" : "Removed due date",
        field: "dueDate",
        oldValue: zist.dueDate
          ? new Date(zist.dueDate).toLocaleDateString()
          : "none",
        newValue: selectedDate ? selectedDate.toLocaleDateString() : "none",
      };

      await updateZist(board.id, zist.columnId, updatedZist, activity);

      // Update the board state
      updateBoardState(updatedZist);

      setDate(selectedDate);

      toast.success(selectedDate ? "Due date set" : "Due date removed", {
        description: selectedDate
          ? `Due date set to ${selectedDate.toLocaleDateString()}`
          : "Due date has been removed",
      });
    } catch (error) {
      console.error("Error setting due date:", error);
      toast.error("Error", {
        description: "Failed to set due date",
      });
    }
  };

  const updateBoardState = (updatedZist: ZistType) => {
    const updatedColumns = board.columns.map((column) => {
      if (column.id === zist.columnId) {
        return {
          ...column,
          zists: column.zists.map((z) => (z.id === zist.id ? updatedZist : z)),
        };
      }
      return column;
    });

    setBoard({
      ...board,
      columns: updatedColumns,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDueDateStatus = () => {
    if (!zist.dueDate) return null;

    const dueDate = new Date(zist.dueDate);
    const today = startOfToday();

    if (isBefore(dueDate, today)) {
      return { label: "Overdue", color: "bg-red-500" };
    } else if (
      isBefore(dueDate, new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000))
    ) {
      return { label: "Due Soon", color: "bg-amber-500" };
    } else {
      return { label: "Upcoming", color: "bg-green-500" };
    }
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-sm md:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl`}
        onPointerDownOutside={(e) => {
          // Prevent the event from propagating to avoid moving the card
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Prevent the event from propagating to avoid moving the card
          e.preventDefault();
        }}
        onKeyDown={(e) => {
          // Prevent keyboard events from bubbling up
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          className={`${boardThemeClass} -z-10 absolute top-0 left- w-full h-full `}
        />
        <div className="p-6 pb-0 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            {editingTitle ? (
              <div className="flex-1 flex gap-2 items-center">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      handleUpdateTitle();
                    } else if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitle(zist.title);
                    }
                  }}
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleUpdateTitle}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTitle(false);
                      setTitle(zist.title);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h2 className="text-xl font-medium">{zist.title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingTitle(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {zist.dueDate && (
            <div className="mb-4">
              <Badge className={`${dueDateStatus?.color} text-white`}>
                <Clock className="h-3 w-3 mr-1" />
                {dueDateStatus?.label}:{" "}
                {new Date(zist.dueDate).toLocaleDateString()}
              </Badge>
            </div>
          )}

          {zist.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {zist.labels.map((label, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-primary/10 flex items-center gap-1"
                >
                  {label}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleRemoveLabel(label)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start mb-4 bg-transparent p-0 border-b rounded-none">
              <TabsTrigger
                value="details"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
              >
                <div className="flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  Details
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
              >
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" />
                  Images ({zist.images?.length || 0})
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="checklists"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
              >
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  Checklists
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
              >
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Activity
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2 bg-transparent"
              >
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Settings
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  {!editingDescription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDescription(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a more detailed description..."
                      rows={4}
                      className="resize-none"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingDescription(false);
                          setDescription(zist.description);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-3 bg-muted/30 rounded-lg min-h-[80px] text-sm"
                    onClick={() => setEditingDescription(true)}
                  >
                    {zist.description || (
                      <span className="text-muted-foreground">
                        Add a more detailed description...
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Created: {formatDate(zist.createdAt)}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Last Updated: {formatDate(zist.updatedAt)}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <Label
                        htmlFor="detail-image-upload"
                        className="cursor-pointer"
                      >
                        <span className="text-sm font-medium text-primary hover:text-primary/80">
                          Click to upload images
                        </span>
                        <Input
                          id="detail-image-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
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

                {zist.images && zist.images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {zist.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                          onClick={() => {
                            // Open image in new tab for full view
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(
                                `<img src="${image}" style="max-width: 100%; height: auto;" />`
                              );
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No images uploaded yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="checklists" className="mt-0 space-y-4">
              {zist.checklists.length > 0 ? (
                <div className="space-y-4">
                  {zist.checklists.map((checklist) => {
                    const completedCount = checklist.items.filter(
                      (item) => item.completed
                    ).length;
                    const totalCount = checklist.items.length;
                    const progress =
                      totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                    return (
                      <div key={checklist.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{checklist.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount}
                          </span>
                        </div>

                        <div className="w-full bg-muted h-2 rounded-full mb-3">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="space-y-2">
                          {checklist.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-2"
                            >
                              <Checkbox
                                id={item.id}
                                checked={item.completed}
                                onCheckedChange={() =>
                                  handleToggleChecklistItem(
                                    checklist.id,
                                    item.id
                                  )
                                }
                                className="mt-0.5"
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              <Label
                                htmlFor={item.id}
                                className={`${
                                  item.completed
                                    ? "line-through text-muted-foreground"
                                    : ""
                                }`}
                              >
                                {item.text}
                              </Label>
                            </div>
                          ))}
                        </div>

                        {addingChecklistItems[checklist.id] ? (
                          <div className="mt-3 space-y-2">
                            <Input
                              value={newChecklistItemTexts[checklist.id] || ""}
                              onChange={(e) =>
                                setNewChecklistItemTexts((prev) => ({
                                  ...prev,
                                  [checklist.id]: e.target.value,
                                }))
                              }
                              placeholder="Add an item"
                              autoFocus
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAddChecklistItem(checklist.id)
                                }
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setAddingChecklistItems((prev) => ({
                                    ...prev,
                                    [checklist.id]: false,
                                  }))
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() =>
                              setAddingChecklistItems((prev) => ({
                                ...prev,
                                [checklist.id]: true,
                              }))
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No checklists yet. Add one to track progress.
                </div>
              )}

              {addingChecklist ? (
                <div className="p-4 border rounded-lg space-y-2">
                  <Label htmlFor="checklist-name">Checklist Name</Label>
                  <Input
                    id="checklist-name"
                    value={newChecklistName}
                    onChange={(e) => setNewChecklistName(e.target.value)}
                    placeholder="Enter checklist name"
                    autoFocus
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddChecklist}>
                      Add Checklist
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingChecklist(false);
                        setNewChecklistName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setAddingChecklist(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Checklist
                </Button>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <Button onClick={handleAddComment} disabled={!comment.trim()}>
                  Save
                </Button>

                <div className="space-y-3 mt-4">
                  {zist.activities.length > 0 ? (
                    [...zist.activities]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {activity.type === "comment" ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {activity.userName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(activity.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm mt-1">
                              {activity.type === "comment" ? (
                                <p>{activity.details}</p>
                              ) : (
                                <p>{activity.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No activity yet.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Labels
                  </h3>

                  {addingLabel ? (
                    <div className="space-y-2">
                      <Input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Enter label name"
                        autoFocus
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddLabel}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingLabel(false);
                            setNewLabel("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setAddingLabel(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Label
                    </Button>
                  )}

                  {zist.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {zist.labels.map((label, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-primary/10 flex items-center gap-1"
                        >
                          {label}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleRemoveLabel(label)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Due Date
                  </h3>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {date ? format(date, "PPP") : "Set Due Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      align="start"
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => handleSetDueDate(newDate)}
                        autoFocus
                      />
                      {date && (
                        <div className="p-2 border-t flex justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDueDate(undefined)}
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSetDueDate(date)}
                          >
                            Apply
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  {zist.dueDate && (
                    <div className="mt-2">
                      <Badge className={`${dueDateStatus?.color} text-white`}>
                        <Clock className="h-3 w-3 mr-1" />
                        {dueDateStatus?.label}:{" "}
                        {new Date(zist.dueDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
