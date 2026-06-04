export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}
