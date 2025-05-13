"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/utils/format";
import { supabase } from "@/utils/supabase/client";

interface ProductPerformanceProps {
  userId: string;
}

interface ProductData {
  name: string;
  value: number;
  percentage: number;
  growth: number;
}

export function ProductPerformance({ userId }: ProductPerformanceProps) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProductData() {
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

        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from("ventas")
          .select("productos, total")
          .eq("user_id", userId)
          .gte("fecha", currentMonthStart);

        if (salesError)
          throw new Error(`Error fetching sales: ${salesError.message}`);

        // Fetch previous period sales data
        const { data: prevSalesData, error: prevSalesError } = await supabase
          .from("ventas")
          .select("productos, total")
          .eq("user_id", userId)
          .gte("fecha", previousMonthStart)
          .lte("fecha", previousMonthEnd);

        if (prevSalesError)
          throw new Error(
            `Error fetching previous sales: ${prevSalesError.message}`
          );

        // Process current period data
        const productMap: Record<string, { count: number; revenue: number }> =
          {};
        let totalSales = 0;

        salesData?.forEach((sale) => {
          // Parse products from the text field
          // Assuming products are comma-separated or line-separated
          const productList = sale.productos
            .split(/[,\n]+/)
            .map((p: string) => p.trim());

          productList.forEach((product: string) => {
            if (!product) return;

            if (!productMap[product]) {
              productMap[product] = { count: 0, revenue: 0 };
            }

            // Estimate revenue per product (dividing total by number of products)
            const productRevenue = sale.total / productList.length;
            productMap[product].count += 1;
            productMap[product].revenue += productRevenue;
            totalSales += 1;
          });
        });

        // Process previous period data
        const prevProductMap: Record<
          string,
          { count: number; revenue: number }
        > = {};

        prevSalesData?.forEach((sale) => {
          const productList = sale.productos
            .split(/[,\n]+/)
            .map((p: string) => p.trim());

          productList.forEach((product: string) => {
            if (!product) return;

            if (!prevProductMap[product]) {
              prevProductMap[product] = { count: 0, revenue: 0 };
            }

            const productRevenue = sale.total / productList.length;
            prevProductMap[product].count += 1;
            prevProductMap[product].revenue += productRevenue;
          });
        });

        // Create sorted product list
        const productList = Object.entries(productMap)
          .map(([name, data]) => {
            const percentage =
              totalSales > 0 ? (data.count / totalSales) * 100 : 0;
            const prevCount = prevProductMap[name]?.count || 0;
            const growth =
              prevCount > 0
                ? ((data.count - prevCount) / prevCount) * 100
                : data.count > 0
                ? 100
                : 0;

            return {
              name,
              value: data.count,
              percentage,
              growth,
            };
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 products

        setProducts(productList);
      } catch (error) {
        console.error("Error fetching product data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchProductData();
    }
  }, [userId]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 transition-all hover:bg-zinc-900 hover:shadow-lg hover:shadow-purple-900/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription className="text-zinc-400">
              Este mes
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-zinc-700 bg-zinc-800/50 text-zinc-300"
          >
            Top 5
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 animate-pulse rounded-md bg-zinc-800"></div>
                  <div className="h-5 w-12 animate-pulse rounded-md bg-zinc-800"></div>
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-zinc-800"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <p>No hay datos de ventas disponibles</p>
          </div>
        ) : (
          <div className="space-y-5">
            {products.map((product, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge
                      className={`${
                        product.growth > 0
                          ? "bg-emerald-500/20 text-emerald-400"
                          : product.growth < 0
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-zinc-500/20 text-zinc-400"
                      }`}
                    >
                      {product.growth > 0 ? "+" : ""}
                      {product.growth.toFixed(1)}%
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{product.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"
                    style={{ width: `${product.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-zinc-400">
                  {formatPercent(product.percentage)} del total de ventas
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
