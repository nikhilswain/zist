import { useState } from "react";
import {
  Edit,
  Trash2,
  Archive,
  MoreHorizontal,
  Palette,
  PanelsTopLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOARD_THEMES } from "@/lib/constants";
import type { BoardType } from "@/lib/types";
import { updateBoard, archiveBoard, deleteBoard } from "@/lib/db";

interface BoardHeaderProps {
  board: BoardType;
  setBoard: (board: BoardType) => void;
  areViewsOpen?: boolean;
  onToggleViews?: () => void;
}

export function BoardHeader({
  board,
  setBoard,
  areViewsOpen = false,
  onToggleViews,
}: BoardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [boardName, setBoardName] = useState(board.name);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(board.theme || "default");

  const handleSaveName = async () => {
    if (!boardName.trim()) {
      toast.error("Error", {
        description: "Board name cannot be empty",
      });
      return;
    }

    try {
      const updatedBoard = {
        ...board,
        name: boardName,
      };

      await updateBoard(updatedBoard);
      setBoard(updatedBoard);
      setIsEditing(false);

      toast.info("Board updated", {
        description: "Board name has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating board:", error);
      toast.error("Eror", {
        description: "Failed to update board name",
      });
    }
  };

  const handleArchiveBoard = async () => {
    try {
      await archiveBoard(board.id);

      toast.success("Board archived", {
        description: "The board has been archived successfully",
      });

      window.location.href = "/";
    } catch (error) {
      console.error("Error archiving board:", error);
      toast.error("Error", {
        description: "Failed to archive board",
      });
    }
  };

  const handleDeleteBoard = async () => {
    try {
      await deleteBoard(board.id, board.workspaceId);

      toast.success(" Board deleted", {
        description: "The board has been deleted successfully",
      });

      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting board:", error);
      toast.error("Error", {
        description: "Failed to delete board",
      });
    }
  };

  const handleThemeChange = async () => {
    try {
      const updatedBoard = {
        ...board,
        theme: selectedTheme,
      };

      await updateBoard(updatedBoard);
      setBoard(updatedBoard);
      setThemeDialogOpen(false);

      toast.success("Theme updated", {
        description: "Board theme has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating board theme:", error);
      toast.error("Error", {
        description: "Failed to update board theme",
      });
    }
  };

  // Find the selected theme object
  const currentTheme =
    BOARD_THEMES.find((theme) => theme.id === selectedTheme) || BOARD_THEMES[0];

  return (
    <div className="flex items-center justify-between mb-6">
      {isEditing ? (
        <div className="flex gap-2 items-center">
          <Input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            className="text-xl font-bold h-10 w-64"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveName();
              } else if (e.key === "Escape") {
                setIsEditing(false);
                setBoardName(board.name);
              }
            }}
          />
          <Button onClick={handleSaveName}>Save</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              setBoardName(board.name);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <h1 className="text-2xl font-bold">{board.name}</h1>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Rename
        </Button>

        <Button
          variant="outline"
          onClick={() => setThemeDialogOpen(true)}
          className="gap-2"
        >
          <Palette className="h-4 w-4" />
          Theme
        </Button>

        <Button
          variant="outline"
          onClick={onToggleViews}
          className="gap-2"
        >
          <PanelsTopLeft className="h-4 w-4" />
          {areViewsOpen ? "Hide Views" : "Views"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Board
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this board?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive the board and remove it from your
                    workspace. You can restore it later from the archives.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveBoard}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Board
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the board and all its data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBoard}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent className={"board_dialog-content"}>
          <div
            className={`-z-10 absolute top-0 left- w-full h-full ${
              selectedTheme !== "default" ? currentTheme.class : ""
            }`}
          />
          <DialogHeader>
            <DialogTitle>Board Theme</DialogTitle>
            <DialogDescription>Choose a theme for your board</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {BOARD_THEMES.map((theme) => (
              <div
                key={theme.id}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                  selectedTheme === theme.id
                    ? "border-primary"
                    : "border-transparent"
                } ${theme.class}`}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div className="h-12 flex items-center justify-center">
                  <span className="font-medium">{theme.name}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleThemeChange}>Apply Theme</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
