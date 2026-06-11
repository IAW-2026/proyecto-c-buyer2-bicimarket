type PriceDisplayProps = {
  amount: number;
  className?: string;
};

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return formatter.format(amount / 100);
}

export function PriceDisplay({ amount, className }: PriceDisplayProps) {
  return <span className={className}>{formatPrice(amount)}</span>;
}
