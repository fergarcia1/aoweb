export type MerchantRole = "blacksmith" | "armorer" | "tailor" | "alchemist" | "mage" | "general" | "test_blacksmith" | "test_armorer" | "test_tailor" | "test_alchemist" | "test_mage" | "test_general";

export const MERCHANT_ROLES: readonly MerchantRole[] = [
  "blacksmith",
  "armorer",
  "tailor",
  "alchemist",
  "mage",
  "general",
  "test_blacksmith",
  "test_armorer",
  "test_tailor",
  "test_alchemist",
  "test_mage",
  "test_general",
];

export function isMerchantRole(role: string): role is MerchantRole {
  return MERCHANT_ROLES.includes(role as MerchantRole);
}
