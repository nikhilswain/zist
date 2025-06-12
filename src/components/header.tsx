import { Search, Settings, Home, PlusCircle, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isHome = window.location.pathname === "/";

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl">Zist</span>
          </a>

          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.location.href = "/")}
            >
              <Home className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative">
              <Input
                placeholder="Search..."
                className="w-64 pr-8"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.location.href = "/analytics")}
            className="relative"
          >
            <BarChart2 className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.location.href = "/settings")}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {isHome && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              New Workspace
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </header>
  );
}
