"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BarChart2,
  Command,
  FolderOpen,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
import { CreateBoardDialog } from "@/components/create-board-dialog";
import { CreateZistDialog } from "@/components/create-zist-dialog";
import {
  getBoard,
  getBoardsByWorkspace,
  getWorkspace,
  getWorkspaces,
} from "@/lib/db";
import type { BoardType, WorkspaceType, ZistType } from "@/lib/types";
import { toast } from "sonner";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type HomeWorkspaceResult = {
  workspace: WorkspaceType;
  matchedBoards: BoardType[];
};

type CardResult = {
  zist: ZistType;
  columnName: string;
};

type PaletteAction = {
  key: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onSelect: () => void;
  badge?: string;
  section: string;
};

type PaletteItemProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  onSelect?: () => void;
  badge?: string;
  selected?: boolean;
  muted?: boolean;
  onMouseEnter?: () => void;
  itemRef?: (node: HTMLButtonElement | null) => void;
};

type PaletteSectionProps = {
  heading: string;
  children: ReactNode;
};

type ScopeSummary = {
  label: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-white/12 bg-black/20 px-2 text-[11px] font-medium tracking-wide text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {children}
    </span>
  );
}

function PaletteSection({ heading, children }: PaletteSectionProps) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {heading}
        </div>
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </section>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  description,
  onSelect,
  badge,
  selected = false,
  muted = false,
  onMouseEnter,
  itemRef,
}: PaletteItemProps) {
  const shellClassName = cn(
    "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3.5 text-left transition duration-200",
    muted && "border-dashed border-border/70 bg-muted/20",
    !muted &&
      !selected &&
      "border-border/65 bg-background/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent/40",
    selected &&
      "border-primary/35 bg-primary/10 shadow-[0_0_0_1px_rgba(99,102,241,0.12),0_18px_50px_rgba(59,130,246,0.12)]",
  );

  const content = (
    <>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
          selected
            ? "border-primary/25 bg-primary/12 text-primary"
            : "border-white/10 bg-white/[0.045]",
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {label}
        </div>
        {description ? (
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pl-2">
        {badge ? (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
              selected
                ? "border-primary/18 bg-primary/12 text-primary"
                : "border-white/10 bg-white/[0.04] text-muted-foreground",
            )}
          >
            {badge}
          </span>
        ) : null}
        {!muted ? (
          <ArrowUpRight
            className={cn(
              "h-4 w-4 transition",
              selected
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
        ) : null}
      </div>
    </>
  );

  if (!onSelect) {
    return <div className={shellClassName}>{content}</div>;
  }

  return (
    <button
      ref={itemRef}
      type="button"
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={shellClassName}
    >
      {content}
    </button>
  );
}

function ScopeCard({ scope }: { scope: ScopeSummary }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Current Scope
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <div className="text-lg font-semibold text-foreground">
            {scope.title}
          </div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {scope.description}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {scope.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/65 bg-background/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceType | null>(null);
  const [currentBoard, setCurrentBoard] = useState<BoardType | null>(null);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createZistOpen, setCreateZistOpen] = useState(false);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const isHome = currentPath === "/";
  const isWorkspace = currentPath.startsWith("/workspace/");
  const isBoard = currentPath.startsWith("/board/");
  const isAnalytics = currentPath.startsWith("/analytics");
  const isSettings = currentPath.startsWith("/settings");
  const workspaceId = isWorkspace
    ? (currentPath.split("/").pop() ?? null)
    : null;
  const boardId = isBoard ? (currentPath.split("/").pop() ?? null) : null;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedKey(null);
      return;
    }

    const loadContext = async () => {
      try {
        setLoading(true);
        setWorkspaces([]);
        setBoards([]);
        setCurrentWorkspace(null);
        setCurrentBoard(null);

        if (isHome) {
          const workspaceData = await getWorkspaces();
          setWorkspaces(workspaceData);
          const boardGroups = await Promise.all(
            workspaceData.map((workspace) =>
              getBoardsByWorkspace(workspace.id),
            ),
          );
          setBoards(boardGroups.flat());
          return;
        }

        if (isWorkspace && workspaceId) {
          const workspace = await getWorkspace(workspaceId);
          setCurrentWorkspace(workspace);
          if (workspace) {
            const workspaceBoards = await getBoardsByWorkspace(workspace.id);
            setBoards(workspaceBoards);
          }
          return;
        }

        if (isBoard && boardId) {
          const board = await getBoard(boardId);
          setCurrentBoard(board);
          if (board) {
            const workspace = await getWorkspace(board.workspaceId);
            setCurrentWorkspace(workspace);
          }
        }
      } catch (error) {
        console.error("Error loading command palette context:", error);
        toast.error("Failed to load command palette");
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, [open, isBoard, isHome, isWorkspace, workspaceId, boardId]);

  const normalizedQuery = query.trim().toLowerCase();
  const boardCardCount =
    currentBoard?.columns.reduce(
      (count, column) => count + column.zists.length,
      0,
    ) ?? 0;

  const closeAndRun = (action: () => void) => {
    onOpenChange(false);
    setTimeout(action, 0);
  };

  const navigateTo = (path: string) =>
    closeAndRun(() => {
      window.location.href = path;
    });

  const homeWorkspaceResults = useMemo<HomeWorkspaceResult[]>(() => {
    if (!isHome || !normalizedQuery) return [];

    return workspaces
      .map((workspace) => {
        const workspaceBoards = boards.filter(
          (board) => board.workspaceId === workspace.id,
        );
        const matchedBoards = workspaceBoards.filter((board) =>
          board.name.toLowerCase().includes(normalizedQuery),
        );

        return { workspace, matchedBoards };
      })
      .filter(
        ({ workspace, matchedBoards }) =>
          workspace.name.toLowerCase().includes(normalizedQuery) ||
          matchedBoards.length > 0,
      )
      .slice(0, 6);
  }, [boards, isHome, normalizedQuery, workspaces]);

  const homeBoardResults = useMemo(
    () =>
      isHome && normalizedQuery
        ? boards
            .filter((board) =>
              board.name.toLowerCase().includes(normalizedQuery),
            )
            .slice(0, 6)
        : [],
    [boards, isHome, normalizedQuery],
  );

  const workspaceBoardResults = useMemo(
    () =>
      isWorkspace && normalizedQuery
        ? boards
            .filter((board) =>
              board.name.toLowerCase().includes(normalizedQuery),
            )
            .slice(0, 8)
        : [],
    [boards, isWorkspace, normalizedQuery],
  );

  const boardCardResults = useMemo<CardResult[]>(() => {
    if (!isBoard || !currentBoard || !normalizedQuery) return [];

    return currentBoard.columns
      .flatMap((column) =>
        column.zists
          .filter((zist) => {
            const haystack =
              `${zist.title} ${zist.description} ${column.name}`.toLowerCase();
            return haystack.includes(normalizedQuery);
          })
          .map((zist) => ({
            zist,
            columnName: column.name,
          })),
      )
      .slice(0, 10);
  }, [currentBoard, isBoard, normalizedQuery]);

  const firstColumn = currentBoard?.columns[0] ?? null;

  const navigationActions = useMemo<PaletteAction[]>(() => {
    const actions: PaletteAction[] = [];

    if (!isHome) {
      actions.push({
        key: "nav-home",
        label: "Go to Home",
        description: "Return to your workspace overview",
        icon: Home,
        badge: "Jump",
        section: "Navigation",
        onSelect: () => navigateTo("/"),
      });
    }

    if (!isAnalytics) {
      actions.push({
        key: "nav-analytics",
        label: "Open Analytics",
        description: "See board progress and activity",
        icon: BarChart2,
        badge: "Jump",
        section: "Navigation",
        onSelect: () => navigateTo("/analytics"),
      });
    }

    if (!isSettings) {
      actions.push({
        key: "nav-settings",
        label: "Open Settings",
        description: "Backups, motion, and data controls",
        icon: Settings,
        badge: "Jump",
        section: "Navigation",
        onSelect: () => navigateTo("/settings"),
      });
    }

    if (currentWorkspace && !isWorkspace) {
      actions.push({
        key: `nav-workspace-${currentWorkspace.id}`,
        label: `Open ${currentWorkspace.name}`,
        description: "Jump to the current workspace",
        icon: FolderOpen,
        badge: "Jump",
        section: "Navigation",
        onSelect: () => navigateTo(`/workspace/${currentWorkspace.id}`),
      });
    }

    if (currentBoard && !isBoard) {
      actions.push({
        key: `nav-board-${currentBoard.id}`,
        label: `Open ${currentBoard.name}`,
        description: "Jump back to the current board",
        icon: LayoutGrid,
        badge: "Jump",
        section: "Navigation",
        onSelect: () => navigateTo(`/board/${currentBoard.id}`),
      });
    }

    return actions;
  }, [
    currentBoard,
    currentWorkspace,
    isAnalytics,
    isBoard,
    isHome,
    isSettings,
    isWorkspace,
  ]);

  const createActions = useMemo<PaletteAction[]>(() => {
    const actions: PaletteAction[] = [
      {
        key: "create-workspace",
        label: "Create Workspace",
        description: "Start a fresh workspace",
        icon: Plus,
        badge: "New",
        section: "Create",
        onSelect: () => closeAndRun(() => setCreateWorkspaceOpen(true)),
      },
    ];

    if (currentWorkspace) {
      actions.push({
        key: `create-board-${currentWorkspace.id}`,
        label: `Create Board in ${currentWorkspace.name}`,
        description: "Add a new board to this workspace",
        icon: LayoutGrid,
        badge: "New",
        section: "Create",
        onSelect: () => closeAndRun(() => setCreateBoardOpen(true)),
      });
    }

    if (currentBoard && firstColumn) {
      actions.push({
        key: `create-card-${firstColumn.id}`,
        label: `Add Card to ${firstColumn.name}`,
        description: "Quick capture into the first column",
        icon: StickyNote,
        badge: "New",
        section: "Create",
        onSelect: () => closeAndRun(() => setCreateZistOpen(true)),
      });
    }

    return actions;
  }, [currentBoard, currentWorkspace, firstColumn]);

  const searchActions = useMemo<PaletteAction[]>(() => {
    const workspaceActions = homeWorkspaceResults.map(
      ({ workspace, matchedBoards }) => ({
        key: `workspace-${workspace.id}`,
        label: workspace.name,
        description:
          matchedBoards.length > 0
            ? `Matched boards: ${matchedBoards
                .slice(0, 2)
                .map((board) => board.name)
                .join(
                  ", ",
                )}${matchedBoards.length > 2 ? ` +${matchedBoards.length - 2}` : ""}`
            : "Workspace name match",
        icon: FolderOpen,
        badge: "Workspace",
        section: "Workspaces",
        onSelect: () => navigateTo(`/workspace/${workspace.id}`),
      }),
    );

    const boardActions = homeBoardResults.map((board) => ({
      key: `board-${board.id}`,
      label: board.name,
      description:
        workspaces.find((workspace) => workspace.id === board.workspaceId)
          ?.name ?? "Workspace",
      icon: LayoutGrid,
      badge: "Board",
      section: "Boards",
      onSelect: () => navigateTo(`/board/${board.id}`),
    }));

    const workspaceScopedBoards = workspaceBoardResults.map((board) => ({
      key: `workspace-board-${board.id}`,
      label: board.name,
      description: `${board.columns.length} columns`,
      icon: LayoutGrid,
      badge: "Board",
      section: "Boards",
      onSelect: () => navigateTo(`/board/${board.id}`),
    }));

    const cardActions = boardCardResults.map(({ zist, columnName }) => ({
      key: `card-${zist.id}`,
      label: zist.title,
      description: columnName,
      icon: Sparkles,
      badge: "Card",
      section: "Cards",
      onSelect: () => { if (isBoard && boardId === zist.boardId) { closeAndRun(() => { window.dispatchEvent(new CustomEvent("zist:open-card", { detail: { boardId: zist.boardId, cardId: zist.id } })); }); return; } navigateTo(`/board/${zist.boardId}?card=${zist.id}`); },
    }));

    const rankSearchAction = (action: PaletteAction) => {
      const label = action.label.toLowerCase();
      const sectionPriority =
        action.section === "Cards"
          ? 0
          : action.section === "Boards"
            ? 1
            : action.section === "Workspaces"
              ? 2
              : 3;

      if (label === normalizedQuery) {
        return { score: 0, sectionPriority };
      }

      if (label.startsWith(normalizedQuery)) {
        return { score: 1, sectionPriority };
      }

      return { score: 2, sectionPriority };
    };

    return [
      ...workspaceActions,
      ...boardActions,
      ...workspaceScopedBoards,
      ...cardActions,
    ].sort((left, right) => {
      const leftRank = rankSearchAction(left);
      const rightRank = rankSearchAction(right);

      if (leftRank.score !== rightRank.score) {
        return leftRank.score - rightRank.score;
      }

      if (leftRank.sectionPriority !== rightRank.sectionPriority) {
        return leftRank.sectionPriority - rightRank.sectionPriority;
      }

      return left.label.localeCompare(right.label);
    });
  }, [
    boardCardResults,
    homeBoardResults,
    homeWorkspaceResults,
    normalizedQuery,
    workspaceBoardResults,
    workspaces,
  ]);

  const leftActions = useMemo(
    () => [...navigationActions, ...createActions],
    [navigationActions, createActions],
  );
  const visibleItems = useMemo(
    () => (normalizedQuery ? [...searchActions, ...leftActions] : leftActions),
    [leftActions, normalizedQuery, searchActions],
  );

  useEffect(() => {
    if (!open) return;
    if (!visibleItems.length) {
      setSelectedKey(null);
      return;
    }

    if (normalizedQuery) {
      setSelectedKey(searchActions[0]?.key ?? leftActions[0]?.key ?? null);
      return;
    }

    setSelectedKey((previous) => {
      if (previous && leftActions.some((item) => item.key === previous)) {
        return previous;
      }

      return leftActions[0]?.key ?? null;
    });
  }, [open, visibleItems, normalizedQuery, searchActions, leftActions]);

  useEffect(() => {
    if (!selectedKey) return;
    itemRefs.current[selectedKey]?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  const selectedIndex = visibleItems.findIndex(
    (item) => item.key === selectedKey,
  );
  const activeItem =
    selectedIndex >= 0
      ? visibleItems[selectedIndex]
      : (visibleItems[0] ?? null);
  const searchResultCount = searchActions.length;

  const scopeMeta = useMemo<ScopeSummary>(() => {
    if (isBoard && currentBoard) {
      return {
        label: "Board context",
        title: currentBoard.name,
        description: currentWorkspace
          ? `Searching cards inside ${currentWorkspace.name}`
          : "Searching cards inside the current board",
        stats: [
          { label: "Columns", value: `${currentBoard.columns.length}` },
          { label: "Cards", value: `${boardCardCount}` },
        ],
      };
    }

    if (isWorkspace && currentWorkspace) {
      return {
        label: "Workspace context",
        title: currentWorkspace.name,
        description: "Searching boards in this workspace",
        stats: [
          { label: "Boards", value: `${boards.length}` },
          {
            label: "Results",
            value: normalizedQuery
              ? `${searchResultCount}`
              : `${boards.length}`,
          },
        ],
      };
    }

    return {
      label: "Home context",
      title: "All workspaces",
      description: "Searches workspaces first, then boards across the app.",
      stats: [
        { label: "Workspaces", value: `${workspaces.length}` },
        { label: "Boards", value: `${boards.length}` },
      ],
    };
  }, [
    boardCardCount,
    boards.length,
    currentBoard,
    currentWorkspace,
    isBoard,
    isWorkspace,
    normalizedQuery,
    searchResultCount,
    workspaces.length,
  ]);

  const moveSelection = (direction: 1 | -1) => {
    if (!visibleItems.length) return;
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex =
      (currentIndex + direction + visibleItems.length) % visibleItems.length;
    setSelectedKey(visibleItems[nextIndex].key);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Home" && visibleItems.length) {
      event.preventDefault();
      setSelectedKey(visibleItems[0].key);
      return;
    }

    if (event.key === "End" && visibleItems.length) {
      event.preventDefault();
      setSelectedKey(visibleItems[visibleItems.length - 1].key);
      return;
    }

    if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      activeItem.onSelect();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[min(92vh,860px)] !max-w-none w-[min(60vw,1360px)] sm:!max-w-none overflow-hidden border-border/70 bg-background/90 p-0 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl ">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.24),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_68%)]" />
            <div className="absolute -left-12 bottom-6 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute right-0 top-20 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
          </div>

          <div className="relative flex h-full min-h-0 flex-col">
            <DialogHeader className="gap-4 border-b border-border/60 px-4 pt-4 pb-4 sm:px-5 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Quick Actions
                  </DialogTitle>
                  <DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Search pages, boards, and cards, or jump straight into a
                    create flow without leaving your current context.
                  </DialogDescription>
                </div>
                <div className="hidden items-center gap-2 md:block mr-4">
                  <Kbd>
                    <Command className="mr-1 h-3.5 w-3.5" />K
                  </Kbd>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-card/45 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:rounded-[28px] sm:p-3">
                <div className="flex items-center gap-3 rounded-[20px] px-3 py-3 sm:px-4">
                  <div className="flex h-9 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
                    <Search className="h-[18px] w-[32px]" />
                  </div>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Type a command or search"
                    className="border-0 bg-transparent px-4 py-4 text-sm shadow-none focus-visible:ring-0 sm:text-base"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    {activeItem ? <Kbd>Enter</Kbd> : null}
                    <Kbd>Esc</Kbd>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {scopeMeta.label}
                  </span>
                  {normalizedQuery ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {searchResultCount} result
                      {searchResultCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:px-6">
              <ScrollArea className="h-full min-h-0 pr-1 sm:pr-2">
                <div className="space-y-4 pb-4">
                  <PaletteSection heading="Navigation">
                    {navigationActions.map((action) => (
                      <PaletteItem
                        key={action.key}
                        icon={action.icon}
                        label={action.label}
                        description={action.description}
                        onSelect={action.onSelect}
                        badge={action.badge}
                        selected={selectedKey === action.key}
                        onMouseEnter={() => setSelectedKey(action.key)}
                        itemRef={(node) => {
                          itemRefs.current[action.key] = node;
                        }}
                      />
                    ))}
                  </PaletteSection>

                  <PaletteSection heading="Create">
                    {createActions.map((action) => (
                      <PaletteItem
                        key={action.key}
                        icon={action.icon}
                        label={action.label}
                        description={action.description}
                        onSelect={action.onSelect}
                        badge={action.badge}
                        selected={selectedKey === action.key}
                        onMouseEnter={() => setSelectedKey(action.key)}
                        itemRef={(node) => {
                          itemRefs.current[action.key] = node;
                        }}
                      />
                    ))}
                  </PaletteSection>
                </div>
              </ScrollArea>

              <ScrollArea className="h-full min-h-0 pr-1 sm:pr-2">
                <div className="space-y-4 pb-4">
                  {normalizedQuery ? (
                    <PaletteSection heading="Search Results">
                      {searchActions.length > 0 ? (
                        searchActions.map((action) => (
                          <PaletteItem
                            key={action.key}
                            icon={action.icon}
                            label={action.label}
                            description={action.description}
                            onSelect={action.onSelect}
                            badge={action.badge}
                            selected={selectedKey === action.key}
                            onMouseEnter={() => setSelectedKey(action.key)}
                            itemRef={(node) => {
                              itemRefs.current[action.key] = node;
                            }}
                          />
                        ))
                      ) : (
                        <PaletteItem
                          icon={Search}
                          label="No results found"
                          description="Try a workspace name, board name, or card title."
                          muted
                        />
                      )}
                    </PaletteSection>
                  ) : (
                    <ScopeCard scope={scopeMeta} />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onWorkspaceCreated={(workspace) => {
          window.location.href = `/workspace/${workspace.id}`;
        }}
      />

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        workspaceId={currentWorkspace?.id ?? null}
      />

      <CreateZistDialog
        open={createZistOpen}
        onOpenChange={setCreateZistOpen}
        columnId={firstColumn?.id ?? null}
        boardId={currentBoard?.id ?? ""}
        onZistCreated={() => {
          window.location.reload();
        }}
      />
    </>
  );
}

