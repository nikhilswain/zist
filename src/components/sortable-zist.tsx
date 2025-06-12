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
}

export function SortableZist({
  id,
  zist,
  board,
  setBoard,
  columnId,
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${isDragging ? "z-10" : ""}`}
    >
      <Zist zist={zist} board={board} setBoard={setBoard} />
    </div>
  );
}
