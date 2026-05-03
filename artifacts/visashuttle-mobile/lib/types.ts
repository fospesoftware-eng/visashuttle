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

export interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  aiProvider: string;
  approvalChance: number | null;
  statusLabel: string | null;
  aiResponse: any;
  createdAt: string;
}
