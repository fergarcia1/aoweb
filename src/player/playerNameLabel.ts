export function formatPlayerWorldName(name: string, clanName?: string | null): string {
  const clan = clanName?.trim();
  return clan ? `${name}\n<${clan}>` : name;
}
