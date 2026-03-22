import { useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Download, Upload, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { DB_NAME } from "@/lib/db";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    lockColumnReordering: false,
    enableAnimations: true,
    autoCollapseColumns: false,
    darkMode: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearDataStep, setClearDataStep] = useState(0);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");
  const [clearDataError, setClearDataError] = useState<string | null>(null);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);

  const handleSettingChange = (
    setting: keyof typeof settings,
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));

    toast.success("Setting updated successfully");
  };

  const handleBackupData = async () => {
    try {
      setIsExporting(true);
      // Get all data from IndexedDB
      const openRequest = indexedDB.open(DB_NAME, 1);

      openRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const data: Record<string, any[]> = {};
        const storeNames = Array.from(db.objectStoreNames);
        let completedStores = 0;

        storeNames.forEach((storeName) => {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            data[storeName] = request.result;
            completedStores++;

            if (completedStores === storeNames.length) {
              // All data collected, create and download backup file
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `zira-backup-${
                new Date().toISOString().split("T")[0]
              }.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              toast.success("Backup created successfully");
              setIsExporting(false);
            }
          };
        });
      };

      openRequest.onerror = () => {
        toast.error("Failed to backup data");
        setIsExporting(false);
      };
    } catch (error) {
      console.error("Error backing up data:", error);
      toast.error("Failed to backup data");
      setIsExporting(false);
    }
  };

  const handleRestoreData = () => {
    try {
      setIsImporting(true);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsImporting(false);
          return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);

            // Restore data to IndexedDB
            const openRequest = indexedDB.open(DB_NAME, 1);

            openRequest.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              const storeNames = Object.keys(data);

              storeNames.forEach((storeName) => {
                if (!db.objectStoreNames.contains(storeName)) {
                  toast.error(
                    `Store ${storeName} does not exist in the database`
                  );
                  return;
                }

                const transaction = db.transaction(storeName, "readwrite");
                const store = transaction.objectStore(storeName);

                // Clear existing data
                store.clear();

                // Add new data
                data[storeName].forEach((item: any) => {
                  store.add(item);
                });

                transaction.oncomplete = () => {
                  toast.success(
                    "Data restored successfully. Please refresh the page."
                  );
                  setIsImporting(false);
                };
              });
            };
          } catch (error) {
            console.error("Error parsing backup file:", error);
            toast.error("Failed to parse backup file");
            setIsImporting(false);
          }
        };

        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      console.error("Error restoring data:", error);
      toast.error("Failed to restore data");
      setIsImporting(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearData = () => {
    console.log("handleClearData called");
    try {
      setIsClearing(true);
      const openRequest = indexedDB.open(DB_NAME, 1);

      openRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const storeNames = Array.from(db.objectStoreNames);
        let completedStores = 0;

        if (storeNames.length === 0) {
          toast.success(
            "All data cleared successfully. Please refresh the page."
          );
          setIsClearing(false);
          setClearDataDialogOpen(false);
          return;
        }

        storeNames.forEach((storeName) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();

          clearRequest.onsuccess = () => {
            completedStores++;
            if (completedStores === storeNames.length) {
              toast.success(
                "All data cleared successfully. Please refresh the page."
              );
              setIsClearing(false);
              setClearDataDialogOpen(false);
              setClearDataStep(0);
            }
          };

          clearRequest.onerror = () => {
            toast.error(`Failed to clear ${storeName} data`);
            setIsClearing(false);
          };
        });
      };

      openRequest.onerror = () => {
        toast.error("Failed to clear data");
        setIsClearing(false);
      };
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data");
      setIsClearing(false);
    }
  };

  const handleContinueToClearData = () => {
    console.log("handleContinueToClearData called");
    if (clearDataConfirmText !== "Clear All Data") {
      setClearDataError("Text doesn't match. Please type 'Clear All Data'");
      return;
    }
    setClearDataError(null);
    setClearDataStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSearch={false} />
      <main className="flex-1 container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="general" className="max-w-4xl">
          <TabsList className="mb-6 w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="general"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3 bg-transparent"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3 bg-transparent"
            >
              Data Management
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3 bg-transparent"
            >
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure your Zira experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="lock-columns">Lock Column Reordering</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent columns from being reordered
                    </p>
                  </div>
                  <Switch
                    id="lock-columns"
                    checked={settings.lockColumnReordering}
                    onCheckedChange={(checked) =>
                      handleSettingChange("lockColumnReordering", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations">Enable Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Show animations for a smoother experience
                    </p>
                  </div>
                  <Switch
                    id="animations"
                    checked={settings.enableAnimations}
                    onCheckedChange={(checked) =>
                      handleSettingChange("enableAnimations", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-collapse">Auto-Collapse Columns</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically collapse columns when not in use
                    </p>
                  </div>
                  <Switch
                    id="auto-collapse"
                    checked={settings.autoCollapseColumns}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoCollapseColumns", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Backup, restore, or clear your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Backup Data</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      Export all your workspaces, boards, and cards to a JSON
                      file.
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleBackupData}
                        disabled={isExporting}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export Backup"}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Restore Data</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      Import previously exported data from a backup file.
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleRestoreData}
                        disabled={isImporting}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isImporting ? "Importing..." : "Import Backup"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <Card className="border-destructive/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-destructive">
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Clear all data from the application. This action cannot be
                    undone.
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={isClearing}
                      onClick={() => {
                        console.log("Opening clear data dialog");
                        setClearDataDialogOpen(true);
                        setClearDataStep(0);
                        setClearDataConfirmText("");
                        setClearDataError(null);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isClearing ? "Clearing Data..." : "Clear All Data"}
                    </Button>
                  </CardFooter>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>About Zira</CardTitle>
                <CardDescription>
                  A rich Kanban board application with IndexedDB storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium">Version</h3>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>

                <div>
                  <h3 className="font-medium">Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    Zira uses IndexedDB to store all your data locally in your
                    browser. No data is sent to any server.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Features</h3>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
                    <li>Workspaces & Boards</li>
                    <li>Rich Kanban cards with labels, checklists, and more</li>
                    <li>Drag and drop functionality</li>
                    <li>Activity tracking</li>
                    <li>Data backup and restore</li>
                    <li>Analytics and insights</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Application
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Separate Clear Data Dialog */}
        <AlertDialog
          open={clearDataDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setClearDataDialogOpen(false);
              setClearDataStep(0);
              setClearDataConfirmText("");
              setClearDataError(null);
            }
          }}
        >
          <AlertDialogContent>
            {clearDataStep === 0 ? (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Clear all application data?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your workspaces, boards,
                    and cards. This action cannot be undone.
                    <div className="mt-4">
                      <Label
                        htmlFor="confirm-clear-data"
                        className="text-sm font-medium"
                      >
                        Type{" "}
                        <span className="font-semibold">Clear All Data</span> to
                        confirm
                      </Label>
                      <Input
                        id="confirm-clear-data"
                        className="mt-2"
                        value={clearDataConfirmText}
                        onChange={(e) =>
                          setClearDataConfirmText(e.target.value)
                        }
                        placeholder="Clear All Data"
                      />
                      {clearDataError && (
                        <div className="text-sm text-destructive mt-2">
                          {clearDataError}
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setClearDataDialogOpen(false);
                      setClearDataConfirmText("");
                      setClearDataError(null);
                      setClearDataStep(0);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleContinueToClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            ) : (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Final Warning</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to delete ALL data from this application. This
                    includes:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>All workspaces</li>
                      <li>All boards</li>
                      <li>All cards and their content</li>
                      <li>All settings and preferences</li>
                    </ul>
                    <p className="mt-2 font-medium">
                      This action is irreversible.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setClearDataDialogOpen(false);
                      setClearDataConfirmText("");
                      setClearDataError(null);
                      setClearDataStep(0);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isClearing}
                  >
                    {isClearing ? "Clearing Data..." : "Yes, Delete Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
