export type UniversityName =
  | 'Kampala International University (KIU)'
  | 'Cavendish University Uganda'
  | 'International University of East Africa (IUEA)'
  | 'Clarke International University (CIU)'
  | 'King Caesar University (KCU)';

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
  {
    id: 'cavendish',
    name: 'Cavendish University Uganda',
    shortName: 'Cavendish University',
    acronym: 'CUU',
    campus: 'Nsambya / Kingsgate',
    color: 'border-blue-600 text-blue-700 bg-blue-50',
    accentBg: 'bg-blue-600',
  },
  {
    id: 'iuea',
    name: 'International University of East Africa (IUEA)',
    shortName: 'Int. University of East Africa',
    acronym: 'IUEA',
    campus: 'Kansanga Main Campus',
    color: 'border-purple-600 text-purple-700 bg-purple-50',
    accentBg: 'bg-purple-600',
  },
  {
    id: 'ciu',
    name: 'Clarke International University (CIU)',
    shortName: 'Clarke Int. University',
    acronym: 'CIU',
    campus: 'Muyenga / Bukoto',
    color: 'border-amber-600 text-amber-700 bg-amber-50',
    accentBg: 'bg-amber-600',
  },
  {
    id: 'kcu',
    name: 'King Caesar University (KCU)',
    shortName: 'King Caesar University',
    acronym: 'KCU',
    campus: 'Ggaba / Bunga Campus',
    color: 'border-rose-600 text-rose-700 bg-rose-50',
    accentBg: 'bg-rose-600',
  },
];

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
  notes?: string;
}

export interface SaveEntryPayload {
  fullName: string;
  telephone: string;
  university: UniversityName;
  allowDuplicate?: boolean;
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
  activeTier?: SchoolSummationTier | null;
  lastEntry?: {
    id: string;
    fullName: string;
    university: string;
    time: string;
    date: string;
  } | null;
  todayDate?: string;
}

export interface SchoolSummationTier {
  university: UniversityName | string;
  acronym: string;
  totalSum: number;
  todaySum: number;
  syncedSum: number;
  pendingSum: number;
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

