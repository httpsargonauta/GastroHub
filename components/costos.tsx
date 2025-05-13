"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
  Calculator,
  DollarSign,
  Percent,
  Package,
  ShoppingCart,
  FileText,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dialogs from shadcn/ui
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Imports for Drag and Drop (dnd-kit)
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
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

// Types
interface Product {
  id: number;
  nombre: string;
  precioProducto: number | string;
  dbPrecioProducto: number | string;
  kgProducto: number;
  grReceta: number;
  costoReceta: number;
  proveedor?: string;
}

interface AdditionalCost {
  id: number;
  descripcion: string;
  costoEmpaque: number;
  cantidadPorEmpaque: number;
  costoUnitario: number;
  cantidadUtilizada: number;
  total: number;
}

// Helper component for sortable rows
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
        <GripVertical size={18} className="text-zinc-400" aria-hidden="true" />
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function CostCalculator() {
  /* States for recipe and calculations */
  const [recipeName, setRecipeName] = useState<string>("My Recipe");
  const [products, setProducts] = useState<Product[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [producedQuantities, setProducedQuantities] = useState<number>(8);
  const [operatingExpenses, setOperatingExpenses] = useState<number>(0.27);
  const [profitPercentage, setProfitPercentage] = useState<number>(50);
  const [totalRecipeCost, setTotalRecipeCost] = useState<number>(0);
  const [totalVariableCosts, setTotalVariableCosts] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);

  // States for dialogs (save and load recipes)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [recipeNameToSave, setRecipeNameToSave] = useState(recipeName);
  const [availableRecipes, setAvailableRecipes] = useState<any[]>([]);

  // State for cell editing
  const [editingCell, setEditingCell] = useState<{
    id: number | null;
    field: string | null;
    section?: string;
  }>({ id: null, field: null });
  const [editingValue, setEditingValue] = useState("");

  // State for current user from Supabase Auth
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sensor configuration for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Asynchronous user retrieval using getSession and onAuthStateChange
  useEffect(() => {
    // Subscribe to authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );
    // Get session when component mounts
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error.message);
      } else {
        setCurrentUser(session?.user);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /* General calculations */
  useEffect(() => {
    const totalProducts = products.reduce(
      (sum, product) => sum + product.costoReceta,
      0
    );
    setTotalRecipeCost(Number(totalProducts.toFixed(3)));

    const totalAdditional = additionalCosts.reduce(
      (sum, cost) => sum + cost.total,
      0
    );
    setTotalVariableCosts(Number(totalAdditional.toFixed(3)));

    const total = totalProducts + totalAdditional;
    setTotalCost(Number(total.toFixed(3)));

    const unitCostValue =
      producedQuantities > 0
        ? total / producedQuantities + operatingExpenses
        : 0;
    setUnitCost(Number(unitCostValue.toFixed(3)));

    const suggested = unitCostValue * (1 + profitPercentage / 100);
    setSuggestedPrice(Number(suggested.toFixed(3)));
  }, [
    products,
    additionalCosts,
    producedQuantities,
    operatingExpenses,
    profitPercentage,
  ]);

  /* New accounting calculations */
  const totalRevenue = Number((suggestedPrice * producedQuantities).toFixed(3));
  const grossProfit =
    producedQuantities > 0
      ? Number(
          (
            (suggestedPrice - totalCost / producedQuantities) *
            producedQuantities
          ).toFixed(3)
        )
      : 0;
  const netProfit = Number(
    ((suggestedPrice - unitCost) * producedQuantities).toFixed(3)
  );
  const grossMargin =
    suggestedPrice > 0
      ? Number(
          (
            ((suggestedPrice - totalCost / (producedQuantities || 1)) /
              suggestedPrice) *
            100
          ).toFixed(2)
        )
      : 0;
  const netMargin =
    suggestedPrice > 0
      ? Number(
          (((suggestedPrice - unitCost) / suggestedPrice) * 100).toFixed(2)
        )
      : 0;

  /* Function to recalculate recipe cost */
  const recalcRecipeCost = (product: Product) => {
    const userPrice = Number.parseFloat(product.precioProducto.toString()) || 0;
    const defaultPrice =
      Number.parseFloat(product.dbPrecioProducto.toString()) || 0;
    const effectivePrice = userPrice !== 0 ? userPrice : defaultPrice;
    const grReceta = Number.parseFloat(product.grReceta.toString());
    const grPresentacion = Number.parseFloat(product.kgProducto.toString());
    return grPresentacion > 0
      ? Number(((effectivePrice * grReceta) / grPresentacion).toFixed(3))
      : 0;
  };

  /* exportToCSV */
  const exportToCSV = () => {
    let csvContent = "";
    csvContent += "Products:\n";
    csvContent +=
      "id,nombre,precioProducto,dbPrecioProducto,kgProducto,grReceta,costoReceta\n";
    products.forEach((prod) => {
      csvContent += `${prod.id},"${prod.nombre}",${prod.precioProducto},${prod.dbPrecioProducto},${prod.kgProducto},${prod.grReceta},${prod.costoReceta}\n`;
    });
    csvContent += "\n";
    csvContent += "AdditionalCosts:\n";
    csvContent +=
      "id,descripcion,costoEmpaque,cantidadPorEmpaque,costoUnitario,cantidadUtilizada,total\n";
    additionalCosts.forEach((cost) => {
      csvContent += `${cost.id},"${cost.descripcion}",${cost.costoEmpaque},${cost.cantidadPorEmpaque},${cost.costoUnitario},${cost.cantidadUtilizada},${cost.total}\n`;
    });
    csvContent += "\n";
    csvContent += "Recipe:\n";
    csvContent +=
      "recipeName,producedQuantities,operatingExpenses,profitPercentage\n";
    csvContent += `${recipeName},${producedQuantities},${operatingExpenses},${profitPercentage}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${recipeName}_recipe.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast("Recipe exported to CSV successfully", {
      description: `File: ${recipeName}_recipe.csv`,
      icon: <FileText className="h-5 w-5 text-green-500" />,
    });
  };

  /* Handlers for cell editing */
  const handleCellChange = (id: number, field: string, value: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        if (product.id === id) {
          const updatedProduct = { ...product };
          if (field === "nombre") {
            updatedProduct.nombre = value;
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
                  updatedProduct.dbPrecioProducto = Number(
                    found.precio_presentacion
                  );
                }
              } catch (error) {
                console.error(
                  "Error parsing inventory from localStorage:",
                  error
                );
              }
            }
          } else if (field === "proveedor") {
            updatedProduct.proveedor = value;
          } else {
            const numericValue = Number.parseFloat(value);
            if (field in updatedProduct) {
              (updatedProduct as Record<string, any>)[field] = !isNaN(
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
            updatedProduct.costoReceta = recalcRecipeCost(updatedProduct);
          }
          return updatedProduct;
        }
        return product;
      })
    );
  };

  const handleAdditionalCostChange = (
    id: number,
    field: string,
    value: string
  ) => {
    setAdditionalCosts((prevCosts) =>
      prevCosts.map((cost) => {
        if (cost.id === id) {
          const updatedCost = { ...cost };
          if (field === "descripcion") {
            updatedCost[field] = value;
          } else {
            const numericValue = Number.parseFloat(value);
            if (field in updatedCost) {
              (updatedCost as Record<string, any>)[field] = !isNaN(numericValue)
                ? numericValue
                : value;
            }
            if (["costoEmpaque", "cantidadPorEmpaque"].includes(field)) {
              updatedCost.costoUnitario =
                updatedCost.cantidadPorEmpaque > 0
                  ? updatedCost.costoEmpaque / updatedCost.cantidadPorEmpaque
                  : 0;
            }
            if (["costoUnitario", "cantidadUtilizada"].includes(field)) {
              updatedCost.total =
                updatedCost.costoUnitario * updatedCost.cantidadUtilizada;
            }
          }
          return updatedCost;
        }
        return cost;
      })
    );
  };

  const handleFinalValueChange = (field: string, value: string) => {
    const numericValue = Number.parseFloat(value);
    switch (field) {
      case "producedQuantities":
        setProducedQuantities(!isNaN(numericValue) ? numericValue : 0);
        break;
      case "operatingExpenses":
        setOperatingExpenses(!isNaN(numericValue) ? numericValue : 0);
        break;
      case "profitPercentage":
        setProfitPercentage(!isNaN(numericValue) ? numericValue : 0);
        break;
    }
  };

  const startEditing = (id: number, field: string, section = "products") => {
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

  /* Render editable cells */
  const renderEditableCell = (
    item: any,
    field: string,
    isNumeric = false,
    isEditable = true,
    section = "products"
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
            className="h-8 p-1 text-right bg-zinc-800 text-white border-zinc-700 focus-visible:ring-purple-500"
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
            aria-label={`Edit ${field}`}
          />
        );
      }
      return (
        <Input
          autoFocus
          className={`
          autoFocus
          className={\`h-8 p-1 ${
            isNumeric ? "text-right" : ""
          } bg-zinc-800 text-white border-zinc-700 focus-visible:ring-purple-500`}
          value={value.toString()}
          onChange={(e) => {
            if (section === "products") {
              handleCellChange(item.id, field, e.target.value);
            } else if (section === "additionalCosts") {
              handleAdditionalCostChange(item.id, field, e.target.value);
            }
          }}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEditing();
          }}
          aria-label={`Edit ${field}`}
        />
      );
    }
    return (
      <div
        className={`cursor-pointer p-2 ${
          isNumeric ? "text-right" : ""
        } hover:bg-zinc-800/50 rounded transition-colors`}
        onClick={() => startEditing(item.id, field, section)}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${field}`}
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
          className="h-8 p-1 text-right bg-zinc-800 text-white border-zinc-700 focus-visible:ring-purple-500"
          value={value.toString()}
          onChange={(e) => handleFinalValueChange(field, e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishEditing();
          }}
          aria-label={`Edit ${field}`}
        />
      );
    }
    return (
      <div
        className="cursor-pointer p-2 text-right hover:bg-zinc-800/50 rounded transition-colors"
        onClick={() => setEditingCell({ id: 0, field })}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${field}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            setEditingCell({ id: 0, field });
        }}
      >
        {field === "profitPercentage" ? `${value}%` : value.toFixed(3)}
      </div>
    );
  };

  // Functions to add and remove elements
  const addProduct = () => {
    const newId =
      products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      id: newId,
      nombre: "New product",
      precioProducto: 0,
      dbPrecioProducto: "#N/D",
      kgProducto: 100,
      grReceta: 100,
      costoReceta: 0,
    };
    newProduct.costoReceta = Number(
      (
        (Number(newProduct.precioProducto) * newProduct.grReceta) /
        newProduct.kgProducto
      ).toFixed(3)
    );
    setProducts([...products, newProduct]);

    toast("Product added", {
      description: "Click on cells to edit values",
      icon: <PlusCircle className="h-5 w-5 text-purple-500" />,
    });
  };

  const addAdditionalCost = () => {
    const newId =
      additionalCosts.length > 0
        ? Math.max(...additionalCosts.map((c) => c.id)) + 1
        : 1;
    const newCost: AdditionalCost = {
      id: newId,
      descripcion: "New cost",
      costoEmpaque: 0,
      cantidadPorEmpaque: 1,
      costoUnitario: 0,
      cantidadUtilizada: 0,
      total: 0,
    };
    setAdditionalCosts([...additionalCosts, newCost]);

    toast("Additional cost added", {
      description: "Click on cells to edit values",
      icon: <PlusCircle className="h-5 w-5 text-indigo-500" />,
    });
  };

  const deleteProduct = (id: number) => {
    const productToDelete = products.find((p) => p.id === id);
    setProducts(products.filter((product) => product.id !== id));

    toast("Product deleted", {
      description: productToDelete?.nombre || "Product deleted from recipe",
      icon: <Trash2 className="h-5 w-5 text-rose-500" />,
    });
  };

  const deleteAdditionalCost = (id: number) => {
    const costToDelete = additionalCosts.find((c) => c.id === id);
    setAdditionalCosts(additionalCosts.filter((cost) => cost.id !== id));

    toast("Additional cost deleted", {
      description: costToDelete?.descripcion || "Cost deleted from recipe",
      icon: <Trash2 className="h-5 w-5 text-rose-500" />,
    });
  };

  /* Functions to save and load recipes using dialogs with Supabase */
  const handleSaveRecipe = async () => {
    if (!recipeNameToSave.trim() || !currentUser) {
      console.error(
        "Could not save: missing recipe name or user not authenticated."
      );
      return;
    }

    const newRecipe = {
      user_id: currentUser.id,
      nombre_receta: recipeNameToSave,
      productos: products, // Saved as JSON
      costos_adicionales: additionalCosts, // Saved as JSON
      cantidades_producidas: producedQuantities,
      gastos_operativos: operatingExpenses,
      porcentaje_utilidad: profitPercentage,
    };

    // Upsert: use onConflict as array to avoid duplicates
    const { data, error } = await supabase
      .from("recipes")
      .upsert(newRecipe, { onConflict: "user_id,nombre_receta" });

    if (error) {
      console.error("Error saving recipe:", error.message);
      toast("Error saving recipe", {
        description: error.message,
        icon: <Info className="h-5 w-5 text-rose-500" />,
      });
    } else {
      console.log("Recipe saved:", data);
      toast("Recipe saved successfully", {
        description: `${recipeNameToSave} saved to database`,
        icon: <Save className="h-5 w-5 text-emerald-500" />,
      });
    }
    setSaveDialogOpen(false);
  };

  const openLoadDialog = async () => {
    if (!currentUser) {
      console.error("User not authenticated to load recipes.");
      return;
    }

    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Error loading recipes:", error.message);
      toast("Error loading recipes", {
        description: error.message,
        icon: <Info className="h-5 w-5 text-rose-500" />,
      });
      return;
    }
    if (!recipes || recipes.length === 0) {
      toast("No saved recipes", {
        description: "Create and save a recipe first",
        icon: <Info className="h-5 w-5 text-amber-500" />,
      });
      return;
    }
    console.log("Recipes loaded:", recipes);
    setAvailableRecipes(recipes);
    setLoadDialogOpen(true);
  };

  const handleLoadRecipe = (selectedRecipe: any) => {
    setRecipeName(selectedRecipe.nombre_receta);

    const updatedProducts = selectedRecipe.productos.map((prod: any) => {
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

    setProducts(updatedProducts);
    setAdditionalCosts(selectedRecipe.costos_adicionales);
    setProducedQuantities(selectedRecipe.cantidades_producidas);
    setOperatingExpenses(selectedRecipe.gastos_operativos);
    setProfitPercentage(selectedRecipe.porcentaje_utilidad);

    toast("Recipe loaded successfully", {
      description: `${selectedRecipe.nombre_receta} loaded from database`,
      icon: <FolderOpen className="h-5 w-5 text-blue-500" />,
    });
    setLoadDialogOpen(false);
  };

  /* Handler for drag & drop in products table */
  const handleDragEndProducts = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = products.findIndex((item) => item.id === active.id);
      const newIndex = products.findIndex((item) => item.id === over?.id);
      setProducts(arrayMove(products, oldIndex, newIndex));
    }
  };

  /* Handler for drag & drop in additional costs table */
  const handleDragEndCosts = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = additionalCosts.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = additionalCosts.findIndex(
        (item) => item.id === over?.id
      );
      setAdditionalCosts(arrayMove(additionalCosts, oldIndex, newIndex));
    }
  };

  return (
    <div className="w-full">
      <Card className="shadow-lg border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-zinc-900 to-zinc-900/90 border-b border-zinc-800">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">
                    {recipeName}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Cost and price calculator
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 font-medium">
                  <DollarSign className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Price: ${suggestedPrice.toFixed(2)}
                </Badge>
                <Badge className="bg-zinc-800 text-white px-3 py-1.5 font-medium">
                  <Calculator className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Cost: ${unitCost.toFixed(2)}
                </Badge>
                <Badge className="bg-zinc-800 text-white px-3 py-1.5 font-medium">
                  <Percent className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Margin: {netMargin}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="recipe-name" className="whitespace-nowrap">
                Recipe name:
              </Label>
              <Input
                id="recipe-name"
                value={recipeName}
                onChange={(e) => {
                  setRecipeName(e.target.value);
                  setRecipeNameToSave(e.target.value);
                }}
                placeholder="E.g.: Brownies"
                className="bg-zinc-800 text-white border-zinc-700 focus-visible:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-purple-300"
                >
                  <Save size={16} aria-hidden="true" />
                  Save to DB
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Save Recipe</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Save your recipe to the database for later access.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="save-recipe-input">Recipe name</Label>
                  <Input
                    id="save-recipe-input"
                    value={recipeNameToSave}
                    onChange={(e) => setRecipeNameToSave(e.target.value)}
                    className="bg-zinc-800 text-white border-zinc-700 focus-visible:ring-purple-500"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleSaveRecipe}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={openLoadDialog}
                  variant="outline"
                  className="flex items-center gap-2 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-purple-300"
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  Load from DB
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Load Recipe</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Select a saved recipe to load.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {availableRecipes.length === 0 ? (
                    <p className="text-zinc-400 text-center py-4">
                      No saved recipes
                    </p>
                  ) : (
                    availableRecipes.map((rec, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-start border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-purple-300"
                        onClick={() => handleLoadRecipe(rec)}
                      >
                        <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                        {rec.nombre_receta}
                      </Button>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:text-purple-300"
            >
              <Download size={16} aria-hidden="true" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="bg-zinc-800 p-1 mb-6">
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                <ShoppingCart className="h-4 w-4 mr-2" aria-hidden="true" />
                Products
              </TabsTrigger>
              <TabsTrigger
                value="costs"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                <Package className="h-4 w-4 mr-2" aria-hidden="true" />
                Additional Costs
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                <Calculator className="h-4 w-4 mr-2" aria-hidden="true" />
                Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <Button
                    onClick={addProduct}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
                  >
                    <PlusCircle size={16} aria-hidden="true" />
                    Add Product
                  </Button>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-white"
                        aria-label="Help"
                      >
                        <HelpCircle size={18} aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                      <p className="max-w-xs">
                        Edit cells by clicking on them and reorder products by
                        dragging from the icon on the left.
                        <br />
                        The "DB Product Price" column is read-only.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="overflow-x-auto mb-8 border border-zinc-800 rounded-lg bg-zinc-900/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-zinc-800">
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        Products
                      </TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        Product Price
                      </TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        DB Product Price
                        <div className="text-xs font-normal opacity-75">
                          Not editable
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        Presentation (g)
                      </TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        Recipe (g)
                      </TableHead>
                      <TableHead className="font-bold text-center text-zinc-400">
                        Recipe Cost
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndProducts}
                  >
                    <SortableContext
                      items={products.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {products.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-zinc-400"
                            >
                              No products in the recipe. Click "Add Product" to
                              start.
                            </TableCell>
                          </TableRow>
                        ) : (
                          products.map((product) => (
                            <SortableTableRow key={product.id} id={product.id}>
                              <TableCell className="font-medium">
                                {renderEditableCell(product, "nombre")}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  product,
                                  "precioProducto",
                                  true
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  product,
                                  "dbPrecioProducto",
                                  true
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  product,
                                  "kgProducto",
                                  true
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(product, "grReceta", true)}
                              </TableCell>
                              <TableCell className="text-right font-semibold p-2">
                                <Badge
                                  variant="outline"
                                  className="border-purple-500/30 bg-purple-500/10 text-purple-300"
                                >
                                  ${product.costoReceta.toFixed(3)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteProduct(product.id)}
                                  aria-label={`Delete ${product.nombre}`}
                                  className="hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                  <Trash2
                                    size={16}
                                    className="text-zinc-400"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TableCell>
                            </SortableTableRow>
                          ))
                        )}
                        <TableRow className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 text-white font-bold border-t border-zinc-800">
                          <TableCell colSpan={6} className="text-right">
                            Total Recipe Cost:
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                              ${totalRecipeCost.toFixed(3)}
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </SortableContext>
                  </DndContext>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="costs">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package
                    className="h-5 w-5 text-indigo-400"
                    aria-hidden="true"
                  />
                  Additional Costs
                </h3>
                <Button
                  onClick={addAdditionalCost}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 flex items-center gap-2"
                >
                  <PlusCircle size={16} aria-hidden="true" />
                  Add Cost
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndCosts}
              >
                <SortableContext
                  items={additionalCosts.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/50 mb-8">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-800">
                          <TableHead className="w-8"></TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Description
                          </TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Package Cost
                          </TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Quantity per Package
                          </TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Unit Cost
                          </TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Quantity Used
                          </TableHead>
                          <TableHead className="font-bold text-center text-zinc-400">
                            Total
                          </TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {additionalCosts.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-zinc-400"
                            >
                              No additional costs. Click "Add Cost" to add.
                            </TableCell>
                          </TableRow>
                        ) : (
                          additionalCosts.map((cost) => (
                            <SortableTableRow key={cost.id} id={cost.id}>
                              <TableCell>
                                {renderEditableCell(
                                  cost,
                                  "descripcion",
                                  false,
                                  true,
                                  "additionalCosts"
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  cost,
                                  "costoEmpaque",
                                  true,
                                  true,
                                  "additionalCosts"
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  cost,
                                  "cantidadPorEmpaque",
                                  true,
                                  true,
                                  "additionalCosts"
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  cost,
                                  "costoUnitario",
                                  true,
                                  false,
                                  "additionalCosts"
                                )}
                              </TableCell>
                              <TableCell>
                                {renderEditableCell(
                                  cost,
                                  "cantidadUtilizada",
                                  true,
                                  true,
                                  "additionalCosts"
                                )}
                              </TableCell>
                              <TableCell className="text-right font-semibold p-2">
                                <Badge
                                  variant="outline"
                                  className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                                >
                                  ${cost.total.toFixed(3)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteAdditionalCost(cost.id)}
                                  aria-label={`Delete ${cost.descripcion}`}
                                  className="hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                  <Trash2
                                    size={16}
                                    className="text-zinc-400"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </TableCell>
                            </SortableTableRow>
                          ))
                        )}
                        <TableRow className="bg-gradient-to-r from-indigo-900/20 to-blue-900/20 text-white font-bold border-t border-zinc-800">
                          <TableCell colSpan={7} className="text-right">
                            Total Variable Costs:
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                              ${totalVariableCosts.toFixed(3)}
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </SortableContext>
              </DndContext>
            </TabsContent>

            <TabsContent value="summary">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-zinc-800">
                        <TableHead
                          className="font-bold text-center text-zinc-400"
                          colSpan={2}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Calculator
                              className="h-5 w-5 text-purple-400"
                              aria-hidden="true"
                            />
                            Calculation Parameters
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          label: "Quantities Produced",
                          value: renderEditableFinalValue(
                            "producedQuantities",
                            producedQuantities
                          ),
                          icon: (
                            <Package
                              className="h-4 w-4 text-purple-400"
                              aria-hidden="true"
                            />
                          ),
                        },
                        {
                          label: "Operating Expenses",
                          value: renderEditableFinalValue(
                            "operatingExpenses",
                            operatingExpenses
                          ),
                          icon: (
                            <DollarSign
                              className="h-4 w-4 text-purple-400"
                              aria-hidden="true"
                            />
                          ),
                        },
                        {
                          label: "Profit Percentage (%)",
                          value: renderEditableFinalValue(
                            "profitPercentage",
                            profitPercentage
                          ),
                          icon: (
                            <Percent
                              className="h-4 w-4 text-purple-400"
                              aria-hidden="true"
                            />
                          ),
                        },
                      ].map((row, idx) => (
                        <TableRow
                          key={idx}
                          className={
                            idx % 2 === 0 ? "bg-zinc-900/85" : "bg-zinc-900/50"
                          }
                        >
                          <TableCell className="font-medium flex items-center gap-2">
                            {row.icon}
                            {row.label}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-zinc-800">
                        <TableHead
                          className="font-bold text-center text-zinc-400"
                          colSpan={2}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <DollarSign
                              className="h-5 w-5 text-emerald-400"
                              aria-hidden="true"
                            />
                            Financial Results
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          label: "Total Recipe Cost",
                          value: `$${totalCost.toFixed(3)}`,
                          color: "text-zinc-300",
                        },
                        {
                          label: "Unit Cost",
                          value: `$${unitCost.toFixed(3)}`,
                          color: "text-zinc-300",
                        },
                        {
                          label: "Suggested Price",
                          value: `$${suggestedPrice.toFixed(3)}`,
                          color: "text-emerald-400 font-bold",
                        },
                      ].map((row, idx) => (
                        <TableRow
                          key={idx}
                          className={
                            idx % 2 === 0 ? "bg-zinc-900/85" : "bg-zinc-900/50"
                          }
                        >
                          <TableCell className="font-medium">
                            {row.label}
                          </TableCell>
                          <TableCell className={`text-right ${row.color}`}>
                            {row.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-900/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-zinc-800">
                      <TableHead
                        className="font-bold text-center text-zinc-400"
                        colSpan={2}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <ChevronRight
                            className="h-5 w-5 text-blue-400"
                            aria-hidden="true"
                          />
                          Profitability Analysis
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        label: "Total Revenue",
                        value: `$${totalRevenue.toFixed(3)}`,
                        color: "text-blue-400",
                      },
                      {
                        label: "Gross Profit",
                        value: `$${grossProfit.toFixed(3)}`,
                        color: "text-blue-400",
                      },
                      {
                        label: "Net Profit",
                        value: `$${netProfit.toFixed(3)}`,
                        color: "text-blue-400",
                      },
                      {
                        label: "Gross Margin (%)",
                        value: `${grossMargin}%`,
                        color:
                          grossMargin > 30
                            ? "text-emerald-400"
                            : grossMargin > 15
                            ? "text-amber-400"
                            : "text-rose-400",
                      },
                      {
                        label: "Net Margin (%)",
                        value: `${netMargin}%`,
                        color:
                          netMargin > 30
                            ? "text-emerald-400"
                            : netMargin > 15
                            ? "text-amber-400"
                            : "text-rose-400",
                      },
                    ].map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={
                          idx % 2 === 0 ? "bg-zinc-900/85" : "bg-zinc-900/50"
                        }
                      >
                        <TableCell className="font-medium">
                          {row.label}
                        </TableCell>
                        <TableCell
                          className={`text-right ${row.color} font-medium`}
                        >
                          {row.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
