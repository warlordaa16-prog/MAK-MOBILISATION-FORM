export type UniversityName =
  | 'Kampala International University (KIU)';

export type AdminRole = 'SYSTEM_ADMIN' | 'UNIVERSITY_ADMIN';

export interface AdminUser {
  username: string;
  displayName: string;
  role: AdminRole;
  university: UniversityName | null;
  universityAcronym?: string;
}

export interface UniversityOption {
  id: string;
  name: UniversityName;
  shortName: string;
  acronym: string;
  campus: string;
  color: string;
  accentBg: string;
}

export const UNIVERSITIES: UniversityOption[] = [
  {
    id: 'kiu',
    name: 'Kampala International University (KIU)',
    shortName: 'Kampala Int. University',
    acronym: 'KIU',
    campus: 'Kansanga / Ishaka',
    color: 'border-emerald-600 text-emerald-700 bg-emerald-50',
    accentBg: 'bg-emerald-600',
  },
];

export const MOBILIZATION_METHODS = [
  { id: 'gate', name: 'Campus Gate / Main Entrance', short: 'Gate Booth', icon: 'DoorOpen' },
  { id: 'door-to-door', name: 'Door-to-Door / Hostel Outreach', short: 'Hostel Outreach', icon: 'Home' },
  { id: 'lecture-hall', name: 'Lecture Hall / Class Visitation', short: 'Class Visitation', icon: 'GraduationCap' },
  { id: 'fellowship', name: 'Fellowship / Evening Rally', short: 'Fellowship', icon: 'Users' },
  { id: 'one-on-one', name: 'One-on-One Peer Outreach', short: 'One-on-One', icon: 'UserCheck' },
  { id: 'digital-referral', name: 'Digital / WhatsApp Referral', short: 'Digital Referral', icon: 'Share2' },
] as const;

export type MobilizationMethodName = typeof MOBILIZATION_METHODS[number]['name'];

export type IntakeChannel = 'rapid-single' | 'multi-part' | 'batch-roster' | 'offline-buffer';

export interface MobilizationEntry {
  id: string;
  fullName: string;
  telephone: string;
  rawTelephone?: string;
  university: UniversityName;
  date: string; // DD/MM/YYYY
  time: string; // HH:MM
  timestamp: string; // ISO 8601
  syncedToGoogleSheets: boolean;
  queuedOffline?: boolean;
  mobilizerName?: string; // Who entered the data (irrespective of mobilizer)
  mobilizationMethod?: string; // e.g. Campus Gate, Door-to-Door, Lecture Hall
  intakeMethod?: IntakeChannel | string; // rapid-single, multi-part, batch-roster
  notes?: string;
}

export interface SaveEntryPayload {
  fullName: string;
  telephone: string;
  university: UniversityName;
  allowDuplicate?: boolean;
  mobilizerName?: string;
  mobilizationMethod?: string;
  intakeMethod?: IntakeChannel | string;
  notes?: string;
}

export interface SaveEntryResponse {
  success: boolean;
  message: string;
  entry?: MobilizationEntry;
  isDuplicate?: boolean;
  existingEntry?: {
    id: string;
    fullName: string;
    telephone: string;
    university: string;
    date: string;
  };
  googleSheetsSynced?: boolean;
  warning?: string;
}

export interface AdminStats {
  totalEntries: number;
  byUniversity: Record<string, number>;
  byDate: Record<string, number>;
  sheetsConfigured: boolean;
  duplicateSetting: 'warn' | 'allow' | 'block';
  lastSyncedTimestamp?: string;
}

export interface GoogleSheetsConfigStatus {
  isConfigured: boolean;
  spreadsheetId: string;
  serviceAccountEmail: string;
  hasPrivateKey: boolean;
  sheetTitle?: string;
  lastError?: string;
  totalSyncedRows?: number;
}

export interface DataSummationSummary {
  grandTotal?: number;
  todayTotal?: number;
  totalSynced?: number;
  totalPending?: number;
  activeUniversityTotal?: number;
  activeUniversityToday?: number;
  byUniversity?: Record<string, number>;
  todayByUniversity?: Record<string, number>;
  schoolTiers?: Record<string, SchoolSummationTier>;
  byMobilizationMethod?: Record<string, number>;
  byIntakeMethod?: Record<string, number>;
  activeTier?: SchoolSummationTier | null;
  lastEntry?: {
    id: string;
    fullName: string;
    university: string;
    time: string;
    date: string;
    mobilizationMethod?: string;
    mobilizerName?: string;
  } | null;
  todayDate?: string;
}

export interface SchoolSummationTier {
  university: UniversityName | string;
  acronym: string;
  totalSum: number; // Irrespective of who entered it
  todaySum: number; // Today's count irrespective of who entered it
  syncedSum: number;
  pendingSum: number;
  byMobilizationMethod?: Record<string, number>; // Door-to-Door, Campus Gate, etc.
  byIntakeMethod?: Record<string, number>; // Rapid Single, Multi-Station, Batch
  byMobilizer?: Record<string, number>; // Breakdown by recorder (all summing into this school)
  dailyMilestoneProgress: number;
  dailyMilestoneGoal: number;
  milestonesAchievedToday: number;
  lastEntryTime?: string;
}

export interface MultiLevelSummationData {
  schoolTiers: Record<string, SchoolSummationTier>;
  activeUniversity: string | null;
  activeTier: SchoolSummationTier | null;
  todayDate?: string;
}

export interface SchoolNotification {
  id: string;
  university: string;
  universityAcronym: string;
  title: string;
  message: string;
  type: 'MILESTONE_50' | 'SYSTEM' | 'DAILY_TARGET';
  milestoneCount: number;
  date: string;
  timestamp: string;
  readBy: string[];
}

