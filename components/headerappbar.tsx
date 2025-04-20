"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ui/modetoggle";
import { AutoBreadcrumb } from "./autobreadcrum";
import { useRouter } from "next/navigation"; // Importación correcta para navegación
import SignIn from "./ui/singupButton";
import Link from "next/link";

export default function DashboardHeader() {
  const router = useRouter(); // Hook para manejar la navegación

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-purple-600 p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
            >
              <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
              <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
            </svg>
          </div>
          <span className="text-xl font-bold">GastroHub</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link
            href="#funcionalidades"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            Funcionalidades
          </Link>
          <Link
            href="#beneficios"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            Beneficios
          </Link>
          <Link
            href="#precios"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            Precios
          </Link>
          <Link
            href="#testimonios"
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            Testimonios
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <SignIn />
          <Button variant={"default"} size="sm">
            Solicitar Demo
          </Button>
        </div>
      </div>
    </header>
  );
}
