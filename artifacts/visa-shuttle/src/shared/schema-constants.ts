export const AGENCY_PERMISSIONS = [
  "leads",
  "cases",
  "documents",
  "accounting",
  "analytics",
  "team",
  "settings",
] as const;
export type AgencyPermission = typeof AGENCY_PERMISSIONS[number];

export const SUBMISSION_METHODS = [
  { value: "evisa",   label: "eVisa (Online Portal)" },
  { value: "embassy", label: "Send to Embassy" },
  { value: "vfs",     label: "Through VFS Center" },
] as const;
export type SubmissionMethod = typeof SUBMISSION_METHODS[number]["value"];

export const VISA_STAGES = [
  { value: "not_started", label: "Not Started" },
  { value: "processing",  label: "Processing" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
] as const;
export type VisaStage = typeof VISA_STAGES[number]["value"];

export const VISA_PROCESSING_STATUSES = [
  { value: "submitted_evisa",            label: "Submitted to eVisa Portal" },
  { value: "submitted_embassy",          label: "Submitted to Embassy" },
  { value: "vfs_appointment_pending",    label: "VFS Appointment Pending" },
  { value: "vfs_appointment_completed",  label: "VFS Appointment Completed" },
  { value: "biometric_pending",          label: "Biometric Pending" },
  { value: "biometric_completed",        label: "Biometric Completed" },
  { value: "waiting_documents",          label: "Waiting for More Documents" },
  { value: "application_delayed",        label: "Application Delayed" },
  { value: "passport_sent_collection",   label: "Passport Sent for Collection" },
  { value: "passport_received",          label: "Passport Received" },
] as const;
export type VisaProcessingStatus = typeof VISA_PROCESSING_STATUSES[number]["value"];

export const APPOINTMENT_TYPES = [
  { value: "embassy_consulate", label: "Embassy / Consulate / High Commission" },
  { value: "vfs",   label: "VFS Global" },
  { value: "bls",   label: "BLS International" },
  { value: "other", label: "Other 3rd Party" },
] as const;
export type AppointmentType = typeof APPOINTMENT_TYPES[number]["value"];

export const APPOINTMENT_STATUSES = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "completed",   label: "Completed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled",   label: "Cancelled" },
] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]["value"];

export const CO_TRAVELLER_RELATIONSHIPS = [
  "spouse", "child", "parent", "sibling", "grandparent",
  "in_law", "partner", "friend", "colleague", "relative", "other",
] as const;
export type CoTravellerRelationship = typeof CO_TRAVELLER_RELATIONSHIPS[number];

export const PASSPORT_RELATIONSHIPS = [
  "self", "spouse", "child", "parent", "sibling", "partner", "relative", "other",
] as const;
export type PassportRelationship = typeof PASSPORT_RELATIONSHIPS[number];

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi",           label: "UPI" },
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "gateway",       label: "Online (Gateway)" },
  { value: "other",         label: "Other" },
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];
