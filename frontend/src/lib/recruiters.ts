// Canonical recruiter list for Frontera. Use this everywhere recruiters
// appear as an option, filter, or export grouping.
export const RECRUITERS = [
  "Amy Guy",
  "Audrey Williams",
  "Clint Robinson",
  "Gray Rodgers",
  "Richard Montgomery",
] as const;

export type Recruiter = (typeof RECRUITERS)[number];

// Map common short / first-name variants to the canonical full name.
const FIRST_NAME_TO_FULL: Record<string, Recruiter> = {
  amy: "Amy Guy",
  "amy guy": "Amy Guy",
  audrey: "Audrey Williams",
  "audrey williams": "Audrey Williams",
  clint: "Clint Robinson",
  "clint robinson": "Clint Robinson",
  gray: "Gray Rodgers",
  "gray rodgers": "Gray Rodgers",
  "gray rogers": "Gray Rodgers",
  richard: "Richard Montgomery",
  "richard montgomery": "Richard Montgomery",
};

export function normalizeRecruiter(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (FIRST_NAME_TO_FULL[key]) return FIRST_NAME_TO_FULL[key];
  // Fall back: match by first token (first name).
  const first = key.split(/\s+/)[0];
  if (FIRST_NAME_TO_FULL[first]) return FIRST_NAME_TO_FULL[first];
  return name;
}

export const RECRUITER_CONTACTS: Record<Recruiter, { email: string; phone: string }> = {
  "Amy Guy": { email: "amy.guy@fronterasearch.com", phone: "(555) 100-0003" },
  "Audrey Williams": { email: "audrey.williams@fronterasearch.com", phone: "(555) 100-0020" },
  "Clint Robinson": { email: "clint.robinson@fronterasearch.com", phone: "(555) 100-0023" },
  "Gray Rodgers": { email: "gray.rodgers@fronterasearch.com", phone: "(555) 100-0024" },
  "Richard Montgomery": { email: "richard.montgomery@fronterasearch.com", phone: "(555) 100-0026" },
};
