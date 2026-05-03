export interface B2cUser {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  deepCheckAccess?: boolean;
  freeChecksUsed?: number;
  freeCheckLimit?: number;
}

export interface SavedProfile {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  employmentStatus: string | null;
  monthlyIncome: string | null;
  bankBalance: string | null;
  hasPassport: boolean | null;
  hasBankStatement: boolean | null;
  hasIncomeProof: boolean | null;
  hasTaxReturn: boolean | null;
  occupation?: string | null;
  passportNumber?: string | null;
}

/** A single step in the AI-generated action plan. */
export interface ActionPlanItem {
  title?: string;
  action?: string;
  description?: string;
}

/** The structured AI assessment returned by /api/b2c/check and /api/b2c/deep-check. */
export interface VisaCheckResult {
  approvalChance?: number;
  grade?: string;
  statusLabel?: string;
  summary?: string;
  strengths?: string[];
  riskFactors?: string[];
  weaknesses?: string[];
  nextSteps?: string[];
  recommendations?: string[];
  actionPlan?: ActionPlanItem[];
}

export interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  aiProvider: string;
  approvalChance: number | null;
  statusLabel: string | null;
  aiResponse: VisaCheckResult | null;
  createdAt: string;
}

export interface CheckSubmitResponse {
  check: VisaCheck;
  result: VisaCheckResult;
}

/** Normalize possibly-mixed action-plan entries (objects or strings) into plain text. */
export function actionPlanToStrings(plan: ActionPlanItem[] | string[] | undefined): string[] {
  if (!plan) return [];
  return plan.map((entry) => {
    if (typeof entry === "string") return entry;
    return entry.title ?? entry.action ?? entry.description ?? "";
  }).filter(Boolean);
}
