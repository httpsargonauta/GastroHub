"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import { supabase } from "@/utils/supabase/client";

interface RecentActivityProps {
  userId: string;
  onViewAll: (tab: string) => void;
}

interface Sale {
  id: string;
  cliente: string;
  productos: string;
  total: number;
  estado: string;
  fecha: string;
  hora: string;
}

interface InventoryItem {
  id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  stock_minimo: number;
  unidad: string;
}

interface Purchase {
  id: string;
  proveedor_nombre: string;
  total: number;
  estado: string;
  fecha_compra: string;
  fecha_recepcion: string | null;
}

export function RecentActivity({ userId, onViewAll }: RecentActivityProps) {
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivityData() {
      setIsLoading(true);
      try {
        // Fetch recent sales
        const { data: salesData, error: salesError } = await supabase
          .from("ventas")
          .select("id, cliente, productos, total, estado, fecha, hora")
          .eq("user_id", userId)
          .order("fecha", { ascending: false })
          .order("hora", { ascending: false })
          .limit(5);

        if (salesError)
          throw new Error(`Error fetching sales: ${salesError.message}`);

        // Fetch inventory data
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("ingredients")
          .eq("user_id", userId)
          .single();

        if (inventoryError && inventoryError.code !== "PGRST116") {
          throw new Error(
            `Error fetching inventory: ${inventoryError.message}`
          );
        }

        // Fetch pending purchases
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("purchases")
          .select(
            "id, proveedor_nombre, total, estado, fecha_compra, fecha_recepcion"
          )
          .eq("user_id", userId)
          .in("estado", ["Pendiente", "En Camino", "Procesando"])
          .order("fecha_compra", { ascending: false })
          .limit(5);

        if (purchasesError)
          throw new Error(
            `Error fetching purchases: ${purchasesError.message}`
          );

        // Process low stock items
        let lowStockItemsList: InventoryItem[] = [];
        if (inventoryData?.ingredients) {
          lowStockItemsList = inventoryData.ingredients
            .filter((item: any) => item.cantidad <= (item.stock_minimo || 0))
            .sort((a: any, b: any) => {
              // Sort by criticality (how far below minimum stock)
              const aRatio =
                a.stock_minimo > 0 ? a.cantidad / a.stock_minimo : 0;
              const bRatio =
                b.stock_minimo > 0 ? b.cantidad / b.stock_minimo : 0;
              return aRatio - bRatio;
            })
            .slice(0, 5);
        }

        setRecentSales(salesData || []);
        setLowStockItems(lowStockItemsList);
        setPendingPurchases(purchasesData || []);
      } catch (error) {
        console.error("Error fetching activity data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchActivityData();
    }
  }, [userId]);

  return (
    <Tabs defaultValue="ventas" className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <TabsList className="bg-zinc-900/70 p-1 w-full sm:w-auto">
          <TabsTrigger
            value="ventas"
            className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            Ventas Recientes
          </TabsTrigger>
          <TabsTrigger
            value="inventario"
            className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            Inventario Bajo
          </TabsTrigger>
          <TabsTrigger
            value="compras"
            className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
          >
            Compras Pendientes
          </TabsTrigger>
        </TabsList>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white w-full sm:w-auto"
          onClick={() => onViewAll("ventas")}
        >
          Ver Todo
        </Button>
      </div>

      <TabsContent value="ventas" className="mt-0">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Productos
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-zinc-800">
                        <td className="px-4 py-3">
                          <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-32 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-40 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-20 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                      </tr>
                    ))
                  ) : recentSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-zinc-400"
                      >
                        No hay ventas recientes
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((sale) => {
                      const saleDate = parseISO(sale.fecha);
                      const timeAgo = formatDistanceToNow(saleDate, {
                        locale: es,
                        addSuffix: true,
                      });

                      return (
                        <tr
                          key={sale.id}
                          className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            #{sale.id.slice(-4)}
                          </td>
                          <td className="px-4 py-3 text-sm">{sale.cliente}</td>
                          <td
                            className="px-4 py-3 text-sm max-w-[200px] truncate"
                            title={sale.productos}
                          >
                            {sale.productos}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge className="bg-emerald-500/20 text-emerald-400">
                              {sale.estado}
                            </Badge>
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-zinc-400"
                            title={`${sale.fecha} ${sale.hora}`}
                          >
                            {timeAgo}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inventario" className="mt-0">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Stock Actual
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Stock Mínimo
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-zinc-800">
                        <td className="px-4 py-3">
                          <div className="h-5 w-32 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-20 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                      </tr>
                    ))
                  ) : lowStockItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-zinc-400"
                      >
                        No hay productos con stock bajo
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => {
                      const isCritical =
                        item.cantidad === 0 ||
                        item.cantidad < item.stock_minimo * 0.5;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {item.nombre}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.categoria || "General"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.cantidad} {item.unidad || "gr"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.stock_minimo} {item.unidad || "gr"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge
                              className={
                                isCritical
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }
                            >
                              {isCritical ? "Crítico" : "Bajo"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="compras" className="mt-0">
        <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Proveedor
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Fecha Compra
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Fecha Entrega
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-zinc-800">
                        <td className="px-4 py-3">
                          <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-40 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-20 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-800"></div>
                        </td>
                      </tr>
                    ))
                  ) : pendingPurchases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-zinc-400"
                      >
                        No hay compras pendientes
                      </td>
                    </tr>
                  ) : (
                    pendingPurchases.map((purchase) => {
                      const purchaseDate = parseISO(purchase.fecha_compra);
                      const formattedPurchaseDate = format(
                        purchaseDate,
                        "dd/MM/yyyy"
                      );

                      let deliveryText = "No especificada";
                      if (purchase.fecha_recepcion) {
                        const deliveryDate = parseISO(purchase.fecha_recepcion);
                        deliveryText = format(deliveryDate, "dd/MM/yyyy");
                      }

                      return (
                        <tr
                          key={purchase.id}
                          className="border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            #{purchase.id.slice(-4)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {purchase.proveedor_nombre}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {formatCurrency(purchase.total)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formattedPurchaseDate}
                          </td>
                          <td className="px-4 py-3 text-sm">{deliveryText}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge
                              className={
                                purchase.estado === "En Camino"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : purchase.estado === "Procesando"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-zinc-500/20 text-zinc-400"
                              }
                            >
                              {purchase.estado}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
