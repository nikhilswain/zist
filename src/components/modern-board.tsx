import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SortableColumn } from "@/components/sortable-column";
import { CreateZistDialog } from "@/components/create-zist-dialog";
import type { BoardType, ZistType, ColumnType } from "@/lib/types";
import {
  updateBoard,
  createColumn,
  deleteColumn,
  updateColumn,
  moveZist,
} from "@/lib/db";
import { toast } from "sonner";

interface ModernBoardProps {
  board: BoardType;
  setBoard: (board: BoardType) => void;
}

export function ModernBoard({ board, setBoard }: ModernBoardProps) {
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [createZistOpen, setCreateZistOpen] = useState(false);
  const [currentColumnId, setCurrentColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isDeletingColumn, setIsDeletingColumn] = useState<string | null>(null);
  const [isUpdatingColumn, setIsUpdatingColumn] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [activeZist, setActiveZist] = useState<ZistType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    if (active.data.current?.type === "column") {
      setActiveColumn(active.data.current.column);
      setActiveZist(null);
    } else if (active.data.current?.type === "zist") {
      setActiveZist(active.data.current.zist);
      setActiveColumn(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // If the active and over elements are the same, do nothing
    if (activeId === overId) return;

    // Handle zist movement between columns
    if (
      active.data.current?.type === "zist" &&
      over.data.current?.type !== "zist"
    ) {
      const activeColumnId = active.data.current.columnId;
      const overColumnId = over.id as string;

      // If the zist is already in this column, do nothing
      if (activeColumnId === overColumnId) return;

      // Find the columns
      const activeColumnIndex = board.columns.findIndex(
        (col) => col.id === activeColumnId
      );
      const overColumnIndex = board.columns.findIndex(
        (col) => col.id === overColumnId
      );

      if (activeColumnIndex === -1 || overColumnIndex === -1) return;

      // Create new board state
      const newBoard = { ...board };

      // Find the zist in the active column
      const zistIndex = newBoard.columns[activeColumnIndex].zists.findIndex(
        (zist) => zist.id === activeId
      );

      if (zistIndex === -1) return;

      // Get the zist
      const [zist] = newBoard.columns[activeColumnIndex].zists.splice(
        zistIndex,
        1
      );

      // Update the zist's columnId
      zist.columnId = overColumnId;

      // Add to the over column
      newBoard.columns[overColumnIndex].zists.push(zist);

      // Update the board state
      setBoard(newBoard);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveColumn(null);
    setActiveZist(null);

    if (!over) return;

    // Handle column reordering
    if (active.data.current?.type === "column") {
      const activeColumnIndex = board.columns.findIndex(
        (col) => col.id === active.id
      );
      const overColumnIndex = board.columns.findIndex(
        (col) => col.id === over.id
      );

      if (activeColumnIndex !== overColumnIndex) {
        const newColumns = arrayMove(
          board.columns,
          activeColumnIndex,
          overColumnIndex
        );

        // Update the order property
        const updatedColumns = newColumns.map((column, index) => ({
          ...column,
          order: index,
        }));

        const updatedBoard = {
          ...board,
          columns: updatedColumns,
        };

        setBoard(updatedBoard);

        try {
          await updateBoard(updatedBoard);
        } catch (error) {
          console.error("Error updating board:", error);
          toast.error("Failed to reorder columns");
        }
      }
      return;
    }

    // Handle zist reordering or movement between columns
    if (active.data.current?.type === "zist") {
      const activeColumnId = active.data.current.columnId;
      const activeZistId = active.id as string;

      // If over a zist, handle reordering within a column or moving to another column
      if (over.data.current?.type === "zist") {
        const overColumnId = over.data.current.columnId;
        const overZistId = over.id as string;

        // Find the columns
        const activeColumnIndex = board.columns.findIndex(
          (col) => col.id === activeColumnId
        );
        const overColumnIndex = board.columns.findIndex(
          (col) => col.id === overColumnId
        );

        if (activeColumnIndex === -1 || overColumnIndex === -1) return;

        // Find the zists
        const activeZistIndex = board.columns[
          activeColumnIndex
        ].zists.findIndex((zist) => zist.id === activeZistId);
        const overZistIndex = board.columns[overColumnIndex].zists.findIndex(
          (zist) => zist.id === overZistId
        );

        if (activeZistIndex === -1 || overZistIndex === -1) return;

        // Create new board state
        const newBoard = { ...board };

        // If same column, just reorder
        if (activeColumnId === overColumnId) {
          newBoard.columns[activeColumnIndex].zists = arrayMove(
            newBoard.columns[activeColumnIndex].zists,
            activeZistIndex,
            overZistIndex
          );
        } else {
          // Remove from source column
          const [movedZist] = newBoard.columns[activeColumnIndex].zists.splice(
            activeZistIndex,
            1
          );

          // Update columnId
          movedZist.columnId = overColumnId;

          // Add to destination column at the specific position
          newBoard.columns[overColumnIndex].zists.splice(
            overZistIndex,
            0,
            movedZist
          );

          // Persist the move to the database
          try {
            await moveZist(
              board.id,
              activeColumnId,
              overColumnId,
              movedZist.id
            );
          } catch (error) {
            console.error("Error moving zist:", error);
            toast.error("Failed to move card");
            return;
          }
        }

        // Update the board state
        setBoard(newBoard);

        // If it's just a reorder within the same column, update the board in the database
        if (activeColumnId === overColumnId) {
          try {
            await updateBoard(newBoard);
          } catch (error) {
            console.error("Error updating board:", error);
            toast.error("Failed to reorder cards");
          }
        }
      } else if (over.data.current?.type === "column") {
        // If over a column, move the zist to the end of that column
        const overColumnId = over.id as string;

        // If the zist is already in this column, do nothing
        if (activeColumnId === overColumnId) return;

        // Find the columns
        const activeColumnIndex = board.columns.findIndex(
          (col) => col.id === activeColumnId
        );
        const overColumnIndex = board.columns.findIndex(
          (col) => col.id === overColumnId
        );

        if (activeColumnIndex === -1 || overColumnIndex === -1) return;

        // Create new board state
        const newBoard = { ...board };

        // Find the zist in the active column
        const zistIndex = newBoard.columns[activeColumnIndex].zists.findIndex(
          (zist) => zist.id === activeZistId
        );

        if (zistIndex === -1) return;

        // Get the zist
        const [movedZist] = newBoard.columns[activeColumnIndex].zists.splice(
          zistIndex,
          1
        );

        // Update the zist's columnId
        movedZist.columnId = overColumnId;

        // Add to the over column
        newBoard.columns[overColumnIndex].zists.push(movedZist);

        // Update the board state
        setBoard(newBoard);

        // Persist the move to the database
        try {
          await moveZist(board.id, activeColumnId, overColumnId, movedZist.id);
        } catch (error) {
          console.error("Error moving zist:", error);
          toast.error("Failed to move card");
        }
      }
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Please enter a column name");
      return;
    }

    try {
      setIsAddingColumn(true);
      const column = await createColumn(board.id, newColumnName);

      const updatedBoard = {
        ...board,
        columns: [...board.columns, column],
      };

      setBoard(updatedBoard);
      setNewColumnName("");
      setAddingColumn(false);

      toast.success("Column added successfully");
    } catch (error) {
      console.error("Error adding column:", error);
      toast.error("Failed to add column");
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      setIsDeletingColumn(columnId);
      await deleteColumn(board.id, columnId);

      const updatedBoard = {
        ...board,
        columns: board.columns.filter((col) => col.id !== columnId),
      };

      setBoard(updatedBoard);

      toast.success("Column deleted successfully");
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error("Failed to delete column");
    } finally {
      setIsDeletingColumn(null);
    }
  };

  const handleEditColumn = async (columnId: string) => {
    const column = board.columns.find((col) => col.id === columnId);
    if (!column) return;

    setEditingColumnId(columnId);
    setEditingColumnName(column.name);
  };

  const handleSaveColumnEdit = async () => {
    if (!editingColumnId || !editingColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }

    try {
      setIsUpdatingColumn(true);
      const columnIndex = board.columns.findIndex(
        (col) => col.id === editingColumnId
      );
      if (columnIndex === -1) return;

      const updatedColumn = {
        ...board.columns[columnIndex],
        name: editingColumnName,
      };

      await updateColumn(board.id, updatedColumn);

      const updatedColumns = [...board.columns];
      updatedColumns[columnIndex] = updatedColumn;

      const updatedBoard = {
        ...board,
        columns: updatedColumns,
      };

      setBoard(updatedBoard);
      setEditingColumnId(null);

      toast.success("Column updated successfully");
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error("Failed to update column");
    } finally {
      setIsUpdatingColumn(false);
    }
  };

  const handleOpenCreateZist = (columnId: string) => {
    setCurrentColumnId(columnId);
    setCreateZistOpen(true);
  };

  const handleZistCreated = (zist: ZistType) => {
    console.log("handleZistCreated called with:", zist);

    const columnIndex = board.columns.findIndex(
      (col) => col.id === zist.columnId
    );
    if (columnIndex === -1) {
      console.error("Column not found for zist:", zist.columnId);
      return;
    }

    console.log("Adding zist to column:", board.columns[columnIndex].name);

    const updatedColumns = [...board.columns];
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      zists: [...updatedColumns[columnIndex].zists, zist],
    };

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    console.log("Updating board state with new zist");
    setBoard(updatedBoard);
  };

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis, restrictToWindowEdges]}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 h-full">
          <SortableContext
            items={board.columns.map((col) => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns.map((column) => (
              <SortableColumn
                key={column.id}
                id={column.id}
                column={column}
                board={board}
                setBoard={setBoard}
                onEdit={handleEditColumn}
                onDelete={handleDeleteColumn}
                onAddZist={handleOpenCreateZist}
                isDeleting={isDeletingColumn === column.id}
                editingColumnId={editingColumnId}
                editingColumnName={editingColumnName}
                setEditingColumnName={setEditingColumnName}
                handleSaveColumnEdit={handleSaveColumnEdit}
                isUpdatingColumn={isUpdatingColumn}
              />
            ))}
          </SortableContext>

          {addingColumn ? (
            <div className="w-80 flex-shrink-0">
              <Card className="apple-card">
                <CardContent className="p-3">
                  <Input
                    placeholder="Enter column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="h-8 mb-3"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddColumn();
                      } else if (e.key === "Escape") {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddColumn}
                      disabled={isAddingColumn}
                    >
                      {isAddingColumn ? "Adding..." : "Add Column"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }}
                      disabled={isAddingColumn}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="w-80 flex-shrink-0">
              <Button
                variant="outline"
                className="h-12 w-full mt-1"
                onClick={() => setAddingColumn(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeColumn && (
            <div className="w-80 opacity-80">
              <Card className="h-full flex flex-col apple-card">
                <CardContent className="p-3">
                  <div className="font-medium">{activeColumn.name}</div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeZist && (
            <div className="w-[320px] opacity-80">
              <Card className="apple-card">
                <CardContent className="p-3">
                  <div className="font-medium">{activeZist.title}</div>
                  {activeZist.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {activeZist.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CreateZistDialog
        open={createZistOpen}
        onOpenChange={setCreateZistOpen}
        columnId={currentColumnId}
        boardId={board.id}
        onZistCreated={handleZistCreated}
      />
    </div>
  );
}
