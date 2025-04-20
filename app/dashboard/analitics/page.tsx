"use client";

import { useState, useEffect } from "react";
// Se eliminan las importaciones de Cookies por usar Supabase
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  HelpCircle,
  Trash2,
  Save,
  FolderOpen,
  Download,
  GripVertical,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Diálogos de shadcn/ui
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Importaciones para Drag and Drop (dnd-kit)
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/utils/supabase/client";

// Tipos
interface Producto {
  id: number;
  nombre: string;
  precioProducto: number | string;
  dbPrecioProducto: number | string;
  kgProducto: number;
  grReceta: number;
  costoReceta: number;
  proveedor?: string;
}

interface CostoAdicional {
  id: number;
  descripcion: string;
  costoEmpaque: number;
  cantidadPorEmpaque: number;
  costoUnitario: number;
  cantidadUtilizada: number;
  total: number;
}

// Componente auxiliar para filas con drag & drop
function SortableTableRow({
  id,
  children,
}: {
  id: number | string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TableCell className="w-8 text-center cursor-grab">
        <GripVertical size={18} className="text-neutral-400" />
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function Home() {
  /* Estados para receta y cálculos */
  const [nombreReceta, setNombreReceta] = useState<string>("Mi Receta");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [costosAdicionales, setCostosAdicionales] = useState<CostoAdicional[]>(
    []
  );
  const [cantidadesProducidas, setCantidadesProducidas] = useState<number>(8);
  const [gastosOperativos, setGastosOperativos] = useState<number>(0.27);
  const [porcentajeUtilidad, setPorcentajeUtilidad] = useState<number>(50);
  const [totalCostoReceta, setTotalCostoReceta] = useState<number>(0);
  const [totalCostosVariables, setTotalCostosVariables] = useState<number>(0);
  const [costoTotal, setCostoTotal] = useState<number>(0);
  const [costoUnitario, setCostoUnitario] = useState<number>(0);
  const [precioSugerido, setPrecioSugerido] = useState<number>(0);

  // Estados para diálogos (guardar y cargar recetas)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [recipeNameToSave, setRecipeNameToSave] = useState(nombreReceta);
  const [availableRecipes, setAvailableRecipes] = useState<any[]>([]);

  // Estado para edición de celdas
  const [editingCell, setEditingCell] = useState<{
    id: number | null;
    field: string | null;
    section?: string;
  }>({ id: null, field: null });
  const [editingValue, setEditingValue] = useState("");

  // Estado para el usuario actual obtenido de Supabase Auth
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Configuración de sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Obtención asíncrona del usuario usando getSession y onAuthStateChange
  useEffect(() => {
    // Suscribirse a los cambios en el estado de la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Cambio en estado de auth:", event, session);
        setCurrentUser(session?.user ?? null);
      }
    );
    // Obtener la sesión al montar el componente
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error al obtener la sesión:", error.message);
      } else {
        console.log("Sesión obtenida:", session);
        setCurrentUser(session?.user);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /* Cálculos generales */
  useEffect(() => {
    const totalProductos = productos.reduce(
      (sum, producto) => sum + producto.costoReceta,
      0
    );
    setTotalCostoReceta(Number(totalProductos.toFixed(3)));

    const totalAdicionales = costosAdicionales.reduce(
      (sum, costo) => sum + costo.total,
      0
    );
    setTotalCostosVariables(Number(totalAdicionales.toFixed(3)));

    const total = totalProductos + totalAdicionales;
    setCostoTotal(Number(total.toFixed(3)));

    const unitario =
      cantidadesProducidas > 0
        ? total / cantidadesProducidas + gastosOperativos
        : 0;
    setCostoUnitario(Number(unitario.toFixed(3)));

    const sugerido = unitario * (1 + porcentajeUtilidad / 100);
    setPrecioSugerido(Number(sugerido.toFixed(3)));
  }, [
    productos,
    costosAdicionales,
    cantidadesProducidas,
    gastosOperativos,
    porcentajeUtilidad,
  ]);

  /* Nuevos cálculos contables */
  const totalIngresos = Number(
    (precioSugerido * cantidadesProducidas).toFixed(3)
  );
  const gananciaBruta =
    cantidadesProducidas > 0
      ? Number(
          (
            (precioSugerido - costoTotal / cantidadesProducidas) *
            cantidadesProducidas
          ).toFixed(3)
        )
      : 0;
  const gananciaNeta = Number(
    ((precioSugerido - costoUnitario) * cantidadesProducidas).toFixed(3)
  );
  const margenBruto =
    precioSugerido > 0
      ? Number(
          (
            ((precioSugerido - costoTotal / (cantidadesProducidas || 1)) /
              precioSugerido) *
            100
          ).toFixed(2)
        )
      : 0;
  const margenNeto =
    precioSugerido > 0
      ? Number(
          (((precioSugerido - costoUnitario) / precioSugerido) * 100).toFixed(2)
        )
      : 0;

  /* Función para recalcular el costo de receta */
  const recalcCostoReceta = (producto: Producto) => {
    const userPrice = parseFloat(producto.precioProducto.toString()) || 0;
    const defaultPrice = parseFloat(producto.dbPrecioProducto.toString()) || 0;
    const effectivePrice = userPrice !== 0 ? userPrice : defaultPrice;
    const grReceta = parseFloat(producto.grReceta.toString());
    const grPresentacion = parseFloat(producto.kgProducto.toString());
    return grPresentacion > 0
      ? Number(((effectivePrice * grReceta) / grPresentacion).toFixed(3))
      : 0;
  };

  /* exportToCSV */
  const exportToCSV = () => {
    let csvContent = "";
    csvContent += "Productos:\n";
    csvContent +=
      "id,nombre,precioProducto,dbPrecioProducto,kgProducto,grReceta,costoReceta\n";
    productos.forEach((prod) => {
      csvContent += `${prod.id},"${prod.nombre}",${prod.precioProducto},${prod.dbPrecioProducto},${prod.kgProducto},${prod.grReceta},${prod.costoReceta}\n`;
    });
    csvContent += "\n";
    csvContent += "CostosAdicionales:\n";
    csvContent +=
      "id,descripcion,costoEmpaque,cantidadPorEmpaque,costoUnitario,cantidadUtilizada,total\n";
    costosAdicionales.forEach((cost) => {
      csvContent += `${cost.id},"${cost.descripcion}",${cost.costoEmpaque},${cost.cantidadPorEmpaque},${cost.costoUnitario},${cost.cantidadUtilizada},${cost.total}\n`;
    });
    csvContent += "\n";
    csvContent += "Receta:\n";
    csvContent +=
      "nombreReceta,cantidadesProducidas,gastosOperativos,porcentajeUtilidad\n";
    csvContent += `${nombreReceta},${cantidadesProducidas},${gastosOperativos},${porcentajeUtilidad}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${nombreReceta}_receta.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Handlers para edición de celdas */
  const handleCellChange = (id: number, field: string, value: string) => {
    setProductos((prevProductos) =>
      prevProductos.map((producto) => {
        if (producto.id === id) {
          let updatedProducto = { ...producto };
          if (field === "nombre") {
            updatedProducto.nombre = value;
            const storedInv = localStorage.getItem("inventario");
            if (storedInv) {
              try {
                const inventory = JSON.parse(storedInv);
                const found = inventory.find(
                  (item: any) =>
                    item.nombre.trim().toLowerCase() ===
                    value.trim().toLowerCase()
                );
                if (found) {
                  updatedProducto.dbPrecioProducto = Number(
                    found.precio_presentacion
                  );
                }
              } catch (error) {
                console.error(
                  "Error al parsear inventario desde localStorage:",
                  error
                );
              }
            }
          } else if (field === "proveedor") {
            updatedProducto.proveedor = value;
          } else {
            const numericValue = Number.parseFloat(value);
            if (field in updatedProducto) {
              (updatedProducto as Record<string, any>)[field] = !isNaN(
                numericValue
              )
                ? numericValue
                : value;
            }
          }
          if (
            ["nombre", "precioProducto", "grReceta", "kgProducto"].includes(
              field
            )
          ) {
            updatedProducto.costoReceta = recalcCostoReceta(updatedProducto);
          }
          return updatedProducto;
        }
        return producto;
      })
    );
  };

  const handleCostoAdicionalChange = (
    id: number,
    field: string,
    value: string
  ) => {
    setCostosAdicionales((prevCostos) =>
      prevCostos.map((costo) => {
        if (costo.id === id) {
          const updatedCosto = { ...costo };
          if (field === "descripcion") {
            updatedCosto[field] = value;
          } else {
            const numericValue = Number.parseFloat(value);
            if (field in updatedCosto) {
              (updatedCosto as Record<string, any>)[field] = !isNaN(
                numericValue
              )
                ? numericValue
                : value;
            }
            if (["costoEmpaque", "cantidadPorEmpaque"].includes(field)) {
              updatedCosto.costoUnitario =
                updatedCosto.cantidadPorEmpaque > 0
                  ? updatedCosto.costoEmpaque / updatedCosto.cantidadPorEmpaque
                  : 0;
            }
            if (["costoUnitario", "cantidadUtilizada"].includes(field)) {
              updatedCosto.total =
                updatedCosto.costoUnitario * updatedCosto.cantidadUtilizada;
            }
          }
          return updatedCosto;
        }
        return costo;
      })
    );
  };

  const handleFinalValueChange = (field: string, value: string) => {
    const numericValue = Number.parseFloat(value);
    switch (field) {
      case "cantidadesProducidas":
        setCantidadesProducidas(!isNaN(numericValue) ? numericValue : 0);
        break;
      case "gastosOperativos":
        setGastosOperativos(!isNaN(numericValue) ? numericValue : 0);
        break;
      case "porcentajeUtilidad":
        setPorcentajeUtilidad(!isNaN(numericValue) ? numericValue : 0);
        break;
    }
  };

  const startEditing = (id: number, field: string, section = "productos") => {
    if (
      ["dbPrecioProducto", "costoUnitario", "total", "costoReceta"].includes(
        field
      )
    )
      return;
    setEditingCell({ id, field, section });
  };

  const finishEditing = () => {
    setEditingCell({ id: null, field: null });
  };

  /* Render de celdas editables */
  const renderEditableCell = (
    item: any,
    field: string,
    isNumeric = false,
    isEditable = true,
    section = "productos"
  ) => {
    const isEditing =
      editingCell.id === item.id &&
      editingCell.field === field &&
      editingCell.section === section;
    const value = item[field];
    if (!isEditable)
      return (
        <div className={`p-2 ${isNumeric ? "text-right" : ""}`}>
          {isNumeric && typeof value === "number" ? value.toFixed(3) : value}
        </div>
      );
    if (isEditing) {
      if (field === "precioProducto") {
        return (
          <Input
            autoFocus
            type="text"
            className="h-8 p-1 text-right bg-neutral-700 text-white border-neutral-600"
            value={editingValue !== "" ? editingValue : value.toString()}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => {
              const numericVal = Number.parseFloat(editingValue);
              handleCellChange(
                item.id,
                field,
                isNaN(numericVal) ? "0" : numericVal.toString()
              );
              setEditingValue("");
              finishEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const numericVal = Number.parseFloat(editingValue);
                handleCellChange(
                  item.id,
                  field,
                  isNaN(numericVal) ? "0" : numericVal.toString()
                );
                setEditingValue("");
                finishEditing();
              }
            }}
            aria-label={`Editar ${field}`}
          />
        );
      }
      return (
        <Input
          autoFocus
          className={`h-8 p-1 ${
            isNumeric ? "text-right" : ""
          } bg-neutral-700 text-white border-neutral-600`}
          value={value.toString()}
          onChange={(e) => {
            if (section === "productos") {
              handleCellChange(item.id, field, e.target.value);
            } else if (section === "costosAdicionales") {
              handleCostoAdicionalChange(item.id, field, e.target.value);
            }
          }}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEditing();
          }}
          aria-label={`Editar ${field}`}
        />
      );
    }
    return (
      <div
        className={`cursor-pointer p-2 ${isNumeric ? "text-right" : ""}`}
        onClick={() => startEditing(item.id, field, section)}
        role="button"
        tabIndex={0}
        aria-label={`Editar ${field}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            startEditing(item.id, field, section);
        }}
      >
        {isNumeric && typeof value === "number" ? value.toFixed(3) : value}
      </div>
    );
  };

  const renderEditableFinalValue = (field: string, value: number) => {
    const isEditing = editingCell.id === 0 && editingCell.field === field;
    if (isEditing) {
      return (
        <Input
          autoFocus
          className="h-8 p-1 text-right bg-neutral-700 text-white border-neutral-600"
          value={value.toString()}
          onChange={(e) => handleFinalValueChange(field, e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEditing();
          }}
          aria-label={`Editar ${field}`}
        />
      );
    }
    return (
      <div
        className="cursor-pointer p-2 text-right"
        onClick={() => setEditingCell({ id: 0, field })}
        role="button"
        tabIndex={0}
        aria-label={`Editar ${field}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            setEditingCell({ id: 0, field });
        }}
      >
        {field === "porcentajeUtilidad" ? `${value}%` : value.toFixed(3)}
      </div>
    );
  };

  // Funciones para agregar y eliminar elementos
  const agregarProducto = () => {
    const nuevoId =
      productos.length > 0 ? Math.max(...productos.map((p) => p.id)) + 1 : 1;
    const nuevoProducto: Producto = {
      id: nuevoId,
      nombre: "Nuevo producto",
      precioProducto: 0,
      dbPrecioProducto: "#N/D",
      kgProducto: 100,
      grReceta: 100,
      costoReceta: 0,
    };
    nuevoProducto.costoReceta = Number(
      (
        (Number(nuevoProducto.precioProducto) * nuevoProducto.grReceta) /
        nuevoProducto.kgProducto
      ).toFixed(3)
    );
    setProductos([...productos, nuevoProducto]);
  };

  const agregarCostoAdicional = () => {
    const nuevoId =
      costosAdicionales.length > 0
        ? Math.max(...costosAdicionales.map((c) => c.id)) + 1
        : 1;
    const nuevoCosto: CostoAdicional = {
      id: nuevoId,
      descripcion: "Nuevo costo",
      costoEmpaque: 0,
      cantidadPorEmpaque: 1,
      costoUnitario: 0,
      cantidadUtilizada: 0,
      total: 0,
    };
    setCostosAdicionales([...costosAdicionales, nuevoCosto]);
  };

  const eliminarProducto = (id: number) => {
    setProductos(productos.filter((producto) => producto.id !== id));
  };

  const eliminarCostoAdicional = (id: number) => {
    setCostosAdicionales(costosAdicionales.filter((costo) => costo.id !== id));
  };

  /* Funciones para guardar y cargar recetas mediante diálogos utilizando Supabase */
  const handleSaveRecipe = async () => {
    if (!recipeNameToSave.trim() || !currentUser) {
      console.error(
        "No se pudo guardar: falta el nombre de la receta o el usuario no está autenticado."
      );
      return;
    }

    const newRecipe = {
      user_id: currentUser.id,
      nombre_receta: recipeNameToSave,
      productos, // Se guardan como JSON
      costos_adicionales: costosAdicionales, // Se guardan como JSON
      cantidades_producidas: cantidadesProducidas,
      gastos_operativos: gastosOperativos,
      porcentaje_utilidad: porcentajeUtilidad,
    };

    // Upsert: utilizamos onConflict como array para evitar duplicidades
    const { data, error } = await supabase
      .from("recipes")
      .upsert(newRecipe, { onConflict: "user_id,nombre_receta" });

    if (error) {
      console.error("Error al guardar la receta:", error.message);
      toast(`Error al guardar la receta: ${error.message}`, {
        style: { background: "#f44336", color: "#fff" },
      });
    } else {
      console.log("Receta guardada:", data);
      toast("Receta guardada exitosamente en Supabase!", {
        style: { background: "#4caf50", color: "#fff" },
      });
    }
    setSaveDialogOpen(false);
  };

  const openLoadDialog = async () => {
    if (!currentUser) {
      console.error("El usuario no está autenticado para cargar recetas.");
      return;
    }

    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Error al cargar recetas:", error.message);
      toast(`Error al cargar recetas: ${error.message}`);
      return;
    }
    if (!recipes || recipes.length === 0) {
      toast("No hay recetas guardadas.");
      return;
    }
    console.log("Recetas cargadas:", recipes);
    setAvailableRecipes(recipes);
    setLoadDialogOpen(true);
  };

  const handleLoadRecipe = (selectedRecipe: any) => {
    setNombreReceta(selectedRecipe.nombre_receta);

    const updatedProductos = selectedRecipe.productos.map((prod: any) => {
      const inventory = JSON.parse(localStorage.getItem("inventario") || "[]");
      if (inventory && inventory.length > 0) {
        const found = inventory.find(
          (item: any) =>
            item.nombre.trim().toLowerCase() ===
            prod.nombre.trim().toLowerCase()
        );
        if (found) {
          prod.dbPrecioProducto = Number(found.precio_presentacion);
        }
      }
      return prod;
    });

    setProductos(updatedProductos);
    setCostosAdicionales(selectedRecipe.costos_adicionales);
    setCantidadesProducidas(selectedRecipe.cantidades_producidas);
    setGastosOperativos(selectedRecipe.gastos_operativos);
    setPorcentajeUtilidad(selectedRecipe.porcentaje_utilidad);

    toast("Receta cargada exitosamente desde Supabase!", {
      style: { background: "#2196f3", color: "#fff" },
    });
    setLoadDialogOpen(false);
  };

  /* Handler para drag & drop en la tabla de productos */
  const handleDragEndProductos = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = productos.findIndex((item) => item.id === active.id);
      const newIndex = productos.findIndex((item) => item.id === over?.id);
      setProductos(arrayMove(productos, oldIndex, newIndex));
    }
  };

  /* Handler para drag & drop en la tabla de costos adicionales */
  const handleDragEndCostos = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = costosAdicionales.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = costosAdicionales.findIndex(
        (item) => item.id === over?.id
      );
      setCostosAdicionales(arrayMove(costosAdicionales, oldIndex, newIndex));
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 text-white min-h-screen">
      <Card className="shadow-lg bg-neutral-800">
        <CardHeader className="bg-neutral-800 border-b border-neutral-700">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <CardTitle className="text-2xl font-bold">
                Calculadora de Costos
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-transparent border-blue-500 text-white px-2 py-1 font-extrabold">
                  Precio Sugerido: ${precioSugerido.toFixed(3)}
                </Badge>
                <Badge className="bg-transparent border-indigo-500 text-white px-2 py-1 font-extrabold">
                  Costo Unitario: ${costoUnitario.toFixed(3)}
                </Badge>
                <Badge className="bg-transparent border-red-500 text-white px-2 py-1 font-extrabold">
                  Costo Total: ${costoTotal.toFixed(3)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="nombre-receta" className="whitespace-nowrap">
                Nombre de la receta:
              </Label>
              <Input
                id="nombre-receta"
                value={nombreReceta}
                onChange={(e) => {
                  setNombreReceta(e.target.value);
                  setRecipeNameToSave(e.target.value);
                }}
                placeholder="Ej: Brownies"
                className="bg-neutral-700 text-white border-neutral-600"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Save size={16} />
                  Guardar en DB
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-800 text-white">
                <DialogHeader>
                  <DialogTitle>Guardar Receta</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="save-recipe-input">Nombre de la receta</Label>
                  <Input
                    id="save-recipe-input"
                    value={recipeNameToSave}
                    onChange={(e) => setRecipeNameToSave(e.target.value)}
                    className="bg-neutral-700 text-white border-neutral-600"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveRecipe}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openLoadDialog}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FolderOpen size={16} />
                  Cargar desde DB
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-800 text-white">
                <DialogHeader>
                  <DialogTitle>Cargar Receta</DialogTitle>
                </DialogHeader>
                <div className="py-2 flex flex-col gap-2">
                  {availableRecipes.map((rec, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleLoadRecipe(rec)}
                    >
                      {rec.nombre_receta}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <Button
                onClick={agregarProducto}
                variant="outline"
                className="flex items-center gap-2"
              >
                <PlusCircle size={16} />
                Agregar Producto
              </Button>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle size={18} />
                    <span className="sr-only">Ayuda</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-700 text-white">
                  <p className="max-w-xs">
                    Edite las celdas y reordene productos arrastrando desde el
                    ícono (grip).
                    <br />
                    La columna "DB Precio Producto" es de solo lectura.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="overflow-x-auto mb-8 border border-neutral-700 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="font-bold text-center">
                    Productos
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    Precio Producto
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    DB Precio Producto
                    <div className="text-xs font-normal opacity-75">
                      No editable
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    GR Presentación
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    GR Receta
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    Costo Receta
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndProductos}
              >
                <SortableContext
                  items={productos.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {productos.map((producto) => (
                      <SortableTableRow key={producto.id} id={producto.id}>
                        <TableCell className="font-medium">
                          {renderEditableCell(producto, "nombre")}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(producto, "precioProducto", true)}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(
                            producto,
                            "dbPrecioProducto",
                            true
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(producto, "kgProducto", true)}
                        </TableCell>
                        <TableCell>
                          {renderEditableCell(producto, "grReceta", true)}
                        </TableCell>
                        <TableCell className="text-right font-semibold p-2">
                          ${producto.costoReceta.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => eliminarProducto(producto.id)}
                            aria-label={`Eliminar ${producto.nombre}`}
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </TableCell>
                      </SortableTableRow>
                    ))}
                    <TableRow className="bg-neutral-700 text-white font-bold">
                      <TableCell colSpan={6} className="text-right">
                        Total Costo Receta:
                      </TableCell>
                      <TableCell className="text-right">
                        ${totalCostoReceta.toFixed(3)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </SortableContext>
              </DndContext>
            </Table>
          </div>
          {/* Tabla de Costos Adicionales */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Costos Adicionales</h3>
              <Button
                onClick={agregarCostoAdicional}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <PlusCircle size={14} />
                Agregar
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndCostos}
            >
              <SortableContext
                items={costosAdicionales.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="overflow-x-auto border border-neutral-700 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="font-bold text-center">
                          Descripción
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Costo Empaque
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Cantidad x Empaque
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Costo Unidad
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Cantidad Utilizada
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Total
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costosAdicionales.map((costo) => (
                        <SortableTableRow key={costo.id} id={costo.id}>
                          <TableCell>
                            {renderEditableCell(
                              costo,
                              "descripcion",
                              false,
                              true,
                              "costosAdicionales"
                            )}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(
                              costo,
                              "costoEmpaque",
                              true,
                              true,
                              "costosAdicionales"
                            )}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(
                              costo,
                              "cantidadPorEmpaque",
                              true,
                              true,
                              "costosAdicionales"
                            )}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(
                              costo,
                              "costoUnitario",
                              true,
                              false,
                              "costosAdicionales"
                            )}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(
                              costo,
                              "cantidadUtilizada",
                              true,
                              true,
                              "costosAdicionales"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold p-2">
                            ${costo.total.toFixed(3)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => eliminarCostoAdicional(costo.id)}
                              aria-label={`Eliminar ${costo.descripcion}`}
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </TableCell>
                        </SortableTableRow>
                      ))}
                      <TableRow className="bg-neutral-700 text-white font-bold">
                        <TableCell colSpan={7} className="text-right">
                          Total Costos Variables:
                        </TableCell>
                        <TableCell className="text-right">
                          ${totalCostosVariables.toFixed(3)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </SortableContext>
            </DndContext>
          </div>
          {/* Resumen de Costos y Cálculos Finales */}
          <div className="overflow-x-auto border border-neutral-700 rounded-lg mb-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-center" colSpan={2}>
                    Resumen de Costos y Cálculos Finales
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    label: "Cantidades Producidas",
                    value: renderEditableFinalValue(
                      "cantidadesProducidas",
                      cantidadesProducidas
                    ),
                  },
                  {
                    label: "Gastos Operativos",
                    value: renderEditableFinalValue(
                      "gastosOperativos",
                      gastosOperativos
                    ),
                  },
                  {
                    label: "Porcentaje (%) de Utilidad",
                    value: renderEditableFinalValue(
                      "porcentajeUtilidad",
                      porcentajeUtilidad
                    ),
                  },
                  {
                    label: "Total Costo de Receta",
                    value: `$${costoTotal.toFixed(3)}`,
                  },
                  {
                    label: "Costo Unitario",
                    value: `$${costoUnitario.toFixed(3)}`,
                  },
                  {
                    label: "Precio Sugerido",
                    value: `$${precioSugerido.toFixed(3)}`,
                  },
                  {
                    label: "Total Ingresos",
                    value: `$${totalIngresos.toFixed(3)}`,
                  },
                  {
                    label: "Ganancia Bruta",
                    value: `$${gananciaBruta.toFixed(3)}`,
                  },
                  {
                    label: "Ganancia Neta",
                    value: `$${gananciaNeta.toFixed(3)}`,
                  },
                  { label: "Margen Bruto (%)", value: `${margenBruto}%` },
                  { label: "Margen Neto (%)", value: `${margenNeto}%` },
                ].map((row, idx) => (
                  <TableRow
                    key={idx}
                    className={
                      idx % 2 === 0 ? "bg-neutral-900/85" : "bg-neutral-800"
                    }
                  >
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Instrucciones */}
          <div className="mt-6 p-4 rounded-lg border border-neutral-700">
            <h3 className="font-semibold mb-2 text-lg">Instrucciones:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-white">
              <li>Haz clic en cualquier celda para editarla.</li>
              <li>
                Presiona Enter o haz clic fuera de la celda para guardar los
                cambios.
              </li>
              <li>Los costos se calculan automáticamente.</li>
              <li>
                Puedes agregar, reordenar (drag & drop) y eliminar productos y
                costos adicionales.
              </li>
              <li>
                Usa los botones "Guardar en DB", "Cargar desde DB" y "Exportar
                CSV" para respaldar o exportar tu receta.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
