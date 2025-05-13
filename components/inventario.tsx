"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  PlusCircle,
  FileDown,
  FileUp,
  Search,
  Package,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Ingredient {
  id: number;
  nombre: string;
  cantidad: number;
  preciopresentacion: number;
  precioporgramo: number;
  proveedor: string;
  categoria?: string;
  stock_minimo?: number;
  unidad?: string;
  fecha_actualizacion?: string;
}

export default function InventoryManager() {
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("todos");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Ingredient;
    direction: "asc" | "desc";
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [proveedorFilter, setProveedorFilter] = useState<string | null>(null);
  const [proveedores, setProveedores] = useState<string[]>([]);

  // Get current user
  useEffect(() => {
    async function getUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    }
    getUser();
  }, []);

  // Load or create inventory when userId is available
  useEffect(() => {
    if (userId) fetchInventory();
  }, [userId]);

  // Extract unique categories and suppliers from ingredients
  useEffect(() => {
    const uniqueCategories = Array.from(
      new Set(
        ingredientes
          .filter((ing) => ing.categoria)
          .map((ing) => ing.categoria as string)
      )
    );

    const uniqueProveedores = Array.from(
      new Set(
        ingredientes.filter((ing) => ing.proveedor).map((ing) => ing.proveedor)
      )
    );

    setCategorias(uniqueCategories);
    setProveedores(uniqueProveedores);
  }, [ingredientes]);

  const fetchInventory = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("ingredients")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(); // Permite que, si no hay registro, data sea null sin arrojar error

      if (!data) {
        // No existe un inventario: muestra un toast y prepara los ingredientes iniciales
        toast.error(
          "No se pudo cargar el inventario, agrega ingredientes para comenzar"
        );
        setIngredientes([]);
        return;
      }

      if (error) {
        console.error("Error fetching inventory:", error.message);
        toast.error("Error loading inventory", {
          description: error.message,
        });
        return;
      }

      // Si se encontró el inventario, se actualizan los ingredientes, asignando valores predeterminados si faltan algunos campos
      const updatedIngredients = (data.ingredients || []).map(
        (ing: Ingredient) => ({
          ...ing,
          categoria: ing.categoria || "General",
          stock_minimo: ing.stock_minimo || 0,
          unidad: ing.unidad || "gr",
          fecha_actualizacion:
            ing.fecha_actualizacion || new Date().toISOString().split("T")[0],
        })
      );
      setIngredientes(updatedIngredients);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error loading inventory");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Update inventory (local state and Supabase)
  async function updateInventory(updated: Ingredient[]) {
    setIngredientes(updated);
    if (!userId) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("inventory")
        .update({ ingredients: updated })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating inventory:", error.message);
        toast.error("Error updating inventory", {
          description: error.message,
        });
      }
    } catch (err) {
      console.error("Unexpected error updating:", err);
      toast.error("Unexpected error updating inventory");
    } finally {
      setIsSaving(false);
    }
  }

  // Add a new ingredient to the array
  function addIngredient() {
    const newId =
      ingredientes.length > 0
        ? Math.max(...ingredientes.map((i) => i.id)) + 1
        : 1;
    const newIngredient: Ingredient = {
      id: newId,
      nombre: "New ingredient",
      cantidad: 0,
      preciopresentacion: 0,
      precioporgramo: 0,
      proveedor: "",
      categoria: "General",
      stock_minimo: 0,
      unidad: "gr",
      fecha_actualizacion: new Date().toISOString().split("T")[0],
    };
    const updated = [...ingredientes, newIngredient];
    updateInventory(updated);

    toast.success("Ingredient added", {
      description: "A new ingredient has been added to the inventory",
      icon: <PlusCircle className="h-5 w-5 text-green-500" />,
    });
  }

  // Remove an ingredient from the array
  function deleteIngredient(id: number) {
    const ingredientToDelete = ingredientes.find((ing) => ing.id === id);
    const updated = ingredientes.filter((ing) => ing.id !== id);
    updateInventory(updated);

    toast.success("Ingredient deleted", {
      description: `"${ingredientToDelete?.nombre}" has been removed from inventory`,
      icon: <Trash2 className="h-5 w-5 text-rose-500" />,
    });
  }

  // Update an ingredient and recalculate "precioporgramo" if needed
  function handleChange(id: number, field: keyof Ingredient, value: string) {
    const updated = ingredientes.map((ing) => {
      if (ing.id === id) {
        const newValue =
          field === "nombre" ||
          field === "proveedor" ||
          field === "categoria" ||
          field === "unidad" ||
          field === "fecha_actualizacion"
            ? value
            : Number(value);
        const updatedIng = { ...ing, [field]: newValue };

        if (field === "cantidad" || field === "preciopresentacion") {
          const newCantidad =
            field === "cantidad" ? Number(value) : ing.cantidad;
          const newPrecioPres =
            field === "preciopresentacion"
              ? Number(value)
              : ing.preciopresentacion;
          updatedIng.precioporgramo =
            newCantidad > 0 ? newPrecioPres / newCantidad : 0;
        }

        // Update modification date when changing important fields
        if (
          ["cantidad", "preciopresentacion", "proveedor"].includes(
            field as string
          )
        ) {
          updatedIng.fecha_actualizacion = new Date()
            .toISOString()
            .split("T")[0];
        }

        return updatedIng;
      }
      return ing;
    });
    updateInventory(updated);
  }

  // Export ingredients array to CSV
  function exportCSV() {
    let csv =
      "id,nombre,cantidad,preciopresentacion,precioporgramo,proveedor,categoria,stock_minimo,unidad,fecha_actualizacion\n";
    ingredientes.forEach((i) => {
      csv += `${i.id},"${i.nombre}",${i.cantidad},${i.preciopresentacion},${
        i.precioporgramo
      },"${i.proveedor}","${i.categoria || "General"}",${
        i.stock_minimo || 0
      },"${i.unidad || "gr"}","${i.fecha_actualizacion || ""}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Inventory exported", {
      description: "CSV file with all ingredients has been downloaded",
      icon: <FileDown className="h-5 w-5 text-blue-500" />,
    });
  }

  // Import ingredients from a CSV file and update the entire array using upsert
  async function importCSV() {
    if (!importFile) {
      toast.error("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length < 2) {
          toast.error("CSV file doesn't have enough information");
          return;
        }
        const importedIngredients: Ingredient[] = [];
        try {
          // Skip header (index 0)
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(",");
            if (columns.length >= 6) {
              const id = Number(columns[0].trim());
              const nombre = columns[1].trim().replace(/^"|"$/g, "");
              const cantidad = Number(columns[2].trim());
              const preciopresentacion = Number(columns[3].trim());
              const precioporgramo =
                cantidad > 0 ? preciopresentacion / cantidad : 0;
              const proveedor = columns[5].trim().replace(/^"|"$/g, "");
              const categoria =
                columns.length > 6
                  ? columns[6].trim().replace(/^"|"$/g, "")
                  : "General";
              const stock_minimo =
                columns.length > 7 ? Number(columns[7].trim()) : 0;
              const unidad =
                columns.length > 8
                  ? columns[8].trim().replace(/^"|"$/g, "")
                  : "gr";
              const fecha_actualizacion =
                columns.length > 9
                  ? columns[9].trim().replace(/^"|"$/g, "")
                  : new Date().toISOString().split("T")[0];

              importedIngredients.push({
                id,
                nombre,
                cantidad,
                preciopresentacion,
                precioporgramo,
                proveedor,
                categoria,
                stock_minimo,
                unidad,
                fecha_actualizacion,
              });
            } else {
              console.warn(`Invalid line: ${lines[i]}`);
            }
          }
          // Update the entire inventory in a single operation
          updateInventory(importedIngredients);
          setShowImportDialog(false);
          setImportFile(null);

          toast.success("CSV imported successfully", {
            description: `${importedIngredients.length} ingredients imported`,
            icon: <FileUp className="h-5 w-5 text-green-500" />,
          });
        } catch (error) {
          console.error("Error importing CSV:", error);
          toast.error("Error processing CSV file", {
            description: "Check the file format and try again",
          });
        }
      }
    };
    reader.readAsText(importFile);
  }

  // Function to sort ingredients
  const requestSort = (key: keyof Ingredient) => {
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

  const sortedIngredientes = [...ingredientes];
  if (sortConfig !== null) {
    sortedIngredientes.sort((a, b) => {
      if (a[sortConfig.key]! < b[sortConfig.key]!) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key]! > b[sortConfig.key]!) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  // Filter ingredients by search, category, and advanced filters
  const filteredIngredientes = sortedIngredientes.filter((ing) => {
    const matchesSearch =
      ing.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.proveedor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      activeFilter === "todos" ||
      (activeFilter === "stock_bajo"
        ? ing.cantidad <= (ing.stock_minimo || 0)
        : ing.categoria === activeFilter);

    const matchesProveedor =
      !proveedorFilter || ing.proveedor === proveedorFilter;

    return matchesSearch && matchesCategory && matchesProveedor;
  });

  // Calculate inventory statistics
  const totalIngredientes = ingredientes.length;
  const ingredientesBajoStock = ingredientes.filter(
    (ing) => ing.cantidad <= (ing.stock_minimo || 0)
  ).length;
  const valorTotalInventario = ingredientes.reduce(
    (sum, ing) => sum + ing.preciopresentacion,
    0
  );

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                <Package className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Ingredients
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIngredientes}</div>
            <p className="mt-1 text-xs text-zinc-400">
              {categorias.length} different categories
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-600 to-pink-600">
                <AlertCircle className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Low Stock
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredientesBajoStock}</div>
            <p className="mt-1 text-xs text-rose-400">
              {ingredientesBajoStock > 0
                ? "Requires attention"
                : "All in order"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-dollar-sign"
                  aria-hidden="true"
                >
                  <line x1="12" x2="12" y1="2" y2="22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Value
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valorTotalInventario.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Inventory investment</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-2 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold">
                Ingredient Inventory
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your inventory of ingredients and raw materials
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={addIngredient}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <PlusCircle size={16} className="mr-1" />
                Add Ingredient
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  >
                    <FileDown size={16} className="mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                  <DropdownMenuItem
                    onClick={exportCSV}
                    className="hover:bg-zinc-800 cursor-pointer"
                  >
                    <FileDown size={16} className="mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                onClick={() => setShowImportDialog(true)}
              >
                <FileUp size={16} className="mr-1" />
                Import
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchInventory()}
                      className="text-zinc-400 hover:text-white"
                      aria-label="Refresh inventory"
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh inventory</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="todos" className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="w-full md:w-auto overflow-x-auto">
                <TabsList className="bg-zinc-800 p-1">
                  <TabsTrigger
                    value="todos"
                    onClick={() => setActiveFilter("todos")}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="stock_bajo"
                    onClick={() => setActiveFilter("stock_bajo")}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    Low Stock
                  </TabsTrigger>
                  {categorias.map((cat) => (
                    <TabsTrigger
                      key={cat}
                      value={cat}
                      onClick={() => setActiveFilter(cat)}
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                    >
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex w-full md:w-auto gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                    aria-hidden="true"
                  />
                  <Input
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                    aria-label="Search ingredients"
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "border-zinc-700 bg-zinc-800 hover:bg-zinc-700",
                          showFilters &&
                            "bg-purple-900/20 border-purple-500/50 text-purple-400"
                        )}
                        aria-label="Advanced filters"
                        aria-expanded={showFilters}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Advanced filters</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 mb-4">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-zinc-300"
                    id="supplier-filter-label"
                  >
                    Supplier
                  </label>
                  <Select
                    value={proveedorFilter || "todos"}
                    onValueChange={(value) =>
                      setProveedorFilter(value === "todos" ? null : value)
                    }
                    aria-labelledby="supplier-filter-label"
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="All suppliers" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="todos">All suppliers</SelectItem>
                      {proveedores.map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 w-full"
                    onClick={() => {
                      setProveedorFilter(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear filters
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("nombre")}
                        aria-label="Sort by name"
                      >
                        Name
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("cantidad")}
                        aria-label="Sort by quantity"
                      >
                        Quantity
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("preciopresentacion")}
                        aria-label="Sort by presentation price"
                      >
                        Presentation Price
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("precioporgramo")}
                        aria-label="Sort by price per gram"
                      >
                        Price per Gram
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("categoria")}
                        aria-label="Sort by category"
                      >
                        Category
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("proveedor")}
                        aria-label="Sort by supplier"
                      >
                        Supplier
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                      <button
                        className="flex items-center cursor-pointer"
                        onClick={() => requestSort("stock_minimo")}
                        aria-label="Sort by minimum stock"
                      >
                        Minimum Stock
                        <ArrowUpDown
                          className="ml-1 h-3 w-3"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center font-medium text-zinc-400">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="border-zinc-800">
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                        <TableCell className="px-4 py-2 text-center">
                          <Skeleton className="h-10 w-10 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredIngredientes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-zinc-400"
                      >
                        {searchTerm ? (
                          <div className="flex flex-col items-center justify-center">
                            <Search
                              className="h-8 w-8 mb-2 text-zinc-500"
                              aria-hidden="true"
                            />
                            <p>No ingredients found matching "{searchTerm}"</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Package
                              className="h-8 w-8 mb-2 text-zinc-500"
                              aria-hidden="true"
                            />
                            <p>No ingredients in inventory</p>
                            <Button
                              onClick={addIngredient}
                              variant="link"
                              className="mt-2 text-purple-400"
                            >
                              Add an ingredient
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIngredientes.map((ing) => (
                      <TableRow
                        key={ing.id}
                        className="border-zinc-800 hover:bg-zinc-800/50"
                      >
                        <TableCell className="px-4 py-2">
                          <Input
                            value={ing.nombre}
                            onChange={(e) =>
                              handleChange(ing.id, "nombre", e.target.value)
                            }
                            className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                            aria-label={`Name of ${ing.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={ing.cantidad.toString()}
                              onChange={(e) =>
                                handleChange(ing.id, "cantidad", e.target.value)
                              }
                              className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                              aria-label={`Quantity of ${ing.nombre}`}
                            />
                            <Select
                              value={ing.unidad || "gr"}
                              onValueChange={(value: string) =>
                                handleChange(ing.id, "unidad", value)
                              }
                              aria-label={`Unit of ${ing.nombre}`}
                            >
                              <SelectTrigger className="w-20 bg-zinc-800 border-zinc-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="gr">gr</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="l">l</SelectItem>
                                <SelectItem value="unidad">unit</SelectItem>
                              </SelectContent>
                            </Select>
                            {ing.cantidad <= (ing.stock_minimo || 0) && (
                              <Badge className="bg-rose-500/20 text-rose-400">
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">$</span>
                            <Input
                              type="number"
                              value={ing.preciopresentacion.toString()}
                              onChange={(e) =>
                                handleChange(
                                  ing.id,
                                  "preciopresentacion",
                                  e.target.value
                                )
                              }
                              className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                              aria-label={`Presentation price of ${ing.nombre}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">$</span>
                            <Input
                              type="number"
                              value={ing.precioporgramo.toFixed(4)}
                              readOnly
                              className="bg-zinc-800/50 border-zinc-700 text-zinc-400"
                              aria-label={`Price per gram of ${ing.nombre}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Select
                            value={ing.categoria || "General"}
                            onValueChange={(value: string) =>
                              handleChange(ing.id, "categoria", value)
                            }
                            aria-label={`Category of ${ing.nombre}`}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Carnes">Meats</SelectItem>
                              <SelectItem value="Lácteos">Dairy</SelectItem>
                              <SelectItem value="Verduras">
                                Vegetables
                              </SelectItem>
                              <SelectItem value="Frutas">Fruits</SelectItem>
                              <SelectItem value="Secos">Dry Goods</SelectItem>
                              <SelectItem value="Especias">Spices</SelectItem>
                              <SelectItem value="Bebidas">Beverages</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Input
                            value={ing.proveedor}
                            onChange={(e) =>
                              handleChange(ing.id, "proveedor", e.target.value)
                            }
                            className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                            aria-label={`Supplier of ${ing.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={(ing.stock_minimo || 0).toString()}
                              onChange={(e) =>
                                handleChange(
                                  ing.id,
                                  "stock_minimo",
                                  e.target.value
                                )
                              }
                              className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                              aria-label={`Minimum stock of ${ing.nombre}`}
                            />
                            <span className="text-xs text-zinc-400">
                              {ing.unidad || "gr"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            onClick={() => deleteIngredient(ing.id)}
                            className="hover:bg-rose-500/10 hover:text-rose-400"
                            aria-label={`Delete ${ing.nombre}`}
                          >
                            <Trash2 size={16} className="text-zinc-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Import Inventory</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select a CSV file to import ingredients to inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">CSV File</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp
                    className="w-8 h-8 mb-3 text-zinc-400"
                    aria-hidden="true"
                  />
                  <p className="mb-2 text-sm text-zinc-400">
                    <span className="font-semibold">Click to select</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-zinc-500">CSV (*.csv)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  aria-label="Upload CSV file"
                />
              </label>
            </div>
            {importFile && (
              <p className="mt-2 text-sm text-zinc-300">
                Selected file:{" "}
                <span className="font-medium">{importFile.name}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={importCSV}
              disabled={!importFile}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saving indicator */}
      {isSaving && (
        <div
          className="fixed bottom-4 right-4 bg-zinc-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Saving changes...</span>
        </div>
      )}
    </div>
  );
}
