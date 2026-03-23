"use client";

import { useEffect, useRef, useState } from "react";
import { Board } from "@/components/board";
import { Header } from "@/components/header";
import { BoardHeader } from "@/components/board-header";
import { BoardViewBar } from "@/components/board-view-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoard } from "@/lib/db";
import {
  clearStoredBoardViewState,
  createSavedBoardView,
  DEFAULT_BOARD_VIEW_STATE,
  getSavedBoardViews,
  getStoredBoardViewState,
  sanitizeBoardViewState,
  storeBoardViewState,
  storeSavedBoardViews,
} from "@/lib/board-views";
import type { BoardType, BoardViewState, SavedBoardView } from "@/lib/types";
import { toast } from "sonner";

const LAST_OPENED_BOARD_KEY = "zist-last-board";
const OPEN_CARD_EVENT = "zist:open-card";

export default function BoardPage() {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [viewState, setViewState] = useState<BoardViewState>(
    DEFAULT_BOARD_VIEW_STATE,
  );
  const [savedViews, setSavedViews] = useState<SavedBoardView[]>([]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [areViewsOpen, setAreViewsOpen] = useState(false);
  const preserveViewStateRef = useRef(false);

  const boardId = window.location.pathname.split("/").pop() || {};

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        if (boardId) {
          const boardData = await getBoard(boardId as string);
          if (boardData) {
            const storedViews = getSavedBoardViews(boardData.id);
            const storedViewState = getStoredBoardViewState(boardData);
            const activeViewStillExists =
              storedViewState.activeViewId === null ||
              storedViews.some(
                (view) => view.id === storedViewState.activeViewId,
              );

            setBoard(boardData);
            setSavedViews(storedViews);
            setViewState({
              ...storedViewState,
              activeViewId: activeViewStillExists
                ? storedViewState.activeViewId
                : null,
            });

            const currentUrl = new URL(window.location.href);
            setOpenCardId(currentUrl.searchParams.get("card"));
            localStorage.setItem(LAST_OPENED_BOARD_KEY, boardData.id);
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

  useEffect(() => {
    const handleOpenCard = (event: Event) => {
      const customEvent = event as CustomEvent<{
        boardId: string;
        cardId: string;
      }>;

      if (!customEvent.detail || customEvent.detail.boardId !== boardId) {
        return;
      }

      setViewState((currentState) => ({
        ...currentState,
        query: "",
        activeViewId: null,
      }));
      setOpenCardId(customEvent.detail.cardId);

      const url = new URL(window.location.href);
      url.searchParams.set("card", customEvent.detail.cardId);
      window.history.replaceState({}, "", url.toString());
    };

    window.addEventListener(OPEN_CARD_EVENT, handleOpenCard as EventListener);

    return () => {
      window.removeEventListener(
        OPEN_CARD_EVENT,
        handleOpenCard as EventListener,
      );
    };
  }, [boardId]);

  useEffect(() => {
    if (!board) {
      return;
    }

    storeBoardViewState(board.id, viewState);
  }, [board, viewState]);

  useEffect(() => {
    preserveViewStateRef.current = false;

    const handleBeforeUnload = () => {
      preserveViewStateRef.current = true;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!board) {
      return;
    }

    return () => {
      if (!preserveViewStateRef.current) {
        clearStoredBoardViewState(board.id);
      }
    };
  }, [board]);

  const handleOpenCardChange = (cardId: string | null) => {
    setOpenCardId(cardId);

    const url = new URL(window.location.href);

    if (cardId) {
      url.searchParams.set("card", cardId);
      setViewState((currentState) => ({
        ...currentState,
        query: "",
        activeViewId: null,
      }));
    } else {
      url.searchParams.delete("card");
    }

    window.history.replaceState({}, "", url.toString());
  };

  const handleApplySavedView = (view: SavedBoardView) => {
    if (!board) {
      return;
    }

    setViewState({
      ...sanitizeBoardViewState(board, view.state),
      activeViewId: view.id,
    });
  };

  const handleSaveView = (name: string) => {
    if (!board) {
      return;
    }

    const nextView = createSavedBoardView(board.id, name, {
      query: viewState.query,
      selectedColumnId: viewState.selectedColumnId,
      sortMode: viewState.sortMode,
    });
    const nextSavedViews = [nextView, ...savedViews];

    storeSavedBoardViews(board.id, nextSavedViews);
    setSavedViews(nextSavedViews);
    setViewState((currentState) => ({
      ...currentState,
      activeViewId: nextView.id,
    }));

    toast.success("View saved", {
      description: `"${name}" is ready to reuse on this board.`,
    });
  };

  const handleUpdateActiveView = () => {
    if (!board || !viewState.activeViewId) {
      return;
    }

    const nextSavedViews = savedViews.map((view) =>
      view.id === viewState.activeViewId
        ? {
            ...view,
            updatedAt: Date.now(),
            state: {
              query: viewState.query,
              selectedColumnId: viewState.selectedColumnId,
              sortMode: viewState.sortMode,
            },
          }
        : view,
    );

    storeSavedBoardViews(board.id, nextSavedViews);
    setSavedViews(nextSavedViews);

    toast.success("View updated", {
      description: "Your saved board view now reflects the latest filters.",
    });
  };

  const handleRenameView = (viewId: string, name: string) => {
    if (!board) {
      return;
    }

    const nextSavedViews = savedViews.map((view) =>
      view.id === viewId
        ? {
            ...view,
            name,
            updatedAt: Date.now(),
          }
        : view,
    );

    storeSavedBoardViews(board.id, nextSavedViews);
    setSavedViews(nextSavedViews);

    toast.success("View renamed", {
      description: `Saved as "${name}".`,
    });
  };

  const handleDeleteView = (viewId: string) => {
    if (!board) {
      return;
    }

    const nextSavedViews = savedViews.filter((view) => view.id !== viewId);
    storeSavedBoardViews(board.id, nextSavedViews);
    setSavedViews(nextSavedViews);
    setViewState((currentState) => ({
      ...currentState,
      activeViewId:
        currentState.activeViewId === viewId ? null : currentState.activeViewId,
    }));

    toast.success("View deleted", {
      description: "The saved view has been removed from this board.",
    });
  };

  const handleResetView = () => {
    setViewState(DEFAULT_BOARD_VIEW_STATE);
  };

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

  const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

  return (
    <div className={`h-dvh overflow-hidden flex flex-col ${boardThemeClass}`}>
      <Header
        searchValue={viewState.query}
        onSearchChange={(query) =>
          setViewState((currentState) => ({
            ...currentState,
            query,
            activeViewId: null,
          }))
        }
        searchPlaceholder={`Search cards in ${board.name}`}
      />
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden container mx-auto p-4">
        <div className="shrink-0">
          <BoardHeader
            board={board}
            setBoard={setBoard}
            areViewsOpen={areViewsOpen}
            onToggleViews={() => setAreViewsOpen((current) => !current)}
          />
          <BoardViewBar
            board={board}
            viewState={viewState}
            savedViews={savedViews}
            isOpen={areViewsOpen}
            onApplyView={handleApplySavedView}
            onSaveView={handleSaveView}
            onUpdateActiveView={handleUpdateActiveView}
            onRenameView={handleRenameView}
            onDeleteView={handleDeleteView}
            onResetView={handleResetView}
            onSelectedColumnIdChange={(selectedColumnId) =>
              setViewState((currentState) => ({
                ...currentState,
                selectedColumnId,
                activeViewId: null,
              }))
            }
            onSortModeChange={(sortMode) =>
              setViewState((currentState) => ({
                ...currentState,
                sortMode,
                activeViewId: null,
              }))
            }
          />
        </div>
        <Board
          board={board}
          setBoard={setBoard}
          searchQuery={viewState.query}
          selectedSearchColumnId={viewState.selectedColumnId}
          onSelectedSearchColumnIdChange={(selectedColumnId) =>
            setViewState((currentState) => ({
              ...currentState,
              selectedColumnId,
              activeViewId: null,
            }))
          }
          sortMode={viewState.sortMode}
          openCardId={openCardId}
          onOpenCardChange={handleOpenCardChange}
        />
      </main>
    </div>
  );
}
