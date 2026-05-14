export type DocumentRequirement = {
  type: string;
  name: string;
  description: string;
  required: boolean;
};

const UNIVERSAL: DocumentRequirement[] = [
  { type: "passport", name: "Passport", description: "Valid for 6+ months beyond return date, 2 blank pages.", required: true },
  { type: "photo", name: "Passport-size photographs", description: "Recent (last 6 months), white background, country-specific size.", required: true },
  { type: "application_form", name: "Visa application form", description: "Completed and signed.", required: true },
  { type: "cover_letter", name: "Cover letter", description: "Brief explanation of purpose of travel.", required: true },
];

const BY_VISA_TYPE: Record<string, DocumentRequirement[]> = {
  "Tourist Visa": [
    { type: "flight_reservation", name: "Flight reservation", description: "Round-trip itinerary (not paid ticket).", required: true },
    { type: "accommodation", name: "Proof of accommodation", description: "Hotel booking, Airbnb, or host invitation letter.", required: true },
    { type: "travel_insurance", name: "Travel insurance", description: "Minimum coverage as per destination requirements.", required: true },
    { type: "bank_statement", name: "Bank statements", description: "Last 3 months, stamped by bank.", required: true },
    { type: "itr", name: "Income Tax Returns", description: "Last 2 financial years.", required: true },
    { type: "employment_letter", name: "Employment letter / NOC", description: "From employer with leave approval; or business proof if self-employed.", required: true },
    { type: "day_itinerary", name: "Day-by-day itinerary", description: "Planned places to visit each day.", required: false },
  ],
  "Business Visa": [
    { type: "invitation_letter", name: "Invitation letter (host company)", description: "On company letterhead, with purpose & duration.", required: true },
    { type: "company_cover_letter", name: "Company cover letter / NOC", description: "From your employer confirming the trip.", required: true },
    { type: "business_registration", name: "Business registration", description: "If self-employed: incorporation / GST / trade license.", required: false },
    { type: "bank_statement", name: "Bank statements", description: "Last 6 months, stamped.", required: true },
    { type: "itr", name: "Income Tax Returns", description: "Last 3 financial years.", required: true },
    { type: "travel_insurance", name: "Travel insurance", description: "Business trip coverage.", required: true },
    { type: "flight_reservation", name: "Flight reservation", description: "Round-trip itinerary.", required: true },
    { type: "accommodation", name: "Hotel booking", description: "For all nights of stay.", required: true },
  ],
  "Student Visa": [
    { type: "admission_letter", name: "Admission / Acceptance letter", description: "Original from the university or college.", required: true },
    { type: "academic_transcripts", name: "Academic transcripts", description: "10th, 12th, and any degree certificates.", required: true },
    { type: "english_test", name: "English proficiency test", description: "IELTS / TOEFL / PTE / Duolingo score report.", required: true },
    { type: "sop", name: "Statement of Purpose (SOP)", description: "Why this course, why this country.", required: true },
    { type: "resume", name: "CV / Resume", description: "Up-to-date academic & professional CV.", required: true },
    { type: "sponsor_letter", name: "Financial sponsor letter", description: "Affidavit of support from parent / sponsor.", required: true },
    { type: "sponsor_bank_statement", name: "Sponsor bank statements", description: "Last 6 months of sponsor's account.", required: true },
    { type: "sponsor_income_proof", name: "Sponsor income proof", description: "ITR / salary slips / business income.", required: true },
    { type: "tuition_proof", name: "Tuition payment proof", description: "If paid in advance, attach receipt.", required: false },
    { type: "health_insurance", name: "Student health insurance", description: "As required by the destination country.", required: false },
  ],
  "Work Visa": [
    { type: "job_offer", name: "Job offer letter", description: "Signed by employer abroad.", required: true },
    { type: "employment_contract", name: "Employment contract", description: "With salary, role, and duration.", required: true },
    { type: "education_certificates", name: "Educational qualifications", description: "Degree, diploma, professional certifications.", required: true },
    { type: "experience_letters", name: "Work experience letters", description: "From previous employers, with duration & role.", required: true },
    { type: "resume", name: "CV / Resume", description: "Detailed work history.", required: true },
    { type: "police_clearance", name: "Police clearance certificate (PCC)", description: "From local police / passport office.", required: true },
    { type: "medical_report", name: "Medical examination report", description: "From an approved panel physician.", required: true },
  ],
  "Transit Visa": [
    { type: "onward_ticket", name: "Onward flight ticket", description: "Continuous itinerary to final destination.", required: true },
    { type: "destination_visa", name: "Visa for final destination", description: "If required for entry to final country.", required: true },
    { type: "bank_statement", name: "Bank statement", description: "Recent statement showing solvency.", required: false },
  ],
  "Family Visa": [
    { type: "sponsor_passport", name: "Sponsor's passport / ID copy", description: "Photo + visa / residence pages.", required: true },
    { type: "relationship_proof", name: "Proof of relationship", description: "Marriage certificate / birth certificate / family book.", required: true },
    { type: "sponsor_invitation", name: "Sponsor's invitation letter", description: "Stating relationship, purpose, duration.", required: true },
    { type: "sponsor_financials", name: "Sponsor's financial proof", description: "Last 6 months bank statements / income.", required: true },
    { type: "sponsor_residence", name: "Sponsor's residence proof", description: "Lease, utility bill, or property deed.", required: true },
  ],
  "Schengen Visa": [
    { type: "travel_insurance", name: "Schengen travel insurance", description: "€30,000 medical coverage, valid in all Schengen states.", required: true },
    { type: "day_itinerary", name: "Day-by-day itinerary", description: "Cities, dates, and reservations.", required: true },
    { type: "flight_reservation", name: "Confirmed return flight reservation", description: "Round-trip booking (not paid ticket).", required: true },
    { type: "accommodation", name: "Confirmed accommodation", description: "Hotel bookings for every night.", required: true },
    { type: "bank_statement", name: "Bank statements", description: "Last 3 months, stamped by bank.", required: true },
    { type: "itr", name: "Income Tax Returns", description: "Last 2 financial years.", required: true },
    { type: "employment_letter", name: "Employment letter + leave NOC", description: "Salaried: from employer. Self-employed: business proof.", required: true },
  ],
  "Investor Visa": [
    { type: "business_plan", name: "Business plan", description: "Detailed plan for the proposed venture.", required: true },
    { type: "investment_proof", name: "Proof of investment funds", description: "Statements showing available capital.", required: true },
    { type: "bank_statement", name: "Bank statements", description: "Last 12 months.", required: true },
    { type: "source_of_funds", name: "Source of funds documentation", description: "Origin of investment capital (sale deed, ITRs, etc.).", required: true },
  ],
};

const BY_COUNTRY: Record<string, DocumentRequirement[]> = {
  "United States": [
    { type: "ds160", name: "DS-160 confirmation page", description: "Online non-immigrant visa application barcode page.", required: true },
    { type: "visa_appointment", name: "Visa appointment confirmation", description: "OFC + consular interview slots.", required: true },
    { type: "visa_fee_receipt", name: "Visa fee payment receipt", description: "MRV fee receipt.", required: true },
  ],
  "United Kingdom": [
    { type: "online_application", name: "Online application reference", description: "GOV.UK application reference number.", required: true },
    { type: "tb_test", name: "TB test certificate", description: "Required if applying from a listed country for stays > 6 months.", required: false },
    { type: "biometrics", name: "Biometrics (UKVCAS) appointment", description: "Appointment confirmation at visa application centre.", required: true },
  ],
  "Canada": [
    { type: "imm_forms", name: "IMM forms", description: "IMM 5257 (visitor) / IMM 1294 (study) / IMM 1295 (work) as applicable.", required: true },
    { type: "biometrics", name: "Biometrics appointment confirmation", description: "VAC biometrics letter.", required: true },
  ],
  "Australia": [
    { type: "immi_application", name: "ImmiAccount application", description: "Online application reference (TRN).", required: true },
    { type: "biometrics", name: "Biometrics", description: "If required by destination office.", required: false },
  ],
  "United Arab Emirates": [
    { type: "sponsor_eid", name: "Sponsor's Emirates ID copy", description: "If sponsored by a UAE resident or company.", required: false },
    { type: "uae_photo", name: "UAE-spec photograph", description: "White background, 4.3x5.5 cm.", required: true },
  ],
  "New Zealand": [
    { type: "immi_application", name: "INZ application form", description: "Filled and signed.", required: true },
    { type: "medical_report", name: "Medical / chest X-ray", description: "If staying > 6 months or from listed countries.", required: false },
  ],
};

const BY_COUNTRY_VISA: Record<string, DocumentRequirement[]> = {
  "United States::Student Visa": [
    { type: "i20", name: "Form I-20", description: "From the SEVP-approved school.", required: true },
    { type: "sevis_receipt", name: "SEVIS fee receipt (I-901)", description: "Proof of SEVIS fee payment.", required: true },
  ],
  "United States::Work Visa": [
    { type: "i797", name: "I-797 approval notice", description: "USCIS petition approval (e.g. H-1B, L-1).", required: true },
  ],
  "Canada::Student Visa": [
    { type: "loa", name: "Letter of Acceptance (DLI)", description: "From a Designated Learning Institution.", required: true },
    { type: "gic", name: "GIC certificate", description: "Guaranteed Investment Certificate ($10,000+) for SDS stream.", required: false },
    { type: "custodian_declaration", name: "Custodian declaration", description: "Required if applicant is a minor.", required: false },
  ],
  "Australia::Student Visa": [
    { type: "coe", name: "Confirmation of Enrolment (CoE)", description: "From the Australian institution.", required: true },
    { type: "oshc", name: "OSHC health insurance", description: "Overseas Student Health Cover for full study duration.", required: true },
    { type: "gte_statement", name: "Genuine Temporary Entrant (GTE) statement", description: "Explaining intent to return after study.", required: true },
  ],
  "United Kingdom::Student Visa": [
    { type: "cas", name: "CAS letter", description: "Confirmation of Acceptance for Studies from UK university.", required: true },
    { type: "atas", name: "ATAS certificate", description: "If your course requires it.", required: false },
  ],
};

export const CHECKLIST_COUNTRIES = Object.keys(BY_COUNTRY).sort();
export const CHECKLIST_VISA_TYPES = Object.keys(BY_VISA_TYPE).sort();

export function getDocumentChecklist(country: string, visaType: string): DocumentRequirement[] {
  if (!country || !visaType) return [];
  const seen = new Map<string, DocumentRequirement>();
  const sources = [
    UNIVERSAL,
    BY_VISA_TYPE[visaType] || [],
    BY_COUNTRY[country] || [],
    BY_COUNTRY_VISA[`${country}::${visaType}`] || [],
  ];
  for (const list of sources) {
    for (const req of list) {
      seen.set(req.type, req);
    }
  }
  return Array.from(seen.values());
}
