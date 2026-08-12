/**
 * Visa-free and Visa-on-Arrival lookup tables.
 * Key = passport/nationality country name (matches COUNTRIES list)
 * Value = array of destination country names where entry is visa-free
 */

export const SCHENGEN_COUNTRIES = [
  "Schengen", "Schengen Area", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Belgium", "Switzerland", "Austria", "Portugal", "Greece", "Sweden", "Norway",
  "Denmark", "Finland", "Czech Republic", "Hungary", "Poland", "Slovakia", "Slovenia",
  "Croatia", "Estonia", "Latvia", "Lithuania", "Malta", "Luxembourg", "Iceland", "Liechtenstein"
];

const EU_WESTERN_DESTINATIONS = [
  "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", "Malaysia", "Thailand", "Philippines", "Indonesia", "UAE", "Saudi Arabia", "Qatar",
  "Kuwait", "Bahrain", "Oman", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Uruguay", "Paraguay",
  "Costa Rica", "Panama", "Dominican Republic", "Jamaica", "Israel", "Turkey", "Georgia", "Armenia", "Serbia",
  "Montenegro", "Albania", "Bosnia and Herzegovina", "North Macedonia", "Moldova", "Ukraine", "Vietnam", "Taiwan",
  "Hong Kong", "Macao", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark", "Finland", "Czech Republic", "Hungary", "Poland",
  "Slovakia", "Slovenia", "Croatia", "Estonia", "Latvia", "Lithuania", "Malta", "Luxembourg", "Iceland",
];

const EU_EEA_COUNTRIES = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark", "Finland", "Czech Republic",
  "Hungary", "Poland", "Slovakia", "Slovenia", "Croatia", "Estonia", "Latvia", "Lithuania",
  "Malta", "Luxembourg", "Iceland", "Liechtenstein", "Cyprus", "Romania", "Bulgaria",
  "Andorra", "Monaco", "San Marino", "Vatican City"
];

export const VISA_FREE: Record<string, string[]> = {
  "India": [
    "Nepal", "Bhutan", "Mauritius", "Seychelles", "Jamaica", "Haiti",
    "El Salvador", "Micronesia", "Montserrat", "Niue", "Samoa",
    "Senegal", "Trinidad and Tobago", "Thailand", "Malaysia", "Kenya", "Iran"
  ],
  "Pakistan": ["Maldives", "Nepal", "Tajikistan", "Qatar", "Kenya", "Rwanda"],
  "Bangladesh": ["Nepal", "Bhutan", "Maldives", "Sri Lanka", "Dominica", "Haiti", "Grenada", "Kenya"],
  "Sri Lanka": ["Maldives", "Seychelles", "Singapore", "Cambodia", "Laos", "Indonesia"],
  "Nepal": ["India", "Maldives", "Seychelles"],
  "United States": [
    "Schengen", "Schengen Area", "Canada", "Mexico", "United Kingdom", "Australia", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "Hungary", "Poland", "Slovakia", "Slovenia",
    "Croatia", "Estonia", "Latvia", "Lithuania", "Malta", "Luxembourg",
    "Iceland", "New Zealand", "South Korea", "Singapore", "Chile", "Colombia",
    "Israel", "Taiwan", "Dominican Republic", "Jamaica", "Bahamas", "Barbados", "Trinidad and Tobago", "Costa Rica", "Panama"
  ],
  "United Kingdom": [
    "Schengen", "Schengen Area", "United States", "Canada", "Australia", "New Zealand", "Japan",
    "South Korea", "Singapore", "Israel", "Chile", "Colombia",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "Czech Republic", "Hungary", "Poland",
    "Slovakia", "Slovenia", "Croatia", "Estonia", "Latvia", "Lithuania",
    "Malta", "Luxembourg", "Iceland", "Mexico", "Brazil", "Argentina", "Costa Rica", "Panama"
  ],
  "Canada": [
    "Schengen", "Schengen Area", "United States", "United Kingdom", "Australia", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "Mexico", "New Zealand", "South Korea",
    "Singapore", "Israel", "Chile", "Colombia", "Brazil", "Argentina", "Costa Rica", "Panama"
  ],
  "Australia": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Japan", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Czech Republic", "New Zealand", "South Korea", "Singapore",
    "Israel", "Chile", "Colombia", "Fiji", "Samoa", "Vanuatu"
  ],
  "New Zealand": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Australia", "Japan",
    "South Korea", "Singapore", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "Fiji", "Samoa", "Tonga", "Vanuatu", "Chile", "Colombia"
  ],
  "Japan": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Australia", "Germany",
    "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland",
    "Austria", "Portugal", "Ireland", "Greece", "Sweden", "Norway", "Denmark",
    "Finland", "New Zealand", "South Korea", "Singapore", "Hong Kong",
    "Taiwan", "Israel", "China", "Thailand", "Malaysia", "Indonesia", "Vietnam"
  ],
  "South Korea": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Australia", "Japan",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "New Zealand", "Singapore", "Taiwan",
    "Thailand", "Malaysia", "Indonesia", "Vietnam", "UAE", "Qatar"
  ],
  "Singapore": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Australia", "Japan",
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium",
    "Switzerland", "Austria", "Portugal", "Ireland", "Greece", "Sweden",
    "Norway", "Denmark", "Finland", "New Zealand", "South Korea",
    "Indonesia", "Malaysia", "Thailand", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "China"
  ],
  "Malaysia": [
    "Schengen", "Schengen Area", "United Kingdom", "Japan", "South Korea", "Australia",
    "Indonesia", "Thailand", "Philippines", "Singapore", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "UAE", "Turkey"
  ],
  "Indonesia": [
    "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "Japan", "Brazil", "Chile", "Turkey"
  ],
  "Thailand": [
    "Malaysia", "Singapore", "Indonesia", "Philippines", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "Japan", "South Korea", "Russia", "Brazil", "Chile", "Turkey"
  ],
  "Philippines": [
    "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam",
    "Cambodia", "Laos", "Myanmar", "Brazil", "Colombia", "Peru", "Israel"
  ],
  "United Arab Emirates": [
    "Schengen", "Schengen Area", "United Kingdom", "Canada", "Japan", "South Korea", "Singapore",
    "Malaysia", "Thailand", "Indonesia", "Philippines", "New Zealand", "Georgia", "Armenia",
    "Serbia", "Montenegro", "Albania", "Jordan", "Lebanon", "Egypt", "Turkey",
    "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"
  ],
  "Saudi Arabia": [
    "United Arab Emirates", "Qatar", "Kuwait", "Bahrain", "Oman", "United Kingdom",
    "Malaysia", "Singapore", "Thailand", "Indonesia", "Georgia", "Armenia", "Jordan",
    "Albania", "Bosnia and Herzegovina", "Serbia", "Turkey", "Egypt"
  ],
  "Qatar": [
    "United Arab Emirates", "Saudi Arabia", "Kuwait", "Bahrain", "Oman", "United Kingdom",
    "Schengen", "Schengen Area", "Malaysia", "Singapore", "Thailand", "Indonesia",
    "Georgia", "Armenia", "Jordan", "Turkey", "Egypt"
  ],
  "Kuwait": [
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Bahrain", "Oman", "United Kingdom",
    "Malaysia", "Singapore", "Thailand", "Indonesia", "Georgia", "Armenia", "Jordan", "Turkey"
  ],
  "Bahrain": [
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "United Kingdom",
    "Malaysia", "Singapore", "Thailand", "Indonesia", "Georgia", "Armenia", "Jordan", "Turkey"
  ],
  "Oman": [
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "United Kingdom",
    "Malaysia", "Singapore", "Thailand", "Indonesia", "Georgia", "Armenia", "Jordan", "Turkey"
  ],
  "Turkey": [
    "Azerbaijan", "Georgia", "Jordan", "Ukraine", "Japan", "South Korea", "Singapore",
    "Malaysia", "Thailand", "Colombia", "Brazil", "Argentina", "Chile", "Qatar"
  ],
  "Russia": [
    "Belarus", "Kazakhstan", "Kyrgyzstan", "Armenia", "Azerbaijan",
    "Ukraine", "Serbia", "Turkey", "Thailand", "Vietnam", "UAE", "Qatar", "Brazil", "Argentina"
  ],
  "Brazil": [
    "Schengen", "Schengen Area", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Bolivia",
    "Paraguay", "Uruguay", "Ecuador", "United States", "Canada",
    "United Kingdom", "European Union", "Russia", "South Africa", "Turkey"
  ],
  "Argentina": [
    "Schengen", "Schengen Area", "Brazil", "Chile", "Colombia", "Peru", "Bolivia", "Paraguay",
    "Uruguay", "Ecuador", "Venezuela", "United Kingdom", "Russia", "Turkey", "Israel"
  ],
  "Chile": [
    "Schengen", "Schengen Area", "United States", "United Kingdom", "Canada", "Japan", "South Korea",
    "Argentina", "Brazil", "Colombia", "Peru", "Uruguay", "Paraguay", "Ecuador", "Mexico"
  ],
  "Mexico": [
    "Schengen", "Schengen Area", "United Kingdom", "Japan", "South Korea", "Singapore",
    "Colombia", "Chile", "Peru", "Argentina", "Brazil", "Costa Rica", "Panama"
  ],
  "Colombia": [
    "Schengen", "Schengen Area", "United Kingdom", "Turkey", "Brazil", "Argentina", "Chile", "Peru",
    "Ecuador", "Uruguay", "Paraguay", "Panama", "Costa Rica", "Mexico"
  ],
  "South Africa": [
    "Zimbabwe", "Botswana", "Lesotho", "Swaziland", "Mozambique",
    "Namibia", "Zambia", "Malawi", "Brazil", "Argentina", "Russia", "Israel", "Thailand", "Singapore"
  ],
  "Nigeria": ["Benin", "Niger", "Chad", "Cameroon", "Togo", "Ghana", "Sierra Leone", "Gambia", "Liberia"],
  "Kenya": ["Uganda", "Tanzania", "Rwanda", "Burundi", "Ethiopia", "South Sudan"],
  "Ethiopia": ["Kenya", "Uganda", "Tanzania", "Rwanda"],
  "Israel": [
    "Schengen", "Schengen Area", "United States", "United Kingdom", "Canada", "Japan", "South Korea",
    "Singapore", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Georgia"
  ],
  "Taiwan": [
    "Schengen", "Schengen Area", "United States", "Canada", "United Kingdom", "Japan", "South Korea",
    "Singapore", "Malaysia", "Thailand", "Israel", "Chile", "Colombia", "Peru"
  ],
  "Hong Kong": [
    "Schengen", "Schengen Area", "United Kingdom", "Japan", "South Korea", "Singapore", "Malaysia",
    "Thailand", "Israel", "Chile", "Colombia", "Peru", "Brazil", "Argentina"
  ],
  // Auto-populate all EU/EEA countries with EU_WESTERN_DESTINATIONS
  ...Object.fromEntries(EU_EEA_COUNTRIES.map((c) => [c, EU_WESTERN_DESTINATIONS])),
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

export type RequirementCategory = "visa_free" | "eta_required" | "esta_required" | "etias_required" | "visa_on_arrival" | "visa_required";

export interface DetailedRequirement {
  category: RequirementCategory;
  label: string;
  badge: string;
  score: number; // Max 99%, never 100%
}

export function getDetailedEntryRequirement(
  nationality: string,
  destination: string,
  opts?: { passportCountry?: string; countryOfResidence?: string }
): DetailedRequirement {
  const req = getEntryRequirement(nationality, destination, opts);
  const isSchengen = destination === "Schengen" || destination === "Schengen Area" || SCHENGEN_COUNTRIES.includes(destination);

  if (req === "visa_free" || nationality === destination) {
    // 1. ESTA (for UK, EU, Japan, Singapore, Australia, NZ citizens going to US)
    if (destination === "United States" && ["United Kingdom", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Portugal", "Sweden", "Norway", "Denmark", "Finland", "Japan", "South Korea", "Singapore", "Australia", "New Zealand"].includes(nationality)) {
      return {
        category: "esta_required",
        label: "ESTA Required (Visa Waiver)",
        badge: "ESTA Required",
        score: 99,
      };
    }

    // 2. Canada passport holders
    if (nationality === "Canada") {
      if (destination === "Australia") {
        return { category: "eta_required", label: "eTA Required (Australia ETA)", badge: "eTA Required", score: 99 };
      }
      if (destination === "United Kingdom" || destination === "UK") {
        return { category: "eta_required", label: "eTA Required (UK ETA)", badge: "eTA Required", score: 99 };
      }
      if (isSchengen) {
        return { category: "etias_required", label: "ETIAS Required (EU Authorization)", badge: "ETIAS Required", score: 99 };
      }
      if (destination === "New Zealand" || destination === "South Korea") {
        return { category: "eta_required", label: "eTA Required", badge: "eTA Required", score: 99 };
      }
      if (destination === "United States") {
        return { category: "visa_free", label: "Visa Free (No Visa Needed)", badge: "Visa Free", score: 99 };
      }
    }

    // 3. United States passport holders
    if (nationality === "United States") {
      if (destination === "Canada") {
        return { category: "visa_free", label: "Visa Free (No Visa Needed)", badge: "Visa Free", score: 99 };
      }
      if (destination === "United Kingdom" || destination === "UK") {
        return { category: "eta_required", label: "eTA Required (UK ETA)", badge: "eTA Required", score: 99 };
      }
      if (destination === "Australia") {
        return { category: "eta_required", label: "eTA Required (Australia ETA)", badge: "eTA Required", score: 99 };
      }
      if (isSchengen) {
        return { category: "etias_required", label: "ETIAS Required (EU Authorization)", badge: "ETIAS Required", score: 99 };
      }
    }

    // 4. ETIAS for non-EU visa-free citizens going to Schengen Area
    if (isSchengen && ["United States", "United Kingdom", "Canada", "Australia", "New Zealand", "Japan", "South Korea", "Singapore", "Israel", "Chile", "Brazil", "Mexico", "United Arab Emirates"].includes(nationality)) {
      return { category: "etias_required", label: "ETIAS Required (EU Authorization)", badge: "ETIAS Required", score: 99 };
    }

    // Default pure Visa Free (max score 99%)
    return { category: "visa_free", label: "Visa Free (No Visa Needed)", badge: "Visa Free", score: 99 };
  }

  if (req === "visa_on_arrival") {
    return { category: "visa_on_arrival", label: "Visa on Arrival", badge: "Visa on Arrival", score: 97 };
  }

  // Embassy Visa Required
  return { category: "visa_required", label: "Tourist Visa Required", badge: "Visa Required", score: 55 };
}

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

  const isSchengenDest = destination === "Schengen" || destination === "Schengen Area";

  // 1. Citizen of destination by nationality
  if (nationality === destination) return "visa_free";
  if (isSchengenDest && SCHENGEN_COUNTRIES.includes(nationality)) return "visa_free";

  // 2. Passport issued by destination country → citizen
  if (opts?.passportCountry && (opts.passportCountry === destination || (isSchengenDest && SCHENGEN_COUNTRIES.includes(opts.passportCountry)))) return "visa_free";

  // 3. Already a legal resident of destination → no new visa required
  if (opts?.countryOfResidence && (opts.countryOfResidence === destination || (isSchengenDest && SCHENGEN_COUNTRIES.includes(opts.countryOfResidence)))) return "resident";

  // 4. Bilateral visa-free agreements
  const free = VISA_FREE[nationality];
  if (free) {
    if (free.includes(destination)) return "visa_free";
    if (isSchengenDest && free.some((c) => SCHENGEN_COUNTRIES.includes(c))) return "visa_free";
  }

  // 5. Visa on arrival
  const voa = VISA_ON_ARRIVAL[nationality];
  if (voa) {
    if (voa.includes(destination)) return "visa_on_arrival";
    if (isSchengenDest && voa.some((c) => SCHENGEN_COUNTRIES.includes(c))) return "visa_on_arrival";
  }

  return null;
}
