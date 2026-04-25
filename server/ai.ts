const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

export interface VisaCheckFormData {
  // Step 1 - Travel Basics
  nationality: string;
  destinationCountry: string;
  visaType: string;
  purposeOfTravel: string;
  // Step 2 - Personal
  age: string;
  employmentStatus: string;
  jobTitle?: string;
  monthlyIncome: string;
  tripFunding: string;
  // Step 3 - Financial
  bankBalance: string;
  hasBankStatement?: string;
  hasIncomeProof?: string;
  hasTaxReturn?: string;
  // Step 4 - Travel History
  previousInternationalTravel: string;
  countriesVisited?: string;
  previousVisaApprovals?: string;
  previousVisaRefusals: string;
  overstayHistory?: string;
  // Step 5 - Trip Details
  tripDuration: string;
  returnTicket: string;
  accommodationProof: string;
  invitationLetter?: string;
  travelInsurance?: string;
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
  improvementTips: string[];
  nextSteps: string[];
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
  return `You are an expert immigration consultant AI for Visa Shuttle. Analyze the traveler's visa application profile and return ONLY a valid JSON object with this exact structure:

{
  "approvalChance": <integer 5-95>,
  "statusLabel": "<High Chance|Good Chance|Moderate Chance|Low Chance|Very Risky>",
  "summary": "<2-3 sentence professional assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "missingDocuments": ["<missing doc 1>", "<missing doc 2>", "<missing doc 3>"],
  "requiredDocuments": ["<required doc 1>", "<required doc 2>", "<required doc 3>", "<required doc 4>"],
  "improvementTips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "disclaimer": "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval."
}

Scoring guidelines:
- 80-95: High Chance — strong profile, good finances, clean travel history
- 60-79: Good Chance — solid profile with minor gaps
- 40-59: Moderate Chance — average profile, some concerns
- 20-39: Low Chance — weak finances, refusal history, unclear purpose
- 5-19: Very Risky — multiple serious red flags

Factors that RAISE score:
- Strong/Western passport (US, UK, EU, Canada, Australia, Japan, Singapore)
- Bank balance over $5,000 USD
- Stable full-time employment with good income
- Extensive clean travel history
- No previous visa refusals or overstays
- Hotel + return ticket confirmed
- Short trip (7-14 days) for tourist visa
- Bank statement + income proof + tax return available

Factors that LOWER score:
- South Asian/African/Middle Eastern passport for US/UK/Schengen
- Previous visa refusals (major penalty)
- Overstay history (severe penalty)
- Low bank balance
- Unemployed without income proof
- Long trip 30+ days
- No return ticket or accommodation
- Sponsor-funded without documents

requiredDocuments should list ALL documents needed for this visa type.
improvementTips should give specific, actionable advice.
nextSteps should be chronological steps to take immediately.

Return ONLY valid JSON. No markdown, no code blocks.`;
}

function buildUserPrompt(form: VisaCheckFormData): string {
  const parts: string[] = [
    "=== TRAVELER VISA PROFILE ===",
    `Nationality: ${form.nationality}`,
    `Destination: ${form.destinationCountry}`,
    `Visa Type: ${form.visaType}`,
    `Purpose: ${form.purposeOfTravel}`,
    "",
    "--- Personal Details ---",
    `Age: ${form.age}`,
    `Employment: ${form.employmentStatus}`,
    form.jobTitle ? `Job Title: ${form.jobTitle}` : "",
    `Monthly Income: ${form.monthlyIncome}`,
    `Trip Funding: ${form.tripFunding}`,
    "",
    "--- Financial Profile ---",
    `Bank Balance: ${form.bankBalance}`,
    `Bank Statement Available: ${form.hasBankStatement || "Not specified"}`,
    `Income Proof Available: ${form.hasIncomeProof || "Not specified"}`,
    `Tax Return Available: ${form.hasTaxReturn || "Not specified"}`,
    "",
    "--- Travel History ---",
    `Previous International Travel: ${form.previousInternationalTravel}`,
    form.countriesVisited ? `Countries Visited: ${form.countriesVisited}` : "",
    `Previous Visa Approvals: ${form.previousVisaApprovals || "Not specified"}`,
    `Previous Visa Refusals: ${form.previousVisaRefusals}`,
    `Overstay History: ${form.overstayHistory || "No"}`,
    "",
    "--- Trip Details ---",
    `Trip Duration: ${form.tripDuration}`,
    `Return Ticket: ${form.returnTicket}`,
    `Accommodation/Hotel: ${form.accommodationProof}`,
    `Invitation Letter: ${form.invitationLetter || "No"}`,
    `Travel Insurance: ${form.travelInsurance || "Not specified"}`,
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
      max_tokens: 1200,
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
      max_tokens: 1200,
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
  if (form.overstayHistory === "Yes") score -= 25;
  if (form.bankBalance?.includes("$15,000") || form.bankBalance?.includes("$30,000") || form.bankBalance?.includes("More than")) score += 10;
  else if (form.bankBalance?.includes("$7,000") || form.bankBalance?.includes("$3,000")) score += 4;
  else if (form.bankBalance?.includes("Less than $1,000")) score -= 12;
  if (form.employmentStatus === "Employed (Full-time)") score += 7;
  else if (form.employmentStatus === "Unemployed") score -= 14;
  else if (form.employmentStatus === "Self-employed / Business Owner") score += 2;
  if (form.previousInternationalTravel === "Extensive (10+)") score += 10;
  else if (form.previousInternationalTravel === "5+ countries") score += 7;
  else if (form.previousInternationalTravel === "None") score -= 6;
  if (form.returnTicket === "Yes") score += 5;
  if (form.accommodationProof?.includes("Yes")) score += 5;
  if (form.hasBankStatement === "Yes") score += 4;
  if (form.hasIncomeProof === "Yes") score += 3;
  if (form.travelInsurance === "Yes") score += 3;

  score = Math.max(7, Math.min(94, score));

  const strengths: string[] = [];
  const riskFactors: string[] = [];
  const missingDocuments: string[] = [];
  const requiredDocuments: string[] = [];
  const improvementTips: string[] = [];
  const nextSteps: string[] = [];

  if (HIGH_NAT.has(form.nationality)) strengths.push(`${form.nationality} passport holders enjoy high global visa acceptance rates`);
  if (form.employmentStatus === "Employed (Full-time)") strengths.push("Stable full-time employment demonstrates strong ties to home country");
  if (form.returnTicket === "Yes") strengths.push("Confirmed return ticket shows clear intention to return home");
  if (form.accommodationProof?.includes("Yes")) strengths.push("Confirmed accommodation reflects organized and prepared travel plans");
  if (form.previousVisaRefusals === "No") strengths.push("Clean visa history — no previous refusals on record");
  if (form.previousInternationalTravel !== "None") strengths.push("Prior international travel demonstrates reliability as a traveler");
  if (form.hasBankStatement === "Yes") strengths.push("Bank statement available — key financial document for visa applications");

  if (form.previousVisaRefusals !== "No") riskFactors.push("Previous visa refusal will attract heightened scrutiny from the embassy");
  if (form.overstayHistory === "Yes") riskFactors.push("Prior overstay is a serious red flag — must be addressed in application");
  if (form.employmentStatus === "Unemployed") riskFactors.push("Unemployment raises concerns about financial stability and home-country ties");
  if (!HIGH_NAT.has(form.nationality)) riskFactors.push(`${form.destinationCountry} applies additional scrutiny to ${form.nationality} nationals`);
  if (tough.has(form.destinationCountry)) riskFactors.push(`${form.destinationCountry} visas are among the most strictly evaluated`);
  if (form.previousInternationalTravel === "None") riskFactors.push("No international travel history makes your profile harder to assess");

  if (form.returnTicket !== "Yes") missingDocuments.push("Confirmed return flight ticket");
  if (!form.accommodationProof?.includes("Yes")) missingDocuments.push("Hotel booking confirmation or host invitation letter");
  if (form.hasBankStatement !== "Yes") missingDocuments.push("3–6 months bank statements showing regular transactions");
  if (form.hasIncomeProof !== "Yes") missingDocuments.push("Proof of income (salary slips, payroll records, or tax returns)");
  if (form.travelInsurance !== "Yes") missingDocuments.push("Travel insurance covering the entire trip duration");

  requiredDocuments.push("Valid passport (minimum 6 months validity beyond travel dates)");
  requiredDocuments.push("Completed and signed visa application form");
  requiredDocuments.push("Recent passport-size photographs (per embassy specifications)");
  requiredDocuments.push(`${form.visaType} fee payment receipt`);
  requiredDocuments.push("Proof of financial means (bank statements, 3–6 months)");
  requiredDocuments.push("Confirmed return flight tickets");
  requiredDocuments.push("Accommodation proof (hotel booking or invitation letter)");
  if (form.employmentStatus !== "Unemployed") {
    requiredDocuments.push("Employment letter confirming position, salary, and leave approval");
  }

  improvementTips.push("Boost bank balance to at least $5,000–$10,000 before applying — keep it consistent for 3+ months");
  improvementTips.push("Book return flights and hotel before submitting the application to strengthen your profile");
  improvementTips.push("Write a clear, detailed cover letter explaining your travel purpose and ties to your home country");
  if (form.previousVisaRefusals !== "No") {
    improvementTips.push("Address the previous refusal explicitly — explain what has changed since then with supporting documents");
  }
  improvementTips.push("Apply for travel insurance before submitting — it signals preparedness to consular officers");
  if (form.hasTaxReturn !== "Yes") {
    improvementTips.push("Include tax returns as additional income proof — especially valuable for self-employed applicants");
  }

  nextSteps.push("Gather all required documents listed above before starting your application");
  nextSteps.push(`Book your flight and accommodation in ${form.destinationCountry} (even if refundable) before applying`);
  nextSteps.push(`Visit the official ${form.destinationCountry} embassy or consulate website for the latest visa requirements`);
  nextSteps.push("Submit your application at least 4–6 weeks before your intended travel date");
  nextSteps.push("Consider consulting a licensed immigration consultant if you have a complex profile");

  return {
    approvalChance: score,
    statusLabel: getStatusLabel(score),
    summary: `Based on your profile as a ${form.nationality} national applying for a ${form.visaType} to ${form.destinationCountry}, your estimated approval chance is ${score}%. ${score >= 60 ? "Your profile shows several positive indicators — with thorough documentation, you have a solid foundation for a successful application." : "There are notable risk factors that should be addressed before submitting your application to maximize approval chances."}`,
    strengths: strengths.slice(0, 4),
    riskFactors: riskFactors.slice(0, 4),
    missingDocuments: missingDocuments.slice(0, 5),
    requiredDocuments: requiredDocuments.slice(0, 8),
    improvementTips: improvementTips.slice(0, 5),
    nextSteps: nextSteps.slice(0, 5),
    disclaimer: "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval. Final decisions are made solely by the relevant embassy, consulate, or immigration authority.",
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
