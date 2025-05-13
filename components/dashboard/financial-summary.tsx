"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
} from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  calculatePercentChange,
} from "@/utils/format";
import { supabase } from "@/utils/supabase/client";

interface FinancialSummaryProps {
  userId: string;
}

interface SummaryData {
  totalRevenue: number;
  previousRevenue: number;
  totalExpenses: number;
  previousExpenses: number;
  profitMargin: number;
  previousProfitMargin: number;
  averageTicket: number;
  previousAverageTicket: number;
  totalSales: number;
  previousSales: number;
  lowStockItems: number;
}

export function FinancialSummary({ userId }: FinancialSummaryProps) {
  const [data, setData] = useState<SummaryData>({
    totalRevenue: 0,
    previousRevenue: 0,
    totalExpenses: 0,
    previousExpenses: 0,
    profitMargin: 0,
    previousProfitMargin: 0,
    averageTicket: 0,
    previousAverageTicket: 0,
    totalSales: 0,
    previousSales: 0,
    lowStockItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFinancialData() {
      setIsLoading(true);
      try {
        // Get current date and previous period
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const currentMonthStart = new Date(currentYear, currentMonth, 1)
          .toISOString()
          .split("T")[0];
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1)
          .toISOString()
          .split("T")[0];
        const previousMonthEnd = new Date(currentYear, currentMonth, 0)
          .toISOString()
          .split("T")[0];

        // Fetch sales data for current month
        const { data: currentSales, error: salesError } = await supabase
          .from("ventas")
          .select("total, fecha")
          .eq("user_id", userId)
          .gte("fecha", currentMonthStart);

        if (salesError)
          throw new Error(`Error fetching sales: ${salesError.message}`);

        // Fetch sales data for previous month
        const { data: previousSales, error: prevSalesError } = await supabase
          .from("ventas")
          .select("total, fecha")
          .eq("user_id", userId)
          .gte("fecha", previousMonthStart)
          .lte("fecha", previousMonthEnd);

        if (prevSalesError)
          throw new Error(
            `Error fetching previous sales: ${prevSalesError.message}`
          );

        // Fetch purchases data for current month
        const { data: currentPurchases, error: purchasesError } = await supabase
          .from("purchases")
          .select("total, fecha_compra")
          .eq("user_id", userId)
          .gte("fecha_compra", currentMonthStart);

        if (purchasesError)
          throw new Error(
            `Error fetching purchases: ${purchasesError.message}`
          );

        // Fetch purchases data for previous month
        const { data: previousPurchases, error: prevPurchasesError } =
          await supabase
            .from("purchases")
            .select("total, fecha_compra")
            .eq("user_id", userId)
            .gte("fecha_compra", previousMonthStart)
            .lte("fecha_compra", previousMonthEnd);

        if (prevPurchasesError)
          throw new Error(
            `Error fetching previous purchases: ${prevPurchasesError.message}`
          );

        // Fetch inventory data to check low stock items
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

        // Calculate financial metrics
        const currentRevenue =
          currentSales?.reduce((sum, sale) => sum + sale.total, 0) || 0;
        const prevRevenue =
          previousSales?.reduce((sum, sale) => sum + sale.total, 0) || 0;

        const currentExpenses =
          currentPurchases?.reduce(
            (sum, purchase) => sum + purchase.total,
            0
          ) || 0;
        const prevExpenses =
          previousPurchases?.reduce(
            (sum, purchase) => sum + purchase.total,
            0
          ) || 0;

        const currentProfit = currentRevenue - currentExpenses;
        const prevProfit = prevRevenue - prevExpenses;

        const currentProfitMargin =
          currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
        const prevProfitMargin =
          prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

        const currentSalesCount = currentSales?.length || 0;
        const prevSalesCount = previousSales?.length || 0;

        const currentAvgTicket =
          currentSalesCount > 0 ? currentRevenue / currentSalesCount : 0;
        const prevAvgTicket =
          prevSalesCount > 0 ? prevRevenue / prevSalesCount : 0;

        // Count low stock items
        let lowStockCount = 0;
        if (inventoryData?.ingredients) {
          const ingredients = inventoryData.ingredients;
          lowStockCount = ingredients.filter(
            (item: any) => item.cantidad <= (item.stock_minimo || 0)
          ).length;
        }

        setData({
          totalRevenue: currentRevenue,
          previousRevenue: prevRevenue,
          totalExpenses: currentExpenses,
          previousExpenses: prevExpenses,
          profitMargin: currentProfitMargin,
          previousProfitMargin: prevProfitMargin,
          averageTicket: currentAvgTicket,
          previousAverageTicket: prevAvgTicket,
          totalSales: currentSalesCount,
          previousSales: prevSalesCount,
          lowStockItems: lowStockCount,
        });
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchFinancialData();
    }
  }, [userId]);

  const summaryCards = [
    {
      title: "Ingresos Totales",
      value: data.totalRevenue,
      previousValue: data.previousRevenue,
      icon: <DollarSign className="h-5 w-5" />,
      formatter: formatCurrency,
      color: "from-emerald-600 to-teal-600",
    },
    {
      title: "Gastos Totales",
      value: data.totalExpenses,
      previousValue: data.previousExpenses,
      icon: <ShoppingCart className="h-5 w-5" />,
      formatter: formatCurrency,
      color: "from-rose-600 to-pink-600",
    },
    {
      title: "Margen de Beneficio",
      value: data.profitMargin,
      previousValue: data.previousProfitMargin,
      icon: <TrendingUp className="h-5 w-5" />,
      formatter: formatPercent,
      color: "from-blue-600 to-indigo-600",
    },
    {
      title: "Ticket Promedio",
      value: data.averageTicket,
      previousValue: data.previousAverageTicket,
      icon: <DollarSign className="h-5 w-5" />,
      formatter: formatCurrency,
      color: "from-amber-600 to-yellow-600",
    },
    {
      title: "Total Ventas",
      value: data.totalSales,
      previousValue: data.previousSales,
      icon: <ShoppingCart className="h-5 w-5" />,
      formatter: (val: number) => val.toString(),
      color: "from-purple-600 to-indigo-600",
    },
    {
      title: "Inventario Bajo",
      value: data.lowStockItems,
      previousValue: 0,
      icon: <Package className="h-5 w-5" />,
      formatter: (val: number) => val.toString(),
      color: "from-orange-600 to-red-600",
      noComparison: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {summaryCards.map((card, index) => {
        const percentChange = calculatePercentChange(
          card.value,
          card.previousValue
        );
        const isPositive =
          card.title === "Gastos Totales" || card.title === "Inventario Bajo"
            ? percentChange < 0
            : percentChange > 0;

        return (
          <Card
            key={index}
            className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${card.color}`}
                >
                  {card.icon}
                </div>
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {card.title}
                </CardTitle>
              </div>
              {!card.noComparison && (
                <div
                  className={`rounded-full p-1 ${
                    isPositive ? "bg-emerald-900/20" : "bg-rose-900/20"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded-md bg-zinc-800"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {card.formatter(card.value)}
                  </div>
                  {!card.noComparison && (
                    <p
                      className={`mt-1 text-xs ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {percentChange > 0 ? "+" : ""}
                      {percentChange.toFixed(1)}% vs mes anterior
                    </p>
                  )}
                  {card.noComparison && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Requiere atención
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
