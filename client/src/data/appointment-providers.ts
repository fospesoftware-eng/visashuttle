// Curated list of common appointment providers so agents can pick from a
// dropdown instead of typing every embassy / VFS centre by hand.
// Free-text input is still allowed for anything not on this list — these are
// only suggestions, not a hard whitelist.

// ----------------------------------------------------------
// Embassies / Consulates / High Commissions per destination
// (focused on the destinations currently in the seed data + the most common
// ones travel agencies in India / South Asia book against)
// ----------------------------------------------------------
export const EMBASSIES_BY_COUNTRY: Record<string, string[]> = {
  "France": [
    "French Embassy — New Delhi",
    "Consulate General of France — Mumbai",
    "Consulate General of France — Bangalore",
    "Consulate General of France — Kolkata",
    "Consulate General of France — Pondicherry",
  ],
  "Germany": [
    "German Embassy — New Delhi",
    "German Consulate General — Mumbai",
    "German Consulate General — Bangalore",
    "German Consulate General — Chennai",
    "German Consulate General — Kolkata",
  ],
  "United Kingdom": [
    "British High Commission — New Delhi",
    "British Deputy High Commission — Mumbai",
    "British Deputy High Commission — Chennai",
    "British Deputy High Commission — Bangalore",
    "British Deputy High Commission — Kolkata",
    "British Deputy High Commission — Hyderabad",
    "British Deputy High Commission — Chandigarh",
  ],
  "United States": [
    "US Embassy — New Delhi",
    "US Consulate General — Mumbai",
    "US Consulate General — Chennai",
    "US Consulate General — Kolkata",
    "US Consulate General — Hyderabad",
  ],
  "Canada": [
    "Canadian High Commission — New Delhi",
    "Canadian Consulate General — Mumbai",
    "Canadian Consulate General — Bangalore",
    "Canadian Consulate General — Chandigarh",
  ],
  "Australia": [
    "Australian High Commission — New Delhi",
    "Australian Consulate General — Mumbai",
    "Australian Consulate General — Chennai",
  ],
  "Italy": [
    "Embassy of Italy — New Delhi",
    "Consulate General of Italy — Mumbai",
    "Consulate General of Italy — Kolkata",
  ],
  "Spain": [
    "Embassy of Spain — New Delhi",
    "Consulate General of Spain — Mumbai",
  ],
  "Netherlands": [
    "Embassy of the Netherlands — New Delhi",
    "Consulate General of the Netherlands — Mumbai",
  ],
  "Switzerland": [
    "Embassy of Switzerland — New Delhi",
    "Consulate General of Switzerland — Mumbai",
    "Consulate General of Switzerland — Bangalore",
  ],
  "Schengen Area": [
    "Pick the lead-country consulate (e.g. France, Germany, Italy)",
  ],
  "Japan": [
    "Embassy of Japan — New Delhi",
    "Consulate General of Japan — Mumbai",
    "Consulate General of Japan — Bangalore",
    "Consulate General of Japan — Chennai",
    "Consulate General of Japan — Kolkata",
  ],
  "United Arab Emirates": [
    "Embassy of the UAE — New Delhi",
    "Consulate General of the UAE — Mumbai",
  ],
  "Singapore": [
    "High Commission of Singapore — New Delhi",
    "Consulate General of Singapore — Chennai",
    "Consulate General of Singapore — Mumbai",
  ],
};

// ----------------------------------------------------------
// VFS Global / BLS International cities — most agents in India book
// appointments at the centre nearest their applicant.
// ----------------------------------------------------------
export const VFS_BLS_CITIES = [
  "Ahmedabad", "Bangalore", "Chandigarh", "Chennai", "Cochin",
  "Coimbatore", "Goa", "Gurgaon", "Hyderabad", "Indore",
  "Jaipur", "Jalandhar", "Kolkata", "Lucknow", "Mumbai",
  "New Delhi", "Noida", "Pondicherry", "Pune", "Surat",
  "Trivandrum", "Vadodara", "Vishakhapatnam",
];

// ----------------------------------------------------------
// Suggestion helper — return embassies for a destination, or a generic
// fallback when we don't have curated data yet.
// ----------------------------------------------------------
export function suggestEmbassies(destinationCountry: string | null | undefined): string[] {
  if (!destinationCountry) return [];
  return EMBASSIES_BY_COUNTRY[destinationCountry] ?? [];
}
