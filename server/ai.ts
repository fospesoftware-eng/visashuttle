const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

export interface VisaCheckFormData {
  // Step 1 - Personal Profile
  nationality: string;
  passportCountry?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  numberOfChildren?: string;
  countryOfResidence?: string;
  dependentsHomeCountry?: string;
  // Step 2 - Travel Plan
  destinationCountry: string;
  visaType: string;
  purposeOfTravel: string;
  plannedTravelDate?: string;
  tripDuration: string;
  entryType?: string;
  firstTimeVisitor?: string;
  // Visa-type conditional fields
  institutionName?: string;
  studyLevel?: string;
  hasAcceptanceLetter?: string;
  hasJobOffer?: string;
  hiringCompanyName?: string;
  invitingCompanyName?: string;
  hostRelationship?: string;
  hostVisaStatus?: string;
  transitFinalDestination?: string;
  // Step 3 - Employment & Income
  employmentStatus: string;
  jobTitle?: string;
  companyName?: string;
  yearsInJob?: string;
  monthlyIncome: string;
  sourceOfIncome?: string;
  hasTaxReturn?: string;
  hasSalarySlips?: string;
  // Employment-type conditional fields
  businessType?: string;
  hasBusinessRegistration?: string;
  scholarshipAvailable?: string;
  hasEnrollmentLetter?: string;
  previousProfession?: string;
  hasPensionDocs?: string;
  // Step 4 - Financial Strength
  bankBalance: string;
  hasBankStatement?: string;
  bankStatementDuration?: string;
  hasLargeDeposits?: string;
  hasCreditCard?: string;
  hasProperty?: string;
  tripFunding: string;
  sponsorDetails?: string;
  // Step 5 - Travel History
  countriesVisited?: string;
  numberOfTrips?: string;
  previousVisaApprovals?: string;
  previousVisaRefusals: string;
  refusalReason?: string;
  hasOverstay?: string;
  hasDeportation?: string;
  // Step 6 - Documents
  hasReturnTicket?: string;
  hasHotelBooking?: string;
  hasInvitationLetter?: string;
  hasTravelInsurance?: string;
  hasItinerary?: string;
  hasLeaveApproval?: string;
  hasCoverLetter?: string;
  // Step 7 - Home Ties
  familyInHomeCountry?: string;
  propertyInHomeCountry?: string;
  stableEmploymentHome?: string;
  ongoingEducation?: string;
  financialCommitmentsHome?: string;
  criminalRecord?: string;
  immigrationViolation?: string;
  [key: string]: string | undefined;
}

export interface AIVisaResult {
  approvalChance: number;
  statusLabel: string;
  summary: string;
  strengths: string[];
  riskFactors: string[];
  missingDocuments: string[];
  requiredDocuments: string[];
  countrySpecificConcerns: string[];
  improvementTips: string[];
  nextSteps: string[];
  finalRecommendation: string;
  disclaimer: string;
}

function getStatusLabel(chance: number): string {
  if (chance >= 80) return "High Chance";
  if (chance >= 60) return "Good Chance";
  if (chance >= 40) return "Moderate Chance";
  if (chance >= 20) return "Low Chance";
  return "Very Risky";
}

function buildSystemPrompt(): string {
  return `You are an expert immigration consultant AI for Visa Shuttle with deep knowledge of visa regulations, embassy requirements, and approval patterns globally. Analyze the traveler's complete visa profile — including ALL conditional answers about their specific visa type, employment situation, marital status, and documents — then return ONLY a valid JSON object with this exact structure:

{
  "approvalChance": <integer 5-95>,
  "statusLabel": "<High Chance|Good Chance|Moderate Chance|Low Chance|Very Risky>",
  "summary": "<2-3 sentence professional assessment tailored specifically to this nationality + destination + visa type combination, referencing their actual situation>",
  "strengths": ["<specific strength from their profile>", "<specific strength>", "<specific strength>", "<specific strength>"],
  "riskFactors": ["<specific risk from their profile>", "<specific risk>", "<specific risk>"],
  "missingDocuments": ["<specific missing doc for their visa type>", "<specific missing doc>", "<specific missing doc>"],
  "requiredDocuments": ["<required doc 1>", "<required doc 2>", "<required doc 3>", "<required doc 4>", "<required doc 5>"],
  "countrySpecificConcerns": ["<country + visa-type specific concern 1>", "<country + visa-type specific concern 2>"],
  "improvementTips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>", "<actionable tip 4>"],
  "nextSteps": ["<concrete next step 1>", "<concrete next step 2>", "<concrete next step 3>", "<concrete next step 4>"],
  "finalRecommendation": "<One direct sentence: recommend applying now, apply with improvements, postpone, or seek legal advice>",
  "disclaimer": "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval."
}

SCORING RULES (be precise, not generous):
- 80-95: Strong profile — solid finances, clean history, proper docs, strong home ties, appropriate visa type for nationality
- 60-79: Good chance — mostly solid with 1-2 addressable gaps
- 40-59: Moderate — average finances, some gaps or minor risk factors
- 20-39: Low chance — multiple gaps, refusal history, weak finances, or problematic visa type for this nationality
- 5-19: Very Risky — deportation/overstay/criminal record, severely weak profile, or very high-scrutiny combination

KEY SCORING FACTORS:
RAISES score: Western/strong passport (US, UK, EU, AU, CA, JP, SG), bank balance >$7,000 consistent, stable employment 2+ years, extensive clean travel history, no refusals/overstays, return ticket + hotel confirmed, travel insurance, bank statement 6+ months, strong home ties (spouse/children/property in home country), invitation letter from verified host, cover letter, acceptance letter (student), formal job offer (work visa), short stay (7-14 days tourist).

LOWERS score: South Asian, African, Middle Eastern passport applying for US/UK/Schengen/AU, previous refusals (−15 each), overstay (−25), deportation (−35), criminal record (−20), immigration violations (−20), unemployment with low bank balance, stay >1 month with no strong ties, no return ticket, no bank statement, first-time visitor to high-scrutiny destination, large unexplained bank deposits.

VISA-TYPE SPECIFIC considerations:
- Student Visa: Score UP if acceptance letter + institution name provided + scholarship + enrollment letter. Score DOWN if no acceptance letter or vague institution.
- Work Visa: Score UP if formal job offer letter available + named hiring company. Score DOWN if no job offer.
- Business Visa: Score UP if inviting company named + invitation letter. 
- Spouse/Family Visa: Score UP if host relationship clear + host visa status provided.
- Tourist/Visit Visa: Score UP if hotel + return ticket + itinerary + travel insurance all confirmed.

EMPLOYMENT-TYPE considerations:
- Fully employed 2+ years with salary slips + tax return: significant positive
- Self-employed with business registration + tax return: positive
- Student with scholarship + enrollment letter: positive for student visa
- Retired with pension docs: neutral to positive
- Unemployed: significant negative unless very high bank balance

Tailor ALL response fields to the SPECIFIC VISA TYPE and NATIONALITY+DESTINATION combination. Do not give generic answers.
Return ONLY valid JSON. No markdown, no code blocks.`;
}

function buildUserPrompt(form: VisaCheckFormData): string {
  const parts: string[] = [
    "=== COMPLETE TRAVELER VISA PROFILE ===",
    "",
    "--- Personal Profile ---",
    `Nationality: ${form.nationality}`,
    form.passportCountry ? `Passport Issued By: ${form.passportCountry}` : "",
    form.gender ? `Gender: ${form.gender}` : "",
    form.maritalStatus ? `Marital Status: ${form.maritalStatus}` : "",
    form.numberOfChildren ? `Number of Children: ${form.numberOfChildren}` : "",
    form.countryOfResidence ? `Country of Residence: ${form.countryOfResidence}` : "",
    form.dateOfBirth ? `Date of Birth: ${form.dateOfBirth}` : "",
    form.dependentsHomeCountry ? `Total Dependents in Home Country: ${form.dependentsHomeCountry}` : "",
    "",
    "--- Travel Plan ---",
    `Destination Country: ${form.destinationCountry}`,
    `Visa Type Applied For: ${form.visaType}`,
    `Purpose of Travel: ${form.purposeOfTravel}`,
    `Intended Trip Duration: ${form.tripDuration}`,
    form.entryType ? `Entry Type: ${form.entryType}` : "",
    form.firstTimeVisitor ? `First-time Visitor to Destination: ${form.firstTimeVisitor}` : "",
    form.plannedTravelDate ? `Planned Travel Date: ${form.plannedTravelDate}` : "",
    // Visa-type conditional data
    form.institutionName ? `Institution / University: ${form.institutionName}` : "",
    form.studyLevel ? `Study Level / Program: ${form.studyLevel}` : "",
    form.hasAcceptanceLetter ? `Admission/Acceptance Letter Received: ${form.hasAcceptanceLetter}` : "",
    form.hasJobOffer ? `Formal Job Offer Letter Available: ${form.hasJobOffer}` : "",
    form.hiringCompanyName ? `Hiring Company (Destination): ${form.hiringCompanyName}` : "",
    form.invitingCompanyName ? `Inviting Company / Organisation: ${form.invitingCompanyName}` : "",
    form.hostRelationship ? `Relationship to Host: ${form.hostRelationship}` : "",
    form.hostVisaStatus ? `Host's Visa / Residency Status: ${form.hostVisaStatus}` : "",
    form.transitFinalDestination ? `Transit — Final Destination: ${form.transitFinalDestination}` : "",
    "",
    "--- Employment & Income ---",
    `Employment Status: ${form.employmentStatus}`,
    form.jobTitle ? `Job Title: ${form.jobTitle}` : "",
    form.companyName ? `Company / Employer: ${form.companyName}` : "",
    form.businessType ? `Business / Work Type: ${form.businessType}` : "",
    form.yearsInJob ? `Years in Current Role / Business: ${form.yearsInJob}` : "",
    form.previousProfession ? `Previous Profession (Retired): ${form.previousProfession}` : "",
    `Monthly Income (USD): ${form.monthlyIncome}`,
    form.sourceOfIncome ? `Primary Income Source: ${form.sourceOfIncome}` : "",
    // Employment-conditional documents
    form.hasSalarySlips ? `Salary Slips Available (last 3 months): ${form.hasSalarySlips}` : "",
    form.hasTaxReturn ? `Tax Return / ITR Available: ${form.hasTaxReturn}` : "",
    form.hasBusinessRegistration ? `Business Registration Document: ${form.hasBusinessRegistration}` : "",
    form.scholarshipAvailable ? `Scholarship / Financial Aid: ${form.scholarshipAvailable}` : "",
    form.hasEnrollmentLetter ? `Student Enrollment Letter: ${form.hasEnrollmentLetter}` : "",
    form.hasPensionDocs ? `Pension / Retirement Documents: ${form.hasPensionDocs}` : "",
    "",
    "--- Financial Strength ---",
    `Approximate Bank Balance (USD): ${form.bankBalance}`,
    `Bank Statement Available: ${form.hasBankStatement || "Not specified"}`,
    form.bankStatementDuration ? `Bank Statement Coverage: ${form.bankStatementDuration}` : "",
    `Unexplained Large Deposits: ${form.hasLargeDeposits || "No"}`,
    `Credit Card Available: ${form.hasCreditCard || "Not specified"}`,
    `Property / Assets Owned: ${form.hasProperty || "Not specified"}`,
    `Trip Funding Source: ${form.tripFunding}`,
    form.sponsorDetails ? `Sponsor Details: ${form.sponsorDetails}` : "",
    "",
    "--- Travel History ---",
    form.numberOfTrips ? `Total International Trips (lifetime): ${form.numberOfTrips}` : "Total International Trips: Not specified",
    form.countriesVisited ? `Countries Visited (last 3 years): ${form.countriesVisited}` : "",
    `Previous Visa Approvals: ${form.previousVisaApprovals || "Not specified"}`,
    `Previous Visa Refusals: ${form.previousVisaRefusals}`,
    form.refusalReason ? `Refusal Reason Provided: ${form.refusalReason}` : "",
    `Overstay History: ${form.hasOverstay || "No"}`,
    `Deportation History: ${form.hasDeportation || "No"}`,
    "",
    "--- Supporting Documents ---",
    `Return / Onward Ticket Booked: ${form.hasReturnTicket || "No"}`,
    `Hotel / Accommodation Booked: ${form.hasHotelBooking || "Not applicable / No"}`,
    `Invitation Letter (Host/Company): ${form.hasInvitationLetter || "No"}`,
    `Travel Insurance Policy: ${form.hasTravelInsurance || "No"}`,
    `Day-wise Travel Itinerary: ${form.hasItinerary || "No"}`,
    `Leave Approval / NOC from Employer: ${form.hasLeaveApproval || "N/A (not employed)"}`,
    `Cover Letter / Personal Statement: ${form.hasCoverLetter || "No"}`,
    "",
    "--- Home Country Ties ---",
    `Spouse / Family in Home Country: ${form.familyInHomeCountry || "Not specified"}`,
    `Property / Real Estate in Home Country: ${form.propertyInHomeCountry || "Not specified"}`,
    `Stable Employment / Active Business at Home: ${form.stableEmploymentHome || "Not specified"}`,
    `Ongoing Education / Study at Home: ${form.ongoingEducation || "No"}`,
    `Financial Commitments at Home (loans/EMI/rent): ${form.financialCommitmentsHome || "Not specified"}`,
    "",
    "--- Risk & Compliance Declarations ---",
    `Criminal Record (any jurisdiction): ${form.criminalRecord || "No"}`,
    `Immigration Violation History: ${form.immigrationViolation || "No"}`,
  ];

  return parts.filter(p => p !== "").join("\n");
}

async function callOpenAI(form: VisaCheckFormData): Promise<AIVisaResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(form) },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status} ${await response.text()}`);
  const data = await response.json() as any;
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content) as AIVisaResult;
}

async function callClaude(form: VisaCheckFormData): Promise<AIVisaResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(form) }],
    }),
  });

  if (!response.ok) throw new Error(`Claude error: ${response.status} ${await response.text()}`);
  const data = await response.json() as any;
  const content = data.content[0]?.text;
  if (!content) throw new Error("No content from Claude");
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");
  return JSON.parse(jsonMatch[0]) as AIVisaResult;
}

function mockResult(form: VisaCheckFormData): AIVisaResult {
  const HIGH_NAT = new Set(["United States","United Kingdom","Germany","France","Canada","Australia","Japan","South Korea","Singapore","Netherlands","Switzerland","Sweden","Norway","Denmark","Finland","Austria","Belgium","New Zealand","Ireland","Luxembourg"]);
  const MID_NAT = new Set(["Brazil","Mexico","Argentina","South Africa","Turkey","Malaysia","Thailand","Philippines","Indonesia","Russia","Ukraine","Poland","Romania","Morocco","Jordan","Egypt","Georgia","Taiwan"]);

  let score = 48;
  if (HIGH_NAT.has(form.nationality)) score += 22;
  else if (MID_NAT.has(form.nationality)) score += 8;
  else score -= 5;

  if (form.visaType === "Tourist Visa" || form.visaType === "Transit Visa") score += 10;
  else if (form.visaType === "Visit Visa") score += 7;
  else if (form.visaType === "Business Visa") score += 4;
  else if (form.visaType === "Conference / Event Visa") score += 5;
  else if (form.visaType === "Medical Visa") score += 2;
  else if (form.visaType === "Investor Visa") score += 3;
  else if (form.visaType === "Student Visa") score -= 5;
  else if (form.visaType === "Work Visa") score -= 10;
  else if (form.visaType === "Spouse / Family Visa") score -= 3;

  // Visa-type conditional bonuses
  if (form.visaType === "Student Visa") {
    if (form.hasAcceptanceLetter === "Yes") score += 10;
    if (form.institutionName) score += 3;
    if (form.scholarshipAvailable === "Yes") score += 5;
    if (form.hasEnrollmentLetter === "Yes") score += 4;
  }
  if (form.visaType === "Work Visa") {
    if (form.hasJobOffer === "Yes") score += 12;
    if (form.hiringCompanyName) score += 4;
  }
  if (form.visaType === "Business Visa") {
    if (form.invitingCompanyName) score += 5;
    if (form.hasInvitationLetter === "Yes") score += 6;
  }
  if (form.visaType === "Spouse / Family Visa") {
    if (form.hostRelationship) score += 4;
    if (form.hostVisaStatus) score += 4;
    if (form.hasInvitationLetter === "Yes") score += 5;
  }

  // Marital status / dependents (strong home ties = lower immigration risk)
  if (form.maritalStatus === "Married" && form.numberOfChildren && parseInt(form.numberOfChildren) > 0) score += 6;
  else if (form.maritalStatus === "Married") score += 3;
  if (form.dependentsHomeCountry && form.dependentsHomeCountry !== "None") score += 3;

  const tough = new Set(["United States","United Kingdom","Canada","Australia","Germany","France","Schengen"]);
  if (tough.has(form.destinationCountry)) score -= 8;

  if (form.previousVisaRefusals?.includes("Yes") || form.previousVisaRefusals === "Yes – once") score -= 18;
  if (form.previousVisaRefusals === "Yes – multiple times") score -= 28;
  if (form.hasOverstay === "Yes") score -= 25;
  if (form.hasDeportation === "Yes") score -= 30;
  if (form.criminalRecord === "Yes") score -= 20;
  if (form.bankBalance?.includes("$15,000") || form.bankBalance?.includes("$30,000") || form.bankBalance?.includes("More than")) score += 12;
  else if (form.bankBalance?.includes("$7,000") || form.bankBalance?.includes("$3,000")) score += 5;
  else if (form.bankBalance?.includes("Less than $1,000")) score -= 12;
  if (form.employmentStatus === "Employed (Full-time)") score += 9;
  else if (form.employmentStatus === "Employed (Part-time)") score += 4;
  else if (form.employmentStatus === "Government Employee") score += 11;
  else if (form.employmentStatus === "Self-employed / Business Owner") score += 4;
  else if (form.employmentStatus === "Freelancer / Consultant") score += 2;
  else if (form.employmentStatus === "Retired") score += 5;
  else if (form.employmentStatus === "Student") score += 0;
  else if (form.employmentStatus === "Unemployed") score -= 14;
  // Employment-conditional document bonuses
  if (form.hasSalarySlips === "Yes") score += 4;
  if (form.hasBusinessRegistration === "Yes") score += 5;
  if (form.hasPensionDocs === "Yes") score += 3;
  if (form.yearsInJob && !["Less than 6 months","6 months – 1 year"].some(v => form.yearsInJob === v)) score += 4;
  if (form.numberOfTrips === "10+" || form.numberOfTrips === "6-10") score += 10;
  else if (form.numberOfTrips === "3-5") score += 6;
  else if (form.numberOfTrips === "None") score -= 6;
  if (form.hasReturnTicket === "Yes") score += 6;
  if (form.hasHotelBooking === "Yes") score += 5;
  if (form.hasBankStatement === "Yes") score += 5;
  if (form.hasSalarySlips === "Yes") score += 4;
  if (form.hasTaxReturn === "Yes") score += 3;
  if (form.hasTravelInsurance === "Yes") score += 4;
  if (form.hasCoverLetter === "Yes") score += 3;
  if (form.familyInHomeCountry === "Yes") score += 5;
  if (form.propertyInHomeCountry === "Yes") score += 5;
  if (form.firstTimeVisitor === "Yes") score -= 4;
  if (form.entryType === "Multiple") score -= 3;

  score = Math.max(7, Math.min(94, score));

  const strengths: string[] = [];
  const riskFactors: string[] = [];
  const missingDocuments: string[] = [];
  const requiredDocuments: string[] = [];
  const countrySpecificConcerns: string[] = [];
  const improvementTips: string[] = [];
  const nextSteps: string[] = [];

  if (HIGH_NAT.has(form.nationality)) strengths.push(`${form.nationality} passport holders enjoy strong global visa acceptance rates`);
  if (form.employmentStatus === "Employed (Full-time)") strengths.push("Stable full-time employment demonstrates strong ties to home country and a reason to return");
  if (form.employmentStatus === "Government Employee") strengths.push("Government employment is highly regarded by embassies as a stable, verifiable income source");
  if (form.employmentStatus === "Retired") strengths.push("Retired status with pension income shows financial stability without immigration intent");
  if (form.hasReturnTicket === "Yes") strengths.push("Confirmed return ticket shows clear intention to return home after travel");
  if (form.hasHotelBooking === "Yes") strengths.push("Confirmed hotel / accommodation booking reflects an organized, well-prepared application");
  if (form.previousVisaRefusals === "No") strengths.push("Clean visa history — no previous refusals or overstays on record");
  if (form.numberOfTrips && form.numberOfTrips !== "None") strengths.push("Prior international travel history demonstrates reliability and trustworthiness as a traveler");
  if (form.hasBankStatement === "Yes") strengths.push("Bank statement available — the most important financial evidence for visa officers");
  if (form.familyInHomeCountry === "Yes") strengths.push("Spouse / family members in home country are a strong incentive to return after travel");
  if (form.propertyInHomeCountry === "Yes") strengths.push("Property ownership in home country significantly strengthens ties and reduces immigration risk");
  if (form.yearsInJob && !["Less than 6 months","6 months – 1 year"].includes(form.yearsInJob)) strengths.push(`${form.yearsInJob} in current role shows employment stability that reassures visa officers`);
  if (form.maritalStatus === "Married" && form.numberOfChildren && parseInt(form.numberOfChildren) > 0) strengths.push(`Married with ${form.numberOfChildren} children — strong family ties in home country significantly reduce immigration risk`);
  // Visa-type conditional strengths
  if (form.hasAcceptanceLetter === "Yes" && form.visaType === "Student Visa") strengths.push(`Official acceptance letter from ${form.institutionName || "institution"} confirms genuine study intent`);
  if (form.hasJobOffer === "Yes" && form.visaType === "Work Visa") strengths.push(`Formal job offer from ${form.hiringCompanyName || "destination employer"} validates work visa purpose`);
  if (form.scholarshipAvailable === "Yes") strengths.push("Scholarship / financial aid reduces financial burden concern for student visa applications");
  if (form.hasBusinessRegistration === "Yes") strengths.push("Registered business provides verifiable proof of self-employment and income source");

  if (form.previousVisaRefusals !== "No") riskFactors.push(`Previous visa refusal (${form.previousVisaRefusals}) will attract heightened scrutiny — must be addressed in cover letter`);
  if (form.hasOverstay === "Yes") riskFactors.push("Prior overstay is a serious red flag that must be explicitly addressed with explanation in cover letter");
  if (form.hasDeportation === "Yes") riskFactors.push("Deportation history severely impacts visa eligibility — strongly recommend seeking immigration legal counsel");
  if (form.criminalRecord === "Yes") riskFactors.push("Criminal record will require additional documentation and police clearance certificate");
  if (form.immigrationViolation === "Yes") riskFactors.push("Immigration violation history will be thoroughly investigated and requires detailed explanation");
  if (form.employmentStatus === "Unemployed") riskFactors.push("Unemployment significantly raises concerns about financial sustainability and motivation to return home");
  if (!HIGH_NAT.has(form.nationality) && tough.has(form.destinationCountry)) riskFactors.push(`${form.nationality} passport holders face heightened scrutiny for ${form.destinationCountry} visas — thorough documentation is critical`);
  else if (!HIGH_NAT.has(form.nationality)) riskFactors.push(`${form.nationality} passport may face additional verification steps at the ${form.destinationCountry} embassy`);
  if (tough.has(form.destinationCountry)) riskFactors.push(`${form.destinationCountry} is a high-scrutiny destination — financial proof and home ties must be impeccable`);
  if (form.numberOfTrips === "None" || !form.numberOfTrips) riskFactors.push("No international travel history makes your profile harder for officers to trust — first-time risk factor");
  if (form.firstTimeVisitor === "Yes") riskFactors.push("First-time visitor to this destination receives extra embassy scrutiny — every document counts");
  if (form.visaType === "Student Visa" && form.hasAcceptanceLetter !== "Yes") riskFactors.push("No acceptance letter on file — embassy cannot verify genuine study intent without it");
  if (form.visaType === "Work Visa" && form.hasJobOffer !== "Yes") riskFactors.push("No formal job offer letter — a work visa without an offer letter is very unlikely to be approved");
  if (form.hasLargeDeposits === "Yes") riskFactors.push("Large recent bank deposits may appear suspicious — be prepared to explain the source in writing");

  if (form.hasReturnTicket !== "Yes") missingDocuments.push("Confirmed return / onward flight ticket (even a refundable booking counts)");
  if (form.hasBankStatement !== "Yes") missingDocuments.push("3–6 months bank statements showing consistent balance and regular transactions");
  if (form.hasTravelInsurance !== "Yes") missingDocuments.push("Travel insurance policy (mandatory for Schengen; strongly recommended everywhere)");
  if (form.hasCoverLetter !== "Yes") missingDocuments.push("Cover letter explaining travel purpose, home ties, and clear intention to return");
  // Visa-type conditional missing documents
  if (form.visaType === "Student Visa" && form.hasAcceptanceLetter !== "Yes") missingDocuments.push("Official admission / acceptance letter from the educational institution");
  if (form.visaType === "Work Visa" && form.hasJobOffer !== "Yes") missingDocuments.push("Formal job offer letter signed by the destination employer");
  if (["Business Visa","Visit Visa","Spouse / Family Visa"].includes(form.visaType) && form.hasInvitationLetter !== "Yes") missingDocuments.push("Invitation letter from host / company / institution in destination country");
  if (["Tourist Visa","Visit Visa","Business Visa"].includes(form.visaType) && form.hasHotelBooking !== "Yes") missingDocuments.push("Hotel / accommodation booking confirmation (or host accommodation letter)");
  if (["Tourist Visa","Business Visa"].includes(form.visaType) && form.hasItinerary !== "Yes") missingDocuments.push("Day-wise travel itinerary / planned daily schedule");
  // Employment-conditional missing documents
  if (["Employed (Full-time)","Employed (Part-time)","Government Employee"].includes(form.employmentStatus) && form.hasSalarySlips !== "Yes") missingDocuments.push("Last 3 months salary slips / payroll records");
  if (["Employed (Full-time)","Employed (Part-time)","Government Employee"].includes(form.employmentStatus) && form.hasLeaveApproval !== "Yes") missingDocuments.push("Leave approval / NOC letter from employer confirming your return to work");
  if (["Employed (Full-time)","Employed (Part-time)","Government Employee","Self-employed / Business Owner","Freelancer / Consultant"].includes(form.employmentStatus) && form.hasTaxReturn !== "Yes") missingDocuments.push("Latest tax return / ITR as additional income evidence");
  if (["Self-employed / Business Owner","Freelancer / Consultant"].includes(form.employmentStatus) && form.hasBusinessRegistration !== "Yes") missingDocuments.push("Business registration certificate / trade license / client contracts");
  if (form.employmentStatus === "Student" && form.hasEnrollmentLetter !== "Yes") missingDocuments.push("Current enrollment / student status letter from your institution");

  requiredDocuments.push("Valid passport with minimum 6 months validity beyond your planned return date");
  requiredDocuments.push(`Completed ${form.visaType} application form (from official embassy / consulate portal)`);
  requiredDocuments.push("Recent passport-size photographs (per embassy size and background specification)");
  requiredDocuments.push("Bank statements (3–6 months) showing consistent balance and regular transactions");
  requiredDocuments.push("Confirmed return / onward flight ticket");
  // Visa-type specific requirements
  if (form.visaType === "Student Visa") {
    requiredDocuments.push("Official admission / acceptance letter from the educational institution");
    requiredDocuments.push("Proof of tuition payment or scholarship / sponsorship letter");
    requiredDocuments.push("Academic transcripts and previous qualifications");
  } else if (form.visaType === "Work Visa") {
    requiredDocuments.push("Formal job offer letter from the destination employer");
    requiredDocuments.push("Employment contract or terms and conditions of employment");
    requiredDocuments.push("Employer's business registration / proof of legitimacy");
  } else if (form.visaType === "Business Visa") {
    requiredDocuments.push("Invitation letter from the host company / organisation");
    requiredDocuments.push("Business registration certificate (your own company)");
    requiredDocuments.push("Hotel / accommodation booking for the trip duration");
  } else if (form.visaType === "Spouse / Family Visa") {
    requiredDocuments.push("Marriage certificate or proof of family relationship");
    requiredDocuments.push("Host's valid visa / residence permit / citizenship document");
    requiredDocuments.push("Sponsor's financial statements and accommodation proof");
  } else {
    requiredDocuments.push("Hotel / accommodation booking or host invitation letter");
    requiredDocuments.push("Travel itinerary showing planned activities");
  }
  // Employment-based requirements
  if (["Employed (Full-time)","Employed (Part-time)","Government Employee"].includes(form.employmentStatus)) {
    requiredDocuments.push("Employment letter confirming role, salary, leave approval, and guaranteed return to work");
  } else if (["Self-employed / Business Owner","Freelancer / Consultant"].includes(form.employmentStatus)) {
    requiredDocuments.push("Business registration certificate, tax returns, and audited accounts or client contracts");
  }

  // Country-specific concerns
  if (form.destinationCountry === "United States") {
    countrySpecificConcerns.push("Must demonstrate strong non-immigrant intent — prove you will return home");
    countrySpecificConcerns.push("DS-160 form must be completed online; biometrics and interview at US Embassy required");
    countrySpecificConcerns.push("ESTA not available for most passports — visa appointment can take 2-8 weeks");
  } else if (["Germany","France","Italy","Spain","Netherlands","Austria","Belgium","Greece","Portugal"].includes(form.destinationCountry)) {
    countrySpecificConcerns.push("Schengen visa requires travel insurance with minimum €30,000 coverage");
    countrySpecificConcerns.push("Apply at the embassy of the country where you'll spend the most time");
    countrySpecificConcerns.push("Financial proof must show sufficient funds: approximately €100/day");
  } else if (form.destinationCountry === "United Kingdom") {
    countrySpecificConcerns.push("UK visa requires biometric enrollment at a Visa Application Centre");
    countrySpecificConcerns.push("Online UK Visas and Immigration (UKVI) portal application — processing time 3-4 weeks standard");
    countrySpecificConcerns.push("Must clearly demonstrate strong ties to home country and intention to return");
  } else if (form.destinationCountry === "Canada") {
    countrySpecificConcerns.push("eTA (electronic travel authorization) may be required before boarding, or full visitor visa");
    countrySpecificConcerns.push("IRCC online application — biometrics required at authorized VAC");
    countrySpecificConcerns.push("Purpose of visit and financial means must be clearly documented");
  } else if (form.destinationCountry === "Australia") {
    countrySpecificConcerns.push("Australian Tourist Visa (subclass 600) is online — typically processed in 2-4 weeks");
    countrySpecificConcerns.push("Health insurance and character declaration may be required");
    countrySpecificConcerns.push("Show clear evidence of funds and intention to depart after visit");
  } else {
    countrySpecificConcerns.push(`Check ${form.destinationCountry}'s official embassy website for latest requirements and processing times`);
    countrySpecificConcerns.push("Ensure all documents are translated to the official language if required");
  }

  improvementTips.push("Maintain a consistent bank balance of $5,000+ for 3+ months before applying — avoid large withdrawals");
  improvementTips.push("Book refundable return flights and hotel before submitting — it significantly boosts your profile");
  improvementTips.push("Write a compelling cover letter explaining your travel purpose, home ties, and intention to return");
  if (form.previousVisaRefusals !== "No") improvementTips.push("Address the previous refusal directly in your cover letter — show what has changed");
  if (form.familyInHomeCountry !== "Yes") improvementTips.push("Include documentation of family, property, or financial commitments in your home country to strengthen ties");
  improvementTips.push("Apply at least 4–8 weeks before your planned travel date to allow processing time");

  nextSteps.push("Collect all required documents listed above, starting with financial evidence");
  nextSteps.push(`Book your flights and ${form.destinationCountry} hotel (refundable options work) before applying`);
  nextSteps.push(`Visit the official ${form.destinationCountry} embassy/consulate website for the current application portal and fee`);
  nextSteps.push("Get travel insurance before submitting — it's required for some visas and always strengthens your application");
  nextSteps.push("Submit the application at least 4–8 weeks before your planned departure date");

  const recommendation = score >= 70
    ? `We recommend proceeding with your ${form.destinationCountry} ${form.visaType} application — your profile is strong with good approval prospects.`
    : score >= 50
    ? `You can apply, but first address the risk factors above — particularly financial documentation — to maximize your chances.`
    : `We advise strengthening your profile (finances, documents, home ties) before applying to avoid another refusal on record.`;

  return {
    approvalChance: score,
    statusLabel: getStatusLabel(score),
    summary: `Based on your profile as a ${form.nationality} national applying for a ${form.visaType} to ${form.destinationCountry}, your estimated approval chance is ${score}%. ${score >= 60 ? "Your profile shows positive indicators — with thorough documentation, you have a solid foundation for a successful application." : "There are notable risk factors that should be addressed and documented before submitting to maximize approval chances."}`,
    strengths: strengths.slice(0, 5),
    riskFactors: riskFactors.slice(0, 4),
    missingDocuments: missingDocuments.slice(0, 6),
    requiredDocuments: requiredDocuments.slice(0, 8),
    countrySpecificConcerns: countrySpecificConcerns.slice(0, 3),
    improvementTips: improvementTips.slice(0, 5),
    nextSteps: nextSteps.slice(0, 5),
    finalRecommendation: recommendation,
    disclaimer: "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval. Final decisions rest solely with the relevant embassy, consulate, or immigration authority.",
  };
}

// ============================================================
// DEEP CHECK — Extended types, prompt and Claude-only runner
// ============================================================

export interface DeepCheckFormData extends VisaCheckFormData {
  // Extended personal
  passportMonthsValid?: string;      // "6-12 months" | "12-24 months" | "24-48 months" | "48+ months"
  hasDualNationality?: string;       // Yes / No
  dualNationalityCountry?: string;
  educationLevel?: string;           // High School / Bachelor's / Master's / PhD / Other
  fieldOfStudy?: string;
  // Extended financial
  hasInvestments?: string;           // Yes / No (stocks, mutual funds, bonds)
  hasFixedDeposits?: string;         // Yes / No
  investmentValue?: string;          // rough range
  monthlyExpenses?: string;          // <$500 / $500-$1500 / $1500-$3000 / $3000+
  hasBankTransactions?: string;      // regular consistent / irregular / large unexplained
  // Destination ties
  destinationContacts?: string;      // None / Relatives / Friends / Business contacts / Academic institution
  destinationContactStatus?: string; // Their visa/residency status
  // Current visa holdings
  currentVisaHoldings?: string;      // None / Schengen / US / UK / Australia / Japan / Canada
  visaHoldingExpiry?: string;        // still valid / expired within 2 years / older
  // Trip specifics
  specificCitiesPlanned?: string;
  eventOrConferenceName?: string;
  hasConferenceInvitation?: string;  // Yes / No
  purposeDetailedExplanation?: string;
  // Additional docs & compliance
  hasHealthInsurance?: string;       // Yes / No
  hasPoliceCharacterCertificate?: string;
  hasRefusalExplanationLetter?: string;
  // Home country depth
  monthsInCurrentResidence?: string; // <6 months / 6-12 months / 1-3 years / 3-5 years / 5+ years
  hasEmploymentContract?: string;
  hasGovtIssuedId?: string;
  hasSocialMedia?: string;           // Active public social presence? Yes / No
}

export interface DeepCheckDimensionScores {
  financial: number;          // 0-100
  documents: number;          // 0-100
  travelHistory: number;      // 0-100
  homeTies: number;           // 0-100
  visaProfile: number;        // 0-100
}

export interface DeepCheckRiskDetail {
  factor: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  mitigation: string;
}

export interface DeepCheckActionItem {
  priority: "immediate" | "before_applying" | "optional";
  action: string;
  impact: string;
  timeframe: string;
}

export interface DeepCheckResult extends AIVisaResult {
  dimensionScores: DeepCheckDimensionScores;
  riskDetails: DeepCheckRiskDetail[];
  actionPlan: DeepCheckActionItem[];
  embassyInsight: string;
  profileGrade: string;           // A+ / A / B+ / B / C+ / C / D / F
  documentCompletionRate: number; // 0-100 — how complete your docs are
  confidenceLevel: string;        // "Very High" | "High" | "Moderate" | "Low"
}

function buildDeepCheckSystemPrompt(): string {
  return `You are an elite immigration intelligence system used by professional visa consultants. You have access to embassy decision patterns, approval rate data, and consular officer evaluation criteria for every country. 

Perform a thorough "embassy-style" deep risk assessment on the applicant's complete profile and return ONLY a valid JSON object with this EXACT structure:

{
  "approvalChance": <integer 5-95>,
  "profileGrade": "<A+|A|B+|B|C+|C|D|F>",
  "statusLabel": "<High Chance|Good Chance|Moderate Chance|Low Chance|Very Risky>",
  "confidenceLevel": "<Very High|High|Moderate|Low>",
  "summary": "<3-4 sentence professional embassy-style assessment referencing their specific nationality, destination, visa type, employment, financial profile, and key risk/strength signals>",
  "embassyInsight": "<2-3 sentences of specific intelligence about how the destination country's embassy/consulate ACTUALLY processes applications from this nationality — include any known quotas, preferred applicant profiles, recent policy changes, interview requirements, or processing patterns>",
  "dimensionScores": {
    "financial": <integer 0-100>,
    "documents": <integer 0-100>,
    "travelHistory": <integer 0-100>,
    "homeTies": <integer 0-100>,
    "visaProfile": <integer 0-100>
  },
  "documentCompletionRate": <integer 0-100>,
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>", "<specific strength 4>", "<specific strength 5>"],
  "riskDetails": [
    { "factor": "<risk factor name>", "severity": "<critical|high|medium|low>", "detail": "<Why this is a risk and how it is likely to be perceived by a consular officer>", "mitigation": "<Specific actionable mitigation>"},
    ...provide ALL identified risk factors...
  ],
  "missingDocuments": ["<specific missing document>", ...],
  "requiredDocuments": ["<required document 1>", "<required document 2>", ...at least 8 documents...],
  "countrySpecificConcerns": ["<highly specific concern about this exact nationality+destination+visa type combination>", "<specific concern 2>", "<specific concern 3>"],
  "actionPlan": [
    { "priority": "<immediate|before_applying|optional>", "action": "<Concrete specific action>", "impact": "<Estimated improvement to approval chance, e.g. +8-12%>", "timeframe": "<e.g. 1-2 weeks>" },
    ...provide 6-8 action items sorted by priority...
  ],
  "improvementTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>", "<tip 5>"],
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>", "<step 4>", "<step 5>"],
  "finalRecommendation": "<One direct, specific, actionable recommendation — not generic. Reference their actual situation. E.g.: 'With your Nigerian passport applying for a UK tourist visa and two prior refusals, we recommend postponing application for 6 months while building a 12-month bank statement showing consistent income above £2,500/month, then apply with a strong cover letter addressing each prior refusal.'>",
  "disclaimer": "Visa Shuttle's Deep Check uses AI analysis of your profile against known visa approval patterns. This is an educational assessment — final decisions rest solely with the embassy or immigration authority."
}

SCORING RULES (be precise, realistic — not generous):
profileGrade: A+ (90-95), A (82-89), B+ (74-81), B (65-73), C+ (55-64), C (45-54), D (30-44), F (5-29)
confidenceLevel: "Very High" if all key fields provided, "High" if most provided, "Moderate" if some gaps, "Low" if many fields missing.

DIMENSION SCORING:
- financial (0-100): Assess bank balance, statement availability, consistency, investments, income stability, funding source, credit card, property. 100 = excellent evidence of self-sufficiency.
- documents (0-100): How complete are their travel documents. 100 = return ticket + hotel + insurance + itinerary + invitation + cover letter + bank statement + NOC + salary slips.
- travelHistory (0-100): Previous international trips, prior approvals/refusals, overstay, deportation. 100 = many successful trips, no refusals, no violations.
- homeTies (0-100): Family, property, employment, financial obligations in home country. 100 = married with children, owns property, long-term stable employment, mortgage.
- visaProfile (0-100): How well this nationality + visa type + destination combination typically performs. Consider passport strength, visa type complexity, bilateral relationships.

SEVERITY RULES for riskDetails:
- critical: Deportation history, criminal record, multiple refusals for same destination
- high: Single refusal (same destination), overstay, immigration violation, unemployed with low balance
- medium: Weak bank balance, no return ticket, first-time visitor to high-scrutiny destination, self-employed without docs
- low: Minor gaps like missing itinerary, no cover letter, short bank statement

Tailor EVERYTHING to the specific nationality + destination + visa type combination. Be specific, not generic.
Return ONLY valid JSON. No markdown, no code blocks, no explanation outside the JSON.`;
}

function buildDeepCheckUserPrompt(form: DeepCheckFormData): string {
  const base = buildUserPrompt(form);
  const extra: string[] = [
    "",
    "=== DEEP CHECK — EXTENDED PROFILE ===",
    "",
    "--- Passport & Identity ---",
    form.passportMonthsValid ? `Passport Validity Remaining: ${form.passportMonthsValid}` : "",
    form.hasDualNationality ? `Dual Nationality: ${form.hasDualNationality}` : "",
    form.dualNationalityCountry ? `Second Nationality: ${form.dualNationalityCountry}` : "",
    form.hasGovtIssuedId ? `Government-issued National ID Available: ${form.hasGovtIssuedId}` : "",
    "",
    "--- Education & Professional Background ---",
    form.educationLevel ? `Highest Education Level: ${form.educationLevel}` : "",
    form.fieldOfStudy ? `Field of Study / Specialization: ${form.fieldOfStudy}` : "",
    form.hasEmploymentContract ? `Employment Contract Available: ${form.hasEmploymentContract}` : "",
    "",
    "--- Extended Financial Profile ---",
    form.monthlyExpenses ? `Monthly Living Expenses (USD): ${form.monthlyExpenses}` : "",
    form.hasInvestments ? `Investment Portfolio (stocks/mutual funds/bonds): ${form.hasInvestments}` : "",
    form.hasFixedDeposits ? `Fixed Deposits / Term Deposits: ${form.hasFixedDeposits}` : "",
    form.investmentValue ? `Approximate Investment Value: ${form.investmentValue}` : "",
    form.hasBankTransactions ? `Bank Transaction Pattern: ${form.hasBankTransactions}` : "",
    "",
    "--- Current Visa Holdings ---",
    form.currentVisaHoldings ? `Currently Holds Valid Visa(s) For: ${form.currentVisaHoldings}` : "No current visa holdings mentioned",
    form.visaHoldingExpiry ? `Visa Holding Status: ${form.visaHoldingExpiry}` : "",
    "",
    "--- Destination Country Connections ---",
    form.destinationContacts ? `Contacts at Destination Country: ${form.destinationContacts}` : "None declared",
    form.destinationContactStatus ? `Contact's Visa/Residency Status: ${form.destinationContactStatus}` : "",
    "",
    "--- Detailed Trip Information ---",
    form.specificCitiesPlanned ? `Specific Cities / Regions Planned: ${form.specificCitiesPlanned}` : "",
    form.eventOrConferenceName ? `Event / Conference Name: ${form.eventOrConferenceName}` : "",
    form.hasConferenceInvitation ? `Conference / Event Invitation Letter: ${form.hasConferenceInvitation}` : "",
    form.purposeDetailedExplanation ? `Detailed Purpose of Visit: ${form.purposeDetailedExplanation}` : "",
    "",
    "--- Additional Documents & Compliance ---",
    form.hasHealthInsurance ? `Active Health / Medical Insurance: ${form.hasHealthInsurance}` : "",
    form.hasPoliceCharacterCertificate ? `Police Clearance Certificate: ${form.hasPoliceCharacterCertificate}` : "",
    form.hasRefusalExplanationLetter ? `Refusal Explanation Letter Prepared: ${form.hasRefusalExplanationLetter}` : "",
    "",
    "--- Home Country Depth ---",
    form.monthsInCurrentResidence ? `Duration in Current Residence Country: ${form.monthsInCurrentResidence}` : "",
    form.hasSocialMedia ? `Active Social Media Presence: ${form.hasSocialMedia}` : "",
  ];

  return base + extra.filter(Boolean).join("\n");
}

async function callClaudeDeepCheck(form: DeepCheckFormData): Promise<DeepCheckResult> {
  if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API key not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      system: buildDeepCheckSystemPrompt(),
      messages: [{ role: "user", content: buildDeepCheckUserPrompt(form) }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude Deep Check error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as any;
  const content = data.content[0]?.text;
  if (!content) throw new Error("No content from Claude");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as DeepCheckResult;
  parsed.statusLabel = getStatusLabel(parsed.approvalChance);
  return parsed;
}

function mockDeepCheckResult(form: DeepCheckFormData): DeepCheckResult {
  const base = mockResult(form);
  const score = base.approvalChance;
  return {
    ...base,
    profileGrade: score >= 90 ? "A+" : score >= 82 ? "A" : score >= 74 ? "B+" : score >= 65 ? "B" : score >= 55 ? "C+" : score >= 45 ? "C" : score >= 30 ? "D" : "F",
    confidenceLevel: "Moderate",
    documentCompletionRate: Math.min(95, Math.max(20, score + 5)),
    embassyInsight: `The ${form.destinationCountry} consulate processing ${form.nationality} applicants for ${form.visaType} applications typically requires comprehensive financial documentation and prefers applications with at least 6 months of bank statements. Processing times vary from 5-15 working days. Interview requirements depend on individual profile assessment.`,
    dimensionScores: {
      financial: Math.min(95, Math.max(15, score - 5 + Math.floor(Math.random() * 15))),
      documents: Math.min(95, Math.max(15, score - 10 + Math.floor(Math.random() * 20))),
      travelHistory: Math.min(95, Math.max(15, score + Math.floor(Math.random() * 10))),
      homeTies: Math.min(95, Math.max(15, score + 5 + Math.floor(Math.random() * 10))),
      visaProfile: Math.min(95, Math.max(15, score - 3 + Math.floor(Math.random() * 12))),
    },
    riskDetails: base.riskFactors.slice(0, 4).map((f, i) => ({
      factor: f.split(" ").slice(0, 4).join(" "),
      severity: i === 0 ? "high" : i === 1 ? "medium" : "low" as any,
      detail: f,
      mitigation: base.improvementTips[i] || "Prepare comprehensive documentation addressing this concern.",
    })),
    actionPlan: base.nextSteps.slice(0, 5).map((s, i) => ({
      priority: i === 0 ? "immediate" : i <= 2 ? "before_applying" : "optional" as any,
      action: s,
      impact: `+${5 + i * 3}-${8 + i * 3}% improvement`,
      timeframe: i === 0 ? "This week" : i <= 2 ? "2-4 weeks" : "1-3 months",
    })),
  };
}

export async function runDeepCheck(form: DeepCheckFormData): Promise<{ result: DeepCheckResult; provider: string }> {
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await callClaudeDeepCheck(form);
      return { result, provider: "claude" };
    } catch (e) {
      console.error("[DeepCheck] Claude failed:", e);
    }
  }
  console.warn("[DeepCheck] Falling back to mock (no Anthropic key or Claude failed)");
  return { result: mockDeepCheckResult(form), provider: "mock" };
}

export async function runVisaCheck(form: VisaCheckFormData): Promise<{ result: AIVisaResult; provider: string }> {
  if (AI_PROVIDER === "anthropic" && ANTHROPIC_API_KEY) {
    try {
      const result = await callClaude(form);
      result.statusLabel = getStatusLabel(result.approvalChance);
      return { result, provider: "claude" };
    } catch (e) {
      console.error("[AI] Claude failed, falling back:", e);
    }
  }

  if (OPENAI_API_KEY) {
    try {
      const result = await callOpenAI(form);
      result.statusLabel = getStatusLabel(result.approvalChance);
      return { result, provider: "openai" };
    } catch (e) {
      console.error("[AI] OpenAI failed, falling back to mock:", e);
    }
  }

  return { result: mockResult(form), provider: "mock" };
}
