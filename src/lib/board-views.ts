import { v4 as uuidv4 } from "uuid";
import type { BoardType, BoardViewState, SavedBoardView } from "@/lib/types";

const BOARD_VIEW_STATE_PREFIX = "zist-board-view-state";
const BOARD_SAVED_VIEWS_PREFIX = "zist-board-saved-views";

export const DEFAULT_BOARD_VIEW_STATE: BoardViewState = {
  query: "",
  selectedColumnId: null,
  sortMode: "manual",
  activeViewId: null,
};

const VALID_SORT_MODES = new Set<BoardViewState["sortMode"]>([
  "manual",
  "title-asc",
  "title-desc",
  "updated-desc",
  "created-desc",
]);

function getBoardViewStateKey(boardId: string) {
  return `${BOARD_VIEW_STATE_PREFIX}:${boardId}`;
}

function getSavedBoardViewsKey(boardId: string) {
  return `${BOARD_SAVED_VIEWS_PREFIX}:${boardId}`;
}

export function sanitizeBoardViewState(
  board: BoardType,
  state?: Partial<BoardViewState> | null,
): BoardViewState {
  const selectedColumnId =
    state?.selectedColumnId && board.columns.some((column) => column.id === state.selectedColumnId)
      ? state.selectedColumnId
      : null;

  const sortMode = VALID_SORT_MODES.has(state?.sortMode ?? "manual")
    ? (state?.sortMode ?? "manual")
    : "manual";

  return {
    query: typeof state?.query === "string" ? state.query : "",
    selectedColumnId,
    sortMode,
    activeViewId: typeof state?.activeViewId === "string" ? state.activeViewId : null,
  };
}

export function getStoredBoardViewState(board: BoardType): BoardViewState {
  if (typeof window === "undefined") {
    return DEFAULT_BOARD_VIEW_STATE;
  }

  try {
    const rawState = window.sessionStorage.getItem(getBoardViewStateKey(board.id));
    if (!rawState) {
      return DEFAULT_BOARD_VIEW_STATE;
    }

    const parsedState = JSON.parse(rawState) as Partial<BoardViewState>;
    return sanitizeBoardViewState(board, parsedState);
  } catch (error) {
    console.error("Failed to read stored board view state:", error);
    return DEFAULT_BOARD_VIEW_STATE;
  }
}

export function storeBoardViewState(boardId: string, state: BoardViewState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getBoardViewStateKey(boardId), JSON.stringify(state));
  } catch (error) {
    console.error("Failed to store board view state:", error);
  }
}

export function clearStoredBoardViewState(boardId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getBoardViewStateKey(boardId));
  } catch (error) {
    console.error("Failed to clear board view state:", error);
  }
}

export function getSavedBoardViews(boardId: string): SavedBoardView[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawViews = window.localStorage.getItem(getSavedBoardViewsKey(boardId));
    if (!rawViews) {
      return [];
    }

    const parsedViews = JSON.parse(rawViews) as SavedBoardView[];
    return Array.isArray(parsedViews) ? parsedViews : [];
  } catch (error) {
    console.error("Failed to read saved board views:", error);
    return [];
  }
}

export function storeSavedBoardViews(boardId: string, views: SavedBoardView[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getSavedBoardViewsKey(boardId), JSON.stringify(views));
  } catch (error) {
    console.error("Failed to store saved board views:", error);
  }
}

export function createSavedBoardView(
  boardId: string,
  name: string,
  state: Omit<BoardViewState, "activeViewId">,
): SavedBoardView {
  return {
    id: uuidv4(),
    boardId,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state,
  };
}
