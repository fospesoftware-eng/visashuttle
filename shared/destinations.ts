// =============================================================================
// MASTER LIST — destination countries & visa types
// =============================================================================
// Single source of truth for the country and visa-type pickers used across
// the entire app: agency case wizard, leads, proposals, fee templates,
// accounting, B2C onboarding, customer profile, deep-check, etc.
//
// ➜ To add or remove an option, edit it here and ONLY here. All UI dropdowns
//   import from this file so the lists stay consistent everywhere.
//
// Country names are kept in alphabetical order. "Schengen Area" is included
// as a logical destination even though it isn't a sovereign country, because
// agencies commonly issue a single "Schengen" application.
// =============================================================================

export const COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic",
  "Democratic Republic of Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala",
  "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Schengen Area",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
  "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
];

// A short, curated list of the destinations agencies most commonly issue
// applications for. Use this when the full list would overwhelm the UI
// (e.g. quick-pick buttons, marketing widgets). It's a strict subset of
// COUNTRIES — never add an entry here that isn't in COUNTRIES too.
export const POPULAR_DESTINATIONS: string[] = [
  "United States", "United Kingdom", "Canada", "Australia",
  "Schengen Area", "France", "Germany", "Italy", "Spain", "Netherlands",
  "Switzerland", "United Arab Emirates", "Saudi Arabia",
  "Singapore", "Japan", "South Korea", "New Zealand", "Turkey",
];

// Master list of generic visa categories every page falls back on when there
// isn't a structured per-country config in `shared/visa-catalog.ts`.
// Keep this list short and broadly recognisable — country-specific types
// (e.g. "B1/B2", "Tier 4", "Subclass 500") belong in the per-country file.
//
// "Schengen Visa" intentionally NOT in this generic list — Schengen is a
// regional arrangement and only valid for the 27 member states (which each
// have their own structured config). Showing "Schengen Visa" as an option
// for, say, Algeria is incorrect.
export { GENERIC_VISA_TYPES as VISA_TYPES } from "./visa-catalog";
