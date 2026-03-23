"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableZist } from "@/components/sortable-zist";
import type { ColumnType, BoardType } from "@/lib/types";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SortableColumnProps {
  id: string;
  column: ColumnType;
  board: BoardType;
  setBoard: (board: BoardType) => void;
  onEdit: (columnId: string) => void;
  onDelete: (columnId: string) => void;
  onAddZist: (columnId: string) => void;
  isDeleting: boolean;
  editingColumnId: string | null;
  editingColumnName: string;
  setEditingColumnName: (name: string) => void;
  handleSaveColumnEdit: () => void;
  isUpdatingColumn: boolean;
  openCardId?: string | null;
  onOpenCardChange?: (cardId: string | null) => void;
}

export function SortableColumn({
  id,
  column,
  board,
  setBoard,
  onEdit,
  onDelete,
  onAddZist,
  isDeleting,
  editingColumnId,
  editingColumnName,
  setEditingColumnName,
  handleSaveColumnEdit,
  isUpdatingColumn,
  openCardId = null,
  onOpenCardChange,
}: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "column",
      column,
    },
  });
  const { isOver, setNodeRef: setDropzoneRef } = useDroppable({
    id: `column-dropzone-${column.id}`,
    data: {
      type: "column-dropzone",
      columnId: column.id,
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Get the board theme class
  const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

  const handleDeleteClick = () => {
    console.log("Opening delete dialog for column:", column.id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    console.log("Confirming delete for column:", column.id);

    // Use requestIdleCallback to ensure UI doesn't freeze
    const performDelete = () => {
      startTransition(async () => {
        try {
          onDelete(column.id);
          setDeleteDialogOpen(false);
        } catch (error) {
          console.error("Error deleting column:", error);
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

  const isDisabled = isDeleting || isPending || isUpdatingColumn;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-80 flex-shrink-0 self-stretch min-h-0 transition-all ${
        isDragging ? "z-10" : ""
      }`}
    >
      <Card
        className={`h-full min-h-0 flex flex-col apple-card ${boardThemeClass} ${
          isDisabled ? "opacity-50" : ""
        }`}
      >
        <CardHeader
          className="p-3 pb-0 flex flex-row items-center space-y-0"
          {...attributes}
          {...listeners}
        >
          {editingColumnId === column.id ? (
            <div className="flex w-full gap-2">
              <Input
                value={editingColumnName}
                onChange={(e) => setEditingColumnName(e.target.value)}
                className="h-8"
                autoFocus
                disabled={isUpdatingColumn}
                onKeyDown={(e) => {
                  e.stopPropagation();

                  if (e.key === "Enter") {
                    handleSaveColumnEdit();
                  } else if (e.key === "Escape") {
                    onEdit("");
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSaveColumnEdit}
                className="h-8"
                disabled={isUpdatingColumn}
              >
                {isUpdatingColumn ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit("")}
                className="h-8 px-2"
                disabled={isUpdatingColumn}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-sm font-medium flex-1 truncate">
                {column.name}
              </CardTitle>
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
                    onClick={() => onAddZist(column.id)}
                    disabled={isDisabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add a card
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEdit(column.id)}
                    disabled={isDisabled}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteClick();
                    }}
                    disabled={isDisabled}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="px-3 pb-3">
              <SortableContext
                items={column.zists.map((zist) => zist.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  ref={setDropzoneRef}
                  className={cn(
                    "space-y-2 min-h-[200px] rounded-lg transition-colors",
                    isOver && "bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  {column.zists.map((zist) => (
                    <SortableZist
                      key={zist.id}
                      id={zist.id}
                      zist={zist}
                      board={board}
                      setBoard={setBoard}
                      columnId={column.id}
                      forceOpen={openCardId === zist.id}
                      onDetailOpenChange={(open, zistId) => {
                        if (open) {
                          onOpenCardChange?.(zistId);
                        } else if (openCardId === zistId) {
                          onOpenCardChange?.(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </ScrollArea>
        </CardContent>
        <div className="p-3 pt-0 mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-lg border border-dashed border-border/70 bg-background/40 text-muted-foreground hover:bg-muted/60"
            onClick={() => onAddZist(column.id)}
            disabled={isDisabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a card
          </Button>
        </div>
      </Card>

      {/* Separate Delete Dialog for Column */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteDialogOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column "{column.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the column and all its tasks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Column"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


