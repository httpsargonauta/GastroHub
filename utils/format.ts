/**
 * Utility functions for formatting values in the dashboard
 */

// Format currency with locale support
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Format percentage with locale support
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

// Format large numbers with K, M, B suffixes
export function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + "B"
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M"
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K"
  }
  return value.toString()
}

// Format date to locale string
export function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date)
  }
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Calculate percentage change between two values
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
