"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Zist } from "@/components/zist";
import type { ZistType, BoardType } from "@/lib/types";

interface SortableZistProps {
  id: string;
  zist: ZistType;
  board: BoardType;
  setBoard: (board: BoardType) => void;
  columnId: string;
  forceOpen?: boolean;
  onDetailOpenChange?: (open: boolean, zistId: string) => void;
}

export function SortableZist({
  id,
  zist,
  board,
  setBoard,
  columnId,
  forceOpen = false,
  onDetailOpenChange,
}: SortableZistProps) {
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
      type: "zist",
      zist,
      columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${isDragging ? "z-10" : ""}`}
    >
      <Zist
        zist={zist}
        board={board}
        setBoard={setBoard}
        forceOpen={forceOpen}
        onDetailOpenChange={onDetailOpenChange}
      />
    </div>
  );
}
