export type Role = "public" | "buyer" | "admin";

export type Capability =
  | "cart.add"
  | "favorites.toggle"
  | "orders.view"
  | "checkout"
  | "admin.access";

const CAPABILITIES: Record<Capability, Role[]> = {
  "cart.add":          ["buyer", "admin"],
  "favorites.toggle":  ["buyer", "admin"],
  "orders.view":       ["buyer", "admin"],
  "checkout":          ["buyer", "admin"],
  "admin.access":      ["admin"],
};

export function hasCapability(role: Role, action: Capability): boolean {
  return CAPABILITIES[action].includes(role);
}
