const today = new Date();

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const TODAY_ISO = toDateInputValue(today);
export const MIN_DOB_ISO = toDateInputValue(new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()));

export function getApplicantAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function validateAdultApplicantDob(dateOfBirth: string): string | null {
  if (!dateOfBirth) return "Date of birth is required.";
  if (dateOfBirth > TODAY_ISO) return "Date of birth cannot be in the future.";
  if (dateOfBirth < MIN_DOB_ISO) return "Please enter a realistic date of birth.";

  const age = getApplicantAge(dateOfBirth);
  if (age === null || age < 0 || age > 120) return "Please enter a valid date of birth.";
  if (age < 18) return "B2C visa checks are for adult applicants aged 18 or above. Minors and infants should be assessed under a parent or guardian.";
  return null;
}
