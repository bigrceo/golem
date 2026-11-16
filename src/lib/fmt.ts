export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
export const hhmm = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
