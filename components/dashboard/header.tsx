"use client";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  user: {
    email?: string;
    display_name?: string;
  };
  toggleSidebar: () => void;
}

export function Header({ user, toggleSidebar }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <h1 className="text-lg font-semibold md:text-xl">Dashboard</h1>
      <div className="ml-auto flex items-center gap-4">
        <Avatar className="h-8 w-8 border border-zinc-800">
          <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Avatar" />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
