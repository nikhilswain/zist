import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaces, getBoardsByWorkspace } from "@/lib/db";
import type { WorkspaceType, BoardType, ZistType } from "@/lib/types";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  TimeScale,
  RadialLinearScale,
  Filler,
  PointElement as PointElement2,
} from "chart.js";
import { Pie, Bar, Line, Radar, PolarArea, Doughnut } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  TimeScale,
  RadialLinearScale,
  Filler,
  PointElement2
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  const [stats, setStats] = useState({
    totalWorkspaces: 0,
    totalBoards: 0,
    totalZists: 0,
    totalCompletedZists: 0,
    zistsByStatus: [] as { name: string; value: number }[],
    zistsByWorkspace: [] as { name: string; value: number }[],
    zistsByBoard: [] as { name: string; value: number }[],
    zistsByDate: [] as { date: string; count: number }[],
    zistsByPriority: [] as { name: string; value: number }[],
    zistsByActivity: [] as { name: string; value: number }[],
    zistsByMonth: [] as { month: string; count: number }[],
  });

  // Chart colors - Apple-inspired palette
  const chartColors = [
    "rgba(0, 122, 255, 0.8)", // Blue
    "rgba(52, 199, 89, 0.8)", // Green
    "rgba(255, 149, 0, 0.8)", // Orange
    "rgba(255, 59, 48, 0.8)", // Red
    "rgba(175, 82, 222, 0.8)", // Purple
    "rgba(255, 204, 0, 0.8)", // Yellow
    "rgba(90, 200, 250, 0.8)", // Light Blue
    "rgba(88, 86, 214, 0.8)", // Indigo
    "rgba(255, 45, 85, 0.8)", // Pink
    "rgba(142, 142, 147, 0.8)", // Gray
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const workspaceData = await getWorkspaces();
        setWorkspaces(workspaceData);

        let allBoards: BoardType[] = [];
        for (const workspace of workspaceData) {
          const workspaceBoards = await getBoardsByWorkspace(workspace.id);
          allBoards = [...allBoards, ...workspaceBoards];
        }
        setBoards(allBoards);

        // Calculate stats
        calculateStats(
          workspaceData,
          allBoards,
          selectedWorkspace,
          selectedBoard,
          selectedTimeRange
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    calculateStats(
      workspaces,
      boards,
      selectedWorkspace,
      selectedBoard,
      selectedTimeRange
    );
  }, [selectedWorkspace, selectedBoard, selectedTimeRange, workspaces, boards]);

  const calculateStats = (
    workspaces: WorkspaceType[],
    boards: BoardType[],
    workspaceFilter: string,
    boardFilter: string,
    timeRange: string
  ) => {
    // Filter boards by workspace if needed
    let filteredBoards =
      workspaceFilter === "all"
        ? boards
        : boards.filter((board) => board.workspaceId === workspaceFilter);

    // Further filter by board if needed
    if (boardFilter !== "all") {
      filteredBoards = filteredBoards.filter(
        (board) => board.id === boardFilter
      );
    }

    // Get all zists from filtered boards
    let allZists: ZistType[] = [];
    let completedZists = 0;

    filteredBoards.forEach((board) => {
      board.columns.forEach((column, columnIndex) => {
        // Assume the last column is "Done" or completed
        const isCompletedColumn = columnIndex === board.columns.length - 1;
        if (isCompletedColumn) {
          completedZists += column.zists.length;
        }
        allZists = [...allZists, ...column.zists];
      });
    });

    // Apply time filter
    const filteredZists = filterZistsByTime(allZists, timeRange);

    // Calculate zists by status
    const zistsByStatus = calculateZistsByStatus(filteredBoards, filteredZists);

    // Calculate zists by workspace
    const zistsByWorkspace = calculateZistsByWorkspace(
      workspaces,
      boards,
      filteredZists
    );

    // Calculate zists by board
    const zistsByBoard = calculateZistsByBoard(filteredBoards, filteredZists);

    // Calculate zists by date
    const zistsByDate = calculateZistsByDate(filteredZists);

    // Calculate zists by priority
    const zistsByPriority = calculateZistsByPriority(filteredZists);

    // Calculate zists by activity type
    const zistsByActivity = calculateZistsByActivity(filteredZists);

    // Calculate zists by month
    const zistsByMonth = calculateZistsByMonth(filteredZists);

    setStats({
      totalWorkspaces: workspaces.length,
      totalBoards: filteredBoards.length,
      totalZists: filteredZists.length,
      totalCompletedZists: completedZists,
      zistsByStatus,
      zistsByWorkspace,
      zistsByBoard,
      zistsByDate,
      zistsByPriority,
      zistsByActivity,
      zistsByMonth,
    });
  };

  const filterZistsByTime = (
    zists: ZistType[],
    timeRange: string
  ): ZistType[] => {
    if (timeRange === "all") return zists;

    const now = Date.now();
    let startTimestamp: number;

    switch (timeRange) {
      case "week":
        startTimestamp = now - 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        break;
      case "month":
        startTimestamp = now - 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        break;
      case "quarter":
        startTimestamp = now - 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
        break;
      default:
        return zists;
    }

    return zists.filter((zist) => zist.createdAt >= startTimestamp);
  };

  const calculateZistsByStatus = (boards: BoardType[], zists: ZistType[]) => {
    const statusMap: Record<string, number> = {};

    boards.forEach((board) => {
      board.columns.forEach((column) => {
        const columnZists = zists.filter((zist) => zist.columnId === column.id);
        if (columnZists.length > 0) {
          statusMap[column.name] =
            (statusMap[column.name] || 0) + columnZists.length;
        }
      });
    });

    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
  };

  const calculateZistsByWorkspace = (
    workspaces: WorkspaceType[],
    boards: BoardType[],
    zists: ZistType[]
  ) => {
    const workspaceMap: Record<string, number> = {};

    workspaces.forEach((workspace) => {
      const workspaceBoards = boards.filter(
        (board) => board.workspaceId === workspace.id
      );
      let count = 0;

      workspaceBoards.forEach((board) => {
        board.columns.forEach((column) => {
          const columnZists = zists.filter(
            (zist) => zist.columnId === column.id
          );
          count += columnZists.length;
        });
      });

      if (count > 0) {
        workspaceMap[workspace.name] = count;
      }
    });

    return Object.entries(workspaceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
  };

  const calculateZistsByBoard = (boards: BoardType[], zists: ZistType[]) => {
    const boardMap: Record<string, number> = {};

    boards.forEach((board) => {
      let count = 0;

      board.columns.forEach((column) => {
        const columnZists = zists.filter((zist) => zist.columnId === column.id);
        count += columnZists.length;
      });

      if (count > 0) {
        boardMap[board.name] = count;
      }
    });

    return Object.entries(boardMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
  };

  const calculateZistsByDate = (zists: ZistType[]) => {
    const dateMap: Record<string, number> = {};

    zists.forEach((zist) => {
      const date = new Date(zist.createdAt).toISOString().split("T")[0];
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    return Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateZistsByPriority = (zists: ZistType[]) => {
    const priorityMap: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    zists.forEach((zist) => {
      const priority = zist.priority || "none";
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });

    return Object.entries(priorityMap)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  };

  const calculateZistsByActivity = (zists: ZistType[]) => {
    const activityMap: Record<string, number> = {
      create: 0,
      update: 0,
      move: 0,
      comment: 0,
      delete: 0,
    };

    zists.forEach((zist) => {
      zist.activities.forEach((activity) => {
        activityMap[activity.type] = (activityMap[activity.type] || 0) + 1;
      });
    });

    return Object.entries(activityMap)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  };

  const calculateZistsByMonth = (zists: ZistType[]) => {
    const monthMap: Record<string, number> = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    zists.forEach((zist) => {
      const date = new Date(zist.createdAt);
      const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthMap[monthYear] = (monthMap[monthYear] || 0) + 1;
    });

    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");

        if (aYear !== bYear)
          return Number.parseInt(aYear) - Number.parseInt(bYear);
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
  };

  // Chart data preparation
  const prepareStatusChartData = () => {
    return {
      labels: stats.zistsByStatus.map((item) => item.name),
      datasets: [
        {
          data: stats.zistsByStatus.map((item) => item.value),
          backgroundColor: chartColors.slice(0, stats.zistsByStatus.length),
          borderColor: chartColors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareWorkspaceChartData = () => {
    return {
      labels: stats.zistsByWorkspace.map((item) => item.name),
      datasets: [
        {
          label: "Cards",
          data: stats.zistsByWorkspace.map((item) => item.value),
          backgroundColor: chartColors[0],
          borderColor: chartColors[0].replace("0.8", "1"),
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  };

  const prepareBoardChartData = () => {
    return {
      labels: stats.zistsByBoard.map((item) => item.name),
      datasets: [
        {
          label: "Cards",
          data: stats.zistsByBoard.map((item) => item.value),
          backgroundColor: chartColors[1],
          borderColor: chartColors[1].replace("0.8", "1"),
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  };

  const preparePriorityChartData = () => {
    return {
      labels: stats.zistsByPriority.map((item) => item.name),
      datasets: [
        {
          data: stats.zistsByPriority.map((item) => item.value),
          backgroundColor: chartColors.slice(0, stats.zistsByPriority.length),
          borderColor: chartColors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareDateChartData = () => {
    return {
      labels: stats.zistsByDate.map((item) => new Date(item.date)),
      datasets: [
        {
          label: "Cards Created",
          data: stats.zistsByDate.map((item) => ({
            x: new Date(item.date),
            y: item.count,
          })),
          backgroundColor: chartColors[2],
          borderColor: chartColors[2].replace("0.8", "1"),
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: chartColors[2].replace("0.8", "1"),
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const prepareActivityChartData = () => {
    return {
      labels: stats.zistsByActivity.map((item) => item.name),
      datasets: [
        {
          label: "Activity Count",
          data: stats.zistsByActivity.map((item) => item.value),
          backgroundColor: chartColors.slice(0, stats.zistsByActivity.length),
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareMonthlyChartData = () => {
    return {
      labels: stats.zistsByMonth.map((item) => item.month),
      datasets: [
        {
          label: "Cards Created",
          data: stats.zistsByMonth.map((item) => item.count),
          backgroundColor: chartColors[3],
          borderColor: chartColors[3].replace("0.8", "1"),
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  };

  const prepareRadarChartData = () => {
    // Use priority and status data for radar chart
    return {
      labels: [
        ...stats.zistsByPriority.map((item) => item.name),
        ...stats.zistsByStatus.map((item) => item.name),
      ],
      datasets: [
        {
          label: "Card Distribution",
          data: [
            ...stats.zistsByPriority.map((item) => item.value),
            ...stats.zistsByStatus.map((item) => item.value),
          ],
          backgroundColor: "rgba(0, 122, 255, 0.2)",
          borderColor: "rgba(0, 122, 255, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(0, 122, 255, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(0, 122, 255, 1)",
        },
      ],
    };
  };

  // Chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.raw || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
      },
      y: {
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
    animation: {
      duration: 1000,
    },
  };

  const horizontalBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "x" as const,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
    animation: {
      duration: 1000,
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: any) =>
            new Date(context[0].parsed.x).toLocaleDateString(),
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "day" as const,
          tooltipFormat: "MMM d, yyyy",
          displayFormats: {
            day: "MMM d",
          },
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
      y: {
        type: "linear" as const,
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
          drawOnChartArea: true,
          drawTicks: true,
        },
      },
    },
    animation: {
      duration: 1000,
    },
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          backdropColor: "transparent",
        },
      },
    },
    animation: {
      duration: 1000,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6">Analytics</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-filter">Workspace</Label>
            <Select
              value={selectedWorkspace}
              onValueChange={(value) => {
                setSelectedWorkspace(value);
                setSelectedBoard("all"); // Reset board selection when workspace changes
              }}
            >
              <SelectTrigger id="workspace-filter" className="w-[200px]">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-filter">Board</Label>
            <Select
              value={selectedBoard}
              onValueChange={setSelectedBoard}
              disabled={selectedWorkspace === "all"}
            >
              <SelectTrigger id="board-filter" className="w-[200px]">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {boards
                  .filter(
                    (board) =>
                      selectedWorkspace === "all" ||
                      board.workspaceId === selectedWorkspace
                  )
                  .map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-filter">Time Range</Label>
            <Select
              value={selectedTimeRange}
              onValueChange={setSelectedTimeRange}
            >
              <SelectTrigger id="time-filter" className="w-[200px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {stats.totalWorkspaces}
              </CardTitle>
              <CardDescription>Total Workspaces</CardDescription>
            </CardHeader>
          </Card>

          <Card className="apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.totalBoards}</CardTitle>
              <CardDescription>Total Boards</CardDescription>
            </CardHeader>
          </Card>

          <Card className="apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.totalZists}</CardTitle>
              <CardDescription>Total Cards</CardDescription>
            </CardHeader>
          </Card>

          <Card className="apple-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {stats.totalCompletedZists} / {stats.totalZists}
                {stats.totalZists > 0 &&
                  ` (${Math.round(
                    (stats.totalCompletedZists / stats.totalZists) * 100
                  )}%)`}
              </CardTitle>
              <CardDescription>Completed Cards</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="charts" className="px-6">
              Charts
            </TabsTrigger>
            <TabsTrigger value="advanced" className="px-6">
              Advanced Charts
            </TabsTrigger>
            <TabsTrigger value="trends" className="px-6">
              Trends
            </TabsTrigger>
            <TabsTrigger value="details" className="px-6">
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="apple-card">
                <CardHeader>
                  <CardTitle>Cards by Status</CardTitle>
                  <CardDescription>
                    Distribution of cards across different statuses
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByStatus.length > 0 ? (
                    <Doughnut
                      data={prepareStatusChartData()}
                      options={pieChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="apple-card">
                <CardHeader>
                  <CardTitle>Cards by Workspace</CardTitle>
                  <CardDescription>
                    Distribution of cards across workspaces
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByWorkspace.length > 0 ? (
                    <Bar
                      data={prepareWorkspaceChartData()}
                      options={barChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedWorkspace !== "all" && (
                <Card className="apple-card">
                  <CardHeader>
                    <CardTitle>Cards by Board</CardTitle>
                    <CardDescription>
                      Distribution of cards across boards
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {stats.zistsByBoard.length > 0 ? (
                      <Bar
                        data={prepareBoardChartData()}
                        options={barChartOptions}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          No data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="apple-card">
                <CardHeader>
                  <CardTitle>Cards by Priority</CardTitle>
                  <CardDescription>
                    Distribution of cards by priority level
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByPriority.length > 0 ? (
                    <Pie
                      data={preparePriorityChartData()}
                      options={pieChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="apple-card">
                <CardHeader>
                  <CardTitle>Activity Distribution</CardTitle>
                  <CardDescription>
                    Types of activities performed on cards
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByActivity.length > 0 ? (
                    <PolarArea
                      data={prepareActivityChartData()}
                      options={pieChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="apple-card">
                <CardHeader>
                  <CardTitle>Monthly Card Creation</CardTitle>
                  <CardDescription>Cards created per month</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByMonth.length > 0 ? (
                    <Bar
                      data={prepareMonthlyChartData()}
                      options={horizontalBarChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="apple-card col-span-1 md:col-span-2">
                <CardHeader>
                  <CardTitle>Card Distribution Radar</CardTitle>
                  <CardDescription>
                    Comprehensive view of card distribution across categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {stats.zistsByPriority.length > 0 ||
                  stats.zistsByStatus.length > 0 ? (
                    <Radar
                      data={prepareRadarChartData()}
                      options={radarChartOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>Card Creation Trends</CardTitle>
                <CardDescription>
                  Number of cards created over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                {stats.zistsByDate.length > 0 ? (
                  <Line
                    data={prepareDateChartData()}
                    options={lineChartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card className="apple-card">
              <CardHeader>
                <CardTitle>Detailed Statistics</CardTitle>
                <CardDescription>
                  Detailed breakdown of cards by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-medium">Cards by Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.zistsByStatus.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                chartColors[index % chartColors.length],
                            }}
                          ></div>
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedWorkspace !== "all" && (
                    <>
                      <h3 className="font-medium mt-6">Cards by Board</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.zistsByBoard.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 border rounded-md"
                          >
                            <span>{item.name}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <h3 className="font-medium mt-6">Cards by Priority</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.zistsByPriority.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 border rounded-md"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
