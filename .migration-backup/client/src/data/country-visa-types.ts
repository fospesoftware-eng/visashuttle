// This file used to host the country↔visa-type catalog locally. The data has
// moved to `shared/visa-catalog.ts` so the backend can validate against the
// same source of truth. We re-export everything here so existing imports
// (`@/data/country-visa-types`) continue to work unchanged.

export {
  type VisaCategoryData,
  type CountryVisaConfig,
  GENERIC_VISA_TYPES,
  getCountryVisaConfig,
  getCountryVisaTypes,
  isValidVisaTypeForCountry,
  STRUCTURED_VISA_COUNTRIES,
} from "@shared/visa-catalog";
