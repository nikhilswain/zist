"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Columns3,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  BoardType,
  BoardViewSort,
  BoardViewState,
  SavedBoardView,
} from "@/lib/types";

interface BoardViewBarProps {
  board: BoardType;
  viewState: BoardViewState;
  savedViews: SavedBoardView[];
  isOpen: boolean;
  onApplyView: (view: SavedBoardView) => void;
  onSaveView: (name: string) => void;
  onUpdateActiveView: () => void;
  onRenameView: (viewId: string, name: string) => void;
  onDeleteView: (viewId: string) => void;
  onResetView: () => void;
  onSortModeChange: (sortMode: BoardViewSort) => void;
  onSelectedColumnIdChange: (columnId: string | null) => void;
}

const SORT_OPTIONS: Array<{ value: BoardViewSort; label: string }> = [
  { value: "manual", label: "Manual order" },
  { value: "updated-desc", label: "Recently updated" },
  { value: "created-desc", label: "Recently created" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

export function BoardViewBar({
  board,
  viewState,
  savedViews,
  isOpen,
  onApplyView,
  onSaveView,
  onUpdateActiveView,
  onRenameView,
  onDeleteView,
  onResetView,
  onSortModeChange,
  onSelectedColumnIdChange,
}: BoardViewBarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const activeSavedView = useMemo(
    () => savedViews.find((view) => view.id === viewState.activeViewId) ?? null,
    [savedViews, viewState.activeViewId],
  );

  const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

  const hasTemporaryState =
    viewState.query.trim().length > 0 ||
    viewState.selectedColumnId !== null ||
    viewState.sortMode !== "manual";

  const summaryBadges = [
    activeSavedView ? `View: ${activeSavedView.name}` : null,
    viewState.selectedColumnId
      ? `Column: ${
          board.columns.find((column) => column.id === viewState.selectedColumnId)?.name ??
          "Unknown"
        }`
      : null,
    viewState.sortMode !== "manual"
      ? `Sort: ${SORT_OPTIONS.find((option) => option.value === viewState.sortMode)?.label}`
      : null,
    viewState.query.trim() ? `Search: ${viewState.query.trim()}` : null,
  ].filter(Boolean) as string[];

  const handleOpenSaveDialog = () => {
    setNewViewName(viewState.query.trim() || activeSavedView?.name || `${board.name} view`);
    setSaveDialogOpen(true);
  };

  const handleSaveSubmit = () => {
    const trimmedName = newViewName.trim();
    if (!trimmedName) {
      return;
    }

    onSaveView(trimmedName);
    setSaveDialogOpen(false);
    setNewViewName("");
  };

  const handleOpenRenameDialog = () => {
    if (!activeSavedView) {
      return;
    }

    setRenameValue(activeSavedView.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    const trimmedName = renameValue.trim();
    if (!trimmedName || !activeSavedView) {
      return;
    }

    onRenameView(activeSavedView.id, trimmedName);
    setRenameDialogOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "mb-4 rounded-2xl border border-border/70 bg-background/60 p-3 backdrop-blur",
        boardThemeClass,
      )}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              Saved Views
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                {savedViews.length}
              </Badge>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedViews.length === 0 ? (
                <div className="flex h-9 items-center rounded-full border border-dashed border-border/70 px-3 text-xs text-muted-foreground">
                  No saved views yet.
                </div>
              ) : (
                savedViews.map((view) => {
                  const isActive = activeSavedView?.id === view.id;

                  return (
                    <Button
                      key={view.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "h-9 rounded-full px-3 text-xs",
                        isActive && "border-primary/50 bg-background/80 text-foreground",
                      )}
                      onClick={() => onApplyView(view)}
                    >
                      {view.name}
                    </Button>
                  );
                })
              )}
            </div>

            {summaryBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summaryBadges.map((badge) => (
                  <Badge
                    key={badge}
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <Select
              value={viewState.selectedColumnId ?? "all"}
              onValueChange={(value) => onSelectedColumnIdChange(value === "all" ? null : value)}
            >
              <SelectTrigger className="h-9 w-full rounded-full border-border/70 bg-background/60 sm:w-[180px]">
                <Columns3 className="h-4 w-4" />
                <SelectValue placeholder="All columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All columns</SelectItem>
                {board.columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewState.sortMode} onValueChange={(value) => onSortModeChange(value as BoardViewSort)}>
              <SelectTrigger className="h-9 w-full rounded-full border-border/70 bg-background/60 sm:w-[200px]">
                <SlidersHorizontal className="h-4 w-4" />
                <SelectValue placeholder="Sort cards" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-full border-border/70 bg-background/60 px-3"
              onClick={handleOpenSaveDialog}
              disabled={!hasTemporaryState}
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Save View
            </Button>

            {activeSavedView ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-border/70 bg-background/60 px-3"
                onClick={onUpdateActiveView}
              >
                <Save className="mr-2 h-4 w-4" />
                Update
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3"
              onClick={onResetView}
              disabled={!hasTemporaryState && !activeSavedView}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear
            </Button>

            {activeSavedView ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-full border-border/70 bg-background/60"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenRenameDialog}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteView(activeSavedView.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
            <DialogDescription>
              Save this board setup so you can jump back to it quickly.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newViewName}
            onChange={(event) => setNewViewName(event.target.value)}
            placeholder="Active bugs"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSaveSubmit();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSubmit} disabled={!newViewName.trim()}>
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename saved view</DialogTitle>
            <DialogDescription>
              Update the label without changing the actual filters.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder="In progress reviews"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleRenameSubmit();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!renameValue.trim()}>
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
