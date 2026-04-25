const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

export interface VisaCheckFormData {
  nationality: string;
  destinationCountry: string;
  visaType: string;
  purposeOfTravel: string;
  age: string;
  employmentStatus: string;
  monthlyIncome: string;
  bankBalance: string;
  previousInternationalTravel: string;
  previousVisaRefusals: string;
  tripDuration: string;
  returnTicket: string;
  accommodationProof: string;
  tripFunding: string;
  [key: string]: string;
}

export interface AIVisaResult {
  approvalChance: number;
  statusLabel: string;
  summary: string;
  strengths: string[];
  riskFactors: string[];
  missingDocuments: string[];
  recommendations: string[];
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
  return `You are an expert immigration consultant AI for Visa Shuttle. Your task is to analyze a traveler's visa application profile and provide a realistic, data-driven visa approval chance estimate.

Analyze the provided traveler details carefully and return ONLY a valid JSON object with the following structure:

{
  "approvalChance": <integer between 5 and 95>,
  "statusLabel": "<one of: High Chance / Good Chance / Moderate Chance / Low Chance / Very Risky>",
  "summary": "<2-3 sentence AI assessment summary>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "riskFactors": ["<risk 1>", "<risk 2>", ...],
  "missingDocuments": ["<doc 1>", "<doc 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "disclaimer": "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval."
}

Score guidelines:
- 80-95: High Chance — strong profile, good finances, clear purpose, no refusals
- 60-79: Good Chance — solid profile with minor gaps
- 40-59: Moderate Chance — average profile, some concerns
- 20-39: Low Chance — weak finances, refusal history, unclear purpose
- 5-19: Very Risky — multiple red flags

Key factors that RAISE the score:
- Western passport (US, UK, EU, Canada, Australia, Japan, Singapore, South Korea)
- Strong bank balance (over $5,000 for tourist visa)
- Stable employment with good income
- Extensive travel history without issues
- No previous visa refusals
- Clear trip purpose with hotel and return ticket booked
- Short trip duration (7-14 days)
- Self-funded with clear evidence

Key factors that LOWER the score:
- South Asian, African, or Middle Eastern passports for Schengen/US/UK (stricter scrutiny)
- Previous visa refusals (major red flag)
- Low income or savings
- Unemployed or freelancer without clear income proof
- Long trip duration (30+ days)
- No return ticket
- No accommodation proof
- Sponsor-funded without documentation
- First international travel

Return ONLY the JSON. No markdown, no code blocks, no explanation outside the JSON.`;
}

function buildUserPrompt(form: VisaCheckFormData): string {
  return `Traveler Profile:
- Nationality: ${form.nationality}
- Destination Country: ${form.destinationCountry}
- Visa Type: ${form.visaType}
- Purpose of Travel: ${form.purposeOfTravel}
- Age: ${form.age}
- Employment Status: ${form.employmentStatus}
- Monthly Income: ${form.monthlyIncome}
- Approximate Bank Balance: ${form.bankBalance}
- Previous International Travel: ${form.previousInternationalTravel}
- Previous Visa Refusals: ${form.previousVisaRefusals}
- Trip Duration: ${form.tripDuration}
- Return Ticket: ${form.returnTicket}
- Hotel Booking / Invitation Letter: ${form.accommodationProof}
- Who is Funding the Trip: ${form.tripFunding}

Analyze this profile and return the JSON assessment.`;
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
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

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
      max_tokens: 800,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(form) }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  const content = data.content[0]?.text;
  if (!content) throw new Error("No content from Claude");
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");
  return JSON.parse(jsonMatch[0]) as AIVisaResult;
}

function mockResult(form: VisaCheckFormData): AIVisaResult {
  const HIGH_NAT = new Set(["United States", "United Kingdom", "Germany", "France", "Canada", "Australia", "Japan", "South Korea", "Singapore", "Netherlands", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Austria", "Belgium", "New Zealand", "Ireland", "Luxembourg"]);
  const MID_NAT = new Set(["Brazil", "Mexico", "Argentina", "South Africa", "Turkey", "Malaysia", "Thailand", "Philippines", "Indonesia", "Russia", "Ukraine", "Poland", "Romania", "Morocco", "Jordan", "Egypt", "Georgia", "Taiwan"]);

  let score = 48;
  if (HIGH_NAT.has(form.nationality)) score += 22;
  else if (MID_NAT.has(form.nationality)) score += 8;
  else score -= 5;

  if (form.visaType === "Tourist Visa" || form.visaType === "Transit Visa") score += 10;
  else if (form.visaType === "Visit Visa") score += 7;
  else if (form.visaType === "Business Visa") score += 4;
  else if (form.visaType === "Student Visa") score -= 5;
  else if (form.visaType === "Work Visa") score -= 10;

  const tough = new Set(["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Schengen"]);
  if (tough.has(form.destinationCountry)) score -= 8;

  if (form.previousVisaRefusals === "Yes") score -= 20;
  if (form.bankBalance?.includes("$10,000") || form.bankBalance?.includes("$20,000") || form.bankBalance?.includes("More than")) score += 8;
  else if (form.bankBalance?.includes("$1,000") || form.bankBalance?.includes("Less than")) score -= 10;
  if (form.employmentStatus === "Employed (Full-time)") score += 5;
  else if (form.employmentStatus === "Unemployed") score -= 12;
  if (form.previousInternationalTravel === "5+ countries") score += 8;
  else if (form.previousInternationalTravel === "None") score -= 5;
  if (form.returnTicket === "Yes") score += 5;
  if (form.accommodationProof === "Yes") score += 5;

  score = Math.max(8, Math.min(93, score));

  const strengths: string[] = [];
  const riskFactors: string[] = [];
  const missingDocuments: string[] = [];
  const recommendations: string[] = [];

  if (HIGH_NAT.has(form.nationality)) strengths.push(`${form.nationality} passport holders have high visa acceptance rates globally`);
  if (form.employmentStatus === "Employed (Full-time)") strengths.push("Stable full-time employment demonstrates strong ties to home country");
  if (form.returnTicket === "Yes") strengths.push("Return ticket booked — shows clear intention to return home");
  if (form.accommodationProof === "Yes") strengths.push("Confirmed accommodation demonstrates organized travel planning");
  if (form.previousVisaRefusals === "No") strengths.push("Clean visa history with no previous refusals");
  if (form.previousInternationalTravel === "5+ countries") strengths.push("Extensive international travel history strengthens your credibility");

  if (form.previousVisaRefusals === "Yes") riskFactors.push("Previous visa refusal significantly increases scrutiny on new applications");
  if (form.employmentStatus === "Unemployed") riskFactors.push("Unemployment reduces confidence in financial stability and home country ties");
  if (!HIGH_NAT.has(form.nationality)) riskFactors.push(`${form.destinationCountry} applies additional scrutiny to ${form.nationality} applications`);
  if (tough.has(form.destinationCountry)) riskFactors.push(`${form.destinationCountry} is known for rigorous visa screening`);

  if (!form.returnTicket || form.returnTicket === "No") missingDocuments.push("Confirmed return flight ticket");
  if (!form.accommodationProof || form.accommodationProof === "No") missingDocuments.push("Hotel booking confirmation or invitation letter");
  missingDocuments.push("3-6 months bank statements showing regular income");
  if (form.employmentStatus !== "Unemployed") missingDocuments.push("Employment letter confirming leave approval and salary");
  missingDocuments.push("Updated travel itinerary with day-by-day plan");

  recommendations.push("Ensure bank statements show consistent income for the last 6 months");
  recommendations.push(`Book accommodation in ${form.destinationCountry} before submitting the application`);
  recommendations.push("Prepare a detailed cover letter explaining your travel purpose");
  if (form.previousVisaRefusals === "Yes") recommendations.push("Address previous refusal reasons explicitly in your new application with supporting evidence");
  recommendations.push("Consider travel insurance for the full trip duration — it strengthens your application");

  return {
    approvalChance: score,
    statusLabel: getStatusLabel(score),
    summary: `Based on your profile as a ${form.nationality} national applying for a ${form.visaType} to ${form.destinationCountry}, your estimated approval chance is ${score}%. ${score >= 60 ? "Your profile has several strong points, though thorough documentation will be key." : "There are some risk factors that require attention before submitting your application."}`,
    strengths: strengths.slice(0, 4),
    riskFactors: riskFactors.slice(0, 4),
    missingDocuments: missingDocuments.slice(0, 5),
    recommendations: recommendations.slice(0, 4),
    disclaimer: "Visa Shuttle provides AI-based estimation only and does not guarantee visa approval.",
  };
}

export async function runVisaCheck(form: VisaCheckFormData): Promise<{ result: AIVisaResult; provider: string }> {
  if (AI_PROVIDER === "anthropic" && ANTHROPIC_API_KEY) {
    try {
      const result = await callClaude(form);
      result.statusLabel = getStatusLabel(result.approvalChance);
      return { result, provider: "claude" };
    } catch (e) {
      console.error("[AI] Claude failed, falling back to mock:", e);
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
