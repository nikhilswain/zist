"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  FolderOpen,
  LayoutGrid,
  MoveRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getBoardsByWorkspace, getWorkspaces } from "@/lib/db";
import type { BoardType, WorkspaceType, ZistType } from "@/lib/types";
import { toast } from "sonner";

const LAST_OPENED_BOARD_KEY = "zist-last-board";

const getBoardThemeClass = (theme?: string) =>
  theme ? `board-theme-${theme}` : "";

type RecentBoard = {
  board: BoardType;
  workspaceName: string;
};

type RecentCard = {
  zist: ZistType;
  boardName: string;
  workspaceName: string;
};

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} day${diff >= 2 * day ? "s" : ""} ago`;
  }

  return new Date(timestamp).toLocaleDateString();
};

export function HomeRecentActivity() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [lastOpenedBoardId, setLastOpenedBoardId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const workspaceData = await getWorkspaces();
        setWorkspaces(workspaceData);

        const boardGroups = await Promise.all(
          workspaceData.map((workspace) => getBoardsByWorkspace(workspace.id))
        );

        setBoards(boardGroups.flat());
        setLastOpenedBoardId(localStorage.getItem(LAST_OPENED_BOARD_KEY));
      } catch (error) {
        console.error("Error loading recent activity:", error);
        toast.error("Failed to load recent activity");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const workspaceNameById = useMemo(
    () =>
      Object.fromEntries(
        workspaces.map((workspace) => [workspace.id, workspace.name])
      ),
    [workspaces]
  );

  const boardById = useMemo(
    () => Object.fromEntries(boards.map((board) => [board.id, board])),
    [boards]
  );

  const recentBoards = useMemo<RecentBoard[]>(
    () =>
      [...boards]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 4)
        .map((board) => ({
          board,
          workspaceName: workspaceNameById[board.workspaceId] ?? "Workspace",
        })),
    [boards, workspaceNameById]
  );

  const recentCards = useMemo<RecentCard[]>(
    () =>
      boards
        .flatMap((board) =>
          board.columns.flatMap((column) =>
            column.zists.map((zist) => ({
              zist,
              boardName: board.name,
              workspaceName: workspaceNameById[board.workspaceId] ?? "Workspace",
            }))
          )
        )
        .sort((a, b) => b.zist.updatedAt - a.zist.updatedAt)
        .slice(0, 4),
    [boards, workspaceNameById]
  );

  const lastOpenedBoard = useMemo(
    () =>
      lastOpenedBoardId
        ? boards.find((board) => board.id === lastOpenedBoardId) ?? null
        : null,
    [boards, lastOpenedBoardId]
  );

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (boards.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
            <span>Home shortcuts</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Jump back in</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your recent boards and cards stay here for fast re-entry without
            digging through everything.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {boards.length} active boards
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Card className="relative overflow-hidden border-border/60 bg-background/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              <span className="text-sm">Last opened</span>
            </div>
            <CardTitle className="text-lg">
              {lastOpenedBoard ? "Continue where you left off" : "Open a board"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastOpenedBoard ? (
              <a
                href={`/board/${lastOpenedBoard.id}`}
                className={`group block rounded-2xl border border-white/10 p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${getBoardThemeClass(
                  lastOpenedBoard.theme
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold">{lastOpenedBoard.name}</div>
                    <div className="text-sm text-muted-foreground/90">
                      {workspaceNameById[lastOpenedBoard.workspaceId]}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/90">
                      <span className="rounded-full border border-white/10 bg-background/30 px-2 py-1">
                        {lastOpenedBoard.columns.length} columns
                      </span>
                      <span className="rounded-full border border-white/10 bg-background/30 px-2 py-1">
                        {lastOpenedBoard.columns.reduce(
                          (count, column) => count + column.zists.length,
                          0
                        )} tasks
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {formatRelativeTime(lastOpenedBoard.updatedAt)}
                    </div>
                  </div>
                  <MoveRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                Open any board and it will appear here for quick return access.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <span className="text-sm">Recent boards</span>
            </div>
            <CardTitle className="text-lg">Most recently updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBoards.map(({ board, workspaceName }) => (
              <a
                key={board.id}
                href={`/board/${board.id}`}
                className={`block rounded-2xl border border-white/10 p-3 shadow-sm transition-transform hover:-translate-y-0.5 ${getBoardThemeClass(
                  board.theme
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{board.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {workspaceName}
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-background/30 px-2 py-1 text-[11px] capitalize text-muted-foreground">
                    {board.theme || "default"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{board.columns.length} columns</span>
                  <span>{formatRelativeTime(board.updatedAt)}</span>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/30 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">Recent cards</span>
            </div>
            <CardTitle className="text-lg">Recently touched cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCards.length > 0 ? (
              recentCards.map(({ zist, boardName, workspaceName }) => (
                <a
                  key={zist.id}
                  href={`/board/${zist.boardId}`}
                  className={`block rounded-2xl border border-white/10 p-3 shadow-sm transition-transform hover:-translate-y-0.5 ${getBoardThemeClass(
                    boardById[zist.boardId]?.theme
                  )}`}
                >
                  <div className="line-clamp-1 font-medium">{zist.title}</div>
                  <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {boardName} in {workspaceName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {boardById[zist.boardId]?.columns.find(
                        (column) => column.id === zist.columnId
                      )?.name || "Card"}
                    </span>
                    <span>{formatRelativeTime(zist.updatedAt)}</span>
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                Your recently edited cards will show up here once you start
                updating them.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
