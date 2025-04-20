"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Componente que construye los breadcrumbs a partir de la ruta actual
export function AutoBreadcrumb() {
  const pathname = usePathname(); // obtiene la ruta actual (por ejemplo, "/productos/detalles")
  // Separamos la ruta por "/" y se filtran los valores vacíos
  const segments = pathname.split("/").filter(Boolean);

  // Función auxiliar para convertir el texto en mayúscula inicial (por ejemplo, "productos" => "Productos")
  const toTitleCase = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Siempre mostramos el primer elemento: el Dashboard o raíz */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {/* Por cada segmento, se agrega un separador y se construye el breadcrumb */}
        {segments.map((segment, index) => {
          // Se reconstruye el href: "/segmento1", "/segmento1/segmento2", ...
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1; // si es el último, se muestra como página actual
          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator />
              {isLast ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>{toTitleCase(segment)}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink href={href}>
                    {toTitleCase(segment)}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
