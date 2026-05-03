/**
 * Visa-free and Visa-on-Arrival lookup tables.
 * Key = passport/nationality country name (matches COUNTRIES list)
 * Value = array of destination country names where entry is visa-free
 */

export const VISA_FREE: Record<string, string[]> = {
  "India": [
    "Nepal", "Bhutan", "Mauritius", "Seychelles", "Jamaica", "Haiti",
    "El Salvador", "Micronesia", "Montserrat", "Niue", "Samoa",
    "Senegal", "Trinidad and Tobago",
  ],
  "Pakistan": ["Maldives", "Nepal", "Tajikistan"],
  "Bangladesh": ["Nepal", "Haiti", "Dominica", "Micronesia"],
  "Sri Lanka": ["Maldives"],
  "Nepal": ["India", "Maldives"],
  "United States": [
    "Canada", "Mexico", "United Kingdom", "Australia", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "Hungary", "Poland", "Slovakia", "Slovenia",
    "Croatia", "Estonia", "Latvia", "Lithuania", "Malta", "Luxembourg",
    "Iceland", "New Zealand", "South Korea", "Singapore", "Chile", "Colombia",
    "Israel", "Taiwan",
  ],
  "United Kingdom": [
    "United States", "Canada", "Australia", "New Zealand", "Japan",
    "South Korea", "Singapore", "Israel", "Chile", "Colombia",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "Czech Republic", "Hungary", "Poland",
    "Slovakia", "Slovenia", "Croatia", "Estonia", "Latvia", "Lithuania",
    "Malta", "Luxembourg", "Iceland",
  ],
  "Germany": [
    "United States", "Canada", "Australia", "Japan", "New Zealand",
    "South Korea", "Singapore", "United Kingdom", "France", "Italy", "Spain",
    "Netherlands", "Belgium", "Switzerland", "Austria", "Portugal", "Ireland",
    "Greece", "Sweden", "Norway", "Denmark", "Finland", "Czech Republic",
    "Hungary", "Poland", "Slovakia", "Slovenia", "Croatia", "Estonia",
    "Latvia", "Lithuania", "Malta", "Luxembourg", "Iceland", "Israel", "Chile",
  ],
  "France": [
    "United States", "Canada", "Australia", "Japan", "New Zealand",
    "South Korea", "Singapore", "United Kingdom", "Germany", "Italy",
    "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Portugal",
    "Ireland", "Greece", "Sweden", "Norway", "Denmark", "Finland",
    "Czech Republic", "Hungary", "Poland", "Slovakia", "Slovenia", "Croatia",
    "Estonia", "Latvia", "Lithuania", "Malta", "Luxembourg", "Iceland",
    "Israel", "Chile",
  ],
  "Canada": [
    "United States", "United Kingdom", "Australia", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "Mexico", "New Zealand", "South Korea",
    "Singapore", "Israel", "Chile", "Colombia",
  ],
  "Australia": [
    "United States", "Canada", "United Kingdom", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "New Zealand", "South Korea", "Singapore",
    "Israel", "Chile", "Colombia",
  ],
  "Japan": [
    "United States", "Canada", "United Kingdom", "Australia", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "New Zealand", "South Korea", "Singapore", "Hong Kong",
    "Taiwan", "Israel",
  ],
  "South Korea": [
    "United States", "Canada", "United Kingdom", "Australia", "Japan",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "New Zealand", "Singapore", "Taiwan",
  ],
  "Singapore": [
    "United States", "Canada", "United Kingdom", "Australia", "Japan",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "New Zealand", "South Korea",
    "Indonesia", "Malaysia", "Thailand", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar",
  ],
  "Malaysia": [
    "Indonesia", "Thailand", "Philippines", "Singapore", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "Japan", "South Korea", "Australia",
  ],
  "Indonesia": [
    "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar",
  ],
  "Thailand": [
    "Malaysia", "Singapore", "Indonesia", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar",
  ],
  "Philippines": [
    "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam",
    "Cambodia", "Laos", "Myanmar",
  ],
  "Turkey": [
    "Azerbaijan", "Georgia", "Jordan", "Ukraine",
  ],
  "Russia": [
    "Belarus", "Kazakhstan", "Kyrgyzstan", "Armenia", "Azerbaijan",
    "Ukraine", "Serbia", "Turkey",
  ],
  "Brazil": [
    "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Bolivia",
    "Paraguay", "Uruguay", "Ecuador", "United States", "Canada",
    "United Kingdom", "European Union",
  ],
  "Argentina": [
    "Brazil", "Chile", "Colombia", "Peru", "Bolivia", "Paraguay",
    "Uruguay", "Ecuador", "Venezuela",
  ],
  "South Africa": [
    "Zimbabwe", "Botswana", "Lesotho", "Swaziland", "Mozambique",
    "Namibia", "Zambia", "Malawi",
  ],
  "Nigeria": ["Benin", "Niger", "Chad", "Cameroon", "Togo", "Ghana"],
  "Kenya": ["Uganda", "Tanzania", "Rwanda", "Burundi"],
  "Ethiopia": ["Kenya", "Uganda", "Tanzania", "Rwanda"],
};

/**
 * Visa-on-Arrival: citizens can enter but need a stamp/fee at the border.
 * We treat this as ~95% approval (essentially guaranteed but has a process).
 */
export const VISA_ON_ARRIVAL: Record<string, string[]> = {
  "India": [
    "Indonesia", "Thailand", "Cambodia", "Laos", "Myanmar", "Vietnam",
    "Maldives", "Sri Lanka", "Qatar", "Bahrain", "Oman", "Jordan",
    "Kenya", "Rwanda", "Tanzania", "Uganda", "Ethiopia", "Egypt",
    "Mozambique", "Madagascar", "Comoros", "Djibouti", "Guinea-Bissau",
    "Tuvalu", "Timor-Leste",
  ],
  "Pakistan": [
    "Cambodia", "Laos", "Myanmar", "Kenya", "Ethiopia",
  ],
  "Bangladesh": [
    "Cambodia", "Laos", "Myanmar", "Kenya", "Ethiopia",
  ],
  "Sri Lanka": [
    "Indonesia", "Cambodia", "Laos", "Myanmar",
  ],
  "United States": [
    "Thailand", "Indonesia", "Nepal", "Sri Lanka",
  ],
  "United Kingdom": [
    "Thailand", "Indonesia", "Nepal", "Sri Lanka", "Maldives",
  ],
};

export type EntryRequirement = "visa_free" | "visa_on_arrival" | "resident" | null;

/**
 * Returns the entry requirement for a traveller.
 *  - "visa_free"    : no visa needed (citizen or bilateral agreement)
 *  - "visa_on_arrival" : can get VOA at the port of entry
 *  - "resident"     : already legally residing in destination — no new visa required
 *  - null           : must apply for a visa
 */
export function getEntryRequirement(
  nationality: string,
  destination: string,
  opts?: { passportCountry?: string; countryOfResidence?: string }
): EntryRequirement {
  if (!nationality || !destination) return null;

  // 1. Citizen of destination by nationality
  if (nationality === destination) return "visa_free";

  // 2. Passport issued by destination country → citizen
  if (opts?.passportCountry && opts.passportCountry === destination) return "visa_free";

  // 3. Already a legal resident of destination → no new visa required
  if (opts?.countryOfResidence && opts.countryOfResidence === destination) return "resident";

  // 4. Bilateral visa-free agreements
  const free = VISA_FREE[nationality];
  if (free?.includes(destination)) return "visa_free";

  // 5. Visa on arrival
  const voa = VISA_ON_ARRIVAL[nationality];
  if (voa?.includes(destination)) return "visa_on_arrival";

  return null;
}
