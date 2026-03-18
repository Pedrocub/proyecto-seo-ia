import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDITS_FILE = path.join(DATA_DIR, "audits.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string): T[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeJSON<T>(filePath: string, data: T[]) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---- AUDITS ----

export interface StoredAudit {
  id: string;
  slug: string;
  businessName: string;
  contactName?: string;
  siteUrl: string;
  auditDate: string;
  overallScore: number;
  overallGrade: string;
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  oppsCount: number;
  categories: {
    key: string;
    label: string;
    score: number;
    issueCount: number;
    icon: string;
  }[];
  issues: {
    id: number;
    title: string;
    category: string;
    severity: string;
    description: string;
    whyItMatters: string;
  }[];
  vitals: { lcp: number | null; cls: number | null; inp: number | null };
  summary: string;
  viewCount: number;
  ctaClicks: number;
  createdAt: string;
}

export function getAudits(): StoredAudit[] {
  return readJSON<StoredAudit>(AUDITS_FILE);
}

export function getAuditBySlug(slug: string): StoredAudit | undefined {
  const audits = getAudits();
  return audits.find((a) => a.slug === slug);
}

export function saveAudit(audit: StoredAudit) {
  const audits = getAudits();
  const existing = audits.findIndex((a) => a.slug === audit.slug);
  if (existing >= 0) {
    audits[existing] = audit;
  } else {
    audits.push(audit);
  }
  writeJSON(AUDITS_FILE, audits);
}

export function incrementAuditView(slug: string) {
  const audits = getAudits();
  const audit = audits.find((a) => a.slug === slug);
  if (audit) {
    audit.viewCount = (audit.viewCount || 0) + 1;
    writeJSON(AUDITS_FILE, audits);
  }
}

// ---- LEADS ----

export interface StoredLead {
  id: string;
  businessName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  status: string;
  auditSlug?: string;
  createdAt: string;
}

export function getLeads(): StoredLead[] {
  return readJSON<StoredLead>(LEADS_FILE);
}

export function saveLeads(leads: StoredLead[]) {
  writeJSON(LEADS_FILE, leads);
}

export function addLeads(newLeads: StoredLead[]) {
  const existing = getLeads();
  existing.push(...newLeads);
  writeJSON(LEADS_FILE, existing);
}

export function updateLead(id: string, updates: Partial<StoredLead>) {
  const leads = getLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index >= 0) {
    leads[index] = { ...leads[index], ...updates };
    writeJSON(LEADS_FILE, leads);
  }
}

// ---- HELPERS ----

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
