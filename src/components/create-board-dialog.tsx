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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createBoard } from "@/lib/db";
import { BOARD_THEMES } from "@/lib/constants";
import type { BoardType } from "@/lib/types";
import { toast } from "sonner";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  onBoardCreated?: (board: BoardType) => void;
}

export function CreateBoardDialog({
  open,
  onOpenChange,
  workspaceId,
  onBoardCreated,
}: CreateBoardDialogProps) {
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [loading, setLoading] = useState(false);

  // Find the selected theme object
  const currentTheme =
    BOARD_THEMES.find((theme) => theme.id === selectedTheme) || BOARD_THEMES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceId) {
      toast.error("No workspace selected");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a board name");
      return;
    }

    setLoading(true);

    try {
      const board = await createBoard(
        name,
        workspaceId,
        selectedTheme !== "default" ? selectedTheme : undefined
      );

      toast.success("Board created successfully");

      setName("");
      setSelectedTheme("default");
      onOpenChange(false);

      if (onBoardCreated) {
        onBoardCreated(board);
      }

      window.location.href = `/board/${board.id}`;
    } catch (error) {
      console.error("Error creating board:", error);
      toast.error("Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={selectedTheme !== "default" ? currentTheme.class : ""}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Board</DialogTitle>
            <DialogDescription>
              Create a new board to organize your tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter board name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Board Theme</Label>
              <RadioGroup
                value={selectedTheme}
                onValueChange={setSelectedTheme}
                className="grid grid-cols-4 gap-2"
              >
                {BOARD_THEMES.map((theme) => (
                  <div key={theme.id} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={theme.id}
                      id={`theme-${theme.id}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`theme-${theme.id}`}
                      className={`flex flex-col items-center justify-center w-full h-16 rounded-md border-2 cursor-pointer ${
                        selectedTheme === theme.id
                          ? "border-primary"
                          : "border-transparent"
                      } ${theme.class || "bg-card"}`}
                    >
                      <div
                        className="w-4 h-4 rounded-full mb-1"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="text-xs">{theme.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
