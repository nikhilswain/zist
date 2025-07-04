import { v4 as uuidv4 } from "uuid";
import type {
  WorkspaceType,
  BoardType,
  ColumnType,
  ZistType,
  ActivityType,
} from "./types";

export const DB_NAME = "zist-db";
const DB_VERSION = 1;

// Initialize the database
export async function initDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error opening database:", event);
      reject(new Error("Error opening database"));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains("workspaces")) {
        db.createObjectStore("workspaces", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("boards")) {
        db.createObjectStore("boards", { keyPath: "id" });
      }
    };
  });
}

// Get database connection with timeout and retry
async function getDB(timeout = 5000, retries = 3): Promise<IDBDatabase> {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Database connection timeout"));
        }, timeout);

        initDB()
          .then((db) => {
            clearTimeout(timeoutId);
            resolve(db);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
    } catch (error) {
      console.warn(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error("Failed to connect to database after retries");
}

// Queue database operations to prevent conflicts
// function queueOperation<T>(operation: () => Promise<T>): Promise<T> {
//   operationQueue = operationQueue.then(
//     () => operation(),
//     () => operation(), // Run operation even if previous failed
//   )
//   return operationQueue
// }

// Workspace operations
export async function createWorkspace(name: string): Promise<WorkspaceType> {
  // return queueOperation(async () => {
  const db = await getDB();
  const workspace: WorkspaceType = {
    id: uuidv4(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    boards: [],
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["workspaces"], "readwrite");

    transaction.oncomplete = () => {
      resolve(workspace);
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when creating workspace:", event);
      reject(new Error("Failed to create workspace"));
    };

    const store = transaction.objectStore("workspaces");
    const request = store.add(workspace);

    request.onerror = (event) => {
      console.error("Error adding workspace:", event);
      reject(new Error("Failed to add workspace"));
    };
  });
  // })
}

export async function getWorkspaces(): Promise<WorkspaceType[]> {
  // return queueOperation(async () => {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["workspaces"], "readonly");
    const store = transaction.objectStore("workspaces");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = (event) => {
      console.error("Failed to get workspaces:", event);
      reject(new Error("Failed to get workspaces"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when getting workspaces:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}

export async function getWorkspace(id: string): Promise<WorkspaceType | null> {
  // return queueOperation(async () => {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["workspaces"], "readonly");
    const store = transaction.objectStore("workspaces");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = (event) => {
      console.error("Failed to get workspace:", event);
      reject(new Error("Failed to get workspace"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when getting workspace:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}

export async function updateWorkspace(
  workspace: WorkspaceType
): Promise<WorkspaceType> {
  // return queueOperation(async () => {
  const db = await getDB();
  workspace.updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["workspaces"], "readwrite");

    transaction.oncomplete = () => {
      resolve(workspace);
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when updating workspace:", event);
      reject(new Error("Failed to update workspace"));
    };

    const store = transaction.objectStore("workspaces");
    const request = store.put(workspace);

    request.onerror = (event) => {
      console.error("Error updating workspace:", event);
      reject(new Error("Failed to update workspace"));
    };
  });
  // })
}

export async function deleteWorkspace(id: string): Promise<void> {
  // return queueOperation(async () => {
  console.log("Starting deleteWorkspace operation for id:", id);
  const db = await getDB();

  return new Promise(async (resolve, reject) => {
    try {
      // Get all boards first
      const allBoards = await getAllBoardsSync(db);
      const workspaceBoards = allBoards.filter(
        (board) => board.workspaceId === id
      );
      console.log(`Found ${workspaceBoards.length} boards for workspace ${id}`);

      const transaction = db.transaction(["workspaces", "boards"], "readwrite");

      transaction.oncomplete = () => {
        console.log("Workspace deletion completed successfully");
        resolve();
      };

      transaction.onerror = (event) => {
        console.error("Transaction error when deleting workspace:", event);
        reject(new Error("Failed to delete workspace"));
      };

      // Delete all boards belonging to this workspace
      const boardStore = transaction.objectStore("boards");
      workspaceBoards.forEach((board) => {
        console.log(`Deleting board ${board.id}`);
        boardStore.delete(board.id);
      });

      // Delete the workspace
      const workspaceStore = transaction.objectStore("workspaces");
      console.log(`Deleting workspace ${id}`);
      workspaceStore.delete(id);
    } catch (error) {
      console.error("Error in deleteWorkspace:", error);
      reject(error);
    }
  });
  // })
}

// Helper function to get all boards synchronously within a transaction
function getAllBoardsSync(db: IDBDatabase): Promise<BoardType[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readonly");
    const store = transaction.objectStore("boards");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = (event) => {
      console.error("Failed to get all boards:", event);
      reject(new Error("Failed to get all boards"));
    };
  });
}

// Board operations
export async function createBoard(
  name: string,
  workspaceId: string,
  theme?: string
): Promise<BoardType> {
  // return queueOperation(async () => {
  const db = await getDB();

  const boardId = uuidv4();
  const columns: ColumnType[] = [
    {
      id: uuidv4(),
      name: "To Do",
      boardId: boardId,
      order: 0,
      zists: [],
    },
    {
      id: uuidv4(),
      name: "In Progress",
      boardId: boardId,
      order: 1,
      zists: [],
    },
    {
      id: uuidv4(),
      name: "Done",
      boardId: boardId,
      order: 2,
      zists: [],
    },
  ];

  const board: BoardType = {
    id: boardId,
    name,
    workspaceId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    columns,
    archived: false,
    theme: theme,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards", "workspaces"], "readwrite");

    transaction.oncomplete = () => {
      resolve(board);
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when creating board:", event);
      reject(new Error("Failed to create board"));
    };

    // Add the board
    const boardStore = transaction.objectStore("boards");
    boardStore.add(board);

    // Update the workspace
    const workspaceStore = transaction.objectStore("workspaces");
    const workspaceRequest = workspaceStore.get(workspaceId);

    workspaceRequest.onsuccess = () => {
      const workspace = workspaceRequest.result;
      if (workspace) {
        workspace.boards.push(boardId);
        workspace.updatedAt = Date.now();
        workspaceStore.put(workspace);
      }
    };
  });
  // })
}

export async function getBoard(id: string): Promise<BoardType | null> {
  // return queueOperation(async () => {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readonly");
    const store = transaction.objectStore("boards");
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = (event) => {
      console.error("Failed to get board:", event);
      reject(new Error("Failed to get board"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when getting board:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}

export async function getBoardsByWorkspace(
  workspaceId: string
): Promise<BoardType[]> {
  // return queueOperation(async () => {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readonly");
    const store = transaction.objectStore("boards");
    const request = store.getAll();

    request.onsuccess = () => {
      const boards = (request.result || []).filter(
        (board) => board.workspaceId === workspaceId && !board.archived
      );
      resolve(boards);
    };

    request.onerror = (event) => {
      console.error("Failed to get boards:", event);
      reject(new Error("Failed to get boards"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when getting boards:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}

export async function getArchivedBoardsByWorkspace(
  workspaceId: string
): Promise<BoardType[]> {
  // return queueOperation(async () => {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readonly");
    const store = transaction.objectStore("boards");
    const request = store.getAll();

    request.onsuccess = () => {
      const boards = (request.result || []).filter(
        (board) => board.workspaceId === workspaceId && board.archived
      );
      resolve(boards);
    };

    request.onerror = (event) => {
      console.error("Failed to get archived boards:", event);
      reject(new Error("Failed to get archived boards"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when getting archived boards:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}

export async function updateBoard(board: BoardType): Promise<BoardType> {
  // return queueOperation(async () => {
  console.log("updateBoard called with board:", board.id, board.name);
  const db = await getDB();
  board.updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readwrite");

    transaction.oncomplete = () => {
      console.log("Board update transaction completed successfully");
      resolve(board);
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when updating board:", event);
      reject(new Error("Failed to update board"));
    };

    const store = transaction.objectStore("boards");
    const request = store.put(board);

    request.onsuccess = () => {
      console.log("Board put request successful");
    };

    request.onerror = (event) => {
      console.error("Error updating board:", event);
      reject(new Error("Failed to update board"));
    };
  });
  // })
}

export async function updateBoardTheme(
  boardId: string,
  theme: string
): Promise<BoardType> {
  const db = await getDB();

  return new Promise(async (resolve, reject) => {
    try {
      const board = await getBoard(boardId);
      if (!board) {
        reject(new Error("Board not found"));
        return;
      }

      const updatedBoard = {
        ...board,
        theme,
        updatedAt: Date.now(),
      };

      const transaction = db.transaction(["boards"], "readwrite");
      const store = transaction.objectStore("boards");
      store.put(updatedBoard);

      transaction.oncomplete = () => {
        resolve(updatedBoard);
      };

      transaction.onerror = (event) => {
        console.error("Transaction error when updating board theme:", event);
        reject(new Error("Failed to update board theme"));
      };
    } catch (error) {
      console.error("Exception in updateBoardTheme:", error);
      reject(error);
    }
  });
}

export async function archiveBoard(id: string): Promise<void> {
  // return queueOperation(async () => {
  const db = await getDB();
  const board = await getBoard(id);

  if (!board) {
    throw new Error("Board not found");
  }

  board.archived = true;
  board.updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readwrite");

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when archiving board:", event);
      reject(new Error("Failed to archive board"));
    };

    const store = transaction.objectStore("boards");
    const request = store.put(board);

    request.onerror = (event) => {
      console.error("Error archiving board:", event);
      reject(new Error("Failed to archive board"));
    };
  });
  // })
}

export async function restoreBoard(id: string): Promise<void> {
  // return queueOperation(async () => {
  const db = await getDB();
  const board = await getBoard(id);

  if (!board) {
    throw new Error("Board not found");
  }

  board.archived = false;
  board.updatedAt = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readwrite");

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when restoring board:", event);
      reject(new Error("Failed to restore board"));
    };

    const store = transaction.objectStore("boards");
    const request = store.put(board);

    request.onerror = (event) => {
      console.error("Error restoring board:", event);
      reject(new Error("Failed to restore board"));
    };
  });
  // })
}

export async function deleteBoard(
  id: string,
  workspaceId: string
): Promise<void> {
  // return queueOperation(async () => {
  console.log("Starting deleteBoard operation for id:", id);
  const db = await getDB();

  return new Promise(async (resolve, reject) => {
    try {
      // Get the workspace first
      const workspace = await getWorkspace(workspaceId);

      const transaction = db.transaction(["boards", "workspaces"], "readwrite");

      transaction.oncomplete = () => {
        console.log("Board deletion completed successfully");
        resolve();
      };

      transaction.onerror = (event) => {
        console.error("Transaction error when deleting board:", event);
        reject(new Error("Failed to delete board"));
      };

      // Delete the board
      const boardStore = transaction.objectStore("boards");
      console.log(`Deleting board ${id}`);
      boardStore.delete(id);

      // Update the workspace
      if (workspace) {
        const workspaceStore = transaction.objectStore("workspaces");
        workspace.boards = workspace.boards.filter((boardId) => boardId !== id);
        workspace.updatedAt = Date.now();
        workspaceStore.put(workspace);
      }
    } catch (error) {
      console.error("Error in deleteBoard:", error);
      reject(error);
    }
  });
  // })
}

// Zist operations
export async function createZist(
  columnId: string,
  boardId: string,
  title: string,
  description = "",
  images: string[] = []
): Promise<ZistType> {
  // return queueOperation(async () => {
  console.log("=== createZist START ===");
  console.log("Parameters:", {
    columnId,
    boardId,
    title,
    description,
    imagesCount: images.length,
  });

  try {
    console.log("Step 1: Getting database connection...");
    const db = await getDB();
    console.log("Database connection successful");

    console.log("Step 2: Getting board...");
    const board = await getBoard(boardId);
    if (!board) {
      console.error("Board not found:", boardId);
      throw new Error("Board not found");
    }
    console.log(
      "Board found:",
      board.name,
      "with",
      board.columns.length,
      "columns"
    );

    console.log("Step 3: Finding column...");
    const columnIndex = board.columns.findIndex((col) => col.id === columnId);
    if (columnIndex === -1) {
      console.error("Column not found:", columnId);
      console.log(
        "Available columns:",
        board.columns.map((c) => ({ id: c.id, name: c.name }))
      );
      throw new Error("Column not found");
    }
    console.log(
      "Column found:",
      board.columns[columnIndex].name,
      "at index",
      columnIndex
    );

    console.log("Step 4: Creating zist object...");
    const zist: ZistType = {
      id: uuidv4(),
      title,
      description,
      columnId,
      boardId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      attachments: [],
      checklists: [],
      images: images || [],
      activities: [
        {
          id: uuidv4(),
          type: "create",
          userId: "system",
          userName: "System",
          timestamp: Date.now(),
          details: "Created this card",
        },
      ],
    };
    console.log("Zist created:", {
      id: zist.id,
      title: zist.title,
      columnId: zist.columnId,
    });

    console.log("Step 5: Adding zist to column...");
    board.columns[columnIndex].zists.push(zist);
    board.updatedAt = Date.now();
    console.log(
      "Zist added to column. Column now has",
      board.columns[columnIndex].zists.length,
      "zists"
    );

    console.log("Step 6: Updating board in database...");
    const updatedBoard = await updateBoard(board);
    console.log("Board updated successfully");

    console.log("=== createZist SUCCESS ===");
    return zist;
  } catch (error) {
    console.error("=== createZist ERROR ===");
    console.error("Error details:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    throw error;
  }
  // })
}

export async function updateZist(
  boardId: string,
  columnId: string,
  zist: ZistType,
  activityDetails?: ActivityType
): Promise<ZistType> {
  // return queueOperation(async () => {
  const board = await getBoard(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const columnIndex = board.columns.findIndex((col) => col.id === columnId);
  if (columnIndex === -1) {
    throw new Error("Column not found");
  }

  const zistIndex = board.columns[columnIndex].zists.findIndex(
    (z) => z.id === zist.id
  );
  if (zistIndex === -1) {
    throw new Error("Zist not found");
  }

  zist.updatedAt = Date.now();

  if (activityDetails) {
    zist.activities.push({
      ...activityDetails,
      id: uuidv4(),
      timestamp: Date.now(),
    });
  }

  board.columns[columnIndex].zists[zistIndex] = zist;
  board.updatedAt = Date.now();

  await updateBoard(board);
  return zist;
  // })
}

export async function moveZist(
  boardId: string,
  fromColumnId: string,
  toColumnId: string,
  zistId: string
): Promise<void> {
  // return queueOperation(async () => {
  const board = await getBoard(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const fromColumnIndex = board.columns.findIndex(
    (col) => col.id === fromColumnId
  );
  if (fromColumnIndex === -1) {
    throw new Error("Source column not found");
  }

  const toColumnIndex = board.columns.findIndex((col) => col.id === toColumnId);
  if (toColumnIndex === -1) {
    throw new Error("Destination column not found");
  }

  const zistIndex = board.columns[fromColumnIndex].zists.findIndex(
    (z) => z.id === zistId
  );
  if (zistIndex === -1) {
    throw new Error("Zist not found");
  }

  const zist = { ...board.columns[fromColumnIndex].zists[zistIndex] };
  zist.columnId = toColumnId;

  zist.activities.push({
    id: uuidv4(),
    type: "move",
    userId: "system",
    userName: "System",
    timestamp: Date.now(),
    details: `Moved from ${board.columns[fromColumnIndex].name} to ${board.columns[toColumnIndex].name}`,
    field: "column",
    oldValue: board.columns[fromColumnIndex].name,
    newValue: board.columns[toColumnIndex].name,
  });

  board.columns[fromColumnIndex].zists.splice(zistIndex, 1);
  board.columns[toColumnIndex].zists.push(zist);
  board.updatedAt = Date.now();

  await updateBoard(board);
  // })
}

export async function deleteZist(
  boardId: string,
  columnId: string,
  zistId: string
): Promise<void> {
  // return queueOperation(async () => {
  console.log("Starting deleteZist operation for zistId:", zistId);
  const board = await getBoard(boardId);

  if (!board) {
    throw new Error("Board not found");
  }

  const columnIndex = board.columns.findIndex((col) => col.id === columnId);
  if (columnIndex === -1) {
    throw new Error("Column not found");
  }

  board.columns[columnIndex].zists = board.columns[columnIndex].zists.filter(
    (z) => z.id !== zistId
  );
  board.updatedAt = Date.now();

  await updateBoard(board);
  console.log("Zist deletion completed successfully");
  // })
}

// Column operations
export async function createColumn(
  boardId: string,
  name: string
): Promise<ColumnType> {
  // return queueOperation(async () => {
  const board = await getBoard(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const column: ColumnType = {
    id: uuidv4(),
    name,
    boardId,
    order: board.columns.length,
    zists: [],
  };

  board.columns.push(column);
  board.updatedAt = Date.now();

  await updateBoard(board);
  return column;
  // })
}

export async function updateColumn(
  boardId: string,
  column: ColumnType
): Promise<ColumnType> {
  // return queueOperation(async () => {
  const board = await getBoard(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const columnIndex = board.columns.findIndex((col) => col.id === column.id);
  if (columnIndex === -1) {
    throw new Error("Column not found");
  }

  board.columns[columnIndex] = column;
  board.updatedAt = Date.now();

  await updateBoard(board);
  return column;
  // })
}

export async function deleteColumn(
  boardId: string,
  columnId: string
): Promise<void> {
  // return queueOperation(async () => {
  console.log("Starting deleteColumn operation for columnId:", columnId);
  const board = await getBoard(boardId);

  if (!board) {
    throw new Error("Board not found");
  }

  const updatedColumns = board.columns.filter((col) => col.id !== columnId);
  updatedColumns.forEach((col, index) => {
    col.order = index;
  });

  board.columns = updatedColumns;
  board.updatedAt = Date.now();

  await updateBoard(board);
  console.log("Column deletion completed successfully");
  // })
}

export async function reorderColumns(
  boardId: string,
  columnIds: string[]
): Promise<void> {
  // return queueOperation(async () => {
  const board = await getBoard(boardId);
  if (!board) {
    throw new Error("Board not found");
  }

  const reorderedColumns = columnIds
    .map((columnId, index) => {
      const column = board.columns.find((col) => col.id === columnId);
      if (column) {
        column.order = index;
        return column;
      }
      return null;
    })
    .filter(Boolean) as ColumnType[];

  board.columns = reorderedColumns;
  board.updatedAt = Date.now();

  await updateBoard(board);
}

// Search operations
export async function searchZists(query: string): Promise<ZistType[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["boards"], "readonly");
    const store = transaction.objectStore("boards");
    const request = store.getAll();

    request.onsuccess = () => {
      const boards = request.result || [];
      const results: ZistType[] = [];

      boards.forEach((board) => {
        interface SearchResult extends ZistType {}

        board.columns.forEach((column: ColumnType): void => {
          const matchingZists: ZistType[] = column.zists.filter(
            (zist: ZistType): boolean =>
              zist.title.toLowerCase().includes(query.toLowerCase()) ||
              zist.description.toLowerCase().includes(query.toLowerCase()) ||
              zist.labels.some((label: string): boolean =>
                label.toLowerCase().includes(query.toLowerCase())
              )
          );
          results.push(...matchingZists);
        });
      });

      resolve(results);
    };

    request.onerror = (event) => {
      console.error("Failed to search zists:", event);
      reject(new Error("Failed to search zists"));
    };

    transaction.onerror = (event) => {
      console.error("Transaction error when searching zists:", event);
      reject(new Error("Transaction failed"));
    };
  });
  // })
}
