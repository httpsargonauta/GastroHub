"use client";

import {
  ShoppingCart,
  Package,
  ClipboardList,
  BarChart3,
  Calculator,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      label: "Nueva Venta",
      value: "ventas",
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: "Registrar Compra",
      value: "compras",
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "Crear Receta",
      value: "recetas",
    },
    {
      icon: <Calculator className="h-5 w-5" />,
      label: "Calcular Costos",
      value: "calculadora",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Ver Reportes",
      value: "reportes",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">
          Acciones Rápidas
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Añadir acción
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="flex h-24 flex-col items-center justify-center gap-3 border-zinc-800 bg-zinc-900/50 hover:border-purple-500/50 hover:bg-zinc-900 hover:text-purple-400"
            onClick={() => onAction(action.value)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              {action.icon}
            </div>
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
