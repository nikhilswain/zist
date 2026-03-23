"use client";

import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { Header } from "@/components/header";
import { BoardHeader } from "@/components/board-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoard } from "@/lib/db";
import type { BoardType } from "@/lib/types";
import { toast } from "sonner";

export default function BoardPage() {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const boardId = window.location.pathname.split("/").pop() || {};

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        if (boardId) {
          const boardData = await getBoard(boardId as string);
          if (boardData) {
            setBoard(boardData);
          } else {
            toast.error("Board not found", {
              description: "The requested board could not be found",
            });

            window.location.href = "/";
          }
        }
      } catch (error) {
        console.error("Error fetching board:", error);
        toast.error("Error", {
          description: "Failed to load board",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [boardId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto p-4">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-80">
                <Skeleton className="h-10 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-32" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!board) return null;

  // Get the board theme class
  const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

  return (
    <div className={`h-dvh overflow-hidden flex flex-col ${boardThemeClass}`}>
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search cards in ${board.name}`}
      />
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden container mx-auto p-4">
        <div className="shrink-0">
          <BoardHeader board={board} setBoard={setBoard} />
        </div>
        <Board board={board} setBoard={setBoard} searchQuery={searchQuery} />
      </main>
    </div>
  );
}
