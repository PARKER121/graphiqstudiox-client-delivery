const formatter = new Intl.NumberFormat("en-GH", {
  currency: "GHS",
  style: "currency",
});

export function formatPriceFromMinor(amount: number) {
  return formatter.format(amount / 100);
}
