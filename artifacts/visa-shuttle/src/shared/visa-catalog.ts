// =============================================================================
// MASTER VISA CATALOG — country → category → specific visa types
// =============================================================================
// Single source of truth for *which visa types are valid for which country*.
// Used by the agency case wizard, lead form, lead-convert dialog, proposal
// dialog, B2C visa check, deep check, and the backend create-endpoints
// (defense-in-depth validation).
//
// Two layers of coverage:
//   1. EXPLICIT configs — countries with a real, well-defined visa
//      classification (United States, United Kingdom, China, India, …).
//      These return a structured `categories → types` object so the UI can
//      render grouped dropdowns (e.g. "Visit / Short-Stay" → "B1/B2").
//   2. SCHENGEN — built dynamically from a per-country pool, mapped to the
//      A / C / D codes.
//   3. GENERIC fallback — for countries without an explicit config we offer
//      a short, broadly-recognised set of categories. NOTE: this list does
//      NOT include "Schengen Visa" — Schengen is a regional arrangement and
//      should never appear under, say, Algeria or Brazil.
// =============================================================================

export interface VisaCategoryData {
  types: string[];
  purposeDefault: string;
}

export interface CountryVisaConfig {
  flag: string;
  regionLabel: string;
  categories: Record<string, VisaCategoryData>;
}

// Generic fallback — used when a country has no explicit config.
// Ordering: most-common first.
export const GENERIC_VISA_TYPES: string[] = [
  "Tourist Visa",
  "Business Visa",
  "Visit Visa",
  "Student Visa",
  "Work Visa",
  "Transit Visa",
  "Family Visa",
  "Investor Visa",
  "Conference / Event Visa",
  "Medical Visa",
  "Diplomatic Visa",
  "Official Visa",
  "Other",
];

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

// Per-country visa types from the Schengen JSON data.
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

// "Schengen Area" as a single destination ≠ any one country's visa list.
// Build a true UNION across all 28 Schengen states so a customer entering
// the area generally (without picking a specific embassy yet) sees every
// visa type that any member country issues. We deduplicate while
// preserving the first-seen order so list ordering stays stable.
function buildSchengenAreaUnionConfig(): CountryVisaConfig {
  const byCode: Record<string, string[]> = { A: [], C: [], D: [] };
  const seen: Record<string, Record<string, true>> = { A: {}, C: {}, D: {} };
  SCHENGEN_COUNTRIES.forEach((country) => {
    const types = SCHENGEN_COUNTRY_TYPES[country] ?? [];
    for (const t of types) {
      const code = SCHENGEN_TYPE_TO_CODE[t];
      if (!code) continue;
      if (!seen[code][t]) {
        seen[code][t] = true;
        byCode[code].push(t);
      }
    }
  });
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

// ── Existing explicit configs ─────────────────────────────────────────────

const UK_CONFIG: CountryVisaConfig = {
  flag: "🇬🇧", regionLabel: "UK Visa",
  categories: {
    "Visit / Short-Stay": { purposeDefault: "Tourism & Sightseeing", types: ["Standard Visitor Visa", "Business Visitor Visa", "Medical Visitor Visa", "Permitted Paid Engagement Visa", "Marriage / Civil Partnership Visitor Visa"] },
    "Transit":            { purposeDefault: "Transit",               types: ["Direct Airside Transit Visa", "Visitor in Transit Visa"] },
    "Study":              { purposeDefault: "Study / Education",     types: ["Student Visa (Tier 4)", "Short-term Study Visa (under 6 months)", "Child Student Visa"] },
    "Work":               { purposeDefault: "Employment",            types: ["Skilled Worker Visa", "Intra-company Transfer Visa", "Global Talent Visa", "Graduate Visa", "Youth Mobility Scheme (Tier 5)", "Seasonal Worker Visa", "Health and Care Worker Visa", "Scale-up Worker Visa", "Innovator Founder Visa", "High Potential Individual (HPI) Visa"] },
    "Family":             { purposeDefault: "Family Visit",          types: ["Spouse / Partner Visa", "Child Visa", "Parent of a Child in the UK Visa", "Adult Dependent Relative Visa"] },
    "Settlement / ILR":   { purposeDefault: "Family Visit",          types: ["Indefinite Leave to Remain (ILR)", "Indefinite Leave to Enter (ILE)", "British National (Overseas) – BN(O)"] },
  },
};

const CANADA_CONFIG: CountryVisaConfig = {
  flag: "🇨🇦", regionLabel: "Canadian Visa",
  categories: {
    "Visitor / Temporary Resident": { purposeDefault: "Tourism & Sightseeing", types: ["Visitor Visa (TRV)", "Super Visa (Parents / Grandparents)", "Business Visitor Visa", "Electronic Travel Authorization (eTA)"] },
    "Transit":             { purposeDefault: "Transit",           types: ["Transit Visa"] },
    "Study":               { purposeDefault: "Study / Education", types: ["Study Permit", "Short-term Study (under 6 months, no permit required)"] },
    "Work":                { purposeDefault: "Employment",        types: ["Open Work Permit", "Employer-specific Work Permit", "LMIA-based Work Permit", "International Experience Canada (IEC) – Working Holiday", "IEC – Young Professionals", "IEC – International Co-op", "Intra-company Transfer Work Permit"] },
    "Permanent Residence": { purposeDefault: "Employment",        types: ["Express Entry – Federal Skilled Worker (FSW)", "Express Entry – Canadian Experience Class (CEC)", "Express Entry – Federal Skilled Trades (FST)", "Provincial Nominee Program (PNP)", "Atlantic Immigration Program (AIP)", "Rural and Northern Immigration Pilot (RNIP)", "Family Sponsorship – Spouse / Partner", "Family Sponsorship – Child", "Family Sponsorship – Parent / Grandparent"] },
  },
};

const AUSTRALIA_CONFIG: CountryVisaConfig = {
  flag: "🇦🇺", regionLabel: "Australian Visa",
  categories: {
    "Visitor / Tourist":   { purposeDefault: "Tourism & Sightseeing", types: ["Visitor Visa – subclass 600", "Electronic Travel Authority (ETA) – subclass 601", "eVisitor – subclass 651", "Business Visitor stream (subclass 600)"] },
    "Transit":             { purposeDefault: "Transit",               types: ["Transit Visa – subclass 771", "Cruise Transit Visa – subclass 773"] },
    "Study":               { purposeDefault: "Study / Education",     types: ["Student Visa – subclass 500", "Student Guardian Visa – subclass 590", "Training Visa – subclass 407"] },
    "Work / Skilled":      { purposeDefault: "Employment",            types: ["Temporary Skill Shortage (TSS) – subclass 482", "Employer Nomination Scheme – subclass 186", "Skilled Independent – subclass 189", "Skilled Nominated – subclass 190", "Skilled Work Regional – subclass 491", "Working Holiday – subclass 417", "Work and Holiday – subclass 462", "Global Talent Independent – subclass 858", "Business Innovation & Investment – subclass 188"] },
    "Family":              { purposeDefault: "Family Visit",          types: ["Partner Visa – subclass 820/801", "Prospective Marriage Visa – subclass 300", "Child Visa – subclass 101/802", "Parent Visa – subclass 103/804", "Contributory Parent Visa – subclass 143/173"] },
    "Permanent Residence": { purposeDefault: "Employment",            types: ["Permanent Residence (Skilled) – subclass 189 / 190 / 491", "Permanent Residence (Employer Sponsored) – subclass 186 / 187", "Permanent Residence (Partner) – subclass 801 / 100", "Permanent Residence (Refugee / Humanitarian)"] },
  },
};

const UAE_CONFIG: CountryVisaConfig = {
  flag: "🇦🇪", regionLabel: "UAE Visa",
  categories: {
    "Tourist / Visit":     { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa – 30 days (single entry)", "Tourist Visa – 60 days (single entry)", "Tourist Visa – 90 days (single entry)", "Tourist Visa – 5-year Multi-entry", "Visit Visa – 30 days (family / personal)", "Visit Visa – 90 days (family / personal)"] },
    "Transit":             { purposeDefault: "Transit",               types: ["Transit Visa – 48 hours", "Transit Visa – 96 hours", "Transit Visa – 14 days"] },
    "Work / Employment":   { purposeDefault: "Employment",            types: ["Employment Visa / Work Permit", "Investor / Partner Visa", "Green Visa (Skilled Employee)", "Green Visa (Freelancer / Self-employed)", "Golden Visa – 10 years (Investor)", "Golden Visa – 10 years (Skilled Professional)", "Golden Visa – 10 years (Researcher / Specialist)", "Mission / Government Employee Visa"] },
    "Study":               { purposeDefault: "Study / Education",     types: ["Student Visa"] },
    "Family":              { purposeDefault: "Family Visit",          types: ["Family Residence Visa (Spouse)", "Family Residence Visa (Children)", "Domestic Worker Visa"] },
  },
};

const NZ_CONFIG: CountryVisaConfig = {
  flag: "🇳🇿", regionLabel: "New Zealand Visa",
  categories: {
    "Visitor":   { purposeDefault: "Tourism & Sightseeing", types: ["Visitor Visa", "Business Visitor Visa", "Medical Treatment Visitor Visa", "NZeTA (Electronic Travel Authority)"] },
    "Transit":   { purposeDefault: "Transit",               types: ["Transit Visa"] },
    "Study":     { purposeDefault: "Study / Education",     types: ["Student Visa", "Fee Paying Student Visa"] },
    "Work":      { purposeDefault: "Employment",            types: ["Accredited Employer Work Visa (AEWV)", "Working Holiday Visa", "Skilled Migrant Category Resident Visa", "Essential Skills Work Visa", "Specific Purpose Work Visa", "Religious Worker Visa"] },
    "Family":    { purposeDefault: "Family Visit",          types: ["Partner of a New Zealand Resident Visa", "Dependent Child Resident Visa", "Parent Retirement Resident Visa"] },
    "Residence": { purposeDefault: "Employment",            types: ["Skilled Migrant Category", "Resident Visa (Partner)", "Resident Visa (Family)", "Investor 1 Resident Visa", "Investor 2 Resident Visa"] },
  },
};

const SINGAPORE_CONFIG: CountryVisaConfig = {
  flag: "🇸🇬", regionLabel: "Singapore Visa",
  categories: {
    "Visit / Short-Term":   { purposeDefault: "Tourism & Sightseeing", types: ["Social Visit Visa (Tourist)", "Social Visit Visa (Business)", "Social Visit Visa (Family / Friends)", "Courtesy Visit Visa"] },
    "Transit":              { purposeDefault: "Transit",               types: ["Transit Visa (within 96 hours)", "Visa-Free Transit Facility (VFTF)"] },
    "Student":              { purposeDefault: "Study / Education",     types: ["Student's Pass", "Dependant's Pass (Student)"] },
    "Work / Employment":    { purposeDefault: "Employment",            types: ["Employment Pass (EP)", "S Pass", "Work Permit (General)", "Work Permit (Domestic Worker)", "EntrePass (Entrepreneur)", "Tech.Pass", "Personalised Employment Pass (PEP)", "ONE Pass (Overseas Networks & Expertise)"] },
    "Long-Term Residence":  { purposeDefault: "Family Visit",          types: ["Long-Term Visit Pass (LTVP)", "Dependant's Pass (Work)", "Permanent Resident (SPR) – Global Investor Programme (GIP)", "Permanent Resident (SPR) – Professionals / Skilled Workers"] },
  },
};

const JAPAN_CONFIG: CountryVisaConfig = {
  flag: "🇯🇵", regionLabel: "Japan Visa",
  categories: {
    "Temporary Visitor":   { purposeDefault: "Tourism & Sightseeing", types: ["Temporary Visitor Visa (Tourism)", "Temporary Visitor Visa (Business)", "Temporary Visitor Visa (Medical)", "Temporary Visitor Visa (Transit)"] },
    "Study":               { purposeDefault: "Study / Education",     types: ["Student Visa (College / University)", "Student Visa (Japanese Language School)", "Cultural Activities Visa"] },
    "Work":                { purposeDefault: "Employment",            types: ["Engineer / Specialist in Humanities Visa", "Skilled Labor Visa", "Highly Skilled Professional Visa (HSP)", "Instructor Visa", "Intra-company Transferee Visa", "Business Manager Visa", "Researcher Visa", "Specified Skilled Worker – Type 1", "Specified Skilled Worker – Type 2", "Technical Intern Training Visa"] },
    "Family / Dependent":  { purposeDefault: "Family Visit",          types: ["Spouse or Child of Japanese National Visa", "Spouse or Child of Permanent Resident Visa", "Long-term Resident Visa", "Dependent Visa"] },
    "Permanent Residence": { purposeDefault: "Employment",            types: ["Permanent Resident Visa", "Highly Skilled Professional – Point-based Permanent Resident"] },
  },
};

const SAUDI_CONFIG: CountryVisaConfig = {
  flag: "🇸🇦", regionLabel: "Saudi Arabia Visa",
  categories: {
    "Tourist / Visit":   { purposeDefault: "Tourism & Sightseeing", types: ["eVisa – Tourist (30 days single)", "eVisa – Tourist (90 days multiple)", "Visit Visa – Family / Relative", "VIP Tourist Visa", "Umrah Visa", "Hajj Visa"] },
    "Transit":           { purposeDefault: "Transit",               types: ["Transit Visa (Airport)"] },
    "Work / Employment": { purposeDefault: "Employment",            types: ["Work Visa (Employment Contract)", "Premium Residency / Green Card Visa", "Investor Visa", "Freelance / Independent Professional Visa"] },
    "Study":             { purposeDefault: "Study / Education",     types: ["Student Visa"] },
    "Family / Dependent":{ purposeDefault: "Family Visit",          types: ["Family Joining Visa (Dependent)", "Domestic Worker Visa"] },
  },
};

const US_CONFIG: CountryVisaConfig = {
  flag: "🇺🇸", regionLabel: "US Visa",
  categories: {
    "Visitor":         { purposeDefault: "Tourism & Sightseeing", types: ["B1/B2 – Business / Pleasure", "B1 – Business Only", "B2 – Tourism / Pleasure", "C – Transit", "D – Crewmember"] },
    "Student":         { purposeDefault: "Study / Education",      types: ["F-1 – Academic Student", "F-2 – Dependent of F-1", "M-1 – Vocational Student", "M-2 – Dependent of M-1"] },
    "Work":            { purposeDefault: "Employment",             types: ["H-1B – Specialty Occupation", "H-1B1 – Free Trade Agreement", "H-2A – Agricultural Worker", "H-2B – Non-Agricultural Temp Worker", "H-3 – Trainee / Special Education", "L-1A – Intracompany Manager/Exec", "L-1B – Intracompany Specialized Knowledge", "O-1A – Extraordinary Ability (Science/Business)", "O-1B – Extraordinary Achievement (Arts/Film/TV)", "O-2 – Essential Support for O-1", "P-1A – Internationally Recognized Athlete", "P-1B – Entertainment Group Member", "P-2 – Artist / Entertainer (Exchange Program)", "P-3 – Culturally Unique Performer", "Q – Cultural Exchange Worker", "R-1 – Religious Worker"] },
    "Exchange":        { purposeDefault: "Study / Education",      types: ["J-1 – Exchange Visitor", "J-2 – Dependent of J-1"] },
    "Immigrant Work":  { purposeDefault: "Employment",             types: ["EB-1 – Priority Workers (Extraordinary Ability / Outstanding)", "EB-2 – Advanced Degree / Exceptional Ability", "EB-3 – Skilled Workers / Professionals / Other Workers", "EB-4 – Special Immigrants (Religious Workers / Broadcasters, etc.)", "EB-5 – Immigrant Investor"] },
    "Immigrant Family":{ purposeDefault: "Family Visit",           types: ["IR-1 – Spouse of US Citizen", "IR-2 – Unmarried Child (under 21) of US Citizen", "IR-5 – Parent of Adult US Citizen", "F-1 – Unmarried Adult Son / Daughter of US Citizen", "F-2A – Spouse / Child of Permanent Resident", "F-2B – Unmarried Adult Son / Daughter of Permanent Resident", "F-3 – Married Son / Daughter of US Citizen", "F-4 – Sibling of Adult US Citizen"] },
  },
};

// ── NEW EXPLICIT CONFIGS ──────────────────────────────────────────────────
// Real, country-specific visa categories. Source: official MFA / immigration
// authority pages, cross-checked against current (2025) practice.

const ALGERIA_CONFIG: CountryVisaConfig = {
  flag: "🇩🇿", regionLabel: "Algerian Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry)", "Tourist Visa (multiple entry)", "Family / Friend Visit Visa", "Cultural Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa (single entry)", "Business Visa (multiple entry)"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa (Temporary)", "Work Visa (Long-term)"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa", "Research / Internship Visa"] },
    "Transit":         { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "Other":           { purposeDefault: "Tourism & Sightseeing",  types: ["Press / Journalist Visa", "Sports Visa", "Medical Treatment Visa", "Diplomatic Visa", "Official / Service Visa"] },
  },
};

const MOROCCO_CONFIG: CountryVisaConfig = {
  flag: "🇲🇦", regionLabel: "Moroccan Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry, up to 90 days)", "Tourist Visa (multiple entry)", "Family / Friend Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa (single entry)", "Business Visa (multiple entry)"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa", "Research / Internship Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa", "Self-employed / Freelance Visa"] },
    "Long Stay":       { purposeDefault: "Family Visit",           types: ["Long-stay Residence Visa", "Family Reunification Visa", "Retirement Residence"] },
    "Transit":         { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "Other":           { purposeDefault: "Tourism & Sightseeing",  types: ["Diplomatic Visa", "Official / Service Visa"] },
  },
};

const TUNISIA_CONFIG: CountryVisaConfig = {
  flag: "🇹🇳", regionLabel: "Tunisian Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry)", "Tourist Visa (multiple entry)", "Family / Friend Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa", "Long-stay Residence (Carte de Séjour)"] },
    "Transit":         { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "Other":           { purposeDefault: "Tourism & Sightseeing",  types: ["Diplomatic Visa", "Official Visa"] },
  },
};

const EGYPT_CONFIG: CountryVisaConfig = {
  flag: "🇪🇬", regionLabel: "Egyptian Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist eVisa (single entry, 30 days)", "Tourist eVisa (multiple entry, 30 days)", "Tourist Visa on Arrival", "Tourist Visa (sticker)", "Family / Friend Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business eVisa", "Business Visa (sticker)"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa", "Al-Azhar Religious Study Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa", "Investor Visa"] },
    "Family":          { purposeDefault: "Family Visit",           types: ["Family Reunion / Residence Visa"] },
    "Transit":         { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "Other":           { purposeDefault: "Tourism & Sightseeing",  types: ["Diplomatic Visa", "Official Visa"] },
  },
};

const TURKEY_CONFIG: CountryVisaConfig = {
  flag: "🇹🇷", regionLabel: "Turkish Visa",
  categories: {
    "Tourist / Visit":     { purposeDefault: "Tourism & Sightseeing", types: ["e-Visa (Tourist, single entry)", "e-Visa (Tourist, multiple entry)", "Tourist Sticker Visa", "Family / Friend Visit Visa"] },
    "Business":            { purposeDefault: "Business Meeting",       types: ["Business e-Visa", "Business Sticker Visa", "Conference / Event Visa"] },
    "Study":               { purposeDefault: "Study / Education",      types: ["Student Visa", "Education / Internship Visa"] },
    "Work":                { purposeDefault: "Employment",             types: ["Work Visa (Çalışma İzni)", "Work Visa (Independent / Self-employed)", "Turquoise Card (Skilled)"] },
    "Long-Term Residence": { purposeDefault: "Family Visit",           types: ["Family Residence Permit", "Long-term Residence Permit", "Investor / Citizenship-by-Investment Visa"] },
    "Transit":             { purposeDefault: "Transit",                types: ["Transit Visa", "Airport Transit Visa"] },
    "Other":               { purposeDefault: "Tourism & Sightseeing",  types: ["Medical Visa", "Diplomatic Visa", "Official / Service Visa"] },
  },
};

const INDIA_CONFIG: CountryVisaConfig = {
  flag: "🇮🇳", regionLabel: "Indian Visa",
  categories: {
    "Tourist":            { purposeDefault: "Tourism & Sightseeing", types: ["e-Tourist Visa (30 days, double entry)", "e-Tourist Visa (1 year, multiple entry)", "e-Tourist Visa (5 years, multiple entry)", "Tourist Visa (sticker, 6 months)", "Tourist Visa (sticker, multi-year)"] },
    "Business":           { purposeDefault: "Business Meeting",       types: ["e-Business Visa (1 year)", "Business Visa (sticker, 5 years)"] },
    "Conference":         { purposeDefault: "Conference / Event",     types: ["e-Conference Visa", "Conference Visa (sticker)"] },
    "Medical":            { purposeDefault: "Medical Treatment",      types: ["e-Medical Visa", "Medical Visa", "e-Medical Attendant Visa"] },
    "Student / Research": { purposeDefault: "Study / Education",      types: ["Student Visa", "Research Visa", "Internship Visa"] },
    "Employment":         { purposeDefault: "Employment",             types: ["Employment Visa", "Project Visa"] },
    "Journalist / Film":  { purposeDefault: "Tourism & Sightseeing",  types: ["Journalist Visa", "Film Visa"] },
    "Transit":            { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "OCI / PIO":          { purposeDefault: "Family Visit",           types: ["OCI Card (Overseas Citizen of India)", "OCI Miscellaneous Service"] },
    "Other":              { purposeDefault: "Tourism & Sightseeing",  types: ["Entry Visa (X-Visa)", "Diplomatic Visa", "Official Visa"] },
  },
};

const CHINA_CONFIG: CountryVisaConfig = {
  flag: "🇨🇳", regionLabel: "Chinese Visa",
  categories: {
    "Tourist (L)":               { purposeDefault: "Tourism & Sightseeing", types: ["L – Tourist (single entry)", "L – Tourist (double entry)", "L – Tourist (multiple entry)"] },
    "Business (M)":              { purposeDefault: "Business Meeting",       types: ["M – Business / Commercial (single entry)", "M – Business / Commercial (multiple entry)"] },
    "Visit / Exchange (F)":      { purposeDefault: "Tourism & Sightseeing",  types: ["F – Non-commercial Visit / Exchange / Study under 180 days"] },
    "Student":                   { purposeDefault: "Study / Education",      types: ["X1 – Long-term Student (180+ days)", "X2 – Short-term Student (under 180 days)"] },
    "Work / Talent":             { purposeDefault: "Employment",             types: ["Z – Work Visa", "R – High-level Talent Visa"] },
    "Family Reunion (Q)":        { purposeDefault: "Family Visit",           types: ["Q1 – Long-term Family Reunion (relative of Chinese citizen / PR)", "Q2 – Short-term Family Visit (relative of Chinese citizen / PR)"] },
    "Family of Foreign Worker (S)":{ purposeDefault: "Family Visit",         types: ["S1 – Long-term Family Visit (dependent of foreign worker)", "S2 – Short-term Family Visit (dependent of foreign worker)"] },
    "Crew / Journalist":         { purposeDefault: "Tourism & Sightseeing",  types: ["C – Crew Member", "J1 – Resident Foreign Journalist", "J2 – Short-term Foreign Journalist"] },
    "Transit (G)":               { purposeDefault: "Transit",                types: ["G – Transit Visa", "Visa-Free Transit (24/72/144-hour)"] },
    "Permanent Residence":       { purposeDefault: "Employment",             types: ["D – Permanent Residence"] },
  },
};

const RUSSIA_CONFIG: CountryVisaConfig = {
  flag: "🇷🇺", regionLabel: "Russian Visa",
  categories: {
    "Tourist":           { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry)", "Tourist Visa (double entry)", "e-Visa (unified)"] },
    "Business":          { purposeDefault: "Business Meeting",       types: ["Business Visa (single entry)", "Business Visa (multiple entry)"] },
    "Private / Family":  { purposeDefault: "Family Visit",           types: ["Private Visit Visa", "Family Reunion Visa"] },
    "Study":             { purposeDefault: "Study / Education",      types: ["Student Visa", "Research Visa"] },
    "Work":              { purposeDefault: "Employment",             types: ["Work Visa (Ordinary)", "Work Visa (Highly Qualified Specialist)"] },
    "Humanitarian":      { purposeDefault: "Tourism & Sightseeing",  types: ["Humanitarian Visa", "Cultural / Religious Exchange Visa"] },
    "Transit":           { purposeDefault: "Transit",                types: ["Transit Visa"] },
    "Other":             { purposeDefault: "Tourism & Sightseeing",  types: ["Diplomatic Visa", "Official / Service Visa", "Crew Visa"] },
  },
};

const BRAZIL_CONFIG: CountryVisaConfig = {
  flag: "🇧🇷", regionLabel: "Brazilian Visa",
  categories: {
    "Visit (VIVIS)":          { purposeDefault: "Tourism & Sightseeing", types: ["VIVIS – Tourism", "VIVIS – Business", "VIVIS – Artistic / Sports", "VIVIS – Transit"] },
    "Temporary (VITEM)":      { purposeDefault: "Study / Education",     types: ["VITEM I – Research / Cultural / Educational", "VITEM II – Health Treatment", "VITEM III – Volunteer Activity", "VITEM IV – Study", "VITEM V – Work", "VITEM VI – Investor", "VITEM VII – Religious / Missionary", "VITEM VIII – Retiree", "VITEM IX – Family Reunion", "VITEM XI – Stateless / Refugee", "VITEM XIV – Digital Nomad"] },
    "Permanent / Diplomatic": { purposeDefault: "Employment",            types: ["Permanent Visa (Investor)", "Diplomatic Visa", "Official / Service Visa", "Courtesy Visa"] },
  },
};

const MEXICO_CONFIG: CountryVisaConfig = {
  flag: "🇲🇽", regionLabel: "Mexican Visa",
  categories: {
    "Visitor":             { purposeDefault: "Tourism & Sightseeing", types: ["Visitor Visa (no permission to work)", "Visitor Visa (with permission for paid activities)", "Visitor Visa (humanitarian reasons)", "Visitor Visa (adoption)"] },
    "Resident":            { purposeDefault: "Study / Education",     types: ["Temporary Resident Visa", "Temporary Resident Student Visa", "Permanent Resident Visa"] },
    "Transit":             { purposeDefault: "Transit",               types: ["Transit Visa"] },
    "Other":               { purposeDefault: "Tourism & Sightseeing", types: ["Diplomatic Visa", "Official Visa"] },
  },
};

const ARGENTINA_CONFIG: CountryVisaConfig = {
  flag: "🇦🇷", regionLabel: "Argentinian Visa",
  categories: {
    "Visit":               { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa", "Business Visa", "Visit (Family / Friend) Visa"] },
    "Temporary Residence": { purposeDefault: "Study / Education",     types: ["Student Visa", "Work / Employment Visa", "Investor Visa", "Family / Spouse Visa", "Religious Worker Visa", "Pensioner / Rentier Visa", "Digital Nomad Visa"] },
    "Permanent / Other":   { purposeDefault: "Employment",            types: ["Permanent Residence", "Transit Visa", "Diplomatic Visa", "Official Visa"] },
  },
};

const KOREA_CONFIG: CountryVisaConfig = {
  flag: "🇰🇷", regionLabel: "South Korean Visa",
  categories: {
    "Short-Term":         { purposeDefault: "Tourism & Sightseeing", types: ["C-3 Short-term General (Tourist / Business / Visit)", "C-4 Short-term Employment", "K-ETA (Electronic Travel Authorization)"] },
    "Cultural / Study":   { purposeDefault: "Study / Education",     types: ["D-1 Cultural / Arts", "D-2 Student (Degree)", "D-4 General Trainee / Language Studies"] },
    "Work":               { purposeDefault: "Employment",            types: ["D-7 Intra-company Transferee", "D-8 Investor / Corporate", "D-9 Trade", "D-10 Job Seeker", "E-1 Professor", "E-2 Foreign Language Teacher", "E-7 Special Profession", "E-9 Non-Professional Employment (EPS)"] },
    "Family / Residence": { purposeDefault: "Family Visit",          types: ["F-1 Visiting / Joining Family", "F-2 Resident", "F-4 Overseas Korean", "F-5 Permanent Resident", "F-6 Marriage Migrant"] },
    "Working Holiday":    { purposeDefault: "Tourism & Sightseeing", types: ["H-1 Working Holiday", "H-2 Visit + Employment (ethnic Koreans)"] },
    "Diplomatic":         { purposeDefault: "Tourism & Sightseeing", types: ["A-1 Diplomatic", "A-2 Government Official", "A-3 Treaty"] },
  },
};

const THAILAND_CONFIG: CountryVisaConfig = {
  flag: "🇹🇭", regionLabel: "Thai Visa",
  categories: {
    "Tourist":          { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (TR – single entry)", "Tourist Visa (TR – multiple entry)", "Tourist eVisa", "Visa Exemption (no visa)", "Visa on Arrival (VOA)"] },
    "Education (ED)":   { purposeDefault: "Study / Education",     types: ["Non-Immigrant ED – Student", "Non-Immigrant ED – Trainee"] },
    "Business (B)":     { purposeDefault: "Business Meeting",       types: ["Non-Immigrant B – Business", "Non-Immigrant B – Work / Employment"] },
    "Family / Marriage":{ purposeDefault: "Family Visit",           types: ["Non-Immigrant O – Marriage", "Non-Immigrant O – Family"] },
    "Retirement":       { purposeDefault: "Family Visit",           types: ["Non-Immigrant O-A (Long-stay Retirement)", "Non-Immigrant O-X (Long-stay Retirement, multi-year)"] },
    "Long-Term":        { purposeDefault: "Employment",             types: ["Long-Term Resident Visa (LTR)", "Smart Visa (T – Talent)", "Smart Visa (I – Investor)", "Smart Visa (E – Executive)", "Smart Visa (S – Startup)"] },
    "Transit":          { purposeDefault: "Transit",                types: ["Transit Visa (TS)"] },
    "Other":            { purposeDefault: "Tourism & Sightseeing",  types: ["Diplomatic Visa", "Official Visa"] },
  },
};

const MALAYSIA_CONFIG: CountryVisaConfig = {
  flag: "🇲🇾", regionLabel: "Malaysian Visa",
  categories: {
    "Visit":               { purposeDefault: "Tourism & Sightseeing", types: ["Single Entry Visa", "Multiple Entry Visa", "eVISA", "Visa Without Reference", "Visa With Reference"] },
    "Study":               { purposeDefault: "Study / Education",     types: ["Student Pass"] },
    "Work / Employment":   { purposeDefault: "Employment",            types: ["Employment Pass (Category I)", "Employment Pass (Category II)", "Employment Pass (Category III)", "Professional Visit Pass", "Residence Pass-Talent (RP-T)"] },
    "Long-Term Residence": { purposeDefault: "Family Visit",          types: ["Long-Term Social Visit Pass (Spouse)", "Long-Term Social Visit Pass (Parent)", "Dependent Pass", "MM2H (Malaysia My Second Home)", "DE Rantau (Digital Nomad)"] },
    "Transit":             { purposeDefault: "Transit",               types: ["Transit Visa"] },
    "Other":               { purposeDefault: "Tourism & Sightseeing", types: ["Diplomatic Pass", "Official Pass"] },
  },
};

const INDONESIA_CONFIG: CountryVisaConfig = {
  flag: "🇮🇩", regionLabel: "Indonesian Visa",
  categories: {
    "Visit (Short-Term)":  { purposeDefault: "Tourism & Sightseeing", types: ["Visa on Arrival (VOA)", "B211A Visit (Tourism)", "B211A Visit (Business)", "B211A Visit (Social / Cultural / Family)", "B211B Visit (Tourism, with sponsor)", "e-VOA"] },
    "Limited Stay (KITAS)":{ purposeDefault: "Employment",            types: ["KITAS – Work", "KITAS – Family", "KITAS – Investor", "KITAS – Retirement", "KITAS – Student"] },
    "Long-Term":           { purposeDefault: "Family Visit",          types: ["Second Home Visa (5 / 10 years)", "Golden Visa (5 / 10 years)"] },
    "Transit":             { purposeDefault: "Transit",               types: ["Transit Visa"] },
    "Other":               { purposeDefault: "Tourism & Sightseeing", types: ["Diplomatic Visa", "Service Visa"] },
  },
};

const PHILIPPINES_CONFIG: CountryVisaConfig = {
  flag: "🇵🇭", regionLabel: "Philippine Visa",
  categories: {
    "Temporary Visitor (9a)": { purposeDefault: "Tourism & Sightseeing", types: ["9(a) – Tourism", "9(a) – Business", "9(a) – Medical", "Visa Waiver / 30-day Stay (no visa)"] },
    "Other Non-Immigrant":    { purposeDefault: "Employment",            types: ["9(b) – Transit", "9(c) – Seaman", "9(d) – Treaty Trader / Investor", "9(f) – Student", "9(g) – Pre-arranged Employment", "47(a)(2) – Special Non-Immigrant"] },
    "Immigrant / Long-Term":  { purposeDefault: "Family Visit",          types: ["13 – Quota Immigrant", "13(a) – Spouse of Filipino", "SRRV (Special Resident Retiree's Visa)", "SIRV (Special Investor's Resident Visa)", "SVEG (Special Visa for Employment Generation)"] },
    "Diplomatic":             { purposeDefault: "Tourism & Sightseeing", types: ["9(e) – Diplomat / Consul"] },
  },
};

const VIETNAM_CONFIG: CountryVisaConfig = {
  flag: "🇻🇳", regionLabel: "Vietnamese Visa",
  categories: {
    "Tourist":      { purposeDefault: "Tourism & Sightseeing", types: ["DL – Tourist", "e-Visa (Tourist / Business, single entry)", "e-Visa (Tourist / Business, multiple entry, 90 days)"] },
    "Business":     { purposeDefault: "Business Meeting",       types: ["DN1 – Business (with Vietnamese org)", "DN2 – Business (independent)"] },
    "Work":         { purposeDefault: "Employment",             types: ["LD1 – Work (exempt from work permit)", "LD2 – Work (with work permit)"] },
    "Study":        { purposeDefault: "Study / Education",      types: ["DH – Student / Internship"] },
    "Family":       { purposeDefault: "Family Visit",           types: ["TT – Family of LD/DN visa holder", "VR – Visiting (other)"] },
    "Investor":     { purposeDefault: "Employment",             types: ["DT1 – Investor (Class 1)", "DT2 – Investor (Class 2)", "DT3 – Investor (Class 3)", "DT4 – Investor (Class 4)"] },
    "Conference":   { purposeDefault: "Conference / Event",     types: ["HN – Conference / Workshop"] },
    "Diplomatic":   { purposeDefault: "Tourism & Sightseeing",  types: ["NG1 – State Guest", "NG2 – Diplomat", "NG3 – Diplomatic Staff", "NG4 – Diplomatic Family"] },
    "Transit":      { purposeDefault: "Transit",                types: ["Transit Visa"] },
  },
};

const SOUTH_AFRICA_CONFIG: CountryVisaConfig = {
  flag: "🇿🇦", regionLabel: "South African Visa",
  categories: {
    "Visit":              { purposeDefault: "Tourism & Sightseeing", types: ["Visitor's Visa (Tourism)", "Visitor's Visa (Business)", "Visitor's Visa (Conference)", "Visitor's Visa (Medical Treatment)"] },
    "Study":              { purposeDefault: "Study / Education",     types: ["Study Visa", "Exchange Visa"] },
    "Work":               { purposeDefault: "Employment",            types: ["General Work Visa", "Critical Skills Work Visa", "Intra-company Transfer Work Visa", "Corporate Visa", "Treaty Visa"] },
    "Business / Investor":{ purposeDefault: "Employment",            types: ["Business Visa (Investor)"] },
    "Family":             { purposeDefault: "Family Visit",          types: ["Relative's Visa (Family)", "Spousal Visa"] },
    "Long-Term":          { purposeDefault: "Family Visit",          types: ["Retired Person's Visa", "Permanent Residence Permit"] },
    "Transit / Other":    { purposeDefault: "Transit",               types: ["Transit Visa", "Crew Visa", "Diplomatic Visa", "Official Visa"] },
  },
};

const QATAR_CONFIG: CountryVisaConfig = {
  flag: "🇶🇦", regionLabel: "Qatar Visa",
  categories: {
    "Tourist / Visit":      { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa Waiver (visa-free entry)", "Tourist eVisa", "A1 Tourist (24-hr Transit)", "Family Visit Visa", "Hayya Card (event-based)"] },
    "Business":             { purposeDefault: "Business Meeting",       types: ["Business Visa", "Conference / Event Visa"] },
    "Family Residence":     { purposeDefault: "Family Visit",           types: ["Family Residence Visa (Spouse)", "Family Residence Visa (Children)"] },
    "Work / Employment":    { purposeDefault: "Employment",             types: ["Work / Employment Visa", "Investor / Self-Sponsored Residence"] },
    "Study":                { purposeDefault: "Study / Education",      types: ["Student Visa"] },
    "Transit / Diplomatic": { purposeDefault: "Transit",                types: ["Transit Visa", "Diplomatic Visa"] },
  },
};

const BAHRAIN_CONFIG: CountryVisaConfig = {
  flag: "🇧🇭", regionLabel: "Bahrain Visa",
  categories: {
    "Tourist":           { purposeDefault: "Tourism & Sightseeing", types: ["Tourist eVisa (2-week, single entry)", "Tourist eVisa (3-month, single entry)", "Tourist eVisa (1-year, multiple entry)", "Tourist eVisa (5-year, multiple entry)"] },
    "Business":          { purposeDefault: "Business Meeting",       types: ["Business eVisa", "Business Visa (multiple entry)"] },
    "Family":            { purposeDefault: "Family Visit",           types: ["Family Visit Visa", "Family Residence (Spouse)", "Family Residence (Child)"] },
    "Work":              { purposeDefault: "Employment",             types: ["Work / Employment Visa", "Investor Visa", "Self-Sponsored / Golden Residency"] },
    "GCC Resident":      { purposeDefault: "Tourism & Sightseeing",  types: ["GCC Resident Visa (3-month)", "GCC Resident Visa (single entry)"] },
    "Transit / Diplomatic":{ purposeDefault: "Transit",              types: ["Transit Visa", "Diplomatic Visa"] },
  },
};

const OMAN_CONFIG: CountryVisaConfig = {
  flag: "🇴🇲", regionLabel: "Oman Visa",
  categories: {
    "Tourist":           { purposeDefault: "Tourism & Sightseeing", types: ["Tourist eVisa (10 days, single entry)", "Tourist eVisa (30 days, single entry)", "Tourist eVisa (1 year, multiple entry)", "Express eVisa (10 days)", "GCC Resident Tourist"] },
    "Business":          { purposeDefault: "Business Meeting",       types: ["Business Visa"] },
    "Work":              { purposeDefault: "Employment",             types: ["Employment / Work Resident Visa", "Investor Visa"] },
    "Family":            { purposeDefault: "Family Visit",           types: ["Family Joining Visa"] },
    "Study / Other":     { purposeDefault: "Study / Education",      types: ["Student Visa", "Transit Visa", "Diplomatic Visa"] },
  },
};

const KUWAIT_CONFIG: CountryVisaConfig = {
  flag: "🇰🇼", regionLabel: "Kuwait Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist eVisa", "Tourist Visa", "Visit Visa (Family)"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa", "Commercial Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa", "Domestic Worker Visa"] },
    "Study / Other":   { purposeDefault: "Study / Education",      types: ["Student Visa", "Transit Visa", "Diplomatic Visa"] },
  },
};

const JORDAN_CONFIG: CountryVisaConfig = {
  flag: "🇯🇴", regionLabel: "Jordan Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry, 1-month)", "Tourist Visa (multiple entry, 6-month)", "Jordan Pass (visa waiver bundle)", "Family Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa", "Investor Visa"] },
    "Transit / Other": { purposeDefault: "Transit",                types: ["Transit Visa", "Diplomatic Visa"] },
  },
};

const ISRAEL_CONFIG: CountryVisaConfig = {
  flag: "🇮🇱", regionLabel: "Israel Visa",
  categories: {
    "Tourist":         { purposeDefault: "Tourism & Sightseeing", types: ["B/2 – Visitor / Tourist"] },
    "Work / Specialist":{purposeDefault: "Employment",            types: ["B/1 – Work (Expert / Specialist)", "B/1 – Work (Caregiver)", "B/1 – Volunteer", "B/4 – Religious Trainee / Clergy"] },
    "Resident":        { purposeDefault: "Family Visit",          types: ["A/1 – Temporary Resident", "A/2 – Student", "A/3 – Clergy", "A/4 – Family Member of A/2 or A/3", "A/5 – Permanent Resident Status"] },
    "Aliyah":          { purposeDefault: "Family Visit",          types: ["Aliyah (under Law of Return)"] },
    "Other":           { purposeDefault: "Transit",               types: ["Transit Visa", "Diplomatic Visa"] },
  },
};

const LEBANON_CONFIG: CountryVisaConfig = {
  flag: "🇱🇧", regionLabel: "Lebanon Visa",
  categories: {
    "Tourist / Visit": { purposeDefault: "Tourism & Sightseeing", types: ["Tourist Visa (single entry, 1-month)", "Tourist Visa (multiple entry, 6-month)", "Visa on Arrival (eligible nationals)", "Family Visit Visa"] },
    "Business":        { purposeDefault: "Business Meeting",       types: ["Business Visa"] },
    "Study":           { purposeDefault: "Study / Education",      types: ["Student Visa"] },
    "Work":            { purposeDefault: "Employment",             types: ["Work Visa"] },
    "Transit / Other": { purposeDefault: "Transit",                types: ["Transit Visa", "Diplomatic Visa"] },
  },
};

const IRELAND_CONFIG: CountryVisaConfig = {
  flag: "🇮🇪", regionLabel: "Irish Visa",
  categories: {
    "Short-Stay 'C'":  { purposeDefault: "Tourism & Sightseeing", types: ["C Visit (Tourism)", "C Business", "C Conference / Event", "C Marriage / Civil Partnership", "C Visit (Family / Friend)"] },
    "Long-Stay 'D' Study": { purposeDefault: "Study / Education", types: ["D Study (English Language)", "D Study (Higher Education)"] },
    "Long-Stay 'D' Work":  { purposeDefault: "Employment",        types: ["D Critical Skills Employment Permit", "D General Employment Permit", "D Intra-Company Transfer", "D Atypical Working Scheme", "D Working Holiday Authorisation"] },
    "Long-Stay 'D' Family":{ purposeDefault: "Family Visit",      types: ["D Join Family / Spouse", "D De Facto Partner of Irish / EEA citizen"] },
    "Long-Stay 'D' Other": { purposeDefault: "Family Visit",      types: ["D Religious Minister", "D Volunteer", "Stamp 0 (Limited Permission)"] },
    "Transit":             { purposeDefault: "Transit",           types: ["Transit Visa", "Re-entry Visa"] },
  },
};

const HONG_KONG_CONFIG: CountryVisaConfig = {
  flag: "🇭🇰", regionLabel: "Hong Kong Visa",
  categories: {
    "Visit":   { purposeDefault: "Tourism & Sightseeing", types: ["Visit Visa (Tourism)", "Visit Visa (Business)", "Visit Visa (Conference / Exhibition)", "Visit Visa (Family)"] },
    "Work":    { purposeDefault: "Employment",            types: ["General Employment Policy (GEP)", "Top Talent Pass Scheme (TTPS)", "Quality Migrant Admission Scheme (QMAS)", "Capital Investment Entrant Scheme (CIES)", "Working Holiday"] },
    "Study":   { purposeDefault: "Study / Education",     types: ["Student Visa", "Training Visa"] },
    "Family":  { purposeDefault: "Family Visit",          types: ["Dependant Visa"] },
    "Residence":{ purposeDefault: "Employment",           types: ["Right of Abode", "Right to Land"] },
    "Transit": { purposeDefault: "Transit",               types: ["Transit Visa"] },
  },
};

const TAIWAN_CONFIG: CountryVisaConfig = {
  flag: "🇹🇼", regionLabel: "Taiwan Visa",
  categories: {
    "Visitor":  { purposeDefault: "Tourism & Sightseeing", types: ["Visitor Visa (Tourism)", "Visitor Visa (Business)", "Visitor Visa (Visit Family)", "Visitor Visa (Medical)"] },
    "Resident": { purposeDefault: "Employment",            types: ["Resident Visa (Employment)", "Resident Visa (Study)", "Resident Visa (Joining Family)", "Resident Visa (Investment)", "Employment Gold Card"] },
    "Other":    { purposeDefault: "Transit",               types: ["Transit / Stopover Visa", "Diplomatic Visa", "Courtesy Visa"] },
  },
};

// ── Master lookup ─────────────────────────────────────────────────────────
const EXPLICIT_CONFIGS: Record<string, CountryVisaConfig> = {
  // Existing
  "United States":         US_CONFIG,
  "United Kingdom":        UK_CONFIG,
  "Canada":                CANADA_CONFIG,
  "Australia":             AUSTRALIA_CONFIG,
  "United Arab Emirates":  UAE_CONFIG,
  "New Zealand":           NZ_CONFIG,
  "Singapore":             SINGAPORE_CONFIG,
  "Japan":                 JAPAN_CONFIG,
  "Saudi Arabia":          SAUDI_CONFIG,
  // North Africa
  "Algeria":               ALGERIA_CONFIG,
  "Morocco":               MOROCCO_CONFIG,
  "Tunisia":               TUNISIA_CONFIG,
  "Egypt":                 EGYPT_CONFIG,
  // Middle East / Gulf
  "Turkey":                TURKEY_CONFIG,
  "Qatar":                 QATAR_CONFIG,
  "Bahrain":               BAHRAIN_CONFIG,
  "Oman":                  OMAN_CONFIG,
  "Kuwait":                KUWAIT_CONFIG,
  "Jordan":                JORDAN_CONFIG,
  "Israel":                ISRAEL_CONFIG,
  "Lebanon":               LEBANON_CONFIG,
  // Asia
  "India":                 INDIA_CONFIG,
  "China":                 CHINA_CONFIG,
  "South Korea":           KOREA_CONFIG,
  "Thailand":              THAILAND_CONFIG,
  "Malaysia":              MALAYSIA_CONFIG,
  "Indonesia":             INDONESIA_CONFIG,
  "Philippines":           PHILIPPINES_CONFIG,
  "Vietnam":               VIETNAM_CONFIG,
  "Hong Kong":             HONG_KONG_CONFIG,
  "Taiwan":                TAIWAN_CONFIG,
  // Europe (non-Schengen)
  "Ireland":               IRELAND_CONFIG,
  // Other
  "Russia":                RUSSIA_CONFIG,
  "South Africa":          SOUTH_AFRICA_CONFIG,
  "Brazil":                BRAZIL_CONFIG,
  "Mexico":                MEXICO_CONFIG,
  "Argentina":             ARGENTINA_CONFIG,
};

// Schengen countries handled dynamically by buildSchengenConfig().
const SCHENGEN_COUNTRIES = new Set(Object.keys(SCHENGEN_COUNTRY_TYPES));

/**
 * Returns structured visa config for countries that have a two-step
 * category → type selection. Returns null for countries that fall back
 * to the GENERIC_VISA_TYPES list.
 */
export function getCountryVisaConfig(country: string): CountryVisaConfig | null {
  if (!country) return null;
  if (EXPLICIT_CONFIGS[country]) return EXPLICIT_CONFIGS[country];
  if (country === "Schengen Area") {
    // Synthetic option: union of all Schengen types under A/C/D buckets.
    return buildSchengenAreaUnionConfig();
  }
  if (SCHENGEN_COUNTRIES.has(country)) return buildSchengenConfig(country);
  return null;
}

/**
 * Flat list of every visa type that's valid for a given country. Falls back
 * to GENERIC_VISA_TYPES when no explicit config exists. This is the canonical
 * "is X a valid visa for Y?" oracle for both UI dropdowns and backend create
 * validation.
 */
export function getCountryVisaTypes(country: string): string[] {
  const conf = getCountryVisaConfig(country);
  if (!conf) return GENERIC_VISA_TYPES;
  const seen = new Set<string>();
  for (const cat of Object.values(conf.categories)) {
    for (const t of cat.types) seen.add(t);
  }
  return Array.from(seen);
}

/**
 * Defense-in-depth validator. Use on backend create endpoints to catch
 * mismatched country↔visa-type pairs (e.g. Algeria + "Schengen Visa").
 * Empty visaType is treated as valid here — call sites should enforce
 * required-field separately.
 */
export function isValidVisaTypeForCountry(country: string, visaType: string | null | undefined): boolean {
  if (!visaType) return true;
  if (!country) return true; // can't validate without a country
  const allowed = getCountryVisaTypes(country);
  return allowed.includes(visaType);
}

/** Set of all countries with structured (categorised) visa selection. */
export const STRUCTURED_VISA_COUNTRIES = (() => {
  const out = new Set<string>(Object.keys(EXPLICIT_CONFIGS));
  SCHENGEN_COUNTRIES.forEach((c) => out.add(c));
  out.add("Schengen Area");
  return out;
})();
