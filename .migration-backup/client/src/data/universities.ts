import rawData from "@assets/top_1000_educational_institutes_universities_1777391570965.json";

const entries = rawData as { name: string; country: string }[];

export const UNIVERSITIES_BY_COUNTRY: Record<string, string[]> = {};

for (const entry of entries) {
  if (!UNIVERSITIES_BY_COUNTRY[entry.country]) {
    UNIVERSITIES_BY_COUNTRY[entry.country] = [];
  }
  UNIVERSITIES_BY_COUNTRY[entry.country].push(entry.name);
}

export function getUniversitiesForCountry(country: string): string[] {
  return UNIVERSITIES_BY_COUNTRY[country] || [];
}
