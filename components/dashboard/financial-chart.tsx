"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/utils/format";
import { supabase } from "@/utils/supabase/client";

interface FinancialChartProps {
  userId: string;
}

interface ChartData {
  labels: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

export function FinancialChart({ userId }: FinancialChartProps) {
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    revenue: [],
    expenses: [],
    profit: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month"
  );

  useEffect(() => {
    async function fetchChartData() {
      setIsLoading(true);
      try {
        // Calculate date range based on timeframe
        const today = new Date();
        let startDate: Date;
        let dateFormat: string;
        let groupByFormat: string;

        if (timeframe === "week") {
          // Last 7 days
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 6);
          dateFormat = "dd/MM";
          groupByFormat = "fecha";
        } else if (timeframe === "month") {
          // Last 30 days
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 29);
          dateFormat = "dd/MM";
          groupByFormat = "fecha";
        } else {
          // Last 12 months
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 11);
          startDate.setDate(1);
          dateFormat = "MMM yyyy";
          groupByFormat = "to_char(fecha, 'YYYY-MM')";
        }

        const startDateStr = startDate.toISOString().split("T")[0];

        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from("ventas")
          .select("fecha, total")
          .eq("user_id", userId)
          .gte("fecha", startDateStr)
          .order("fecha", { ascending: true });

        if (salesError)
          throw new Error(`Error fetching sales: ${salesError.message}`);

        // Fetch purchases data
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("purchases")
          .select("fecha_compra, total")
          .eq("user_id", userId)
          .gte("fecha_compra", startDateStr)
          .order("fecha_compra", { ascending: true });

        if (purchasesError)
          throw new Error(
            `Error fetching purchases: ${purchasesError.message}`
          );

        // Process data based on timeframe
        const labels: string[] = [];
        const revenueByPeriod: Record<string, number> = {};
        const expensesByPeriod: Record<string, number> = {};

        if (timeframe === "year") {
          // Group by month for yearly view
          for (let i = 0; i < 12; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() - 11 + i);
            date.setDate(1);
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
            const monthLabel = date.toLocaleDateString("es-ES", {
              month: "short",
              year: "numeric",
            });
            labels.push(monthLabel);
            revenueByPeriod[monthKey] = 0;
            expensesByPeriod[monthKey] = 0;
          }

          // Aggregate sales by month
          salesData?.forEach((sale) => {
            const monthKey = sale.fecha.slice(0, 7); // YYYY-MM format
            if (revenueByPeriod[monthKey] !== undefined) {
              revenueByPeriod[monthKey] += sale.total;
            }
          });

          // Aggregate purchases by month
          purchasesData?.forEach((purchase) => {
            const monthKey = purchase.fecha_compra.slice(0, 7); // YYYY-MM format
            if (expensesByPeriod[monthKey] !== undefined) {
              expensesByPeriod[monthKey] += purchase.total;
            }
          });
        } else {
          // Daily view for week or month
          const days = timeframe === "week" ? 7 : 30;
          for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (days - 1) + i);
            const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format
            const dayLabel = date.toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
            });
            labels.push(dayLabel);
            revenueByPeriod[dayKey] = 0;
            expensesByPeriod[dayKey] = 0;
          }

          // Aggregate sales by day
          salesData?.forEach((sale) => {
            if (revenueByPeriod[sale.fecha] !== undefined) {
              revenueByPeriod[sale.fecha] += sale.total;
            }
          });

          // Aggregate purchases by day
          purchasesData?.forEach((purchase) => {
            if (expensesByPeriod[purchase.fecha_compra] !== undefined) {
              expensesByPeriod[purchase.fecha_compra] += purchase.total;
            }
          });
        }

        // Convert to arrays for chart
        const revenue = Object.values(revenueByPeriod);
        const expenses = Object.values(expensesByPeriod);
        const profit = revenue.map((rev, i) => rev - expenses[i]);

        setChartData({
          labels,
          revenue,
          expenses,
          profit,
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchChartData();
    }
  }, [userId, timeframe]);

  // Find the maximum value for scaling
  const maxValue = Math.max(...chartData.revenue, ...chartData.expenses);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Ingresos vs Gastos</CardTitle>
            <CardDescription className="text-zinc-400">
              Análisis comparativo de ingresos y gastos
            </CardDescription>
          </div>
          <Tabs
            defaultValue="month"
            value={timeframe}
            onValueChange={(value) =>
              setTimeframe(value as "week" | "month" | "year")
            }
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-zinc-800 p-1 w-full sm:w-auto">
              <TabsTrigger
                value="week"
                className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                Semana
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                Mes
              </TabsTrigger>
              <TabsTrigger
                value="year"
                className="flex-1 sm:flex-none data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-purple-400"
              >
                Año
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] w-full animate-pulse rounded-md bg-zinc-800"></div>
        ) : (
          <div className="h-[300px] w-full">
            <div className="flex h-full w-full flex-col">
              <div className="flex mb-2 items-center gap-4 justify-end">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-zinc-400">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                  <span className="text-xs text-zinc-400">Gastos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-zinc-400">Beneficio</span>
                </div>
              </div>

              <div className="flex h-[250px] items-end gap-1 overflow-hidden">
                {chartData.labels.map((label, i) => {
                  const revenueHeight =
                    maxValue > 0 ? (chartData.revenue[i] / maxValue) * 100 : 0;
                  const expenseHeight =
                    maxValue > 0 ? (chartData.expenses[i] / maxValue) * 100 : 0;
                  const profitValue = chartData.profit[i];
                  const isProfitPositive = profitValue >= 0;

                  return (
                    <div
                      key={i}
                      className="group relative flex w-full flex-col items-center"
                    >
                      <div className="absolute bottom-full mb-2 hidden rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium shadow-lg group-hover:block z-10">
                        <div className="text-purple-400">
                          Ingresos: {formatCurrency(chartData.revenue[i])}
                        </div>
                        <div className="text-rose-400">
                          Gastos: {formatCurrency(chartData.expenses[i])}
                        </div>
                        <div
                          className={
                            isProfitPositive
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }
                        >
                          Beneficio: {formatCurrency(profitValue)}
                        </div>
                      </div>

                      <div className="relative w-full">
                        {/* Revenue bar */}
                        <div
                          className="absolute bottom-0 left-0 w-[45%] rounded-t bg-purple-500 transition-all duration-200"
                          style={{ height: `${revenueHeight}%` }}
                        ></div>

                        {/* Expense bar */}
                        <div
                          className="absolute bottom-0 right-0 w-[45%] rounded-t bg-rose-500 transition-all duration-200"
                          style={{ height: `${expenseHeight}%` }}
                        ></div>

                        {/* Profit indicator */}
                        {isProfitPositive ? (
                          <div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-[80%] bg-emerald-500"
                            style={{
                              bottom: `${(profitValue / maxValue) * 100}%`,
                            }}
                          ></div>
                        ) : (
                          <div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-[80%] bg-rose-500"
                            style={{
                              bottom: `${
                                (chartData.expenses[i] / maxValue) * 100
                              }%`,
                            }}
                          ></div>
                        )}

                        {/* Transparent full-height div for hover */}
                        <div className="absolute inset-0 cursor-pointer"></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-12 text-xs text-zinc-500">
                {chartData.labels.map((label, i) => (
                  <div key={i} className="col-span-1 text-center truncate">
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
