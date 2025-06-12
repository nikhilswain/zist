"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Folder, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getWorkspaces,
  deleteWorkspace,
  updateWorkspace,
  getBoardsByWorkspace,
} from "@/lib/db";
import type { WorkspaceType, BoardType } from "@/lib/types";
import { toast } from "sonner";

export function Workspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [boards, setBoards] = useState<Record<string, BoardType[]>>({});
  const [loading, setLoading] = useState(true);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmWorkspaceName, setConfirmWorkspaceName] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const workspaceData = await getWorkspaces();
        setWorkspaces(workspaceData);

        // Fetch boards for each workspace
        const boardsData: Record<string, BoardType[]> = {};
        for (const workspace of workspaceData) {
          const workspaceBoards = await getBoardsByWorkspace(workspace.id);
          boardsData[workspace.id] = workspaceBoards;
        }
        setBoards(boardsData);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
        toast.error("Failed to load workspaces");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleDeleteWorkspace = async (id: string) => {
    console.log("handleDeleteWorkspace called with id:", id);

    // Check if the workspace has any boards
    const workspaceBoards = boards[id] || [];
    if (workspaceBoards.length > 0) {
      toast.error(
        "Cannot delete workspace with boards. Please delete all boards first."
      );
      setIsDeleting(null);
      setDeleteDialogOpen(null);
      return;
    }

    setIsDeleting(id);

    // Use requestIdleCallback to ensure UI doesn't freeze
    const performDelete = () => {
      startTransition(async () => {
        try {
          await deleteWorkspace(id);
          console.log("Workspace deleted successfully:", id);

          // Update state after successful deletion
          setWorkspaces((prevWorkspaces) =>
            prevWorkspaces.filter((workspace) => workspace.id !== id)
          );

          // Clean up boards state
          setBoards((prevBoards) => {
            const newBoards = { ...prevBoards };
            delete newBoards[id];
            return newBoards;
          });

          toast.success("Workspace deleted successfully");
        } catch (error) {
          console.error("Error deleting workspace:", error);
          toast.error("Failed to delete workspace");
        } finally {
          setIsDeleting(null);
          setDeleteDialogOpen(null);
        }
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ("requestIdleCallback" in window) {
      requestIdleCallback(performDelete, { timeout: 1000 });
    } else {
      setTimeout(performDelete, 50);
    }
  };

  const handleConfirmDeleteWorkspace = async (id: string, name: string) => {
    console.log(
      "handleConfirmDeleteWorkspace called with id:",
      id,
      "name:",
      name
    );
    if (confirmWorkspaceName !== name) {
      setConfirmError("Workspace name doesn't match");
      return;
    }

    setConfirmError(null);
    await handleDeleteWorkspace(id);
    setConfirmWorkspaceName("");
  };

  const openDeleteDialog = (id: string) => {
    console.log("Opening delete dialog for workspace:", id);
    setDeleteDialogOpen(id);
    setConfirmWorkspaceName("");
    setConfirmError(null);
  };

  const handleEditWorkspace = async () => {
    if (!editWorkspaceId || !editWorkspaceName.trim()) return;

    try {
      const workspace = workspaces.find((w) => w.id === editWorkspaceId);
      if (!workspace) return;

      const updatedWorkspace = {
        ...workspace,
        name: editWorkspaceName,
      };

      await updateWorkspace(updatedWorkspace);

      setWorkspaces(
        workspaces.map((w) => (w.id === editWorkspaceId ? updatedWorkspace : w))
      );

      setEditWorkspaceOpen(false);
      setEditWorkspaceId(null);
      setEditWorkspaceName("");

      toast.success("Workspace updated successfully");
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace");
    }
  };

  const openEditWorkspaceDialog = (workspace: WorkspaceType) => {
    setEditWorkspaceId(workspace.id);
    setEditWorkspaceName(workspace.name);
    setEditWorkspaceOpen(true);
  };

  const handleWorkspaceCreated = (workspace: WorkspaceType) => {
    setWorkspaces((prev) => [...prev, workspace]);
    setBoards((prev) => ({
      ...prev,
      [workspace.id]: [],
    }));
  };

  const navigateToWorkspace = (workspaceId: string) => {
    window.location.href = `/workspace/${workspaceId}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <Button
          onClick={() => setCreateWorkspaceOpen(true)}
          disabled={isPending || isDeleting !== null}
        >
          <Plus className="mr-2 h-4 w-4" /> New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/40">
          <Folder className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create a workspace to start organizing your boards
          </p>
          <Button
            onClick={() => setCreateWorkspaceOpen(true)}
            disabled={isPending || isDeleting !== null}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Workspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                isDeleting === workspace.id || isPending
                  ? "opacity-50 pointer-events-none"
                  : ""
              }`}
              onClick={() =>
                !isDeleting && !isPending && navigateToWorkspace(workspace.id)
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>{workspace.name}</CardTitle>
                  <CardDescription>
                    {boards[workspace.id]?.length || 0} boards
                  </CardDescription>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isDeleting === workspace.id || isPending}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEditWorkspaceDialog(workspace)}
                        disabled={isDeleting === workspace.id || isPending}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigateToWorkspace(workspace.id)}
                        disabled={isDeleting === workspace.id || isPending}
                      >
                        <Folder className="mr-2 h-4 w-4" /> View Boards
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteDialog(workspace.id);
                        }}
                        disabled={isDeleting === workspace.id || isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      <Dialog open={editWorkspaceOpen} onOpenChange={setEditWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Change the name of your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Workspace name"
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                disabled={isPending || isDeleting !== null}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditWorkspaceOpen(false)}
              disabled={isPending || isDeleting !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditWorkspace}
              disabled={isPending || isDeleting !== null}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Separate Delete Dialog */}
      {workspaces.map((workspace) => (
        <AlertDialog
          key={`delete-dialog-${workspace.id}`}
          open={deleteDialogOpen === workspace.id}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteDialogOpen(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the workspace "{workspace.name}"
                and all its data. This action cannot be undone.
                <div className="mt-4">
                  <Label
                    htmlFor="confirm-workspace-name"
                    className="text-sm font-medium"
                  >
                    Type <span className="font-semibold">{workspace.name}</span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="confirm-workspace-name"
                    className="mt-2"
                    value={confirmWorkspaceName}
                    onChange={(e) => setConfirmWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    disabled={isDeleting === workspace.id}
                  />
                  {confirmError && (
                    <div className="text-sm text-destructive mt-2">
                      {confirmError}
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  if (!isDeleting) {
                    setDeleteDialogOpen(null);
                    setConfirmWorkspaceName("");
                  }
                }}
                disabled={isDeleting === workspace.id}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmDeleteWorkspace(workspace.id, workspace.name);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting === workspace.id}
              >
                {isDeleting === workspace.id
                  ? "Deleting..."
                  : "Delete Workspace"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
