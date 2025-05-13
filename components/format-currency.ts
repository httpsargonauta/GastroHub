/**
 * Formats a number as currency
 * @param value - The number to format
 * @param currency - The currency code (default: USD)
 * @param locale - The locale to use for formatting (default: es-MX)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency = "USD", locale = "es-MX"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Parses a currency string to a number
 * @param value - The currency string to parse
 * @returns Parsed number value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols, spaces, and commas
  const cleanValue = value.replace(/[^\d.-]/g, "")
  return Number(cleanValue) || 0
}
