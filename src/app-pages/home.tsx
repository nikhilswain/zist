import { useState } from "react";
import { Workspaces } from "@/components/workspaces";
import { Header } from "@/components/header";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search workspaces"
      />
      <main className="flex-1 container mx-auto p-4">
        <Workspaces searchQuery={searchQuery} />
      </main>
    </div>
  );
}
