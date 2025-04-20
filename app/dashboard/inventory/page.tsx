"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/utils/supabase/client";

interface Ingredient {
  id: number;
  nombre: string;
  cantidad: number; // en gramos
  preciopresentacion: number;
  precioporgramo: number;
  proveedor: string;
}

export default function InventarioPage() {
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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

  // Al tener el userId, se carga o crea el inventario
  useEffect(() => {
    if (userId) fetchInventory();
  }, [userId]);

  async function fetchInventory() {
    const { data, error } = await supabase
      .from("inventory")
      .select("ingredients")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener el inventario:", error.message);
      return;
    }

    if (!data) {
      // Si no existe el registro, lo creamos con un arreglo vacío
      const { error: insertError } = await supabase
        .from("inventory")
        .insert({ user_id: userId, ingredients: [] });
      if (insertError) {
        console.error("Error creando el inventario:", insertError.message);
        return;
      }
      setIngredientes([]);
    } else {
      setIngredientes(data.ingredients || []);
    }
  }

  // Actualiza el inventario (estado local y en Supabase)
  async function updateInventory(updated: Ingredient[]) {
    setIngredientes(updated);
    if (!userId) return;
    const { error } = await supabase
      .from("inventory")
      .update({ ingredients: updated })
      .eq("user_id", userId);
    if (error) {
      console.error("Error actualizando el inventario:", error.message);
    }
  }

  // Agrega un nuevo ingrediente al arreglo
  function agregarIngrediente() {
    const newId =
      ingredientes.length > 0
        ? Math.max(...ingredientes.map((i) => i.id)) + 1
        : 1;
    const newIngredient: Ingredient = {
      id: newId,
      nombre: "Nuevo ingrediente",
      cantidad: 0,
      preciopresentacion: 0,
      precioporgramo: 0,
      proveedor: "",
    };
    const updated = [...ingredientes, newIngredient];
    updateInventory(updated);
  }

  // Elimina un ingrediente del arreglo
  function eliminarIngrediente(id: number) {
    const updated = ingredientes.filter((ing) => ing.id !== id);
    updateInventory(updated);
  }

  // Actualiza un ingrediente y recalcula "precioporgramo" si corresponde
  function handleChange(id: number, field: keyof Ingredient, value: string) {
    const updated = ingredientes.map((ing) => {
      if (ing.id === id) {
        const newValue =
          field === "nombre" || field === "proveedor" ? value : Number(value);
        let updatedIng = { ...ing, [field]: newValue };
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
        return updatedIng;
      }
      return ing;
    });
    updateInventory(updated);
  }

  // Exporta el arreglo de ingredientes a CSV
  function exportCSV() {
    let csv =
      "id,nombre,cantidad,preciopresentacion,precioporgramo,proveedor\n";
    ingredientes.forEach((i) => {
      csv += `${i.id},"${i.nombre}",${i.cantidad},${i.preciopresentacion},${i.precioporgramo},"${i.proveedor}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "inventario.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Importa ingredientes desde un archivo CSV y actualiza el arreglo completo usando upsert
  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
        if (lines.length < 2) {
          alert("El archivo CSV no tiene suficiente información.");
          return;
        }
        let importedIngredients: Ingredient[] = [];
        try {
          // Se ignora la cabecera (índice 0)
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
              importedIngredients.push({
                id,
                nombre,
                cantidad,
                preciopresentacion,
                precioporgramo,
                proveedor,
              });
            } else {
              console.warn(`Línea no válida: ${lines[i]}`);
            }
          }
          // Actualizamos todo el inventario en una sola operación
          updateInventory(importedIngredients);
          alert("CSV importado correctamente.");
        } catch (error) {
          console.error("Error al importar el CSV:", error);
          alert("Hubo un error al procesar el archivo CSV.");
        }
      }
    };
    reader.readAsText(file);
  }

  const filteredIngredientes = ingredientes.filter((ing) =>
    ing.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold">
            Inventario de Ingredientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={agregarIngrediente}>
              <PlusCircle size={16} className="mr-1" />
              Agregar Ingrediente
            </Button>
            <Button variant="secondary" onClick={exportCSV}>
              Exportar CSV
            </Button>
            <label htmlFor="import-csv" className="cursor-pointer">
              <Button variant="outline">Importar CSV</Button>
            </label>
            <input
              id="import-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={importCSV}
              hidden
            />
          </div>
          <div className="flex justify-end">
            <Input
              placeholder="Buscar ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[400px] rounded-md border">
            <Table className="table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-2 text-left min-w-[200px]">
                    Nombre
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left w-[100px]">
                    Cantidad (Gr)
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left w-[150px]">
                    Precio por Presentación
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left w-[150px]">
                    Precio por Gramo
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left w-[140px]">
                    Proveedor
                  </TableHead>
                  <TableHead className="px-4 py-2 text-center w-[80px]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredientes.map((ing) => (
                  <TableRow key={ing.id}>
                    <TableCell className="px-4 py-2">
                      <Input
                        value={ing.nombre}
                        onChange={(e) =>
                          handleChange(ing.id, "nombre", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Input
                        type="number"
                        value={ing.cantidad.toString()}
                        onChange={(e) =>
                          handleChange(ing.id, "cantidad", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
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
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Input
                        type="number"
                        value={ing.precioporgramo.toFixed(4)}
                        readOnly
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Input
                        value={ing.proveedor}
                        onChange={(e) =>
                          handleChange(ing.id, "proveedor", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        onClick={() => eliminarIngrediente(ing.id)}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
