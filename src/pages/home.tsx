import { Workspaces } from "@/components/workspaces";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        <Workspaces />
      </main>
    </div>
  );
}
