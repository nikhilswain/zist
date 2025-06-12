import type { BoardTheme } from "./types";

export const BOARD_THEMES: BoardTheme[] = [
  { id: "default", name: "Default", class: "", color: "#1e293b" },
  { id: "blue", name: "Blue", class: "board-theme-blue", color: "#1e40af" },
  {
    id: "purple",
    name: "Purple",
    class: "board-theme-purple",
    color: "#7e22ce",
  },
  { id: "green", name: "Green", class: "board-theme-green", color: "#15803d" },
  { id: "amber", name: "Amber", class: "board-theme-amber", color: "#b45309" },
  { id: "rose", name: "Rose", class: "board-theme-rose", color: "#be123c" },
  { id: "cyan", name: "Cyan", class: "board-theme-cyan", color: "#0891b2" },
  { id: "slate", name: "Slate", class: "board-theme-slate", color: "#475569" },
];
