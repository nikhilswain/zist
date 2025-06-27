import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zist } from "@/components/zist";
import { SortableColumn } from "@/components/sortable-column";
import { CreateZistDialog } from "@/components/create-zist-dialog";
import type { BoardType, ZistType } from "@/lib/types";
import {
  updateBoard,
  createColumn,
  deleteColumn,
  updateColumn,
  moveZist,
} from "@/lib/db";
import { toast } from "sonner";
import { useThemeClass } from "@/lib/hooks/use-theme-class";

interface BoardProps {
  board: BoardType;
  setBoard: (board: BoardType) => void;
}

export function Board({ board, setBoard }: BoardProps) {
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
  const [activeType, setActiveType] = useState<"column" | "zist" | null>(null);

  const boardThemeClass = useThemeClass(board.theme);

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

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);

    // Determine if we're dragging a column or a zist
    if (active.data.current?.type === "column") {
      setActiveType("column");
    } else {
      setActiveType("zist");
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    // Handle column reordering
    if (
      active.data.current?.type === "column" &&
      over.data.current?.type === "column"
    ) {
      if (active.id !== over.id) {
        const oldIndex = board.columns.findIndex((col) => col.id === active.id);
        const newIndex = board.columns.findIndex((col) => col.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumns = arrayMove(board.columns, oldIndex, newIndex);

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
      }
    }

    // Handle zist reordering or moving between columns
    if (active.data.current?.type === "zist") {
      const activeColumnId = active.data.current.columnId;
      const overColumnId =
        over.data.current?.type === "column"
          ? over.id
          : over.data.current?.columnId;

      if (!activeColumnId || !overColumnId) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const sourceColumnIndex = board.columns.findIndex(
        (col) => col.id === activeColumnId
      );
      const destColumnIndex = board.columns.findIndex(
        (col) => col.id === overColumnId
      );

      if (sourceColumnIndex === -1 || destColumnIndex === -1) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const sourceColumn = board.columns[sourceColumnIndex];
      const destColumn = board.columns[destColumnIndex];

      // Find the zist in the source column
      const zistIndex = sourceColumn.zists.findIndex(
        (zist) => zist.id === active.id
      );
      if (zistIndex === -1) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const zist = sourceColumn.zists[zistIndex];

      // Create new arrays to avoid mutating state directly
      const newColumns = [...board.columns];
      const newSourceColumn = {
        ...sourceColumn,
        zists: [...sourceColumn.zists],
      };
      const newDestColumn =
        sourceColumnIndex === destColumnIndex
          ? newSourceColumn
          : { ...destColumn, zists: [...destColumn.zists] };

      // Remove the zist from the source column
      newSourceColumn.zists.splice(zistIndex, 1);

      // If moving to a different column, update the zist's columnId
      let updatedZist = zist;
      if (sourceColumnIndex !== destColumnIndex) {
        updatedZist = {
          ...zist,
          columnId: destColumn.id,
        };
      }

      // Add the zist to the destination column
      // If over is a zist, find its index in the destination column
      if (
        over.data.current?.type === "zist" &&
        over.data.current?.columnId === overColumnId
      ) {
        const overIndex = newDestColumn.zists.findIndex(
          (z) => z.id === over.id
        );
        if (overIndex !== -1) {
          newDestColumn.zists.splice(overIndex, 0, updatedZist);
        } else {
          newDestColumn.zists.push(updatedZist);
        }
      } else {
        // If over is a column, add to the end
        newDestColumn.zists.push(updatedZist);
      }

      // Update the columns in the board
      newColumns[sourceColumnIndex] = newSourceColumn;
      if (sourceColumnIndex !== destColumnIndex) {
        newColumns[destColumnIndex] = newDestColumn;
      }

      const updatedBoard = {
        ...board,
        columns: newColumns,
      };

      setBoard(updatedBoard);

      // Persist the changes to the database
      try {
        if (sourceColumnIndex !== destColumnIndex) {
          await moveZist(board.id, sourceColumn.id, destColumn.id, zist.id);
        } else {
          await updateBoard(updatedBoard);
        }
      } catch (error) {
        console.error("Error updating board:", error);
        toast.error("Failed to move card");
      }
    }

    setActiveId(null);
    setActiveType(null);
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
    const columnIndex = board.columns.findIndex(
      (col) => col.id === zist.columnId
    );
    if (columnIndex === -1) return;

    const updatedColumns = [...board.columns];
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      zists: [...updatedColumns[columnIndex].zists, zist],
    };

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);
  };

  // Find the active column or zist for the drag overlay
  const getActiveItem = () => {
    if (!activeId || !activeType) return null;

    if (activeType === "column") {
      const column = board.columns.find((col) => col.id === activeId);
      if (!column) return null;

      return (
        <Card
          className={`w-80 h-full flex flex-col apple-card opacity-80 ${boardThemeClass}`}
        >
          <CardHeader className="p-3 pb-0 flex flex-row items-center space-y-0">
            <CardTitle className="text-sm font-medium flex-1 truncate">
              {column.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-hidden">
            <div className="space-y-2 min-h-[200px]">
              {column.zists.map((zist) => (
                <div key={zist.id} className="opacity-50">
                  <Zist zist={zist} board={board} setBoard={setBoard} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeType === "zist") {
      // Find the zist in any column
      let activeZist: ZistType | null = null;
      for (const column of board.columns) {
        const zist = column.zists.find((z) => z.id === activeId);
        if (zist) {
          activeZist = zist;
          break;
        }
      }

      if (!activeZist) return null;

      return <Zist zist={activeZist} board={board} setBoard={setBoard} />;
    }

    return null;
  };

  return (
    <div className={`h-full ${boardThemeClass} rounded-xl`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto h-full p-4 ">
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
              <Card className={`apple-card ${boardThemeClass}`}>
                <CardHeader className="p-3 pb-0">
                  <Input
                    placeholder="Enter column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="h-8"
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
                </CardHeader>
                <CardContent className="p-3 flex gap-2">
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
                    Cancel
                  </Button>
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

          <DragOverlay>
            {activeId ? (
              <div className="drag-overlay">{getActiveItem()}</div>
            ) : null}
          </DragOverlay>
        </div>
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
