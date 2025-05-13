"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Search,
  Plus,
  ChevronRight,
  Clock,
  Users,
  Tag,
  Trash2,
  Edit,
  Star,
  MoreHorizontal,
  Utensils,
  Timer,
  ChefHat,
  ArrowLeft,
  ImageIcon,
  Save,
  Loader2,
  Filter,
  X,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Tipos
interface Ingrediente {
  id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface Paso {
  id: number;
  descripcion: string;
  tiempo?: number;
}

interface Receta {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string;
  tiempo_preparacion: number;
  tiempo_coccion: number;
  porciones: number;
  dificultad: "Fácil" | "Media" | "Difícil";
  categoria: string;
  ingredientes: Ingrediente[];
  pasos: Paso[];
  notas?: string;
  imagen?: string;
  favorita: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  costo_total?: number;
  costo_porcion?: number;
  tags?: string[];
}

export default function Recetas() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [recetaActual, setRecetaActual] = useState<Receta | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recetaToDelete, setRecetaToDelete] = useState<string | null>(null);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  const [filtroAvanzado, setFiltroAvanzado] = useState(false);
  const [filtroDificultad, setFiltroDificultad] = useState<string | null>(null);
  const [filtroTiempo, setFiltroTiempo] = useState<number | null>(null);

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

  // Cargar recetas cuando tengamos el userId
  useEffect(() => {
    if (userId) {
      fetchRecetas();
    }
  }, [userId]);

  // Función para cargar recetas desde Supabase
  const fetchRecetas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error al obtener recetas:", error.message);
        toast.error("Error al cargar las recetas", {
          description: error.message,
        });
        return;
      }

      // Transformar los datos si es necesario
      const recetasFormateadas: Receta[] = data.map((receta: any) => ({
        id: receta.id || crypto.randomUUID(),
        user_id: receta.user_id,
        nombre: receta.nombre_receta || receta.nombre || "Receta sin nombre",
        descripcion: receta.descripcion || "",
        tiempo_preparacion: receta.tiempo_preparacion || 0,
        tiempo_coccion: receta.tiempo_coccion || 0,
        porciones: receta.cantidades_producidas || receta.porciones || 1,
        dificultad: receta.dificultad || "Media",
        categoria: receta.categoria || "General",
        ingredientes: receta.ingredientes || [],
        pasos: receta.pasos || [],
        notas: receta.notas || "",
        imagen: receta.imagen || "",
        favorita: receta.favorita || false,
        fecha_creacion:
          receta.fecha_creacion ||
          receta.created_at ||
          new Date().toISOString(),
        fecha_actualizacion:
          receta.fecha_actualizacion ||
          receta.updated_at ||
          new Date().toISOString(),
        costo_total: receta.costo_total || 0,
        costo_porcion: receta.costo_porcion || 0,
        tags: receta.tags || [],
      }));

      setRecetas(recetasFormateadas);
    } catch (err) {
      console.error("Error inesperado:", err);
      toast.error("Error inesperado al cargar las recetas");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Función para crear una nueva receta
  function crearNuevaReceta() {
    if (!userId) return;

    const nuevaReceta: Receta = {
      id: crypto.randomUUID(),
      user_id: userId,
      nombre: "Nueva Receta",
      descripcion: "Descripción de la receta",
      tiempo_preparacion: 15,
      tiempo_coccion: 30,
      porciones: 4,
      dificultad: "Media",
      categoria: "General",
      ingredientes: [
        {
          id: 1,
          nombre: "Ingrediente 1",
          cantidad: 100,
          unidad: "gr",
        },
      ],
      pasos: [
        {
          id: 1,
          descripcion: "Paso 1 de la preparación",
          tiempo: 5,
        },
      ],
      notas: "",
      favorita: false,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      costo_total: 0,
      costo_porcion: 0,
      tags: ["Nueva"],
    };

    setRecetaActual(nuevaReceta);
    setModoEdicion(true);
    setVistaDetalle(true);
  }

  // Función para guardar una receta en Supabase
  async function guardarReceta(receta: Receta) {
    if (!userId || !receta) return;

    setIsSaving(true);

    try {
      // Actualizar fecha de modificación
      receta.fecha_actualizacion = new Date().toISOString();

      // Preparar datos para Supabase
      const recetaData = {
        id: receta.id,
        user_id: userId,
        nombre_receta: receta.nombre,
        descripcion: receta.descripcion,
        tiempo_preparacion: receta.tiempo_preparacion,
        tiempo_coccion: receta.tiempo_coccion,
        porciones: receta.porciones,
        dificultad: receta.dificultad,
        categoria: receta.categoria,
        ingredientes: receta.ingredientes,
        pasos: receta.pasos,
        notas: receta.notas,
        imagen: receta.imagen,
        favorita: receta.favorita,
        fecha_creacion: receta.fecha_creacion,
        fecha_actualizacion: receta.fecha_actualizacion,
        costo_total: receta.costo_total,
        costo_porcion: receta.costo_porcion,
        tags: receta.tags,
      };

      // Upsert para crear o actualizar
      const { error } = await supabase.from("recipes").upsert(recetaData);

      if (error) {
        console.error("Error al guardar la receta:", error.message);
        toast.error("Error al guardar la receta", {
          description: error.message,
        });
        return;
      }

      // Actualizar estado local
      setRecetas((prevRecetas) => {
        const index = prevRecetas.findIndex((r) => r.id === receta.id);
        if (index >= 0) {
          // Actualizar receta existente
          const updatedRecetas = [...prevRecetas];
          updatedRecetas[index] = receta;
          return updatedRecetas;
        } else {
          // Agregar nueva receta
          return [...prevRecetas, receta];
        }
      });

      toast.success("Receta guardada correctamente", {
        description: `La receta "${receta.nombre}" ha sido guardada`,
        icon: <Save className="h-5 w-5 text-green-500" />,
      });

      // Salir del modo edición
      setModoEdicion(false);
    } catch (err) {
      console.error("Error inesperado al guardar:", err);
      toast.error("Error inesperado al guardar la receta");
    } finally {
      setIsSaving(false);
    }
  }

  // Función para eliminar una receta
  async function eliminarReceta(id: string) {
    if (!userId) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al eliminar la receta:", error.message);
        toast.error("Error al eliminar la receta", {
          description: error.message,
        });
        return;
      }

      // Actualizar estado local
      setRecetas((prevRecetas) => prevRecetas.filter((r) => r.id !== id));

      toast.success("Receta eliminada correctamente", {
        icon: <Trash2 className="h-5 w-5 text-rose-500" />,
      });

      // Si estamos viendo la receta eliminada, volver a la lista
      if (recetaActual?.id === id) {
        setRecetaActual(null);
        setVistaDetalle(false);
      }

      // Cerrar diálogo de confirmación
      setShowDeleteDialog(false);
      setRecetaToDelete(null);
    } catch (err) {
      console.error("Error inesperado al eliminar:", err);
      toast.error("Error inesperado al eliminar la receta");
    } finally {
      setIsDeleting(false);
    }
  }

  // Función para marcar/desmarcar como favorita
  async function toggleFavorita(receta: Receta) {
    if (!userId) return;

    const recetaActualizada = { ...receta, favorita: !receta.favorita };

    try {
      const { error } = await supabase
        .from("recipes")
        .update({ favorita: recetaActualizada.favorita })
        .eq("id", receta.id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error al actualizar favorita:", error.message);
        toast.error("Error al actualizar favorita", {
          description: error.message,
        });
        return;
      }

      // Actualizar estado local
      setRecetas((prevRecetas) =>
        prevRecetas.map((r) =>
          r.id === receta.id
            ? { ...r, favorita: recetaActualizada.favorita }
            : r
        )
      );

      if (recetaActual?.id === receta.id) {
        setRecetaActual(recetaActualizada);
      }

      toast.success(
        recetaActualizada.favorita
          ? "Añadida a favoritos"
          : "Eliminada de favoritos",
        {
          icon: recetaActualizada.favorita ? (
            <Star className="h-5 w-5 text-amber-400" />
          ) : (
            <Star className="h-5 w-5 text-zinc-400" />
          ),
        }
      );
    } catch (err) {
      console.error("Error inesperado al actualizar favorita:", err);
      toast.error("Error inesperado al actualizar favorita");
    }
  }

  // Función para actualizar un campo de la receta actual
  function actualizarCampoReceta(campo: keyof Receta, valor: any) {
    if (!recetaActual) return;

    setRecetaActual((prev) => {
      if (!prev) return null;
      return { ...prev, [campo]: valor };
    });
  }

  // Función para agregar un ingrediente a la receta actual
  function agregarIngrediente() {
    if (!recetaActual) return;

    const nuevoId =
      recetaActual.ingredientes.length > 0
        ? Math.max(...recetaActual.ingredientes.map((i) => i.id)) + 1
        : 1;

    const nuevoIngrediente: Ingrediente = {
      id: nuevoId,
      nombre: "Nuevo ingrediente",
      cantidad: 100,
      unidad: "gr",
    };

    actualizarCampoReceta("ingredientes", [
      ...recetaActual.ingredientes,
      nuevoIngrediente,
    ]);
  }

  // Función para actualizar un ingrediente
  function actualizarIngrediente(
    id: number,
    campo: keyof Ingrediente,
    valor: any
  ) {
    if (!recetaActual) return;

    const ingredientesActualizados = recetaActual.ingredientes.map((ing) => {
      if (ing.id === id) {
        return { ...ing, [campo]: valor };
      }
      return ing;
    });

    actualizarCampoReceta("ingredientes", ingredientesActualizados);
  }

  // Función para eliminar un ingrediente
  function eliminarIngrediente(id: number) {
    if (!recetaActual) return;

    const ingredientesFiltrados = recetaActual.ingredientes.filter(
      (ing) => ing.id !== id
    );
    actualizarCampoReceta("ingredientes", ingredientesFiltrados);
  }

  // Función para agregar un paso a la receta actual
  function agregarPaso() {
    if (!recetaActual) return;

    const nuevoId =
      recetaActual.pasos.length > 0
        ? Math.max(...recetaActual.pasos.map((p) => p.id)) + 1
        : 1;

    const nuevoPaso: Paso = {
      id: nuevoId,
      descripcion: "Nuevo paso",
      tiempo: 5,
    };

    actualizarCampoReceta("pasos", [...recetaActual.pasos, nuevoPaso]);
  }

  // Función para actualizar un paso
  function actualizarPaso(id: number, campo: keyof Paso, valor: any) {
    if (!recetaActual) return;

    const pasosActualizados = recetaActual.pasos.map((paso) => {
      if (paso.id === id) {
        return { ...paso, [campo]: valor };
      }
      return paso;
    });

    actualizarCampoReceta("pasos", pasosActualizados);
  }

  // Función para eliminar un paso
  function eliminarPaso(id: number) {
    if (!recetaActual) return;

    const pasosFiltrados = recetaActual.pasos.filter((paso) => paso.id !== id);
    actualizarCampoReceta("pasos", pasosFiltrados);
  }

  // Función para agregar un tag
  function agregarTag(tag: string) {
    if (!recetaActual || !tag.trim()) return;

    const tagsActuales = recetaActual.tags || [];
    if (!tagsActuales.includes(tag)) {
      actualizarCampoReceta("tags", [...tagsActuales, tag]);
    }
  }

  // Función para eliminar un tag
  function eliminarTag(tag: string) {
    if (!recetaActual) return;

    const tagsActuales = recetaActual.tags || [];
    actualizarCampoReceta(
      "tags",
      tagsActuales.filter((t) => t !== tag)
    );
  }

  // Filtrar recetas según búsqueda, categoría y filtros avanzados
  const recetasFiltradas = recetas.filter((receta) => {
    // Filtro de búsqueda
    const matchesSearch =
      receta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receta.tags &&
        receta.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    // Filtro de categoría
    const matchesCategoria =
      categoriaFiltro === "todas" ||
      (categoriaFiltro === "favoritas"
        ? receta.favorita
        : receta.categoria === categoriaFiltro);

    // Filtros avanzados
    const matchesDificultad =
      !filtroDificultad || receta.dificultad === filtroDificultad;
    const matchesTiempo =
      !filtroTiempo ||
      receta.tiempo_preparacion + receta.tiempo_coccion <= filtroTiempo;

    return (
      matchesSearch && matchesCategoria && matchesDificultad && matchesTiempo
    );
  });

  // Obtener categorías únicas
  const categorias = Array.from(new Set(recetas.map((r) => r.categoria)));

  // Renderizar vista de lista de recetas
  const renderListaRecetas = () => (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full md:w-auto overflow-x-auto">
            <Tabs defaultValue="todas" className="w-full">
              <TabsList className="bg-zinc-800 p-1">
                <TabsTrigger
                  value="todas"
                  onClick={() => setCategoriaFiltro("todas")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="favoritas"
                  onClick={() => setCategoriaFiltro("favoritas")}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                >
                  <Star className="h-4 w-4 mr-1" />
                  Favoritas
                </TabsTrigger>
                {categorias.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    onClick={() => setCategoriaFiltro(cat)}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Buscar recetas..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Dificultad
              </label>
              <Select
                value={filtroDificultad || ""}
                onValueChange={(value) => setFiltroDificultad(value || null)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Cualquiera" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="cualquiera">Cualquiera</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Tiempo máximo (min)
              </label>
              <Select
                value={filtroTiempo?.toString() || ""}
                onValueChange={(value) =>
                  setFiltroTiempo(Number.parseInt(value) || null)
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Sin límite" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="sin_limite">Sin límite</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="180">3 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 w-full"
                onClick={() => {
                  setFiltroDificultad(null);
                  setFiltroTiempo(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de recetas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-zinc-800 bg-zinc-900/50">
              <div className="h-48 bg-zinc-800">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader className="p-4 pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
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
      ) : recetasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ClipboardList className="h-12 w-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">
            No se encontraron recetas
          </h3>
          <p className="text-zinc-400 mb-6 max-w-md">
            {searchTerm
              ? `No hay resultados para "${searchTerm}"`
              : categoriaFiltro === "favoritas"
              ? "No tienes recetas favoritas"
              : categoriaFiltro !== "todas"
              ? `No hay recetas en la categoría "${categoriaFiltro}"`
              : "Comienza creando tu primera receta"}
          </p>
          <Button
            onClick={crearNuevaReceta}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear nueva receta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recetasFiltradas.map((receta) => (
            <Card
              key={receta.id}
              className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5 overflow-hidden group"
            >
              <div className="relative h-48 bg-zinc-800">
                {receta.imagen ? (
                  <img
                    src={receta.imagen || "/placeholder.svg"}
                    alt={receta.nombre}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Utensils className="h-12 w-12 text-zinc-700" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-zinc-900/80 hover:bg-zinc-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorita(receta);
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        receta.favorita
                          ? "text-amber-400 fill-amber-400"
                          : "text-zinc-400"
                      }`}
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-zinc-900/80 hover:bg-zinc-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                      <DropdownMenuItem
                        className="hover:bg-zinc-800 cursor-pointer"
                        onClick={() => {
                          setRecetaActual(receta);
                          setModoEdicion(true);
                          setVistaDetalle(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="hover:bg-zinc-800 cursor-pointer text-rose-400 hover:text-rose-300"
                        onClick={() => {
                          setRecetaToDelete(receta.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold line-clamp-1">
                      {receta.nombre}
                    </CardTitle>
                    <CardDescription className="text-zinc-400 line-clamp-2">
                      {receta.descripcion}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 border-zinc-700"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {receta.tiempo_preparacion + receta.tiempo_coccion} min
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 border-zinc-700"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {receta.porciones} porciones
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/50 border-zinc-700"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {receta.categoria}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-zinc-500">
                  <ChefHat className="h-3 w-3 mr-1" />
                  <span>Dificultad: {receta.dificultad}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <div className="text-xs text-zinc-500">
                  {new Date(receta.fecha_actualizacion).toLocaleDateString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                  onClick={() => {
                    setRecetaActual(receta);
                    setModoEdicion(false);
                    setVistaDetalle(true);
                  }}
                >
                  Ver receta
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Renderizar vista detallada de una receta
  const renderDetalleReceta = () => {
    if (!recetaActual) return null;

    return (
      <div className="space-y-6">
        {/* Botón para volver a la lista */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => {
            setVistaDetalle(false);
            setRecetaActual(null);
            setModoEdicion(false);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a recetas
        </Button>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2 border-b border-zinc-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {modoEdicion ? (
                <Input
                  value={recetaActual.nombre}
                  onChange={(e) =>
                    actualizarCampoReceta("nombre", e.target.value)
                  }
                  className="text-xl font-bold bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                />
              ) : (
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {recetaActual.nombre}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {recetaActual.descripcion}
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
                        // Recargar la receta original si existe
                        if (
                          recetaActual.id &&
                          recetas.find((r) => r.id === recetaActual.id)
                        ) {
                          setRecetaActual(
                            recetas.find((r) => r.id === recetaActual.id) ||
                              null
                          );
                        } else {
                          setRecetaActual(null);
                          setVistaDetalle(false);
                        }
                      }}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      onClick={() => guardarReceta(recetaActual)}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-zinc-800"
                      onClick={() => toggleFavorita(recetaActual)}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          recetaActual.favorita
                            ? "text-amber-400 fill-amber-400"
                            : "text-zinc-400"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="outline"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      onClick={() => setModoEdicion(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
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
                        <DropdownMenuItem
                          className="hover:bg-zinc-800 cursor-pointer text-rose-400 hover:text-rose-300"
                          onClick={() => {
                            setRecetaToDelete(recetaActual.id);
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna izquierda: Información general */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Información general</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">
                        Tiempo de preparación
                      </label>
                      {modoEdicion ? (
                        <div className="flex items-center">
                          <Input
                            type="number"
                            value={recetaActual.tiempo_preparacion}
                            onChange={(e) =>
                              actualizarCampoReceta(
                                "tiempo_preparacion",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                            className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-zinc-400">
                            min
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <span>{recetaActual.tiempo_preparacion} min</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">
                        Tiempo de cocción
                      </label>
                      {modoEdicion ? (
                        <div className="flex items-center">
                          <Input
                            type="number"
                            value={recetaActual.tiempo_coccion}
                            onChange={(e) =>
                              actualizarCampoReceta(
                                "tiempo_coccion",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                            className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-zinc-400">
                            min
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-purple-400" />
                          <span>{recetaActual.tiempo_coccion} min</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Porciones</label>
                      {modoEdicion ? (
                        <Input
                          type="number"
                          value={recetaActual.porciones}
                          onChange={(e) =>
                            actualizarCampoReceta(
                              "porciones",
                              Number.parseInt(e.target.value) || 1
                            )
                          }
                          className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-400" />
                          <span>{recetaActual.porciones}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">
                        Dificultad
                      </label>
                      {modoEdicion ? (
                        <Select
                          value={recetaActual.dificultad}
                          onValueChange={(value) =>
                            actualizarCampoReceta("dificultad", value as any)
                          }
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="Fácil">Fácil</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Difícil">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-purple-400" />
                          <span>{recetaActual.dificultad}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Categoría</h3>
                  {modoEdicion ? (
                    <Select
                      value={recetaActual.categoria}
                      onValueChange={(value) =>
                        actualizarCampoReceta("categoria", value)
                      }
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Desayuno">Desayuno</SelectItem>
                        <SelectItem value="Almuerzo">Almuerzo</SelectItem>
                        <SelectItem value="Cena">Cena</SelectItem>
                        <SelectItem value="Postre">Postre</SelectItem>
                        <SelectItem value="Bebida">Bebida</SelectItem>
                        <SelectItem value="Snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="bg-zinc-800 hover:bg-zinc-700">
                      <Tag className="h-3.5 w-3.5 mr-1" />
                      {recetaActual.categoria}
                    </Badge>
                  )}
                </div>

                {/* Etiquetas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Etiquetas</h3>
                  <div className="flex flex-wrap gap-2">
                    {recetaActual.tags && recetaActual.tags.length > 0 ? (
                      recetaActual.tags.map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-purple-900/20 text-purple-400 hover:bg-purple-900/30"
                        >
                          {tag}
                          {modoEdicion && (
                            <button
                              className="ml-1 hover:text-rose-400"
                              onClick={() => eliminarTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-zinc-500 text-sm">Sin etiquetas</p>
                    )}
                  </div>
                  {modoEdicion && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nueva etiqueta"
                        className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.currentTarget;
                            if (input.value.trim()) {
                              agregarTag(input.value.trim());
                              input.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                        onClick={(e) => {
                          const input = e.currentTarget
                            .previousSibling as HTMLInputElement;
                          if (input.value.trim()) {
                            agregarTag(input.value.trim());
                            input.value = "";
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {modoEdicion ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Descripción</h3>
                    <Textarea
                      value={recetaActual.descripcion}
                      onChange={(e) =>
                        actualizarCampoReceta("descripcion", e.target.value)
                      }
                      placeholder="Describe tu receta..."
                      className="h-32 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                    />
                  </div>
                ) : null}

                {recetaActual.imagen ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Imagen</h3>
                    <div className="relative h-48 rounded-md overflow-hidden">
                      <img
                        src={recetaActual.imagen || "/placeholder.svg"}
                        alt={recetaActual.nombre}
                        className="w-full h-full object-cover"
                      />
                      {modoEdicion && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-zinc-900/80 hover:bg-zinc-900"
                          onClick={() => actualizarCampoReceta("imagen", "")}
                        >
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : modoEdicion ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Imagen</h3>
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-md border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                      <div className="flex flex-col items-center">
                        <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
                        <p className="text-sm text-zinc-500">
                          Añadir imagen (URL)
                        </p>
                        <Input
                          type="text"
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="mt-2 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                          onChange={(e) =>
                            actualizarCampoReceta("imagen", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Columna central: Ingredientes */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Ingredientes</h3>
                  {modoEdicion && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      onClick={agregarIngrediente}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {recetaActual.ingredientes.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4">
                      No hay ingredientes
                    </p>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-3">
                        {recetaActual.ingredientes.map((ingrediente) => (
                          <div
                            key={ingrediente.id}
                            className="flex items-center justify-between p-3 rounded-md bg-zinc-800/50 border border-zinc-800"
                          >
                            {modoEdicion ? (
                              <div className="flex-1 grid grid-cols-3 gap-2">
                                <Input
                                  value={ingrediente.nombre}
                                  onChange={(e) =>
                                    actualizarIngrediente(
                                      ingrediente.id,
                                      "nombre",
                                      e.target.value
                                    )
                                  }
                                  className="col-span-3 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  placeholder="Nombre del ingrediente"
                                />
                                <div className="col-span-2 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={ingrediente.cantidad}
                                    onChange={(e) =>
                                      actualizarIngrediente(
                                        ingrediente.id,
                                        "cantidad",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                    placeholder="Cantidad"
                                  />
                                  <Select
                                    value={ingrediente.unidad}
                                    onValueChange={(value) =>
                                      actualizarIngrediente(
                                        ingrediente.id,
                                        "unidad",
                                        value
                                      )
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
                                      <SelectItem value="unidad">
                                        unidad
                                      </SelectItem>
                                      <SelectItem value="cucharada">
                                        cucharada
                                      </SelectItem>
                                      <SelectItem value="cucharadita">
                                        cucharadita
                                      </SelectItem>
                                      <SelectItem value="taza">taza</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-rose-500/10 hover:text-rose-400"
                                  onClick={() =>
                                    eliminarIngrediente(ingrediente.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="font-medium">
                                  {ingrediente.nombre}
                                </span>
                                <span className="text-zinc-400">
                                  {ingrediente.cantidad} {ingrediente.unidad}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>

              {/* Columna derecha: Pasos */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Preparación</h3>
                  {modoEdicion && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      onClick={agregarPaso}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir paso
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {recetaActual.pasos.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4">
                      No hay pasos de preparación
                    </p>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {recetaActual.pasos.map((paso, index) => (
                          <div
                            key={paso.id}
                            className="p-3 rounded-md bg-zinc-800/50 border border-zinc-800"
                          >
                            {modoEdicion ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">
                                    Paso {index + 1}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-rose-500/10 hover:text-rose-400"
                                    onClick={() => eliminarPaso(paso.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Textarea
                                  value={paso.descripcion}
                                  onChange={(e) =>
                                    actualizarPaso(
                                      paso.id,
                                      "descripcion",
                                      e.target.value
                                    )
                                  }
                                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  placeholder="Descripción del paso"
                                />
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-zinc-400">
                                    Tiempo estimado:
                                  </label>
                                  <Input
                                    type="number"
                                    value={paso.tiempo || 0}
                                    onChange={(e) =>
                                      actualizarPaso(
                                        paso.id,
                                        "tiempo",
                                        Number.parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                                  />
                                  <span className="text-sm text-zinc-400">
                                    minutos
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">
                                    Paso {index + 1}
                                  </h4>
                                  {paso.tiempo && (
                                    <Badge
                                      variant="outline"
                                      className="bg-zinc-800/50 border-zinc-700"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      {paso.tiempo} min
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-zinc-300">
                                  {paso.descripcion}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>

            {/* Notas adicionales */}
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Notas adicionales</h3>
              {modoEdicion ? (
                <Textarea
                  value={recetaActual.notas || ""}
                  onChange={(e) =>
                    actualizarCampoReceta("notas", e.target.value)
                  }
                  placeholder="Añade notas o consejos adicionales..."
                  className="h-32 bg-zinc-800 border-zinc-700 focus-visible:ring-purple-500"
                />
              ) : (
                <div className="p-4 rounded-md bg-zinc-800/50 border border-zinc-800">
                  {recetaActual.notas ? (
                    <p className="text-zinc-300">{recetaActual.notas}</p>
                  ) : (
                    <p className="text-zinc-500 italic">
                      No hay notas adicionales
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recetas</h2>
        </div>
        <Button
          onClick={crearNuevaReceta}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      {/* Contenido principal */}
      {vistaDetalle ? renderDetalleReceta() : renderListaRecetas()}

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Eliminar receta</DialogTitle>
            <DialogDescription className="text-zinc-400">
              ¿Estás seguro de que quieres eliminar esta receta? Esta acción no
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
              onClick={() => recetaToDelete && eliminarReceta(recetaToDelete)}
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
    </div>
  );
}
