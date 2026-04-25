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
  // Step 3 - Employment & Income
  employmentStatus: string;
  jobTitle?: string;
  companyName?: string;
  yearsInJob?: string;
  monthlyIncome: string;
  sourceOfIncome?: string;
  hasTaxReturn?: string;
  hasSalarySlips?: string;
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
  return `You are a senior immigration consultant AI for Visa Shuttle. Analyze the traveler's complete visa profile and return ONLY a valid JSON object with this exact structure:

{
  "approvalChance": <integer 5-95>,
  "statusLabel": "<High Chance|Good Chance|Moderate Chance|Low Chance|Very Risky>",
  "summary": "<2-3 sentence professional assessment tailored to nationality + destination>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", "<strength 4>"],
  "riskFactors": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "missingDocuments": ["<missing doc 1>", "<missing doc 2>", "<missing doc 3>"],
  "requiredDocuments": ["<required doc 1>", "<required doc 2>", "<required doc 3>", "<required doc 4>", "<required doc 5>"],
  "countrySpecificConcerns": ["<country-specific concern 1>", "<country-specific concern 2>"],
  "improvementTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"],
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"],
  "finalRecommendation": "<One concise sentence: recommend applying, postpone, or improve profile first>",
  "disclaimer": "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval."
}

Scoring guidelines:
- 80-95: High Chance — strong profile, good finances, clean travel history, strong home ties
- 60-79: Good Chance — solid profile with minor gaps
- 40-59: Moderate Chance — average profile, some concerns
- 20-39: Low Chance — weak finances, refusal history, unclear purpose
- 5-19: Very Risky — multiple serious red flags

Factors that RAISE score: Strong/Western passport, bank balance >$5,000, stable employment, extensive clean travel history, no refusals/overstays, hotel + return ticket confirmed, short trip (7-14 days), bank statement + income proof, strong home ties (family/property), invitation letter, travel insurance, cover letter.

Factors that LOWER score: South Asian/African/Middle Eastern passport for US/UK/Schengen, previous visa refusals (major penalty), overstay history (severe), deportation history, criminal record, low bank balance, unemployment, long trip 30+ days, no return ticket or accommodation, no home ties, first-time visitor.

countrySpecificConcerns should mention destination-specific requirements (e.g., for US: need to prove non-immigrant intent; for Schengen: need travel insurance €30,000; for UK: biometrics required).
finalRecommendation should be actionable: "We recommend applying now with the listed documents." or "We suggest improving your bank balance before applying." etc.

Return ONLY valid JSON. No markdown, no code blocks.`;
}

function buildUserPrompt(form: VisaCheckFormData): string {
  const parts: string[] = [
    "=== TRAVELER VISA PROFILE ===",
    "",
    "--- Personal Profile ---",
    `Nationality: ${form.nationality}`,
    form.passportCountry ? `Passport Country: ${form.passportCountry}` : "",
    form.gender ? `Gender: ${form.gender}` : "",
    form.maritalStatus ? `Marital Status: ${form.maritalStatus}` : "",
    form.countryOfResidence ? `Country of Residence: ${form.countryOfResidence}` : "",
    form.dateOfBirth ? `Date of Birth: ${form.dateOfBirth}` : "",
    form.dependentsHomeCountry ? `Dependents in Home Country: ${form.dependentsHomeCountry}` : "",
    "",
    "--- Travel Plan ---",
    `Destination: ${form.destinationCountry}`,
    `Visa Type: ${form.visaType}`,
    `Purpose: ${form.purposeOfTravel}`,
    `Trip Duration: ${form.tripDuration}`,
    form.entryType ? `Entry Type: ${form.entryType}` : "",
    form.firstTimeVisitor ? `First-time Visitor: ${form.firstTimeVisitor}` : "",
    form.plannedTravelDate ? `Planned Travel Date: ${form.plannedTravelDate}` : "",
    "",
    "--- Employment & Income ---",
    `Employment Status: ${form.employmentStatus}`,
    form.jobTitle ? `Job Title: ${form.jobTitle}` : "",
    form.companyName ? `Company: ${form.companyName}` : "",
    form.yearsInJob ? `Years in Current Role: ${form.yearsInJob}` : "",
    `Monthly Income: ${form.monthlyIncome}`,
    form.sourceOfIncome ? `Source of Income: ${form.sourceOfIncome}` : "",
    `Tax Return Available: ${form.hasTaxReturn || "Not specified"}`,
    `Salary Slips Available: ${form.hasSalarySlips || "Not specified"}`,
    "",
    "--- Financial Strength ---",
    `Bank Balance: ${form.bankBalance}`,
    `Bank Statement Available: ${form.hasBankStatement || "Not specified"}`,
    form.bankStatementDuration ? `Bank Statement Duration: ${form.bankStatementDuration}` : "",
    `Large Recent Deposits: ${form.hasLargeDeposits || "No"}`,
    `Credit Card Available: ${form.hasCreditCard || "Not specified"}`,
    `Property/Assets: ${form.hasProperty || "Not specified"}`,
    `Trip Funding: ${form.tripFunding}`,
    form.sponsorDetails ? `Sponsor Details: ${form.sponsorDetails}` : "",
    "",
    "--- Travel History ---",
    form.countriesVisited ? `Countries Visited: ${form.countriesVisited}` : "Countries Visited: None specified",
    form.numberOfTrips ? `Number of International Trips: ${form.numberOfTrips}` : "",
    `Previous Visa Approvals: ${form.previousVisaApprovals || "Not specified"}`,
    `Previous Visa Refusals: ${form.previousVisaRefusals}`,
    form.refusalReason ? `Refusal Reason: ${form.refusalReason}` : "",
    `Overstay History: ${form.hasOverstay || "No"}`,
    `Deportation History: ${form.hasDeportation || "No"}`,
    "",
    "--- Documents Available ---",
    `Return Ticket: ${form.hasReturnTicket || "Not booked"}`,
    `Hotel Booking: ${form.hasHotelBooking || "Not arranged"}`,
    `Invitation Letter: ${form.hasInvitationLetter || "No"}`,
    `Travel Insurance: ${form.hasTravelInsurance || "No"}`,
    `Day-wise Itinerary: ${form.hasItinerary || "No"}`,
    `Leave Approval Letter: ${form.hasLeaveApproval || "No"}`,
    `Cover Letter: ${form.hasCoverLetter || "No"}`,
    "",
    "--- Home Country Ties ---",
    `Family in Home Country: ${form.familyInHomeCountry || "Not specified"}`,
    `Property in Home Country: ${form.propertyInHomeCountry || "Not specified"}`,
    `Stable Employment/Business: ${form.stableEmploymentHome || "Not specified"}`,
    `Ongoing Education: ${form.ongoingEducation || "No"}`,
    `Financial Commitments Home: ${form.financialCommitmentsHome || "Not specified"}`,
    "",
    "--- Risk & Compliance ---",
    `Criminal Record: ${form.criminalRecord || "No"}`,
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
  else if (form.visaType === "Student Visa") score -= 5;
  else if (form.visaType === "Work Visa") score -= 10;

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
  if (form.employmentStatus === "Employed (Full-time)") score += 8;
  else if (form.employmentStatus === "Unemployed") score -= 14;
  else if (form.employmentStatus === "Self-employed / Business Owner") score += 3;
  if (form.yearsInJob && !["Less than 1 year","0-6 months"].some(v => form.yearsInJob === v)) score += 4;
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
  if (form.employmentStatus === "Employed (Full-time)") strengths.push("Stable full-time employment demonstrates strong ties to home country");
  if (form.hasReturnTicket === "Yes") strengths.push("Confirmed return ticket shows clear intention to return home");
  if (form.hasHotelBooking === "Yes") strengths.push("Confirmed hotel booking reflects organized and well-prepared travel plans");
  if (form.previousVisaRefusals === "No") strengths.push("Clean visa history — no previous refusals or overstays on record");
  if (form.numberOfTrips && form.numberOfTrips !== "None") strengths.push(`Prior international travel history demonstrates reliability as a traveler`);
  if (form.hasBankStatement === "Yes") strengths.push("Bank statement available — primary financial evidence for visa officers");
  if (form.familyInHomeCountry === "Yes") strengths.push("Family in home country acts as a strong incentive to return after travel");
  if (form.propertyInHomeCountry === "Yes") strengths.push("Property ownership in home country strengthens ties and reduces immigration risk");
  if (form.yearsInJob && form.yearsInJob !== "Less than 1 year") strengths.push(`${form.yearsInJob} in current role shows employment stability`);

  if (form.previousVisaRefusals !== "No") riskFactors.push("Previous visa refusal will attract heightened scrutiny from the embassy");
  if (form.hasOverstay === "Yes") riskFactors.push("Prior overstay is a serious red flag that must be addressed in the cover letter");
  if (form.hasDeportation === "Yes") riskFactors.push("Deportation history severely impacts visa eligibility and requires legal counsel");
  if (form.criminalRecord === "Yes") riskFactors.push("Criminal record declaration will require additional documentation and review");
  if (form.employmentStatus === "Unemployed") riskFactors.push("Unemployment raises concerns about financial stability and home-country ties");
  if (!HIGH_NAT.has(form.nationality)) riskFactors.push(`${form.destinationCountry} applies additional scrutiny to ${form.nationality} passport holders`);
  if (tough.has(form.destinationCountry)) riskFactors.push(`${form.destinationCountry} visas are among the most strictly evaluated globally`);
  if (form.numberOfTrips === "None" || !form.numberOfTrips) riskFactors.push("No international travel history makes profile harder for officers to assess");
  if (form.firstTimeVisitor === "Yes") riskFactors.push("First-time visitors receive extra scrutiny — strong documentation is essential");

  if (form.hasReturnTicket !== "Yes") missingDocuments.push("Confirmed return flight ticket (even refundable)");
  if (form.hasHotelBooking !== "Yes") missingDocuments.push("Hotel booking confirmation or host invitation letter");
  if (form.hasBankStatement !== "Yes") missingDocuments.push("3–6 months bank statements with regular transaction history");
  if (form.hasSalarySlips !== "Yes") missingDocuments.push("Salary slips / payroll records (last 3 months)");
  if (form.hasTaxReturn !== "Yes") missingDocuments.push("Latest tax return as additional income evidence");
  if (form.hasTravelInsurance !== "Yes") missingDocuments.push("Travel insurance policy (mandatory for some destinations)");
  if (form.hasCoverLetter !== "Yes") missingDocuments.push("Cover letter explaining travel purpose and home ties");
  if (form.hasLeaveApproval !== "Yes" && form.employmentStatus === "Employed (Full-time)") missingDocuments.push("Leave approval/NOC letter from employer");

  requiredDocuments.push("Valid passport (minimum 6 months validity beyond planned return)");
  requiredDocuments.push("Completed and signed visa application form");
  requiredDocuments.push("Recent passport-size photographs per embassy specification");
  requiredDocuments.push(`${form.visaType} fee payment receipt`);
  requiredDocuments.push("Bank statements (3–6 months) showing sufficient funds");
  requiredDocuments.push("Confirmed return flight itinerary");
  requiredDocuments.push("Accommodation proof (hotel booking or invitation letter)");
  if (form.employmentStatus !== "Unemployed") requiredDocuments.push("Employment letter confirming position, salary, leave approval, and return date");
  if (form.visaType === "Student Visa") requiredDocuments.push("Admission letter from the educational institution");
  if (form.visaType === "Business Visa") requiredDocuments.push("Business invitation letter from the host company");

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
