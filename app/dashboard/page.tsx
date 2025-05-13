"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  BarChart3,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  User2,
  MoreHorizontal,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/utils/supabase/client";
import CalculadoraCostos from "@/components/costos";
import Inventario from "@/components/inventario";
import Recetas from "@/components/recetas";
import Compras from "@/components/compras";
import Ventas from "@/components/ventas";

// Import new dashboard components
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { ProductPerformance } from "@/components/dashboard/product-performance";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";

// Import the Header component
import { Header } from "@/components/dashboard/header";
import ConfiguracionPage from "@/components/configuracion";

interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    async function initializeAndSubscribe() {
      const { data, error } = await supabase.auth.getSession();
      try {
        // Obtén la sesión actual
        console.log("getSession result:", data);
        if (error || !data?.session?.user) {
          console.error("Error obteniendo sesión inicial:", error?.message);
          setShowErrorDialog(true);
        } else {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || "",
            display_name: data.session.user.user_metadata?.display_name || "",
            role: data.session.user.user_metadata?.role,
          });
          setShowErrorDialog(false);
        }
      } catch (err) {
        console.error("Excepción al obtener sesión:", err);
        setShowErrorDialog(true);
      } finally {
        setLoading(false);
      }
      if (data?.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || "",
          display_name: data.session.user.user_metadata?.display_name || "",
          role: data.session.user.user_metadata?.role,
        });
      }
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("onAuthStateChange event:", event, session);
          if (session && session.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              display_name: session.user.user_metadata?.display_name || "",
              role: session.user.user_metadata?.role,
            });
            setShowErrorDialog(false);
          } else {
            setUser(null);
            setShowErrorDialog(true);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
    initializeAndSubscribe().then((unsubscribe) => {
      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    });
  }, []);

  // Handle quick action selection
  const handleQuickAction = (action: string) => {
    setActiveTab(action);
  };

  // Handle view all button in recent activity
  const handleViewAll = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-purple-500"></div>
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (showErrorDialog || !user?.email) {
    return (
      <Dialog open>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Error de sesión</DialogTitle>
            <DialogDescription className="text-zinc-400">
              No se pudo obtener la información de tu cuenta. Por favor cierra
              la sesión y vuelve a iniciar sesión.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/auth");
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Volver a Iniciar Sesión
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Mobile Sidebar Toggle */}
      <button
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/20 md:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform overflow-y-auto bg-zinc-900 shadow-xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
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
            <span className="text-xl font-bold tracking-tight">GastroHub</span>
          </div>
          <div className="flex-1 overflow-auto py-6">
            <nav className="grid gap-1.5 px-3">
              {[
                {
                  icon: <Home className="h-5 w-5" />,
                  label: "Inicio",
                  value: "dashboard",
                  active: activeTab === "dashboard",
                },
                {
                  icon: <BarChart3 className="h-5 w-5" />,
                  label: "Ventas",
                  value: "ventas",
                  active: activeTab === "ventas",
                },
                {
                  icon: <Calculator className="h-5 w-5" />,
                  label: "Calculadora",
                  value: "calculadora",
                  active: activeTab === "calculadora",
                },
                {
                  icon: <ShoppingCart className="h-5 w-5" />,
                  label: "Compras",
                  value: "compras",
                  active: activeTab === "compras",
                },
                {
                  icon: <ClipboardList className="h-5 w-5" />,
                  label: "Recetas",
                  value: "recetas",
                  active: activeTab === "recetas",
                },
                {
                  icon: <Package className="h-5 w-5" />,
                  label: "Inventario",
                  value: "inventario",
                  active: activeTab === "inventario",
                },
                {
                  icon: <Settings className="h-5 w-5" />,
                  label: "Configuración",
                  value: "configuracion",
                  active: activeTab === "configuracion",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all hover:bg-zinc-800 ${
                    item.active
                      ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-400"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  onClick={() => setActiveTab(item.value)}
                >
                  {item.icon}
                  {item.label}
                  {item.active && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                  )}
                </button>
              ))}
            </nav>

            <Separator className="my-6 bg-zinc-800" />

            <div className="px-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Reportes
              </h3>
              <nav className="grid gap-1">
                {[
                  { label: "Ventas Diarias", href: "#" },
                  { label: "Inventario", href: "#" },
                  { label: "Rentabilidad", href: "#" },
                  { label: "Tendencias", href: "#" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="border-t border-zinc-800 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
              <Avatar className="h-10 w-10 border border-zinc-700">
                <AvatarImage
                  src="/placeholder.svg?height=40&width=40"
                  alt="Avatar"
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">
                  {user.display_name || user.email.split("@")[0]}
                </span>
                <span className="text-xs text-zinc-400">
                  {user.role || "Administrador"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 border-zinc-800 bg-zinc-900 text-white"
                >
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem className="focus:bg-zinc-800">
                    <User2 className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-zinc-800">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    className="focus:bg-zinc-800"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push("/auth");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:pl-72">
        {/* Header */}
        <Header
          user={user}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 md:p-8">
            {activeTab === "dashboard" && (
              <>
                {/* Welcome Section */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Bienvenido, {user.display_name || user.email.split("@")[0]}
                  </h2>
                  <p className="mt-1 text-zinc-400">
                    Aquí tienes un resumen financiero y operativo de tu negocio
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="mb-10">
                  <FinancialSummary userId={user.id} />
                </div>

                {/* Charts Section */}
                <div className="mb-10 grid gap-5 md:grid-cols-2">
                  <FinancialChart userId={user.id} />
                  <ProductPerformance userId={user.id} />
                </div>

                {/* Recent Activity */}
                <div className="mb-10">
                  <RecentActivity userId={user.id} onViewAll={handleViewAll} />
                </div>

                {/* Quick Actions */}
                <div className="mb-10">
                  <QuickActions onAction={handleQuickAction} />
                </div>
              </>
            )}

            {activeTab === "calculadora" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <Calculator className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">
                    Calculadora de Costos
                  </h2>
                </div>
                <CalculadoraCostos />
              </div>
            )}

            {activeTab === "inventario" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <Package className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">
                    Inventario de Ingredientes
                  </h2>
                </div>
                <Inventario />
              </div>
            )}

            {activeTab === "recetas" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <ClipboardList className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">Recetas</h2>
                </div>
                <Recetas />
              </div>
            )}

            {activeTab === "compras" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <ShoppingCart className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">Compras</h2>
                </div>
                <Compras />
              </div>
            )}

            {activeTab === "ventas" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
                </div>
                <Ventas />
              </div>
            )}

            {activeTab === "configuracion" && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                  <h2 className="text-2xl font-bold tracking-tight">
                    configuracion
                  </h2>
                </div>
                <ConfiguracionPage />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
