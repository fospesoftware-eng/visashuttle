import { getCountryVisaTypes } from "@/shared/visa-catalog";

export type AiEntryStatus =
  | "visa_free"
  | "e_visa"
  | "visa_on_arrival"
  | "visa_required"
  | "official_check_required";

export type AiConfidence = "high" | "medium" | "low";

export interface AiEntryGuidance {
  status: AiEntryStatus;
  label: string;
  confidence: AiConfidence;
  summary: string;
  conditions: string[];
  documents: string[];
  healthAndTransit: string[];
  sources: { name: string; url: string }[];
  maxStayDays: number | null;
  visaTypes: string[];
}

const SCHENGEN = new Set([
  "Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark", "Estonia", "Finland",
  "France", "Germany", "Greece", "Hungary", "Iceland", "Italy", "Latvia", "Liechtenstein",
  "Lithuania", "Luxembourg", "Malta", "Netherlands", "Norway", "Poland", "Portugal", "Romania",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Schengen Area",
]);

const EU_EEA_CH = new Set([...SCHENGEN, "Ireland"]);

const GCC = new Set(["Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates"]);

const ASEAN = new Set([
  "Brunei", "Cambodia", "Indonesia", "Laos", "Malaysia", "Myanmar", "Philippines", "Singapore",
  "Thailand", "Vietnam",
]);

const STRONG_PASSPORTS = new Set([
  "United States", "Canada", "United Kingdom", "Ireland", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", ...Array.from(EU_EEA_CH),
]);

const OFFICIAL_SOURCES: Record<string, { name: string; url: string }[]> = {
  "United States": [
    { name: "U.S. Department of State - Travel", url: "https://travel.state.gov/" },
    { name: "U.S. Customs and Border Protection", url: "https://www.cbp.gov/travel" },
  ],
  "Canada": [
    { name: "Government of Canada - Visit Canada", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html" },
  ],
  "United Kingdom": [
    { name: "UK Government - Check UK visa", url: "https://www.gov.uk/check-uk-visa" },
  ],
  "Australia": [
    { name: "Australian Department of Home Affairs", url: "https://immi.homeaffairs.gov.au/" },
  ],
  "New Zealand": [
    { name: "Immigration New Zealand", url: "https://www.immigration.govt.nz/" },
  ],
  "Singapore": [
    { name: "Immigration & Checkpoints Authority Singapore", url: "https://www.ica.gov.sg/" },
  ],
  "Japan": [
    { name: "Ministry of Foreign Affairs of Japan", url: "https://www.mofa.go.jp/j_info/visit/visa/" },
  ],
  "South Korea": [
    { name: "Korea Visa Portal", url: "https://www.visa.go.kr/" },
  ],
  "United Arab Emirates": [
    { name: "UAE Government Portal - Visas", url: "https://u.ae/en/information-and-services/visa-and-emirates-id" },
  ],
  "Schengen Area": [
    { name: "European Union - Schengen visa policy", url: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en" },
  ],
};

const DEFAULT_SOURCES = [
  { name: "IATA Travel Centre", url: "https://www.iata.org/en/services/compliance/timatic/travel-documentation/" },
  { name: "Destination embassy or immigration authority", url: "https://www.iatatravelcentre.com/world.php" },
];

function sourcesFor(destination: string) {
  if (OFFICIAL_SOURCES[destination]) return OFFICIAL_SOURCES[destination];
  if (SCHENGEN.has(destination)) return OFFICIAL_SOURCES["Schengen Area"];
  return DEFAULT_SOURCES;
}

function commonDocs(destination: string, status: AiEntryStatus) {
  const docs = [
    "Valid passport or travel document",
    "Return or onward ticket",
    "Proof of accommodation or host invitation",
    "Proof of sufficient funds",
  ];
  if (status !== "visa_free") docs.unshift("Valid visa, eVisa, ETA, or entry authorization where required");
  if (SCHENGEN.has(destination)) docs.push("Travel medical insurance", "Schengen-compliant itinerary and accommodation proof");
  return docs;
}

function healthTransitNotes(fromCountry: string, destination: string, transferCountry?: string) {
  const notes = [
    "Airline check-in rules can be stricter than border rules; verify before ticketing.",
    "Health, vaccination, customs, and currency requirements can change independently of visa rules.",
  ];
  if (transferCountry) {
    notes.unshift(`Transit through ${transferCountry} may require a separate airside or landside transit visa depending on airport, baggage collection, and ticketing.`);
  }
  if (fromCountry !== destination) {
    notes.push(`Check both departure and destination advisories close to the travel date.`);
  }
  return notes;
}

function guidance(
  status: AiEntryStatus,
  label: string,
  confidence: AiConfidence,
  summary: string,
  destination: string,
  fromCountry: string,
  transferCountry?: string,
  maxStayDays: number | null = null,
  extraConditions: string[] = [],
): AiEntryGuidance {
  return {
    status,
    label,
    confidence,
    summary,
    conditions: [
      ...extraConditions,
      "Rules depend on passport type, nationality, residence, purpose, stay duration, and travel history.",
      "Final boarding and entry decisions are made by the airline and border authority.",
    ],
    documents: commonDocs(destination, status),
    healthAndTransit: healthTransitNotes(fromCountry, destination, transferCountry),
    sources: sourcesFor(destination),
    maxStayDays,
    visaTypes: getCountryVisaTypes(destination),
  };
}

export function researchEntryRequirement(opts: {
  nationality: string;
  fromCountry: string;
  destination: string;
  transferCountry?: string;
  purpose?: string;
  visaType?: string;
}): AiEntryGuidance {
  const { nationality, fromCountry, destination, transferCountry, purpose, visaType } = opts;

  if (!destination) {
    return guidance(
      "official_check_required",
      "Select destination",
      "low",
      "Select a destination to estimate entry requirements.",
      destination,
      fromCountry,
      transferCountry,
    );
  }

  if (nationality === destination) {
    return guidance(
      "visa_free",
      "Citizen / returning national",
      "high",
      `${nationality} citizens normally do not need a visa to enter their own country, but must travel with an accepted passport or national document.`,
      destination,
      fromCountry,
      transferCountry,
      null,
      ["If travelling on a foreign passport, dual-national rules may apply."],
    );
  }

  if (EU_EEA_CH.has(nationality) && EU_EEA_CH.has(destination)) {
    return guidance(
      "visa_free",
      "Free movement / short stay normally allowed",
      "high",
      "EU/EEA/Swiss citizens usually have broad entry and residence rights across the EU/EEA/Switzerland, subject to identity document and local registration rules.",
      destination,
      fromCountry,
      transferCountry,
      null,
      ["Carry a valid passport or national ID card accepted by the destination."],
    );
  }

  if (GCC.has(nationality) && GCC.has(destination)) {
    return guidance(
      "visa_free",
      "GCC national entry likely visa-free",
      "high",
      "GCC citizens generally benefit from simplified entry among GCC member states, subject to valid national travel documents.",
      destination,
      fromCountry,
      transferCountry,
      null,
      ["Some employment/residency cases may require additional local procedures."],
    );
  }

  if (ASEAN.has(nationality) && ASEAN.has(destination)) {
    return guidance(
      "visa_free",
      "Regional short-stay entry often available",
      "medium",
      "ASEAN nationals often receive short-stay visa-free access within the region, but stay limits and passport validity vary by destination.",
      destination,
      fromCountry,
      transferCountry,
      null,
      ["Confirm the exact stay limit and permitted purpose before travel."],
    );
  }

  if (destination === "United States") {
    const estaLikely = STRONG_PASSPORTS.has(nationality) && nationality !== "Canada";
    return guidance(
      nationality === "Canada" ? "visa_free" : estaLikely ? "e_visa" : "visa_required",
      nationality === "Canada" ? "Visa usually not required" : estaLikely ? "ESTA / authorization likely required" : "Visa likely required",
      nationality === "Canada" || estaLikely ? "medium" : "high",
      nationality === "Canada"
        ? "Canadian citizens usually do not need visitor visas for short business/tourism visits to the United States."
        : estaLikely
          ? "Many strong-passport nationals use ESTA under the Visa Waiver Program for eligible short visits."
          : "Travellers outside visa waiver categories usually need an appropriate U.S. visa before travel.",
      destination,
      fromCountry,
      transferCountry,
      estaLikely ? 90 : null,
      ["Purpose, criminal/immigration history, and prior travel can affect eligibility."],
    );
  }

  if (destination === "Canada") {
    const etaLikely = STRONG_PASSPORTS.has(nationality) && nationality !== "United States";
    return guidance(
      nationality === "United States" ? "visa_free" : etaLikely ? "e_visa" : "visa_required",
      nationality === "United States" ? "Visa usually not required" : etaLikely ? "eTA / authorization likely required" : "Visa likely required",
      "medium",
      nationality === "United States"
        ? "U.S. citizens generally do not need a visitor visa for Canada, but need accepted identity/travel documents."
        : etaLikely
          ? "Many visa-exempt nationals need an eTA when flying to Canada."
          : "Many nationalities need a Temporary Resident Visa before travel.",
      destination,
      fromCountry,
      transferCountry,
      null,
    );
  }

  if (destination === "United Kingdom") {
    return guidance(
      STRONG_PASSPORTS.has(nationality) ? "e_visa" : "visa_required",
      STRONG_PASSPORTS.has(nationality) ? "ETA or visa-free route may apply" : "Visa likely required",
      "medium",
      "The UK is expanding Electronic Travel Authorisation requirements. Visa nationals need the correct UK visa before travel.",
      destination,
      fromCountry,
      transferCountry,
      180,
      ["ETA rollout depends on nationality and travel date."],
    );
  }

  if (SCHENGEN.has(destination)) {
    return guidance(
      STRONG_PASSPORTS.has(nationality) ? "visa_free" : "visa_required",
      STRONG_PASSPORTS.has(nationality) ? "Short-stay visa exemption may apply" : "Schengen visa likely required",
      "medium",
      STRONG_PASSPORTS.has(nationality)
        ? "Many strong-passport nationals can enter Schengen for short stays under the 90/180 rule."
        : "Many nationalities need a Schengen visa before travel for short stays.",
      destination,
      fromCountry,
      transferCountry,
      90,
      ["Apply the Schengen 90 days in any 180-day period rule where applicable.", "ETIAS may apply after rollout for visa-exempt travellers."],
    );
  }

  if (["Australia", "New Zealand"].includes(destination)) {
    return guidance(
      "e_visa",
      "Online visa / ETA likely required",
      "medium",
      `${destination} commonly uses online visa, ETA, or NZeTA-style travel authorization systems. Exact product depends on nationality and purpose.`,
      destination,
      fromCountry,
      transferCountry,
      null,
      ["Work, study, medical, and long-stay travel normally require a specific visa class."],
    );
  }

  if (["Singapore", "Japan", "South Korea", "United Arab Emirates"].includes(destination)) {
    return guidance(
      STRONG_PASSPORTS.has(nationality) ? "visa_free" : "visa_required",
      STRONG_PASSPORTS.has(nationality) ? "Visa exemption may apply" : "Visa or eVisa may be required",
      "medium",
      `${destination} entry rules vary strongly by nationality, stay length, and purpose. Some passports qualify for visa-free entry while others need a visa or electronic authorization.`,
      destination,
      fromCountry,
      transferCountry,
      null,
    );
  }

  if (visaType && /work|student|study|employment|residence|family/i.test(visaType + " " + (purpose || ""))) {
    return guidance(
      "visa_required",
      "Specific visa required",
      "medium",
      "Long-stay, work, study, family, and residence purposes usually require a destination-specific visa or permit before travel.",
      destination,
      fromCountry,
      transferCountry,
      null,
      ["Do not rely on tourist visa-free rules for work, study, or residence purposes."],
    );
  }

  return guidance(
    "official_check_required",
    "Official check required",
    "low",
    "No high-confidence local rule is available for this passport and route. Use this as a planning checklist and verify against the destination authority before booking.",
    destination,
    fromCountry,
    transferCountry,
    null,
  );
}
