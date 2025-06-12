export type WorkspaceType = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  boards: string[];
};

export type BoardType = {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
  columns: ColumnType[];
  archived: boolean;
  theme?: string;
};

export type ColumnType = {
  id: string;
  name: string;
  boardId: string;
  order: number;
  zists: ZistType[];
};

export type ZistType = {
  id: string;
  title: string;
  description: string;
  columnId: string;
  boardId: string;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  priority?: "low" | "medium" | "high";
  labels: string[];
  attachments: AttachmentType[];
  checklists: ChecklistType[];
  coverImage?: string;
  images: string[]; // Array of base64 image strings
  activities: ActivityType[];
};

export type AttachmentType = {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: number;
};

export type ChecklistType = {
  id: string;
  title: string;
  items: ChecklistItemType[];
};

export type ChecklistItemType = {
  id: string;
  text: string;
  completed: boolean;
};

export type ActivityType = {
  id: string;
  type: "create" | "update" | "move" | "comment" | "delete";
  userId: string;
  userName: string;
  timestamp: number;
  details: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
};

export type UserType = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type BoardTheme = {
  id: string;
  name: string;
  class: string;
  color: string;
};
