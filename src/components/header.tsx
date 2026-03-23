import { Search, Settings, Home, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function Header({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
}: HeaderProps = {}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchValue));
  const [commandOpen, setCommandOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const isHome = currentPath === "/";
  const isAnalytics = currentPath.startsWith("/analytics");
  const isSettings = currentPath.startsWith("/settings");

  useEffect(() => {
    if (searchValue) {
      setSearchOpen(true);
    }
  }, [searchValue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "Escape" && searchOpen && !searchValue) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen, searchValue]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">Zist</span>
            </a>

            {!isHome && (
              <Button variant="ghost" size="icon" asChild>
                <a href="/" aria-label="Go home">
                  <Home className="h-5 w-5" />
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showSearch &&
              (searchOpen ? (
                <div className="relative flex items-center">
                  <Input
                    ref={searchInputRef}
                    value={searchValue}
                    placeholder={searchPlaceholder}
                    className="w-72 pr-14"
                    autoFocus
                    onChange={(event) => onSearchChange?.(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onSearchChange?.("");
                        setSearchOpen(false);
                        searchInputRef.current?.blur();
                      }
                    }}
                    onBlur={() => {
                      if (!searchValue) {
                        setSearchOpen(false);
                      }
                    }}
                  />
                  <div className="absolute right-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <kbd className="rounded border px-1.5 py-0.5">Esc</kbd>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen(true);
                    requestAnimationFrame(() => {
                      searchInputRef.current?.focus();
                      searchInputRef.current?.select();
                    });
                  }}
                  aria-label="Open page search"
                >
                  <Search className="h-5 w-5" />
                </Button>
              ))}

            {!isAnalytics && (
              <Button variant="ghost" size="icon" asChild>
                <a href="/analytics" aria-label="Analytics">
                  <BarChart2 className="h-5 w-5" />
                </a>
              </Button>
            )}

            {!isSettings && (
              <Button variant="ghost" size="icon" asChild>
                <a href="/settings" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </a>
              </Button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
