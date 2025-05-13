"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingCart,
  Search,
  Plus,
  ChevronRight,
  Calendar,
  Trash2,
  Edit,
  MoreHorizontal,
  Package,
  ArrowLeft,
  Save,
  Loader2,
  Filter,
  X,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  CreditCard,
  Truck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { Ingredient } from "./inventario";

// Tipos
interface PurchaseItem {
  id: string;
  purchase_id: string;
  ingrediente_id: number;
  ingrediente_nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  recibido: boolean;
}

interface Purchase {
  id: string;
  user_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  fecha_compra: string;
  fecha_recepcion?: string;
  total: number;
  estado: "pendiente" | "recibido" | "cancelado";
  notas?: string;
  comprobante?: string;
  metodo_pago: "efectivo" | "transferencia" | "crédito";
  items: PurchaseItem[];
}

interface Proveedor {
  id: string;
  nombre: string;
}

export default function Compras() {
  const [compras, setCompras] = useState<Purchase[]>([]);
  const [compraActual, setCompraActual] = useState<Purchase | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todas");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [compraToDelete, setCompraToDelete] = useState<string | null>(null);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  const [filtroAvanzado, setFiltroAvanzado] = useState(false);
  const [filtroProveedor, setFiltroProveedor] = useState<string | null>(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<Date | null>(null);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<Date | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Purchase;
    direction: "asc" | "desc";
  } | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PurchaseItem>>({
    ingrediente_id: 0,
    ingrediente_nombre: "",
    cantidad: 1,
    unidad: "gr",
    precio_unitario: 0,
    subtotal: 0,
    recibido: false,
  });
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showAddProveedorDialog, setShowAddProveedorDialog] = useState(false);
  const [newProveedor, setNewProveedor] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
  });
  const [showAddIngredienteDialog, setShowAddIngredienteDialog] =
    useState(false);
  const [newIngrediente, setNewIngrediente] = useState({
    nombre: "",
    cantidad: 0,
    unidad: "gr",
    precioporgramo: 0,
    preciopresentacion: 0,
    proveedor: "",
    categoria: "General",
    stock_minimo: 0,
  });

  // Obtiene el usuario actual
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

  // Cargar compras cuando tengamos el userId
  useEffect(() => {
    if (userId) {
      fetchCompras();
      fetchProveedores();
      fetchIngredientes();
    }
  }, [userId]);

  // Actualizar subtotal cuando cambia cantidad o precio unitario
  useEffect(() => {
    if (newItem.cantidad && newItem.precio_unitario) {
      setNewItem({
        ...newItem,
        subtotal: newItem.cantidad * newItem.precio_unitario,
      });
    }
  }, [newItem.cantidad, newItem.precio_unitario]);

  // Función para cargar compras desde Supabase
  const fetchCompras = useCallback(async () => {
    setIsLoading(true);
    try {
      // Obtener las cabeceras de compra
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", userId)
        .order("fecha_compra", { ascending: false });

      if (purchasesError) {
        console.error("Error al obtener compras:", purchasesError.message);
        toast.error("Error al cargar las compras", {
          description: purchasesError.message,
        });
        return;
      }

      // Para cada compra, obtener sus items
      const comprasConItems = await Promise.all(
        purchasesData.map(async (purchase) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from("purchase_items")
            .select("*")
            .eq("purchase_id", purchase.id);

          if (itemsError) {
            console.error(
              `Error al obtener items para compra ${purchase.id}:`,
              itemsError.message
            );
            return { ...purchase, items: [] };
          }

          return { ...purchase, items: itemsData || [] };
        })
      );

      setCompras(comprasConItems);
    } catch (err) {
      console.error("Error inesperado:", err);
      toast.error("Error inesperado al cargar las compras");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Función para cargar proveedores desde el inventario
  const fetchProveedores = useCallback(async () => {
    try {
      // Cambiamos .single() por .maybeSingle() para manejar el caso de que no exista el registro
      const { data, error } = await supabase
        .from("inventory")
        .select("ingredients")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error al obtener proveedores:", error.message);
        return;
      }

      // Si no hay datos, inicializamos un array vacío de proveedores
      if (!data) {
        setProveedores([]);
        return;
      }

      const inventarioActual = data.ingredients || [];

      // Extraer proveedores únicos del inventario
      const uniqueProveedores = Array.from(
        new Set(
          inventarioActual
            .filter((ing: Ingredient) => ing.proveedor)
            .map((ing: Ingredient) => ing.proveedor)
        )
      );

      const formattedProveedores = uniqueProveedores.map(
        (nombre: string, index) => ({
          id: `prov-${index + 1}`,
          nombre,
        })
      );

      setProveedores(formattedProveedores);
    } catch (err) {
      console.error("Error inesperado al cargar proveedores:", err);
    }
  }, [userId]);

  // Función para cargar ingredientes desde el inventario
  const fetchIngredientes = useCallback(async () => {
    try {
      // Cambiamos .single() por .maybeSingle() para manejar el caso de que no exista el registro
      const { data, error } = await supabase
        .from("inventory")
        .select("ingredients")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error al obtener ingredientes:", error.message);
        return;
      }

      // Si no hay datos, inicializamos un array vacío de ingredientes
      if (!data) {
        setIngredientes([]);
        return;
      }

      setIngredientes(data.ingredients || []);
    } catch (err) {
      console.error("Error inesperado al cargar ingredientes:", err);
    }
  }, [userId]);

  // Función para crear una nueva compra
  function crearNuevaCompra() {
    if (!userId) return;

    const nuevaCompra: Purchase = {
      id: crypto.randomUUID(),
      user_id: userId,
      proveedor_id: proveedores.length > 0 ? proveedores[0].id : "",
      proveedor_nombre:
        proveedores.length > 0
          ? proveedores[0].nombre
          : "Proveedor sin especificar",
      fecha_compra: new Date().toISOString(),
      total: 0,
      estado: "pendiente",
      metodo_pago: "efectivo",
      items: [],
    };

    setCompraActual(nuevaCompra);
    setModoEdicion(true);
    setVistaDetalle(true);
  }

  // Función para guardar una compra en Supabase
  async function guardarCompra(compra: Purchase) {
    if (!userId || !compra) return;

    setIsSaving(true);

    try {
      // Calcular el total basado en los items
      const total = compra.items.reduce((sum, item) => sum + item.subtotal, 0);
      const compraToSave = { ...compra, total };

      // Preparar datos para Supabase (sin los items)
      const { items, ...compraSinItems } = compraToSave;

      // Guardar la cabecera de la compra
      const { data: savedPurchase, error: purchaseError } = await supabase
        .from("purchases")
        .upsert(compraSinItems)
        .select()
        .single();

      if (purchaseError) {
        console.error("Error al guardar la compra:", purchaseError.message);
        toast.error("Error al guardar la compra", {
          description: purchaseError.message,
        });
        return;
      }

      // Guardar los items de la compra
      if (items.length > 0) {
        // Asegurarse de que todos los items tengan el purchase_id correcto
        const itemsToSave = items.map((item) => ({
          ...item,
          purchase_id: compra.id,
        }));

        // Primero eliminar los items existentes para evitar duplicados
        await supabase
          .from("purchase_items")
          .delete()
          .eq("purchase_id", compra.id);

        // Luego insertar los nuevos/actualizados
        const { error: itemsError } = await supabase
          .from("purchase_items")
          .insert(itemsToSave);

        if (itemsError) {
          console.error(
            "Error al guardar los items de la compra:",
            itemsError.message
          );
          toast.error("Error al guardar los items de la compra", {
            description: itemsError.message,
          });
          return;
        }
      }

      // Actualizar estado local
      setCompras((prevCompras) => {
        const index = prevCompras.findIndex((c) => c.id === compra.id);
        if (index >= 0) {
          // Actualizar compra existente
          const updatedCompras = [...prevCompras];
          updatedCompras[index] = compraToSave;
          return updatedCompras;
        } else {
          // Agregar nueva compra
          return [...prevCompras, compraToSave];
        }
      });

      toast.success("Compra guardada correctamente", {
        description: `La compra a "${compra.proveedor_nombre}" ha sido guardada`,
        icon: <Save className="h-5 w-5 text-green-500" />,
      });

      // Salir del modo edición
      setModoEdicion(false);
    } catch (err) {
      console.error("Error inesperado al guardar:", err);
      toast.error("Error inesperado al guardar la compra");
    } finally {
      setIsSaving(false);
    }
  }

  // Función para eliminar una compra
  async function eliminarCompra(id: string) {
    if (!userId) return;

    setIsDeleting(true);

    try {
      // Primero eliminar los items asociados
      const { error: itemsError } = await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", id);

      if (itemsError) {
        console.error(
          "Error al eliminar los items de la compra:",
          itemsError.message
        );
        toast.error("Error al eliminar los items de la compra", {
          description: itemsError.message,
        });
        return;
      }

      // Luego eliminar la cabecera de la compra
      const { error } = await supabase
        .from("purchases")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al eliminar la compra:", error.message);
        toast.error("Error al eliminar la compra", {
          description: error.message,
        });
        return;
      }

      // Actualizar estado local
      setCompras((prevCompras) => prevCompras.filter((c) => c.id !== id));

      toast.success("Compra eliminada correctamente", {
        icon: <Trash2 className="h-5 w-5 text-rose-500" />,
      });

      // Si estamos viendo la compra eliminada, volver a la lista
      if (compraActual?.id === id) {
        setCompraActual(null);
        setVistaDetalle(false);
      }

      // Cerrar diálogo de confirmación
      setShowDeleteDialog(false);
      setCompraToDelete(null);
    } catch (err) {
      console.error("Error inesperado al eliminar:", err);
      toast.error("Error inesperado al eliminar la compra");
    } finally {
      setIsDeleting(false);
    }
  }

  // Función para actualizar un campo de la compra actual
  function actualizarCampoCompra(campo: keyof Purchase, valor: any) {
    if (!compraActual) return;

    setCompraActual((prev) => {
      if (!prev) return null;
      return { ...prev, [campo]: valor };
    });
  }

  // Función para agregar un item a la compra actual
  function agregarItem(item: Partial<PurchaseItem>) {
    if (!compraActual) return;

    const nuevoItem: PurchaseItem = {
      id: crypto.randomUUID(),
      purchase_id: compraActual.id,
      ingrediente_id: item.ingrediente_id || 0,
      ingrediente_nombre: item.ingrediente_nombre || "",
      cantidad: item.cantidad || 0,
      unidad: item.unidad || "gr",
      precio_unitario: item.precio_unitario || 0,
      subtotal: item.subtotal || 0,
      recibido: item.recibido || false,
    };

    const nuevosItems = [...compraActual.items, nuevoItem];
    const nuevoTotal = nuevosItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    setCompraActual({
      ...compraActual,
      items: nuevosItems,
      total: nuevoTotal,
    });

    setShowAddItemDialog(false);
    setNewItem({
      ingrediente_id: 0,
      ingrediente_nombre: "",
      cantidad: 1,
      unidad: "gr",
      precio_unitario: 0,
      subtotal: 0,
      recibido: false,
    });

    toast.success("Item agregado", {
      description: `Se ha añadido "${nuevoItem.ingrediente_nombre}" a la compra`,
    });
  }

  // Función para actualizar un item
  function actualizarItem(id: string, campo: keyof PurchaseItem, valor: any) {
    if (!compraActual) return;

    const itemsActualizados = compraActual.items.map((item) => {
      if (item.id === id) {
        const itemActualizado = { ...item, [campo]: valor };

        // Si se actualiza cantidad o precio, recalcular subtotal
        if (campo === "cantidad" || campo === "precio_unitario") {
          itemActualizado.subtotal =
            itemActualizado.cantidad * itemActualizado.precio_unitario;
        }

        return itemActualizado;
      }
      return item;
    });

    const nuevoTotal = itemsActualizados.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    setCompraActual({
      ...compraActual,
      items: itemsActualizados,
      total: nuevoTotal,
    });
  }

  // Función para eliminar un item
  function eliminarItem(id: string) {
    if (!compraActual) return;

    const itemsFiltrados = compraActual.items.filter((item) => item.id !== id);
    const nuevoTotal = itemsFiltrados.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    setCompraActual({
      ...compraActual,
      items: itemsFiltrados,
      total: nuevoTotal,
    });

    toast.success("Item eliminado", {
      description: "Se ha eliminado el item de la compra",
      icon: <Trash2 className="h-5 w-5 text-rose-500" />,
    });
  }

  // Función para recibir una compra
  async function recibirCompra(compra: Purchase) {
    if (!userId || !compra) return;

    setIsSaving(true);

    try {
      // Actualizar el estado de la compra a "recibido"
      const compraActualizada = {
        ...compra,
        estado: "recibido" as const,
        fecha_recepcion: new Date().toISOString(),
      };

      // Actualizar la compra en Supabase
      const { error: purchaseError } = await supabase
        .from("purchases")
        .update({
          estado: compraActualizada.estado,
          fecha_recepcion: compraActualizada.fecha_recepcion,
        })
        .eq("id", compra.id)
        .eq("user_id", userId);

      if (purchaseError) {
        console.error("Error al actualizar la compra:", purchaseError.message);
        toast.error("Error al actualizar la compra", {
          description: purchaseError.message,
        });
        return;
      }

      // Marcar todos los items como recibidos
      const itemsActualizados = compra.items.map((item) => ({
        ...item,
        recibido: true,
      }));

      // Actualizar los items en Supabase
      const { error: itemsError } = await supabase
        .from("purchase_items")
        .upsert(itemsActualizados);

      if (itemsError) {
        console.error("Error al actualizar los items:", itemsError.message);
        toast.error("Error al actualizar los items", {
          description: itemsError.message,
        });
        return;
      }

      // Actualizar el inventario con los items recibidos
      await actualizarInventario(compra.items);

      // Actualizar estado local
      setCompras((prevCompras) =>
        prevCompras.map((c) => (c.id === compra.id ? compraActualizada : c))
      );

      if (compraActual?.id === compra.id) {
        setCompraActual(compraActualizada);
      }

      toast.success("Compra recibida correctamente", {
        description: "Los items han sido añadidos al inventario",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      });

      setShowReceiveDialog(false);
    } catch (err) {
      console.error("Error inesperado al recibir la compra:", err);
      toast.error("Error inesperado al recibir la compra");
    } finally {
      setIsSaving(false);
    }
  }

  // Función para actualizar el inventario con los items recibidos
  async function actualizarInventario(items: PurchaseItem[]) {
    try {
      // Obtener el inventario actual
      const { data, error } = await supabase
        .from("inventory")
        .select("ingredients")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error al obtener el inventario:", error.message);
        toast.error("Error al actualizar el inventario", {
          description: error.message,
        });
        return;
      }

      const inventarioActual = data?.ingredients || [];

      // Actualizar o agregar cada item al inventario
      items.forEach((item) => {
        const ingredienteIndex = inventarioActual.findIndex(
          (ing: Ingredient) => ing.id === item.ingrediente_id
        );

        if (ingredienteIndex >= 0) {
          // Actualizar ingrediente existente
          inventarioActual[ingredienteIndex] = {
            ...inventarioActual[ingredienteIndex],
            cantidad:
              inventarioActual[ingredienteIndex].cantidad + item.cantidad,
            preciopresentacion: item.precio_unitario * item.cantidad,
            precioporgramo: item.precio_unitario,
            fecha_actualizacion: new Date().toISOString().split("T")[0],
          };
        } else {
          // Agregar nuevo ingrediente
          const nuevoId =
            inventarioActual.length > 0
              ? Math.max(...inventarioActual.map((i: Ingredient) => i.id)) + 1
              : 1;

          inventarioActual.push({
            id: nuevoId,
            nombre: item.ingrediente_nombre,
            cantidad: item.cantidad,
            preciopresentacion: item.precio_unitario * item.cantidad,
            precioporgramo: item.precio_unitario,
            proveedor: compraActual?.proveedor_nombre || "",
            categoria: "General",
            stock_minimo: 0,
            unidad: item.unidad,
            fecha_actualizacion: new Date().toISOString().split("T")[0],
          });
        }
      });

      // Guardar el inventario actualizado o crear uno nuevo si no existe
      const { error: updateError } = await supabase.from("inventory").upsert({
        user_id: userId,
        ingredients: inventarioActual,
      });

      if (updateError) {
        console.error(
          "Error al actualizar el inventario:",
          updateError.message
        );
        toast.error("Error al actualizar el inventario", {
          description: updateError.message,
        });
      }
    } catch (err) {
      console.error("Error inesperado al actualizar el inventario:", err);
      toast.error("Error inesperado al actualizar el inventario");
    }
  }

  // Función para cancelar una compra
  async function cancelarCompra(compra: Purchase) {
    if (!userId || !compra) return;

    setIsSaving(true);

    try {
      // Actualizar el estado de la compra a "cancelado"
      const compraActualizada = {
        ...compra,
        estado: "cancelado" as const,
      };

      // Actualizar la compra en Supabase
      const { error } = await supabase
        .from("purchases")
        .update({ estado: compraActualizada.estado })
        .eq("id", compra.id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al cancelar la compra:", error.message);
        toast.error("Error al cancelar la compra", {
          description: error.message,
        });
        return;
      }

      // Actualizar estado local
      setCompras((prevCompras) =>
        prevCompras.map((c) => (c.id === compra.id ? compraActualizada : c))
      );

      if (compraActual?.id === compra.id) {
        setCompraActual(compraActualizada);
      }

      toast.success("Compra cancelada correctamente", {
        icon: <XCircle className="h-5 w-5 text-rose-500" />,
      });
    } catch (err) {
      console.error("Error inesperado al cancelar la compra:", err);
      toast.error("Error inesperado al cancelar la compra");
    } finally {
      setIsSaving(false);
    }
  }

  // Función para ordenar compras
  const requestSort = (key: keyof Purchase) => {
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

  // Aplicar ordenamiento a las compras
  const sortedCompras = [...compras];
  if (sortConfig !== null) {
    sortedCompras.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  // Filtrar compras según búsqueda, estado y filtros avanzados
  const comprasFiltradas = sortedCompras.filter((compra) => {
    // Filtro de búsqueda
    const matchesSearch =
      compra.proveedor_nombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (compra.comprobante &&
        compra.comprobante.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (compra.notas &&
        compra.notas.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro de estado
    const matchesEstado =
      estadoFiltro === "todas" || compra.estado === estadoFiltro;

    // Filtros avanzados
    const matchesProveedor =
      !filtroProveedor || compra.proveedor_id === filtroProveedor;

    // Filtro de fechas
    const fechaCompra = new Date(compra.fecha_compra);
    const matchesFechaDesde =
      !filtroFechaDesde || fechaCompra >= filtroFechaDesde;
    const matchesFechaHasta =
      !filtroFechaHasta || fechaCompra <= filtroFechaHasta;

    return (
      matchesSearch &&
      matchesEstado &&
      matchesProveedor &&
      matchesFechaDesde &&
      matchesFechaHasta
    );
  });

  // Calcular estadísticas
  const totalCompras = compras.length;
  const comprasPendientes = compras.filter(
    (c) => c.estado === "pendiente"
  ).length;
  const comprasRecibidas = compras.filter(
    (c) => c.estado === "recibido"
  ).length;
  const valorTotalCompras = compras.reduce((sum, c) => sum + c.total, 0);

  // Renderizar vista de lista de compras
  const renderListaCompras = () => (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto overflow-x-auto">
            <Tabs defaultValue="todas" className="w-full">
              <TabsList className="bg-zinc-800 p-1">
                <TabsTrigger
                  value="todas"
                  onClick={() => setEstadoFiltro("todas")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="pendiente"
                  onClick={() => setEstadoFiltro("pendiente")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Pendientes
                </TabsTrigger>
                <TabsTrigger
                  value="recibido"
                  onClick={() => setEstadoFiltro("recibido")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Recibidas
                </TabsTrigger>
                <TabsTrigger
                  value="cancelado"
                  onClick={() => setEstadoFiltro("cancelado")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Canceladas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar compras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFiltroAvanzado(!filtroAvanzado)}
                    className={cn(
                      "border-zinc-700 bg-zinc-800 hover:bg-zinc-700",
                      filtroAvanzado &&
                        "bg-purple-900/20 border-purple-500/50 text-purple-400"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filtros avanzados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filtros avanzados */}
        {filtroAvanzado && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Proveedor
              </label>
              <Select
                value={filtroProveedor || "todos"}
                onValueChange={(value) =>
                  setFiltroProveedor(value === "todos" ? null : value)
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="todos">Todos los proveedores</SelectItem>
                  {proveedores.map((prov) => (
                    <SelectItem key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                      !filtroFechaDesde && "text-zinc-500"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filtroFechaDesde
                      ? format(filtroFechaDesde, "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                  <CalendarComponent
                    mode="single"
                    selected={filtroFechaDesde}
                    onSelect={setFiltroFechaDesde}
                    initialFocus
                    className="bg-zinc-900"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700",
                      !filtroFechaHasta && "text-zinc-500"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filtroFechaHasta
                      ? format(filtroFechaHasta, "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                  <CalendarComponent
                    mode="single"
                    selected={filtroFechaHasta}
                    onSelect={setFiltroFechaHasta}
                    initialFocus
                    className="bg-zinc-900"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 w-full"
                onClick={() => {
                  setFiltroProveedor(null);
                  setFiltroFechaDesde(null);
                  setFiltroFechaHasta(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Compras
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompras}</div>
            <p className="mt-1 text-xs text-zinc-400">
              {compras.length > 0
                ? `Última: ${format(
                    new Date(compras[0].fecha_compra),
                    "dd/MM/yyyy"
                  )}`
                : "Sin compras"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-yellow-600">
                <Clock className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Pendientes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comprasPendientes}</div>
            <p className="mt-1 text-xs text-amber-400">
              {comprasPendientes > 0 ? "Requieren atención" : "Todo en orden"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-medium text-zinc-400">
                Recibidas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comprasRecibidas}</div>
            <p className="mt-1 text-xs text-zinc-400">
              {comprasRecibidas > 0
                ? `${((comprasRecibidas / totalCompras) * 100).toFixed(
                    0
                  )}% del total`
                : "Sin compras recibidas"}
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
                Valor Total
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valorTotalCompras.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Inversión en compras</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de compras */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-6 w-1/4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : comprasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ShoppingCart className="h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">
            No se encontraron compras
          </h3>
          <p className="text-zinc-400 mb-6 max-w-md">
            {searchTerm
              ? `No hay resultados para "${searchTerm}"`
              : estadoFiltro !== "todas"
              ? `No hay compras con estado "${estadoFiltro}"`
              : "Comienza registrando tu primera compra"}
          </p>
          <Button
            onClick={crearNuevaCompra}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear nueva compra
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {comprasFiltradas.map((compra) => (
            <Card
              key={compra.id}
              className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      {compra.proveedor_nombre}
                      {compra.comprobante && (
                        <Badge
                          variant="outline"
                          className="ml-2 bg-zinc-800/50 border-zinc-700"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {compra.comprobante}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      {format(new Date(compra.fecha_compra), "PPP", {
                        locale: es,
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "px-2 py-1",
                        compra.estado === "pendiente" &&
                          "bg-amber-500/20 text-amber-400",
                        compra.estado === "recibido" &&
                          "bg-green-500/20 text-green-400",
                        compra.estado === "cancelado" &&
                          "bg-rose-500/20 text-rose-400"
                      )}
                    >
                      {compra.estado === "pendiente" && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {compra.estado === "recibido" && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {compra.estado === "cancelado" && (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {compra.estado === "pendiente" && "Pendiente"}
                      {compra.estado === "recibido" && "Recibido"}
                      {compra.estado === "cancelado" && "Cancelado"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-zinc-800/50 border-zinc-700"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />$
                      {compra.total.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 border-zinc-700"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {compra.items.length}{" "}
                    {compra.items.length === 1 ? "item" : "items"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 border-zinc-700"
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    {compra.metodo_pago}
                  </Badge>
                  {compra.fecha_recepcion && (
                    <Badge
                      variant="outline"
                      className="bg-zinc-800/50 border-zinc-700"
                    >
                      <Truck className="h-3 w-3 mr-1" />
                      Recibido:{" "}
                      {format(new Date(compra.fecha_recepcion), "dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
                {compra.notas && (
                  <p className="text-sm text-zinc-400 line-clamp-1">
                    <span className="font-medium">Notas:</span> {compra.notas}
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <div className="text-xs text-zinc-500">
                  {format(new Date(compra.fecha_compra), "dd/MM/yyyy HH:mm")}
                </div>
                <div className="flex gap-2">
                  {compra.estado === "pendiente" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-700 bg-green-900/20 text-green-400 hover:bg-green-900/30 hover:text-green-300"
                            onClick={() => {
                              setCompraActual(compra);
                              setShowReceiveDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Recibir
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Marcar como recibida y actualizar inventario</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                    onClick={() => {
                      setCompraActual(compra);
                      setModoEdicion(false);
                      setVistaDetalle(true);
                    }}
                  >
                    Ver detalles
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Renderizar vista detallada de una compra
  const renderDetalleCompra = () => {
    if (!compraActual) return null;

    return (
      <div className="space-y-6">
        {/* Botón para volver a la lista */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => {
            setVistaDetalle(false);
            setCompraActual(null);
            setModoEdicion(false);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a compras
        </Button>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2 border-b border-zinc-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {modoEdicion ? (
                <div className="w-full">
                  <div className="flex flex-col md:flex-row gap-4 mb-4 w-full">
                    <div className="flex-1">
                      <label className="text-sm text-zinc-400 mb-1 block">
                        Proveedor
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={compraActual.proveedor_id}
                            onValueChange={(value) => {
                              const proveedor = proveedores.find(
                                (p) => p.id === value
                              );
                              actualizarCampoCompra("proveedor_id", value);
                              actualizarCampoCompra(
                                "proveedor_nombre",
                                proveedor?.nombre || ""
                              );
                            }}
                          >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              {proveedores.map((prov) => (
                                <SelectItem key={prov.id} value={prov.id}>
                                  {prov.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                          onClick={() => setShowAddProveedorDialog(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-zinc-400 mb-1 block">
                        Fecha de compra
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-zinc-800 border-zinc-700"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(
                              new Date(compraActual.fecha_compra),
                              "PPP",
                              { locale: es }
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                          <CalendarComponent
                            mode="single"
                            selected={new Date(compraActual.fecha_compra)}
                            onSelect={(date) =>
                              date &&
                              actualizarCampoCompra(
                                "fecha_compra",
                                date.toISOString()
                              )
                            }
                            initialFocus
                            className="bg-zinc-900"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex-1">
                      <label className="text-sm text-zinc-400 mb-1 block">
                        Comprobante
                      </label>
                      <Input
                        placeholder="Número de factura o comprobante"
                        className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                        onChange={(e) =>
                          actualizarCampoCompra("comprobante", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-zinc-400 mb-1 block">
                        Método de pago
                      </label>
                      <Select
                        value={compraActual.metodo_pago}
                        onValueChange={(value) =>
                          actualizarCampoCompra("metodo_pago", value as any)
                        }
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">
                            Transferencia
                          </SelectItem>
                          <SelectItem value="crédito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    {compraActual.proveedor_nombre}
                    <Badge
                      className={cn(
                        "ml-2",
                        compraActual.estado === "pendiente" &&
                          "bg-amber-500/20 text-amber-400",
                        compraActual.estado === "recibido" &&
                          "bg-green-500/20 text-green-400",
                        compraActual.estado === "cancelado" &&
                          "bg-rose-500/20 text-rose-400"
                      )}
                    >
                      {compraActual.estado === "pendiente" && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {compraActual.estado === "recibido" && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {compraActual.estado === "cancelado" && (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {compraActual.estado === "pendiente" && "Pendiente"}
                      {compraActual.estado === "recibido" && "Recibido"}
                      {compraActual.estado === "cancelado" && "Cancelado"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {format(new Date(compraActual.fecha_compra), "PPP", {
                      locale: es,
                    })}
                    {compraActual.comprobante && (
                      <span className="ml-2">
                        | Comprobante:{" "}
                        <span className="font-medium">
                          {compraActual.comprobante}
                        </span>
                      </span>
                    )}
                    <span className="ml-2">
                      | Método de pago:{" "}
                      <span className="font-medium">
                        {compraActual.metodo_pago}
                      </span>
                    </span>
                  </CardDescription>
                </div>
              )}

              <div className="flex gap-2">
                {modoEdicion ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      onClick={() => {
                        setModoEdicion(false);
                        // Recargar la compra original si existe
                        if (
                          compraActual.id &&
                          compras.find((c) => c.id === compraActual.id)
                        ) {
                          setCompraActual(
                            compras.find((c) => c.id === compraActual.id) ||
                              null
                          );
                        } else {
                          setCompraActual(null);
                          setVistaDetalle(false);
                        }
                      }}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      onClick={() => guardarCompra(compraActual)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {compraActual.estado === "pendiente" && (
                      <>
                        <Button
                          variant="outline"
                          className="border-green-700 bg-green-900/20 text-green-400 hover:bg-green-900/30 hover:text-green-300"
                          onClick={() => setShowReceiveDialog(true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Recibir
                        </Button>
                        <Button
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                          onClick={() => setModoEdicion(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-zinc-800"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                        {compraActual.estado === "pendiente" && (
                          <DropdownMenuItem
                            className="hover:bg-zinc-800 cursor-pointer text-rose-400 hover:text-rose-300"
                            onClick={() => cancelarCompra(compraActual)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar compra
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="hover:bg-zinc-800 cursor-pointer text-rose-400 hover:text-rose-300"
                          onClick={() => {
                            setCompraToDelete(compraActual.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Notas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notas</h3>
                {modoEdicion ? (
                  <Textarea
                    value={compraActual.notas || ""}
                    onChange={(e) =>
                      actualizarCampoCompra("notas", e.target.value)
                    }
                    placeholder="Añade notas o comentarios sobre esta compra..."
                    className="h-24 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  />
                ) : (
                  <div className="p-4 rounded-md bg-zinc-800/50 border border-zinc-800">
                    {compraActual.notas ? (
                      <p className="text-zinc-300">{compraActual.notas}</p>
                    ) : (
                      <p className="text-zinc-500 italic">
                        No hay notas adicionales
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Items de la compra */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Items de la compra</h3>
                  {modoEdicion && compraActual.estado === "pendiente" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      onClick={() => setShowAddItemDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir item
                    </Button>
                  )}
                </div>

                {compraActual.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Package className="h-8 w-8 text-zinc-500 mb-2" />
                    <p className="text-zinc-400 mb-2">
                      No hay items en esta compra
                    </p>
                    {modoEdicion && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                        onClick={() => setShowAddItemDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir item
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-800">
                          <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                            Ingrediente
                          </TableHead>
                          <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                            Cantidad
                          </TableHead>
                          <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                            Precio unitario
                          </TableHead>
                          <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                            Subtotal
                          </TableHead>
                          <TableHead className="px-4 py-3 text-left font-medium text-zinc-400">
                            Estado
                          </TableHead>
                          {modoEdicion && (
                            <TableHead className="px-4 py-3 text-center font-medium text-zinc-400">
                              Acciones
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compraActual.items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="border-zinc-800 hover:bg-zinc-800/50"
                          >
                            <TableCell className="px-4 py-2">
                              {modoEdicion ? (
                                <Select
                                  value={item.ingrediente_id.toString()}
                                  onValueChange={(value) => {
                                    const ingrediente = ingredientes.find(
                                      (ing) => ing.id === Number.parseInt(value)
                                    );
                                    actualizarItem(
                                      item.id,
                                      "ingrediente_id",
                                      Number.parseInt(value)
                                    );
                                    actualizarItem(
                                      item.id,
                                      "ingrediente_nombre",
                                      ingrediente?.nombre || ""
                                    );
                                    actualizarItem(
                                      item.id,
                                      "unidad",
                                      ingrediente?.unidad || "gr"
                                    );
                                  }}
                                >
                                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Seleccionar ingrediente" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {ingredientes.map((ing) => (
                                      <SelectItem
                                        key={ing.id}
                                        value={ing.id.toString()}
                                      >
                                        {ing.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="font-medium">
                                  {item.ingrediente_nombre}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              {modoEdicion ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={item.cantidad.toString()}
                                    onChange={(e) =>
                                      actualizarItem(
                                        item.id,
                                        "cantidad",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-24 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  />
                                  <Select
                                    value={item.unidad}
                                    onValueChange={(value) =>
                                      actualizarItem(item.id, "unidad", value)
                                    }
                                  >
                                    <SelectTrigger className="w-20 bg-zinc-800 border-zinc-700">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                      <SelectItem value="gr">gr</SelectItem>
                                      <SelectItem value="kg">kg</SelectItem>
                                      <SelectItem value="ml">ml</SelectItem>
                                      <SelectItem value="l">l</SelectItem>
                                      <SelectItem value="unidad">
                                        unidad
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <span>
                                  {item.cantidad} {item.unidad}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              {modoEdicion ? (
                                <div className="flex items-center">
                                  <span className="mr-2">$</span>
                                  <Input
                                    type="number"
                                    value={item.precio_unitario.toString()}
                                    onChange={(e) =>
                                      actualizarItem(
                                        item.id,
                                        "precio_unitario",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-24 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  />
                                </div>
                              ) : (
                                <span>${item.precio_unitario.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              <span className="font-medium">
                                ${item.subtotal.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-2">
                              {modoEdicion ? (
                                <Select
                                  value={
                                    item.recibido ? "recibido" : "pendiente"
                                  }
                                  onValueChange={(value) =>
                                    actualizarItem(
                                      item.id,
                                      "recibido",
                                      value === "recibido"
                                    )
                                  }
                                >
                                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800">
                                    <SelectItem value="pendiente">
                                      Pendiente
                                    </SelectItem>
                                    <SelectItem value="recibido">
                                      Recibido
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge
                                  className={cn(
                                    item.recibido
                                      ? "bg-green-500/20 text-green-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  )}
                                >
                                  {item.recibido ? (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {item.recibido ? "Recibido" : "Pendiente"}
                                </Badge>
                              )}
                            </TableCell>
                            {modoEdicion && (
                              <TableCell className="px-4 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => eliminarItem(item.id)}
                                  className="hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 border-zinc-700">
                          <TableCell
                            colSpan={3}
                            className="px-4 py-2 text-right font-medium"
                          >
                            Total:
                          </TableCell>
                          <TableCell className="px-4 py-2 font-bold text-lg">
                            ${compraActual.total.toFixed(2)}
                          </TableCell>
                          <TableCell colSpan={modoEdicion ? 2 : 1}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Función para guardar un nuevo proveedor
  async function guardarNuevoProveedor() {
    if (!userId || !newProveedor.nombre) return;

    try {
      // Crear un ID único para el proveedor
      const proveedorId = `prov-${Date.now()}`;

      // Añadir el proveedor a la lista local
      const nuevoProveedor = {
        id: proveedorId,
        nombre: newProveedor.nombre,
        contacto: newProveedor.contacto,
        telefono: newProveedor.telefono,
      };

      setProveedores([...proveedores, nuevoProveedor]);

      // Si estamos en modo edición, actualizar el proveedor de la compra actual
      if (compraActual && modoEdicion) {
        actualizarCampoCompra("proveedor_id", proveedorId);
        actualizarCampoCompra("proveedor_nombre", nuevoProveedor.nombre);
      }

      // Limpiar el formulario
      setNewProveedor({ nombre: "", contacto: "", telefono: "" });
      setShowAddProveedorDialog(false);

      toast.success("Proveedor añadido correctamente", {
        description: `Se ha añadido "${nuevoProveedor.nombre}" a la lista de proveedores`,
      });
    } catch (err) {
      console.error("Error al guardar el proveedor:", err);
      toast.error("Error al guardar el proveedor");
    }
  }

  // Función para guardar un nuevo ingrediente
  async function guardarNuevoIngrediente() {
    if (!userId || !newIngrediente.nombre) return;

    try {
      // Obtener el inventario actual
      const { data, error } = await supabase
        .from("inventory")
        .select("ingredients")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 es el código para "no se encontraron resultados"
        console.error("Error al obtener el inventario:", error.message);
        toast.error("Error al actualizar el inventario", {
          description: error.message,
        });
        return;
      }

      // Si no hay datos, crear un nuevo registro
      const inventarioActual = data?.ingredients || [];

      // Crear un nuevo ID para el ingrediente
      const nuevoId =
        inventarioActual.length > 0
          ? Math.max(...inventarioActual.map((i: Ingredient) => i.id)) + 1
          : 1;

      // Crear el nuevo ingrediente
      const ingrediente = {
        id: nuevoId,
        nombre: newIngrediente.nombre,
        cantidad: newIngrediente.cantidad,
        unidad: newIngrediente.unidad,
        precioporgramo: newIngrediente.precioporgramo,
        preciopresentacion: newIngrediente.preciopresentacion,
        proveedor: newIngrediente.proveedor,
        categoria: newIngrediente.categoria,
        stock_minimo: newIngrediente.stock_minimo,
        fecha_actualizacion: new Date().toISOString().split("T")[0],
      };

      // Añadir el ingrediente al inventario
      inventarioActual.push(ingrediente);

      // Guardar el inventario actualizado o crear uno nuevo si no existe
      const { error: updateError } = await supabase.from("inventory").upsert({
        user_id: userId,
        ingredients: inventarioActual,
      });

      if (updateError) {
        console.error(
          "Error al actualizar el inventario:",
          updateError.message
        );
        toast.error("Error al actualizar el inventario", {
          description: updateError.message,
        });
        return;
      }

      // Actualizar la lista local de ingredientes
      setIngredientes([...ingredientes, ingrediente]);

      // Si estamos añadiendo un item a la compra, seleccionar este ingrediente
      if (showAddItemDialog) {
        setNewItem({
          ...newItem,
          ingrediente_id: nuevoId,
          ingrediente_nombre: newIngrediente.nombre,
          unidad: newIngrediente.unidad,
          precio_unitario: newIngrediente.precioporgramo,
        });
      }

      // Limpiar el formulario
      setNewIngrediente({
        nombre: "",
        cantidad: 0,
        unidad: "gr",
        precioporgramo: 0,
        preciopresentacion: 0,
        proveedor: "",
        categoria: "General",
        stock_minimo: 0,
      });
      setShowAddIngredienteDialog(false);

      toast.success("Ingrediente añadido correctamente", {
        description: `Se ha añadido "${ingrediente.nombre}" al inventario`,
      });
    } catch (err) {
      console.error("Error al guardar el ingrediente:", err);
      toast.error("Error al guardar el ingrediente");
    }
  }

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compras</h2>
          <p className="text-zinc-400">
            Gestiona tus compras de ingredientes y materias primas
          </p>
        </div>
        <Button
          onClick={crearNuevaCompra}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      {/* Contenido principal */}
      {!vistaDetalle && (
        <Card className="border-zinc-800 bg-zinc-900/50 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Gestión de Compras</CardTitle>
            <CardDescription>
              Este módulo te permite gestionar todo el ciclo de compras de
              ingredientes y materias primas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-purple-400" /> Registro
                  de Compras
                </h3>
                <p className="text-sm text-zinc-400">
                  Crea y gestiona órdenes de compra con múltiples items.
                  Registra información como proveedor, fecha, método de pago y
                  comprobante.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-400" /> Recepción de
                  Mercancía
                </h3>
                <p className="text-sm text-zinc-400">
                  Marca las compras como recibidas para actualizar
                  automáticamente tu inventario con los nuevos ingredientes y
                  cantidades.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Plus className="h-5 w-5 text-purple-400" /> Nuevos Elementos
                </h3>
                <p className="text-sm text-zinc-400">
                  Puedes crear nuevos proveedores e ingredientes directamente
                  desde esta sección sin necesidad de ir al módulo de
                  inventario.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {vistaDetalle ? renderDetalleCompra() : renderListaCompras()}

      {/* Diálogo para añadir item */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Añadir item a la compra</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Selecciona un ingrediente existente o crea uno nuevo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Ingrediente</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  onClick={() => setShowAddIngredienteDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Nuevo
                </Button>
              </div>
              <Select
                value={newItem.ingrediente_id?.toString() || ""}
                onValueChange={(value) => {
                  const ingrediente = ingredientes.find(
                    (ing) => ing.id === Number.parseInt(value)
                  );
                  setNewItem({
                    ...newItem,
                    ingrediente_id: Number.parseInt(value),
                    ingrediente_nombre: ingrediente?.nombre || "",
                    unidad: ingrediente?.unidad || "gr",
                  });
                }}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Seleccionar ingrediente" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {ingredientes.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id.toString()}>
                      {ing.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={newItem.cantidad?.toString() || "1"}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        cantidad: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  />
                  <Select
                    value={newItem.unidad || "gr"}
                    onValueChange={(value) =>
                      setNewItem({ ...newItem, unidad: value })
                    }
                  >
                    <SelectTrigger className="w-24 bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="gr">gr</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="unidad">unidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio unitario</label>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <Input
                    type="number"
                    value={newItem.precio_unitario?.toString() || "0"}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        precio_unitario: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subtotal</label>
              <div className="p-2 rounded bg-zinc-800/50 border border-zinc-700 flex items-center">
                <span className="mr-2">$</span>
                <span className="font-medium">
                  {(newItem.subtotal || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddItemDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => agregarItem(newItem)}
              disabled={
                !newItem.ingrediente_id ||
                !newItem.cantidad ||
                !newItem.precio_unitario
              }
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para recibir compra */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Recibir compra</DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que quieres marcar esta compra como recibida?
              Esto actualizará el inventario con los items de la compra.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Importante</p>
                  <p className="text-sm mt-1">
                    Al recibir la compra, todos los items serán añadidos al
                    inventario. Si un ingrediente ya existe, se actualizará su
                    cantidad y precio.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiveDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => compraActual && recibirCompra(compraActual)}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar recepción
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Eliminar compra</DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que quieres eliminar esta compra? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-zinc-700"
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => compraToDelete && eliminarCompra(compraToDelete)}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para añadir proveedor */}
      <Dialog
        open={showAddProveedorDialog}
        onOpenChange={setShowAddProveedorDialog}
      >
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Añadir nuevo proveedor</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Completa la información del nuevo proveedor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre del proveedor *
              </label>
              <Input
                value={newProveedor.nombre}
                onChange={(e) =>
                  setNewProveedor({ ...newProveedor, nombre: e.target.value })
                }
                placeholder="Nombre del proveedor"
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contacto</label>
              <Input
                value={newProveedor.contacto}
                onChange={(e) =>
                  setNewProveedor({ ...newProveedor, contacto: e.target.value })
                }
                placeholder="Nombre del contacto"
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={newProveedor.telefono}
                onChange={(e) =>
                  setNewProveedor({ ...newProveedor, telefono: e.target.value })
                }
                placeholder="Número de teléfono"
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddProveedorDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarNuevoProveedor}
              disabled={!newProveedor.nombre}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para añadir ingrediente */}
      <Dialog
        open={showAddIngredienteDialog}
        onOpenChange={setShowAddIngredienteDialog}
      >
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Añadir nuevo ingrediente</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Completa la información del nuevo ingrediente para el inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre del ingrediente *
              </label>
              <Input
                value={newIngrediente.nombre}
                onChange={(e) =>
                  setNewIngrediente({
                    ...newIngrediente,
                    nombre: e.target.value,
                  })
                }
                placeholder="Nombre del ingrediente"
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad inicial</label>
                <Input
                  type="number"
                  value={newIngrediente.cantidad}
                  onChange={(e) =>
                    setNewIngrediente({
                      ...newIngrediente,
                      cantidad: Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unidad</label>
                <Select
                  value={newIngrediente.unidad}
                  onChange={(e) =>
                    setNewIngrediente({
                      ...newIngrediente,
                      unidad: e.target.value,
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="gr">gr</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="unidad">unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio por unidad</label>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <Input
                    type="number"
                    value={newIngrediente.precioporgramo}
                    onChange={(e) => {
                      const precio = Number(e.target.value);
                      setNewIngrediente({
                        ...newIngrediente,
                        precioporgramo: precio,
                        preciopresentacion: precio * newIngrediente.cantidad,
                      });
                    }}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio total</label>
                <div className="flex items-center">
                  <span className="mr-2">$</span>
                  <Input
                    type="number"
                    value={newIngrediente.preciopresentacion}
                    onChange={(e) => {
                      const precioTotal = Number(e.target.value);
                      const cantidad = newIngrediente.cantidad || 1;
                      setNewIngrediente({
                        ...newIngrediente,
                        preciopresentacion: precioTotal,
                        precioporgramo: precioTotal / cantidad,
                      });
                    }}
                    placeholder="0.00"
                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select
                value={newIngrediente.proveedor}
                onValueChange={(value) =>
                  setNewIngrediente({ ...newIngrediente, proveedor: value })
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {proveedores.length > 0 ? (
                    proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={prov.nombre}>
                        {prov.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="sin-proveedor">
                      Sin proveedores disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={newIngrediente.categoria}
                  onChange={(e) =>
                    setNewIngrediente({
                      ...newIngrediente,
                      categoria: e.target.value,
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Lácteos">Lácteos</SelectItem>
                    <SelectItem value="Carnes">Carnes</SelectItem>
                    <SelectItem value="Frutas">Frutas</SelectItem>
                    <SelectItem value="Verduras">Verduras</SelectItem>
                    <SelectItem value="Granos">Granos</SelectItem>
                    <SelectItem value="Especias">Especias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock mínimo</label>
                <Input
                  type="number"
                  value={newIngrediente.stock_minimo}
                  onChange={(e) =>
                    setNewIngrediente({
                      ...newIngrediente,
                      stock_minimo: Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddIngredienteDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarNuevoIngrediente}
              disabled={!newIngrediente.nombre}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir ingrediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
