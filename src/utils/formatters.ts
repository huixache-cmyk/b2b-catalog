/**
 * Formats a numeric value into a currency string (e.g., $150.00).
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `$${num.toFixed(2)}`;
}

/**
 * Formats a numeric value into a currency string with MXN suffix (e.g., $150.00 MXN).
 */
export function formatCurrencyMXN(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `$${num.toFixed(2)} MXN`;
}

/**
 * Formats a Date object or ISO string into a readable date-time string in Mexico locale.
 */
export function formatDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}
