"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { toast } from "sonner";
import { supabase } from "@/utils/supabase/client";
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
  DollarSign,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define the schema for a sale
const saleSchema = z.object({
  cliente: z.string().min(1, { message: "El nombre del cliente es requerido" }),
  productos: z.string().min(1, { message: "Los productos son requeridos" }),
  total: z.coerce.number().positive({ message: "El total debe ser mayor a 0" }),
  estado: z.string().default("Completado"),
  fecha: z.date(),
  hora: z.string(),
  notas: z.string().optional(),
});

// Define the type for a sale
type Sale = {
  id: string;
  user_id: string;
  cliente: string;
  productos: string;
  total: number;
  estado: string;
  hora: string;
  fecha: string;
  created_at?: string;
  notas?: string;
};

// Define the type for sale statistics
type SaleStats = {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesCount: {
    today: number;
    week: number;
    month: number;
  };
  revenueCount: {
    today: number;
    week: number;
    month: number;
  };
};

export default function Ventas() {
  // State variables
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stats, setStats] = useState<SaleStats>({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    salesCount: {
      today: 0,
      week: 0,
      month: 0,
    },
    revenueCount: {
      today: 0,
      week: 0,
      month: 0,
    },
  });
  const [activeTab, setActiveTab] = useState("todas");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Sale;
    direction: "asc" | "desc";
  } | null>(null);

  // Initialize the form
  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      cliente: "",
      productos: "",
      total: 0,
      estado: "Completado",
      fecha: new Date(),
      hora: format(new Date(), "HH:mm"),
      notas: "",
    },
  });

  // Fetch sales data from Supabase
  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("No se encontró una sesión de usuario");
      }

      const { data, error } = await supabase
        .from("ventas")
        .select("*")
        .eq("user_id", session.session.user.id)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

      if (error) {
        throw new Error(`Error al obtener las ventas: ${error.message}`);
      }

      setSales(data || []);
      setFilteredSales(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Error al cargar las ventas", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate sales statistics
  const calculateStats = (salesData: Sale[]) => {
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);

    const totalSales = salesData.length;
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const todaySales = salesData.filter((sale) => {
      const saleDate = parseISO(sale.fecha);
      return saleDate >= today && saleDate <= endOfDay(today);
    });

    const weekSales = salesData.filter((sale) => {
      const saleDate = parseISO(sale.fecha);
      return (
        saleDate >= weekStart &&
        saleDate <= endOfWeek(today, { weekStartsOn: 1 })
      );
    });

    const monthSales = salesData.filter((sale) => {
      const saleDate = parseISO(sale.fecha);
      return saleDate >= monthStart && saleDate <= endOfMonth(today);
    });

    setStats({
      totalSales,
      totalRevenue,
      averageTicket,
      salesCount: {
        today: todaySales.length,
        week: weekSales.length,
        month: monthSales.length,
      },
      revenueCount: {
        today: todaySales.reduce((sum, sale) => sum + sale.total, 0),
        week: weekSales.reduce((sum, sale) => sum + sale.total, 0),
        month: monthSales.reduce((sum, sale) => sum + sale.total, 0),
      },
    });
  };

  // Apply filters to sales data
  const applyFilters = useCallback(() => {
    let filtered = [...sales];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.cliente.toLowerCase().includes(searchLower) ||
          sale.productos.toLowerCase().includes(searchLower) ||
          sale.total.toString().includes(searchLower)
      );
    }

    // Apply date range filter
    if (dateRange !== "all") {
      const today = startOfDay(new Date());

      if (dateRange === "today") {
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return saleDate >= today && saleDate <= endOfDay(today);
        });
      } else if (dateRange === "week") {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return (
            saleDate >= weekStart &&
            saleDate <= endOfWeek(today, { weekStartsOn: 1 })
          );
        });
      } else if (dateRange === "month") {
        const monthStart = startOfMonth(today);
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return saleDate >= monthStart && saleDate <= endOfMonth(today);
        });
      } else if (dateRange === "custom" && customDateRange.from) {
        const fromDate = startOfDay(customDateRange.from);
        const toDate = customDateRange.to
          ? endOfDay(customDateRange.to)
          : endOfDay(customDateRange.from);

        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return saleDate >= fromDate && saleDate <= toDate;
        });
      }
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((sale) => sale.estado === statusFilter);
    }

    // Apply tab filter
    if (activeTab !== "todas") {
      if (activeTab === "hoy") {
        const today = startOfDay(new Date());
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return saleDate >= today && saleDate <= endOfDay(today);
        });
      } else if (activeTab === "semana") {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return (
            saleDate >= weekStart &&
            saleDate <= endOfWeek(new Date(), { weekStartsOn: 1 })
          );
        });
      } else if (activeTab === "mes") {
        const monthStart = startOfMonth(new Date());
        filtered = filtered.filter((sale) => {
          const saleDate = parseISO(sale.fecha);
          return saleDate >= monthStart && saleDate <= endOfMonth(new Date());
        });
      }
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredSales(filtered);
  }, [
    sales,
    searchTerm,
    dateRange,
    customDateRange,
    statusFilter,
    activeTab,
    sortConfig,
  ]);

  // Request sorting
  const requestSort = (key: keyof Sale) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof saleSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("No se encontró una sesión de usuario");
      }

      const formattedDate = format(data.fecha, "yyyy-MM-dd");

      const saleData = {
        user_id: session.session.user.id,
        cliente: data.cliente,
        productos: data.productos,
        total: data.total,
        estado: data.estado,
        hora: data.hora,
        fecha: formattedDate,
        notas: data.notas || "",
      };

      let response;

      if (editingSale) {
        // Update existing sale
        response = await supabase
          .from("ventas")
          .update(saleData)
          .eq("id", editingSale.id)
          .eq("user_id", session.session.user.id)
          .select();
      } else {
        // Insert new sale
        response = await supabase.from("ventas").insert(saleData).select();
      }

      if (response.error) {
        throw new Error(
          `Error al ${editingSale ? "actualizar" : "registrar"} la venta: ${
            response.error.message
          }`
        );
      }

      toast.success(editingSale ? "Venta actualizada" : "Venta registrada", {
        description: `La venta de ${data.cliente} por $${data.total.toFixed(
          2
        )} ha sido ${editingSale ? "actualizada" : "registrada"} exitosamente`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });

      // Reset form and refresh data
      form.reset({
        cliente: "",
        productos: "",
        total: 0,
        estado: "Completado",
        fecha: new Date(),
        hora: format(new Date(), "HH:mm"),
        notas: "",
      });
      setEditingSale(null);
      setShowSaleDialog(false);
      fetchSales();
    } catch (error) {
      console.error("Error submitting sale:", error);
      toast.error(
        `Error al ${editingSale ? "actualizar" : "registrar"} la venta`,
        {
          description:
            error instanceof Error ? error.message : "Error desconocido",
          icon: <XCircle className="h-5 w-5 text-rose-500" />,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sale deletion
  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error("No se encontró una sesión de usuario");
      }

      const { error } = await supabase
        .from("ventas")
        .delete()
        .eq("id", saleToDelete)
        .eq("user_id", session.session.user.id);

      if (error) {
        throw new Error(`Error al eliminar la venta: ${error.message}`);
      }

      toast.success("Venta eliminada", {
        description: "La venta ha sido eliminada exitosamente",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });

      // Refresh data
      fetchSales();
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Error al eliminar la venta", {
        description:
          error instanceof Error ? error.message : "Error desconocido",
        icon: <XCircle className="h-5 w-5 text-rose-500" />,
      });
    } finally {
      setSaleToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  // Handle editing a sale
  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    form.reset({
      cliente: sale.cliente,
      productos: sale.productos,
      total: sale.total,
      estado: sale.estado,
      fecha: parseISO(sale.fecha),
      hora: sale.hora,
      notas: sale.notas || "",
    });
    setShowSaleDialog(true);
  };

  // Export sales to CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Cliente",
      "Productos",
      "Total",
      "Estado",
      "Fecha",
      "Hora",
      "Notas",
    ];
    const csvData = filteredSales.map((sale) => [
      sale.id,
      sale.cliente,
      sale.productos,
      sale.total.toString(),
      sale.estado,
      sale.fecha,
      sale.hora,
      sale.notas || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ventas_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exportación completada", {
      description: "Las ventas han sido exportadas a CSV exitosamente",
      icon: <FileText className="h-5 w-5 text-green-500" />,
    });
  };

  // Effect to fetch sales on component mount
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Effect to apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Ventas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="mt-1 text-xs text-zinc-400">
              {stats.salesCount.today} ventas hoy
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Ingresos Totales
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              ${stats.revenueCount.today.toFixed(2)} hoy
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
                <TrendingUp className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Ticket Promedio
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.averageTicket.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Por venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sales Card */}
      <Card className="shadow-lg border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-2 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold">
                Registro de Ventas
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Gestiona y visualiza todas tus ventas
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <Plus size={16} className="mr-1" />
                    Nueva Venta
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 text-white border-zinc-800 sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSale ? "Editar Venta" : "Registrar Nueva Venta"}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      {editingSale
                        ? "Modifica los detalles de la venta existente"
                        : "Completa el formulario para registrar una nueva venta"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cliente"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cliente</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Nombre del cliente"
                                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="total"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500 pl-7"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="productos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Productos</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detalle de productos vendidos"
                                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500 min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-zinc-500">
                              Ingresa los productos separados por comas o en
                              líneas separadas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="fecha"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Fecha</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
                                        !field.value && "text-zinc-400"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP", {
                                          locale: es,
                                        })
                                      ) : (
                                        <span>Seleccionar fecha</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    className="bg-zinc-900"
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hora"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hora</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                  <Input
                                    type="time"
                                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500 pl-9"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="estado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Seleccionar estado" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                  <SelectItem value="Completado">
                                    Completado
                                  </SelectItem>
                                  <SelectItem value="Pendiente">
                                    Pendiente
                                  </SelectItem>
                                  <SelectItem value="Cancelado">
                                    Cancelado
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notas"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Notas adicionales sobre la venta"
                                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowSaleDialog(false);
                            setEditingSale(null);
                            form.reset();
                          }}
                          className="border-zinc-700"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                          {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingSale ? "Actualizar Venta" : "Registrar Venta"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                onClick={exportToCSV}
              >
                <Download size={16} className="mr-1" />
                Exportar
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={fetchSales}
                className="text-zinc-400 hover:text-white"
                aria-label="Refrescar ventas"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="w-full md:w-auto overflow-x-auto">
              <Tabs
                defaultValue="todas"
                className="w-full"
                onValueChange={(value) => setActiveTab(value)}
              >
                <TabsList className="bg-zinc-800 p-1">
                  <TabsTrigger
                    value="todas"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    Todas
                  </TabsTrigger>
                  <TabsTrigger
                    value="hoy"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    Hoy
                  </TabsTrigger>
                  <TabsTrigger
                    value="semana"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    Esta Semana
                  </TabsTrigger>
                  <TabsTrigger
                    value="mes"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    Este Mes
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Buscar ventas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  aria-label="Buscar ventas"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "border-zinc-700 bg-zinc-800 hover:bg-zinc-700",
                  showFilters &&
                    "bg-purple-900/20 border-purple-500/50 text-purple-400"
                )}
                aria-label="Filtros avanzados"
                aria-expanded={showFilters}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 mb-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-300"
                  id="date-filter-label"
                >
                  Rango de Fechas
                </label>
                <Select
                  value={dateRange}
                  onValueChange={(
                    value: "all" | "today" | "week" | "month" | "custom"
                  ) => {
                    setDateRange(value);
                    if (value !== "custom") {
                      setCustomDateRange({ from: undefined, to: undefined });
                    }
                  }}
                  aria-labelledby="date-filter-label"
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Todas las fechas" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">Todas las fechas</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === "custom" && (
                  <div className="pt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                            !customDateRange.from && "text-zinc-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDateRange.from ? (
                            customDateRange.to ? (
                              <>
                                {format(customDateRange.from, "P", {
                                  locale: es,
                                })}{" "}
                                -{" "}
                                {format(customDateRange.to, "P", {
                                  locale: es,
                                })}
                              </>
                            ) : (
                              format(customDateRange.from, "P", { locale: es })
                            )
                          ) : (
                            <span>Seleccionar fechas</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-zinc-900 border-zinc-800"
                        align="start"
                      >
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={customDateRange.from}
                          selected={customDateRange}
                          onSelect={setCustomDateRange}
                          numberOfMonths={2}
                          className="bg-zinc-900"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-300"
                  id="status-filter-label"
                >
                  Estado
                </label>
                <Select
                  value={statusFilter || ""}
                  onValueChange={(value) =>
                    setStatusFilter(value === "" ? null : value)
                  }
                  aria-labelledby="status-filter-label"
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 w-full"
                  onClick={() => {
                    setSearchTerm("");
                    setDateRange("all");
                    setCustomDateRange({ from: undefined, to: undefined });
                    setStatusFilter(null);
                    setActiveTab("todas");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="overflow-x-auto overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                    <button
                      className="flex items-center cursor-pointer"
                      onClick={() => requestSort("cliente")}
                      aria-label="Ordenar por cliente"
                    >
                      Cliente
                      <ChevronDown
                        className={cn(
                          "ml-1 h-3 w-3 transition-transform",
                          sortConfig?.key === "cliente" &&
                            sortConfig.direction === "desc" &&
                            "rotate-180"
                        )}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                    Productos
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                    <button
                      className="flex items-center cursor-pointer"
                      onClick={() => requestSort("total")}
                      aria-label="Ordenar por total"
                    >
                      Total
                      <ChevronDown
                        className={cn(
                          "ml-1 h-3 w-3 transition-transform",
                          sortConfig?.key === "total" &&
                            sortConfig.direction === "desc" &&
                            "rotate-180"
                        )}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                    Estado
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                    <button
                      className="flex items-center cursor-pointer"
                      onClick={() => requestSort("fecha")}
                      aria-label="Ordenar por fecha"
                    >
                      Fecha
                      <ChevronDown
                        className={cn(
                          "ml-1 h-3 w-3 transition-transform",
                          sortConfig?.key === "fecha" &&
                            sortConfig.direction === "desc" &&
                            "rotate-180"
                        )}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-center font-medium text-zinc-400">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="border-zinc-800">
                      <TableCell className="px-4 py-3">
                        <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-zinc-400"
                    >
                      {searchTerm || dateRange !== "all" || statusFilter ? (
                        <div className="flex flex-col items-center justify-center">
                          <Search
                            className="h-8 w-8 mb-2 text-zinc-500"
                            aria-hidden="true"
                          />
                          <p>
                            No se encontraron ventas con los filtros aplicados
                          </p>
                          <Button
                            variant="link"
                            className="mt-2 text-purple-400"
                            onClick={() => {
                              setSearchTerm("");
                              setDateRange("all");
                              setCustomDateRange({
                                from: undefined,
                                to: undefined,
                              });
                              setStatusFilter(null);
                              setActiveTab("todas");
                            }}
                          >
                            Limpiar filtros
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingCart
                            className="h-8 w-8 mb-2 text-zinc-500"
                            aria-hidden="true"
                          />
                          <p>No hay ventas registradas</p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="link"
                                className="mt-2 text-purple-400"
                              >
                                Registrar primera venta
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 text-white border-zinc-800">
                              <DialogHeader>
                                <DialogTitle>Registrar Nueva Venta</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                  Completa el formulario para registrar una
                                  nueva venta
                                </DialogDescription>
                              </DialogHeader>
                              {/* Form content would go here */}
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" />
                          {sale.cliente}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div
                          className="max-w-xs truncate"
                          title={sale.productos}
                        >
                          {sale.productos}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium">
                        ${sale.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          className={cn(
                            sale.estado === "Completado" &&
                              "bg-emerald-500/20 text-emerald-400",
                            sale.estado === "Pendiente" &&
                              "bg-amber-500/20 text-amber-400",
                            sale.estado === "Cancelado" &&
                              "bg-rose-500/20 text-rose-400"
                          )}
                        >
                          {sale.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-zinc-300">
                        <div className="flex flex-col">
                          <span>
                            {format(parseISO(sale.fecha), "P", { locale: es })}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {sale.hora}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-zinc-900 border-zinc-800"
                          >
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
                              onClick={() => handleEditSale(sale)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-rose-400 hover:bg-zinc-800 focus:bg-zinc-800 hover:text-rose-300"
                              onClick={() => {
                                setSaleToDelete(sale.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination or load more could go here */}
          {filteredSales.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-sm text-zinc-400">
              <div>
                Mostrando {filteredSales.length} de {sales.length} ventas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-zinc-800"
                  disabled
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Página anterior</span>
                </Button>
                <span>Página 1</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-zinc-800"
                  disabled
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Página siguiente</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-900 text-white border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              la venta seleccionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDeleteSale}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
