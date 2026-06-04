export type MerchantRole = "blacksmith" | "armorer" | "tailor" | "alchemist" | "mage";

export const MERCHANT_ROLES: readonly MerchantRole[] = [
  "blacksmith",
  "armorer",
  "tailor",
  "alchemist",
  "mage",
];

export function isMerchantRole(role: string): role is MerchantRole {
  return (
    role === "blacksmith" ||
    role === "armorer" ||
    role === "tailor" ||
    role === "alchemist" ||
    role === "mage"
  );
}
