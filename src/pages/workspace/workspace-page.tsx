import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateBoardDialog } from "@/components/create-board-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  ArrowLeft,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  getWorkspace,
  getBoardsByWorkspace,
  deleteBoard,
  archiveBoard,
  restoreBoard,
  getArchivedBoardsByWorkspace,
} from "@/lib/db";
import type { WorkspaceType, BoardType } from "@/lib/types";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function WorkspacePage() {
  const [workspace, setWorkspace] = useState<WorkspaceType | null>(null);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [archivedBoards, setArchivedBoards] = useState<BoardType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [confirmBoardName, setConfirmBoardName] = useState("");
  const [confirmBoardError, setConfirmBoardError] = useState<string | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const workspaceId = window.location.pathname.split("/").pop();

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        if (workspaceId) {
          const workspaceData = await getWorkspace(workspaceId as string);
          if (workspaceData) {
            setWorkspace(workspaceData);
            const boardsData = await getBoardsByWorkspace(workspaceData.id);
            setBoards(boardsData);

            // Fetch archived boards
            const archivedBoardsData = await getArchivedBoardsByWorkspace(
              workspaceData.id
            );
            setArchivedBoards(archivedBoardsData);
          } else {
            toast.error("Workspace not found");
            window.location.href = "/";
          }
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
        toast.error("Failed to load workspace");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId]);

  const handleBoardCreated = (board: BoardType) => {
    setBoards((prev) => [...prev, board]);
  };

  const openDeleteDialog = (boardId: string) => {
    console.log("Opening delete dialog for board:", boardId);
    setDeleteDialogOpen(boardId);
    setConfirmBoardName("");
    setConfirmBoardError(null);
  };

  const handleConfirmDeleteBoard = async (
    boardId: string,
    boardName: string
  ) => {
    console.log(
      "handleConfirmDeleteBoard called with id:",
      boardId,
      "name:",
      boardName
    );
    if (confirmBoardName !== boardName) {
      setConfirmBoardError("Board name doesn't match");
      return;
    }

    setConfirmBoardError(null);
    await handleDeleteBoard(boardId);
    setConfirmBoardName("");
  };

  const handleDeleteBoard = async (boardId: string) => {
    console.log("handleDeleteBoard called with id:", boardId);
    try {
      setIsDeleting(boardId);
      if (!workspace) return;

      await deleteBoard(boardId, workspace.id);
      console.log("Board deleted successfully:", boardId);

      // Update the boards state after successful deletion
      setBoards((prevBoards) =>
        prevBoards.filter((board) => board.id !== boardId)
      );
      setArchivedBoards((prevBoards) =>
        prevBoards.filter((board) => board.id !== boardId)
      );

      toast.success("Board deleted successfully");
    } catch (error) {
      console.error("Error deleting board:", error);
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(null);
      setDeleteDialogOpen(null);
    }
  };

  const handleArchiveBoard = async (boardId: string) => {
    console.log("handleArchiveBoard called with id:", boardId);
    try {
      setIsArchiving(boardId);
      const board = boards.find((b) => b.id === boardId);
      if (!board) return;

      await archiveBoard(boardId);
      console.log("Board archived successfully:", boardId);

      // Update the boards state after successful archiving
      setBoards((prevBoards) =>
        prevBoards.filter((board) => board.id !== boardId)
      );

      // Add to archived boards
      setArchivedBoards((prev) => [...prev, { ...board, archived: true }]);

      toast.success("Board archived successfully");
    } catch (error) {
      console.error("Error archiving board:", error);
      toast.error("Failed to archive board");
    } finally {
      setIsArchiving(null);
    }
  };

  const handleRestoreBoard = async (boardId: string) => {
    console.log("handleRestoreBoard called with id:", boardId);
    try {
      setIsRestoring(boardId);
      const board = archivedBoards.find((b) => b.id === boardId);
      if (!board) return;

      await restoreBoard(boardId);
      console.log("Board restored successfully:", boardId);

      // Update the archived boards state
      setArchivedBoards((prevBoards) =>
        prevBoards.filter((board) => board.id !== boardId)
      );

      // Add back to active boards
      setBoards((prev) => [...prev, { ...board, archived: false }]);

      toast.success("Board restored successfully");
    } catch (error) {
      console.error("Error restoring board:", error);
      toast.error("Failed to restore board");
    } finally {
      setIsRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <div className="flex items-center mb-6">
            <Skeleton className="h-10 w-10 rounded-full mr-4" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!workspace) return null;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(normalizedSearchQuery)
  );
  const filteredArchivedBoards = archivedBoards.filter((board) =>
    board.name.toLowerCase().includes(normalizedSearchQuery)
  );

  const renderBoardCard = (board: BoardType, isArchived = false) => {
    const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

    return (
      <Card
        key={board.id}
        className={`relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${boardThemeClass}`}
      >
        {!isArchived && (
          <a
            href={`/board/${board.id}`}
            className="absolute inset-0 z-10 rounded-xl"
            aria-label={`Open board ${board.name}`}
          />
        )}
        <CardHeader className="relative z-0 flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>{board.name}</CardTitle>
            <CardDescription>
              {board.columns.length} columns •{" "}
              {board.columns.reduce((acc, col) => acc + col.zists.length, 0)}{" "}
              tasks
            </CardDescription>
          </div>
          <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isArchived ? (
                  <>
                    <DropdownMenuItem asChild>
                      <a href={`/board/${board.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Board
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveBoard(board.id)}
                      disabled={isArchiving === board.id}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {isArchiving === board.id ? "Archiving..." : "Archive"}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleRestoreBoard(board.id)}
                    disabled={isRestoring === board.id}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isRestoring === board.id ? "Restoring..." : "Restore"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDeleteDialog(board.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="relative z-0 pt-0">
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>Created: {new Date(board.createdAt).toLocaleDateString()}</div>
            <div>Updated: {new Date(board.updatedAt).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBoardList = (board: BoardType, isArchived = false) => {
    const boardThemeClass = board.theme ? `board-theme-${board.theme}` : "";

    return (
      <div
        key={board.id}
        className={`relative flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${boardThemeClass}`}
      >
        {!isArchived && (
          <a
            href={`/board/${board.id}`}
            className="absolute inset-0 z-10"
            aria-label={`Open board ${board.name}`}
          />
        )}
        <div className="relative z-0 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <div>
            <h3 className="font-medium">{board.name}</h3>
            <p className="text-sm text-muted-foreground">
              {board.columns.length} columns •{" "}
              {board.columns.reduce((acc, col) => acc + col.zists.length, 0)}{" "}
              tasks
            </p>
          </div>
        </div>
        <div
          className="relative z-10 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {!isArchived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleArchiveBoard(board.id)}
              disabled={isArchiving === board.id}
            >
              {isArchiving === board.id ? "Archiving..." : "Archive"}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestoreBoard(board.id)}
              disabled={isRestoring === board.id}
            >
              {isRestoring === board.id ? "Restoring..." : "Restore"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openDeleteDialog(board.id);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search boards in ${workspace.name}`}
      />
      <main className="flex-1 container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" className="mr-4" asChild>
            <a href="/" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-9 px-3"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-9 px-3"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          <Button onClick={() => setCreateBoardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Board
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "active" | "archived")}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Boards</TabsTrigger>
            <TabsTrigger value="archived">Archived Boards</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {boards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
                <h3 className="text-lg font-medium mb-2">No boards yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a board to start organizing your tasks
                </p>
                <Button onClick={() => setCreateBoardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Board
                </Button>
              </div>
            ) : filteredBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
                <h3 className="text-lg font-medium mb-2">No matching boards</h3>
                <p className="text-muted-foreground text-center">
                  Try a different board name.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoards.map((board) => renderBoardCard(board))}
              </div>
            ) : (
              <div className="space-y-2 border rounded-md overflow-hidden">
                {filteredBoards.map((board) => renderBoardList(board))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            {archivedBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
                <h3 className="text-lg font-medium mb-2">No archived boards</h3>
                <p className="text-muted-foreground text-center">
                  Archived boards will appear here
                </p>
              </div>
            ) : filteredArchivedBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
                <h3 className="text-lg font-medium mb-2">No matching boards</h3>
                <p className="text-muted-foreground text-center">
                  Try a different board name.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArchivedBoards.map((board) =>
                  renderBoardCard(board, true)
                )}
              </div>
            ) : (
              <div className="space-y-2 border rounded-md overflow-hidden">
                {filteredArchivedBoards.map((board) =>
                  renderBoardList(board, true)
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateBoardDialog
          open={createBoardOpen}
          onOpenChange={setCreateBoardOpen}
          workspaceId={workspace.id}
          onBoardCreated={handleBoardCreated}
        />

        {/* Separate Delete Dialog for Boards */}
        {[...boards, ...archivedBoards].map((board) => (
          <AlertDialog
            key={`delete-dialog-${board.id}`}
            open={deleteDialogOpen === board.id}
            onOpenChange={(open) => {
              if (!open) setDeleteDialogOpen(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the board "{board.name}" and all
                  its data. This action cannot be undone.
                  <div className="mt-4">
                    <Label
                      htmlFor={`confirm-board-name-${board.id}`}
                      className="text-sm font-medium"
                    >
                      Type <span className="font-semibold">{board.name}</span>{" "}
                      to confirm
                    </Label>
                    <Input
                      id={`confirm-board-name-${board.id}`}
                      className="mt-2"
                      value={confirmBoardName}
                      onChange={(e) => setConfirmBoardName(e.target.value)}
                      placeholder="Enter board name"
                    />
                    {confirmBoardError && (
                      <div className="text-sm text-destructive mt-2">
                        {confirmBoardError}
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteDialogOpen(null);
                    setConfirmBoardName("");
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleConfirmDeleteBoard(board.id, board.name)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting === board.id}
                >
                  {isDeleting === board.id ? "Deleting..." : "Delete Board"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </main>
    </div>
  );
}
