// Country-specific visa category and type data
// Used to show a two-step "Category → Visa Type" selector for countries
// that have structured visa classification systems.

export interface VisaCategoryData {
  types: string[];
  purposeDefault: string;
}

export interface CountryVisaConfig {
  flag: string;
  regionLabel: string;
  categories: Record<string, VisaCategoryData>;
}

// ── Schengen: A/C/D type mapping ──────────────────────────────────────────
// Each type belongs to one of the three Schengen codes.
const SCHENGEN_TYPE_TO_CODE: Record<string, "A" | "C" | "D"> = {
  "Airport Transit Visa":      "A",
  "Tourist Visa":              "C",
  "Business Visa":             "C",
  "Family/Friend Visit Visa":  "C",
  "Medical Visa":              "C",
  "Conference/Event Visa":     "C",
  "Cultural Visa":             "C",
  "Sports Visa":               "C",
  "Short Study/Training Visa": "C",
  "Seafarer Visa":             "C",
  "Official Visit Visa":       "C",
  "Student Visa":              "D",
  "Work Visa":                 "D",
  "Family Reunion Visa":       "D",
  "Research Visa":             "D",
  "Residence Visa":            "D",
  "Au Pair Visa":              "D",
  "Internship Visa":           "D",
  "Self-employed Visa":        "D",
  "Entrepreneur Visa":         "D",
  "Job Seeker Visa":           "D",
  "Employment Visa":           "D",
  "EU Blue Card":              "D",
  "Talent Passport Visa":      "D",
  "Digital Nomad Visa":        "D",
  "D7 Visa":                   "D",
  "Startup Visa":              "D",
  "Highly Skilled Migrant Visa":"D",
  "Skilled Worker Visa":       "D",
  "Family Immigration Visa":   "D",
  "Non-lucrative Visa":        "D",
};

const SCHENGEN_CATEGORY_LABELS: Record<"A" | "C" | "D", string> = {
  "A": "A – Airport Transit",
  "C": "C – Short Stay (up to 90 days)",
  "D": "D – National Long Stay (90+ days)",
};

const SCHENGEN_CATEGORY_PURPOSE: Record<"A" | "C" | "D", string> = {
  "A": "Transit",
  "C": "Tourism & Sightseeing",
  "D": "Study / Education",
};

// Per-country visa types from the Schengen JSON data
const SCHENGEN_COUNTRY_TYPES: Record<string, string[]> = {
  "Austria":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Belgium":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Bulgaria":       ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Croatia":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Czech Republic": ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Denmark":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Estonia":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Finland":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "France":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Talent Passport Visa", "Family Reunion Visa", "Residence Visa"],
  "Germany":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Job Seeker Visa", "Employment Visa", "EU Blue Card", "Family Reunion Visa", "Residence Visa"],
  "Greece":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Hungary":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Iceland":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Italy":          ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Self-employed Visa", "Family Reunion Visa", "Residence Visa"],
  "Latvia":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Liechtenstein":  ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Lithuania":      ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Luxembourg":     ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Malta":          ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Netherlands":    ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Startup Visa", "Highly Skilled Migrant Visa", "Family Reunion Visa", "Residence Visa"],
  "Norway":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Skilled Worker Visa", "Family Immigration Visa", "Residence Visa"],
  "Poland":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Portugal":       ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Job Seeker Visa", "D7 Visa", "Digital Nomad Visa", "Family Reunion Visa", "Residence Visa"],
  "Romania":        ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Slovakia":       ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Slovenia":       ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
  "Spain":          ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Self-employed Visa", "Digital Nomad Visa", "Non-lucrative Visa", "Family Reunion Visa", "Residence Visa"],
  "Sweden":         ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Job Seeker Visa", "Family Reunion Visa", "Residence Visa"],
  "Switzerland":    ["Airport Transit Visa", "Tourist Visa", "Business Visa", "Family/Friend Visit Visa", "Medical Visa", "Student Visa", "Work Visa", "Family Reunion Visa", "Residence Visa"],
};

function buildSchengenConfig(country: string): CountryVisaConfig {
  const types = SCHENGEN_COUNTRY_TYPES[country] ?? [];
  const byCode: Record<string, string[]> = { A: [], C: [], D: [] };
  for (const t of types) {
    const code = SCHENGEN_TYPE_TO_CODE[t];
    if (code) byCode[code].push(t);
  }
  const categories: Record<string, VisaCategoryData> = {};
  (["A", "C", "D"] as const).forEach(code => {
    if (byCode[code].length) {
      categories[SCHENGEN_CATEGORY_LABELS[code]] = {
        types: byCode[code],
        purposeDefault: SCHENGEN_CATEGORY_PURPOSE[code],
      };
    }
  });
  return { flag: "🇪🇺", regionLabel: "Schengen Area Visa", categories };
}

// ── United Kingdom ────────────────────────────────────────────────────────
const UK_CONFIG: CountryVisaConfig = {
  flag: "🇬🇧",
  regionLabel: "UK Visa",
  categories: {
    "Visit / Short-Stay": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Standard Visitor Visa", "Business Visitor Visa", "Medical Visitor Visa", "Permitted Paid Engagement Visa", "Marriage / Civil Partnership Visitor Visa"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Direct Airside Transit Visa", "Visitor in Transit Visa"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa (Tier 4)", "Short-term Study Visa (under 6 months)", "Child Student Visa"],
    },
    "Work": {
      purposeDefault: "Employment",
      types: ["Skilled Worker Visa", "Intra-company Transfer Visa", "Global Talent Visa", "Graduate Visa", "Youth Mobility Scheme (Tier 5)", "Seasonal Worker Visa", "Health and Care Worker Visa", "Scale-up Worker Visa", "Innovator Founder Visa", "High Potential Individual (HPI) Visa"],
    },
    "Family": {
      purposeDefault: "Family Visit",
      types: ["Spouse / Partner Visa", "Child Visa", "Parent of a Child in the UK Visa", "Adult Dependent Relative Visa"],
    },
    "Settlement / ILR": {
      purposeDefault: "Family Visit",
      types: ["Indefinite Leave to Remain (ILR)", "Indefinite Leave to Enter (ILE)", "British National (Overseas) – BN(O)"],
    },
  },
};

// ── Canada ────────────────────────────────────────────────────────────────
const CANADA_CONFIG: CountryVisaConfig = {
  flag: "🇨🇦",
  regionLabel: "Canadian Visa",
  categories: {
    "Visitor / Temporary Resident": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Visitor Visa (TRV)", "Super Visa (Parents / Grandparents)", "Business Visitor Visa", "Electronic Travel Authorization (eTA)"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Study Permit", "Short-term Study (under 6 months, no permit required)"],
    },
    "Work": {
      purposeDefault: "Employment",
      types: ["Open Work Permit", "Employer-specific Work Permit", "LMIA-based Work Permit", "International Experience Canada (IEC) – Working Holiday", "IEC – Young Professionals", "IEC – International Co-op", "Intra-company Transfer Work Permit"],
    },
    "Permanent Residence": {
      purposeDefault: "Employment",
      types: ["Express Entry – Federal Skilled Worker (FSW)", "Express Entry – Canadian Experience Class (CEC)", "Express Entry – Federal Skilled Trades (FST)", "Provincial Nominee Program (PNP)", "Atlantic Immigration Program (AIP)", "Rural and Northern Immigration Pilot (RNIP)", "Family Sponsorship – Spouse / Partner", "Family Sponsorship – Child", "Family Sponsorship – Parent / Grandparent"],
    },
  },
};

// ── Australia ─────────────────────────────────────────────────────────────
const AUSTRALIA_CONFIG: CountryVisaConfig = {
  flag: "🇦🇺",
  regionLabel: "Australian Visa",
  categories: {
    "Visitor / Tourist": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Visitor Visa – subclass 600", "Electronic Travel Authority (ETA) – subclass 601", "eVisitor – subclass 651", "Business Visitor stream (subclass 600)"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa – subclass 771", "Cruise Transit Visa – subclass 773"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa – subclass 500", "Student Guardian Visa – subclass 590", "Training Visa – subclass 407"],
    },
    "Work / Skilled": {
      purposeDefault: "Employment",
      types: ["Temporary Skill Shortage (TSS) – subclass 482", "Employer Nomination Scheme – subclass 186", "Skilled Independent – subclass 189", "Skilled Nominated – subclass 190", "Skilled Work Regional – subclass 491", "Working Holiday – subclass 417", "Work and Holiday – subclass 462", "Global Talent Independent – subclass 858", "Business Innovation & Investment – subclass 188"],
    },
    "Family": {
      purposeDefault: "Family Visit",
      types: ["Partner Visa – subclass 820/801", "Prospective Marriage Visa – subclass 300", "Child Visa – subclass 101/802", "Parent Visa – subclass 103/804", "Contributory Parent Visa – subclass 143/173"],
    },
    "Permanent Residence": {
      purposeDefault: "Employment",
      types: ["Permanent Residence (Skilled) – subclass 189 / 190 / 491", "Permanent Residence (Employer Sponsored) – subclass 186 / 187", "Permanent Residence (Partner) – subclass 801 / 100", "Permanent Residence (Refugee / Humanitarian)"],
    },
  },
};

// ── United Arab Emirates ──────────────────────────────────────────────────
const UAE_CONFIG: CountryVisaConfig = {
  flag: "🇦🇪",
  regionLabel: "UAE Visa",
  categories: {
    "Tourist / Visit": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Tourist Visa – 30 days (single entry)", "Tourist Visa – 60 days (single entry)", "Tourist Visa – 90 days (single entry)", "Tourist Visa – 5-year Multi-entry", "Visit Visa – 30 days (family / personal)", "Visit Visa – 90 days (family / personal)"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa – 48 hours", "Transit Visa – 96 hours", "Transit Visa – 14 days"],
    },
    "Work / Employment": {
      purposeDefault: "Employment",
      types: ["Employment Visa / Work Permit", "Investor / Partner Visa", "Green Visa (Skilled Employee)", "Green Visa (Freelancer / Self-employed)", "Golden Visa – 10 years (Investor)", "Golden Visa – 10 years (Skilled Professional)", "Golden Visa – 10 years (Researcher / Specialist)", "Mission / Government Employee Visa"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa"],
    },
    "Family": {
      purposeDefault: "Family Visit",
      types: ["Family Residence Visa (Spouse)", "Family Residence Visa (Children)", "Domestic Worker Visa"],
    },
  },
};

// ── New Zealand ───────────────────────────────────────────────────────────
const NZ_CONFIG: CountryVisaConfig = {
  flag: "🇳🇿",
  regionLabel: "New Zealand Visa",
  categories: {
    "Visitor": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Visitor Visa", "Business Visitor Visa", "Medical Treatment Visitor Visa", "NZeTA (Electronic Travel Authority)"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa", "Fee Paying Student Visa"],
    },
    "Work": {
      purposeDefault: "Employment",
      types: ["Accredited Employer Work Visa (AEWV)", "Working Holiday Visa", "Skilled Migrant Category Resident Visa", "Essential Skills Work Visa", "Specific Purpose Work Visa", "Religious Worker Visa"],
    },
    "Family": {
      purposeDefault: "Family Visit",
      types: ["Partner of a New Zealand Resident Visa", "Dependent Child Resident Visa", "Parent Retirement Resident Visa"],
    },
    "Residence": {
      purposeDefault: "Employment",
      types: ["Skilled Migrant Category", "Resident Visa (Partner)", "Resident Visa (Family)", "Investor 1 Resident Visa", "Investor 2 Resident Visa"],
    },
  },
};

// ── Singapore ─────────────────────────────────────────────────────────────
const SINGAPORE_CONFIG: CountryVisaConfig = {
  flag: "🇸🇬",
  regionLabel: "Singapore Visa",
  categories: {
    "Visit / Short-Term": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Social Visit Visa (Tourist)", "Social Visit Visa (Business)", "Social Visit Visa (Family / Friends)", "Courtesy Visit Visa"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa (within 96 hours)", "Visa-Free Transit Facility (VFTF)"],
    },
    "Student": {
      purposeDefault: "Study / Education",
      types: ["Student's Pass", "Dependant's Pass (Student)"],
    },
    "Work / Employment": {
      purposeDefault: "Employment",
      types: ["Employment Pass (EP)", "S Pass", "Work Permit (General)", "Work Permit (Domestic Worker)", "EntrePass (Entrepreneur)", "Tech.Pass", "Personalised Employment Pass (PEP)", "ONE Pass (Overseas Networks & Expertise)"],
    },
    "Long-Term Residence": {
      purposeDefault: "Family Visit",
      types: ["Long-Term Visit Pass (LTVP)", "Dependant's Pass (Work)", "Permanent Resident (SPR) – Global Investor Programme (GIP)", "Permanent Resident (SPR) – Professionals / Skilled Workers"],
    },
  },
};

// ── Japan ─────────────────────────────────────────────────────────────────
const JAPAN_CONFIG: CountryVisaConfig = {
  flag: "🇯🇵",
  regionLabel: "Japan Visa",
  categories: {
    "Temporary Visitor": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["Temporary Visitor Visa (Tourism)", "Temporary Visitor Visa (Business)", "Temporary Visitor Visa (Medical)", "Temporary Visitor Visa (Transit)"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa (College / University)", "Student Visa (Japanese Language School)", "Cultural Activities Visa"],
    },
    "Work": {
      purposeDefault: "Employment",
      types: ["Engineer / Specialist in Humanities Visa", "Skilled Labor Visa", "Highly Skilled Professional Visa (HSP)", "Instructor Visa", "Intra-company Transferee Visa", "Business Manager Visa", "Researcher Visa", "Specified Skilled Worker – Type 1", "Specified Skilled Worker – Type 2", "Technical Intern Training Visa"],
    },
    "Family / Dependent": {
      purposeDefault: "Family Visit",
      types: ["Spouse or Child of Japanese National Visa", "Spouse or Child of Permanent Resident Visa", "Long-term Resident Visa", "Dependent Visa"],
    },
    "Permanent Residence": {
      purposeDefault: "Employment",
      types: ["Permanent Resident Visa", "Highly Skilled Professional – Point-based Permanent Resident"],
    },
  },
};

// ── Saudi Arabia ──────────────────────────────────────────────────────────
const SAUDI_CONFIG: CountryVisaConfig = {
  flag: "🇸🇦",
  regionLabel: "Saudi Arabia Visa",
  categories: {
    "Tourist / Visit": {
      purposeDefault: "Tourism & Sightseeing",
      types: ["eVisa – Tourist (30 days single)", "eVisa – Tourist (90 days multiple)", "Visit Visa – Family / Relative", "VIP Tourist Visa", "Umrah Visa", "Hajj Visa"],
    },
    "Transit": {
      purposeDefault: "Transit",
      types: ["Transit Visa (Airport)"],
    },
    "Work / Employment": {
      purposeDefault: "Employment",
      types: ["Work Visa (Employment Contract)", "Premium Residency / Green Card Visa", "Investor Visa", "Freelance / Independent Professional Visa"],
    },
    "Study": {
      purposeDefault: "Study / Education",
      types: ["Student Visa"],
    },
    "Family / Dependent": {
      purposeDefault: "Family Visit",
      types: ["Family Joining Visa (Dependent)", "Domestic Worker Visa"],
    },
  },
};

// ── United States ─────────────────────────────────────────────────────────
const US_CONFIG: CountryVisaConfig = {
  flag: "🇺🇸",
  regionLabel: "US Visa",
  categories: {
    "Visitor":         { purposeDefault: "Tourism & Sightseeing", types: ["B1/B2 – Business / Pleasure", "B1 – Business Only", "B2 – Tourism / Pleasure", "C – Transit", "D – Crewmember"] },
    "Student":         { purposeDefault: "Study / Education",      types: ["F-1 – Academic Student", "F-2 – Dependent of F-1", "M-1 – Vocational Student", "M-2 – Dependent of M-1"] },
    "Work":            { purposeDefault: "Employment",             types: ["H-1B – Specialty Occupation", "H-1B1 – Free Trade Agreement", "H-2A – Agricultural Worker", "H-2B – Non-Agricultural Temp Worker", "H-3 – Trainee / Special Education", "L-1A – Intracompany Manager/Exec", "L-1B – Intracompany Specialized Knowledge", "O-1A – Extraordinary Ability (Science/Business)", "O-1B – Extraordinary Achievement (Arts/Film/TV)", "O-2 – Essential Support for O-1", "P-1A – Internationally Recognized Athlete", "P-1B – Entertainment Group Member", "P-2 – Artist / Entertainer (Exchange Program)", "P-3 – Culturally Unique Performer", "Q – Cultural Exchange Worker", "R-1 – Religious Worker"] },
    "Exchange":        { purposeDefault: "Study / Education",      types: ["J-1 – Exchange Visitor", "J-2 – Dependent of J-1"] },
    "Diplomatic":      { purposeDefault: "Business Meeting",       types: ["A-1 – Ambassador / Diplomat", "A-2 – Other Foreign Government Official", "A-3 – Attendant / Servant of A-1/A-2", "G-1 – Designated Principal Resident Representative", "G-2 – Other Accredited Representative", "G-3 – Representative (Non-Recognized Government)", "G-4 – International Organisation Officer / Employee", "G-5 – Personal Employee of G-1 through G-4", "NATO-1 – NATO Principal Permanent Representative", "NATO-2 – Other NATO Representative / Personnel", "NATO-3 – NATO Official's Official Staff"] },
    "Special":         { purposeDefault: "Family Visit",           types: ["K-1 – Fiancé(e) of US Citizen", "K-2 – Minor Child of K-1", "K-3 – Spouse of US Citizen (Pending I-130)", "K-4 – Minor Child of K-3", "S-5 – Informant / Witness", "S-6 – Informant of Terrorist Organisation", "T-1 – Human Trafficking Victim", "U-1 – Crime Victim"] },
    "Immigrant Work":  { purposeDefault: "Employment",             types: ["EB-1 – Priority Workers (Extraordinary Ability / Outstanding)", "EB-2 – Advanced Degree / Exceptional Ability", "EB-3 – Skilled Workers / Professionals / Other Workers", "EB-4 – Special Immigrants (Religious Workers / Broadcasters, etc.)", "EB-5 – Immigrant Investor"] },
    "Immigrant Family":{ purposeDefault: "Family Visit",           types: ["IR-1 – Spouse of US Citizen", "IR-2 – Unmarried Child (under 21) of US Citizen", "IR-5 – Parent of Adult US Citizen", "F-1 – Unmarried Adult Son / Daughter of US Citizen", "F-2A – Spouse / Child of Permanent Resident", "F-2B – Unmarried Adult Son / Daughter of Permanent Resident", "F-3 – Married Son / Daughter of US Citizen", "F-4 – Sibling of Adult US Citizen"] },
  },
};

// ── Master lookup ─────────────────────────────────────────────────────────
// Countries explicitly handled with category → type selection
const EXPLICIT_CONFIGS: Record<string, CountryVisaConfig> = {
  "United States":  US_CONFIG,
  "United Kingdom": UK_CONFIG,
  "Canada":         CANADA_CONFIG,
  "Australia":      AUSTRALIA_CONFIG,
  "United Arab Emirates": UAE_CONFIG,
  "New Zealand":    NZ_CONFIG,
  "Singapore":      SINGAPORE_CONFIG,
  "Japan":          JAPAN_CONFIG,
  "Saudi Arabia":   SAUDI_CONFIG,
};

// Schengen countries handled dynamically
const SCHENGEN_COUNTRIES = new Set(Object.keys(SCHENGEN_COUNTRY_TYPES));

/**
 * Returns structured visa config for countries that have a two-step
 * category → type selection. Returns null for generic countries.
 */
export function getCountryVisaConfig(country: string): CountryVisaConfig | null {
  if (EXPLICIT_CONFIGS[country]) return EXPLICIT_CONFIGS[country];
  if (SCHENGEN_COUNTRIES.has(country)) return buildSchengenConfig(country);
  return null;
}

/** List of all countries with structured visa selection (for reference). */
export const STRUCTURED_VISA_COUNTRIES = new Set([
  "United States",
  ...Object.keys(EXPLICIT_CONFIGS),
  ...SCHENGEN_COUNTRIES,
]);
