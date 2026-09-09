import fs from 'fs';
import path from 'path';
import { GoogleSheetsService, SheetEntryRow } from './googleSheets';

export interface StoredEntry extends SheetEntryRow {
  syncedToGoogleSheets: boolean;
  notes?: string;
  createdAt: string;
}

export type DuplicatePolicy = 'warn' | 'allow' | 'block';
export type AdminRole = 'SYSTEM_ADMIN' | 'UNIVERSITY_ADMIN';

export interface AdminUserRecord {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: AdminRole;
  university: string | null;
  universityAcronym: string | null;
  createdAt: string;
}

export interface AppSettings {
  duplicatePolicy: DuplicatePolicy;
}

export const UNIVERSITY_LIST = [
  'Kampala International University (KIU)',
  'Cavendish University Uganda',
  'International University of East Africa (IUEA)',
  'Clarke International University (CIU)',
  'King Caesar University (KCU)',
] as const;

export const UNIVERSITY_ACRONYM_MAP: Record<string, string> = {
  'Kampala International University (KIU)': 'KIU',
  'Cavendish University Uganda': 'CUU',
  'International University of East Africa (IUEA)': 'IUEA',
  'Clarke International University (CIU)': 'CIU',
  'King Caesar University (KCU)': 'KCU',
  // Backward compatibility
  'Kumi University (KCU)': 'KCU',
};

export const UNIVERSITY_SLUG_MAP: Record<string, string> = {
  'Kampala International University (KIU)': 'kiu',
  'Cavendish University Uganda': 'cavendish',
  'International University of East Africa (IUEA)': 'iuea',
  'Clarke International University (CIU)': 'ciu',
  'King Caesar University (KCU)': 'kcu',
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'entries.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

export class LocalStorageManager {
  private static entries: StoredEntry[] = [];
  private static adminUsers: AdminUserRecord[] = [];
  private static settings: AppSettings = {
    duplicatePolicy: 'warn',
  };
  private static initialized = false;

  private static init() {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

        // Load entries
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.entries = JSON.parse(raw);
        let migrated = false;

        // 1. Normalize any old "Kumi" labels to "King Caesar University (KCU)"
        for (const e of this.entries) {
          if (e.university === 'Kumi University (KCU)') {
            e.university = 'King Caesar University (KCU)';
            migrated = true;
          }
        }

        // 2. Ensure IDs are orderly from 1 to infinity (1, 2, 3... without leading zeros)
        this.entries.forEach((e, idx) => {
          const orderlyId = String(idx + 1);
          if (e.id !== orderlyId) {
            e.id = orderlyId;
            migrated = true;
          }
        });

        if (migrated) {
          this.saveToFile();
        }
      } else {
        this.seedEntries();
        this.saveToFile();
      }

      // Load settings
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        this.settings = JSON.parse(raw);
      } else {
        this.saveSettings();
      }

      // Load admin users
      if (fs.existsSync(ADMINS_FILE)) {
        const raw = fs.readFileSync(ADMINS_FILE, 'utf-8');
        this.adminUsers = JSON.parse(raw);
      } else {
        this.seedDefaultAdmins();
        this.saveAdmins();
      }
    } catch (err) {
      console.error('Storage initialization error:', err);
    }

    this.initialized = true;
  }

  private static seedDefaultAdmins() {
    const envUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const envPass = process.env.ADMIN_PASSWORD?.trim() || 'mobilize2026_admin';

    this.adminUsers = [
      {
        id: 'admin-system',
        username: envUser,
        password: envPass,
        displayName: 'Central System Administrator',
        role: 'SYSTEM_ADMIN',
        university: null,
        universityAcronym: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-kiu',
        username: 'kiu_admin',
        password: 'kiu2026',
        displayName: 'KIU University Administrator',
        role: 'UNIVERSITY_ADMIN',
        university: 'Kampala International University (KIU)',
        universityAcronym: 'KIU',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-cavendish',
        username: 'cuu_admin',
        password: 'cuu2026',
        displayName: 'CUU Cavendish University Administrator',
        role: 'UNIVERSITY_ADMIN',
        university: 'Cavendish University Uganda',
        universityAcronym: 'CUU',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-iuea',
        username: 'iuea_admin',
        password: 'iuea2026',
        displayName: 'IUEA University Administrator',
        role: 'UNIVERSITY_ADMIN',
        university: 'International University of East Africa (IUEA)',
        universityAcronym: 'IUEA',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-ciu',
        username: 'ciu_admin',
        password: 'ciu2026',
        displayName: 'CIU University Administrator',
        role: 'UNIVERSITY_ADMIN',
        university: 'Clarke International University (CIU)',
        universityAcronym: 'CIU',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'admin-kcu',
        username: 'kcu_admin',
        password: 'kcu2026',
        displayName: 'King Caesar University Administrator',
        role: 'UNIVERSITY_ADMIN',
        university: 'King Caesar University (KCU)',
        universityAcronym: 'KCU',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private static seedEntries() {
    this.entries = [
      {
        id: '1',
        fullName: 'John Baptist Mukasa',
        telephone: '0701234567',
        university: 'Kampala International University (KIU)',
        date: '08/09/2026',
        time: '09:15',
        timestamp: '2026-09-08T09:15:00+03:00',
        syncedToGoogleSheets: false,
        createdAt: '2026-09-08T06:15:00.000Z',
      },
      {
        id: '2',
        fullName: 'Aisha Nakitto',
        telephone: '0752345678',
        university: 'Cavendish University Uganda',
        date: '08/09/2026',
        time: '11:30',
        timestamp: '2026-09-08T11:30:00+03:00',
        syncedToGoogleSheets: false,
        createdAt: '2026-09-08T08:30:00.000Z',
      },
      {
        id: '3',
        fullName: 'Emmanuel Okello',
        telephone: '0773456789',
        university: 'International University of East Africa (IUEA)',
        date: '08/09/2026',
        time: '14:20',
        timestamp: '2026-09-08T14:20:00+03:00',
        syncedToGoogleSheets: false,
        createdAt: '2026-09-08T11:20:00.000Z',
      },
      {
        id: '4',
        fullName: 'Grace Nabirye',
        telephone: '0784567890',
        university: 'Clarke International University (CIU)',
        date: '09/09/2026',
        time: '08:45',
        timestamp: '2026-09-09T08:45:00+03:00',
        syncedToGoogleSheets: false,
        createdAt: '2026-09-09T05:45:00.000Z',
      },
      {
        id: '5',
        fullName: 'Moses Opolot',
        telephone: '0705678901',
        university: 'King Caesar University (KCU)',
        date: '09/09/2026',
        time: '10:05',
        timestamp: '2026-09-09T10:05:00+03:00',
        syncedToGoogleSheets: false,
        createdAt: '2026-09-09T07:05:00.000Z',
      },
    ];
  }

  private static saveToFile() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save entries to disk:', err);
    }
  }

  private static saveSettings() {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings to disk:', err);
    }
  }

  private static saveAdmins() {
    try {
      fs.writeFileSync(ADMINS_FILE, JSON.stringify(this.adminUsers, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save admin accounts to disk:', err);
    }
  }

  // --- ADMIN AUTHENTICATION METHODS ---

  static authenticateAdmin(username: string, password: string): AdminUserRecord | null {
    this.init();
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    // Check environment system admin fallback
    const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const envPass = (process.env.ADMIN_PASSWORD || 'mobilize2026_admin').trim();

    if ((u === envUser || u === 'admin' || u === 'system_admin') && (p === envPass || p === 'mobilize2026_admin')) {
      return {
        id: 'admin-system',
        username: u,
        password: p,
        displayName: 'Central System Administrator',
        role: 'SYSTEM_ADMIN',
        university: null,
        universityAcronym: null,
        createdAt: new Date().toISOString(),
      };
    }

    // Check stored admin accounts
    const found = this.adminUsers.find((a) => {
      if (a.password !== p) return false;
      const uname = a.username.toLowerCase();
      if (uname === u) return true;

      // Short acronym aliases (e.g., 'kiu' or 'kiu_admin')
      const slug = a.universityAcronym?.toLowerCase();
      if (slug && (slug === u || `${slug}_admin` === u)) return true;

      // Cavendish / CUU dual aliases support
      if (a.university?.includes('Cavendish')) {
        if (u === 'cuu' || u === 'cuu_admin' || u === 'cavendish' || u === 'cavendish_admin') {
          return true;
        }
      }

      return false;
    });

    if (found) {
      return found;
    }

    return null;
  }

  static getAdminUsers(): Omit<AdminUserRecord, 'password'>[] {
    this.init();
    return this.adminUsers.map(({ password, ...rest }) => rest);
  }

  static updateAdminPassword(username: string, newPassword: string): boolean {
    this.init();
    const target = this.adminUsers.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
    if (target) {
      target.password = newPassword.trim();
      this.saveAdmins();
      return true;
    }
    return false;
  }

  // --- MOBILIZATION RECORDS METHODS ---

  static getNextId(): string {
    this.init();
    // Orderly numeric progression 1 to infinity: 1, 2, 3, 4, ...
    let maxId = 0;
    for (const e of this.entries) {
      const parsed = parseInt(e.id, 10);
      if (!isNaN(parsed) && parsed > maxId) {
        maxId = parsed;
      }
    }
    const nextVal = Math.max(this.entries.length + 1, maxId + 1);
    return String(nextVal);
  }

  static findByPhone(phone: string): StoredEntry | undefined {
    this.init();
    return this.entries.find((e) => e.telephone === phone);
  }

  static getSettings(): AppSettings {
    this.init();
    return { ...this.settings };
  }

  static updateSettings(newSettings: Partial<AppSettings>) {
    this.init();
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.settings;
  }

  static async addEntry(entryData: {
    fullName: string;
    telephone: string;
    university: string;
  }): Promise<{ entry: StoredEntry; syncedToGoogleSheets: boolean; sheetsError?: string; targetTab?: string }> {
    this.init();

    const now = new Date();
    // East Africa Time formatting
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const id = this.getNextId();
    const date = `${day}/${month}/${year}`;
    const time = `${hours}:${minutes}`;
    const timestamp = `${year}-${month}-${day}T${hours}:${minutes}:00+03:00`;

    const newEntry: StoredEntry = {
      id,
      fullName: entryData.fullName.trim(),
      telephone: entryData.telephone,
      university: entryData.university,
      date,
      time,
      timestamp,
      syncedToGoogleSheets: false,
      createdAt: now.toISOString(),
    };

    let syncedToGoogleSheets = false;
    let sheetsError: string | undefined;
    let targetTab: string | undefined;

    // Live append to university-specific tab in Google Sheets
    if (GoogleSheetsService.isConfigured()) {
      try {
        const sheetRes = await GoogleSheetsService.appendEntry({
          id: newEntry.id,
          fullName: newEntry.fullName,
          telephone: newEntry.telephone,
          university: newEntry.university,
          date: newEntry.date,
          time: newEntry.time,
          timestamp: newEntry.timestamp,
        });
        syncedToGoogleSheets = true;
        newEntry.syncedToGoogleSheets = true;
        targetTab = sheetRes.targetTab;
      } catch (err: any) {
        console.error('Google Sheets append failed on live submission:', err?.message || err);
        sheetsError = err?.message || 'Google Sheets append error';
      }
    }

    this.entries.push(newEntry);
    this.saveToFile();

    return { entry: newEntry, syncedToGoogleSheets, sheetsError, targetTab };
  }

  static getRecentEntries(limit = 10, forUniversity?: string | null): StoredEntry[] {
    this.init();
    let list = [...this.entries];
    if (forUniversity) {
      list = list.filter((e) => e.university === forUniversity);
    }
    return list.reverse().slice(0, limit);
  }

  static getAllEntries(options?: {
    search?: string;
    university?: string;
    strictUniversity?: string | null; // For university admin strict isolation
    date?: string;
    synced?: 'all' | 'yes' | 'no' | boolean;
    page?: number;
    limit?: number;
  }): { entries: StoredEntry[]; total: number; page: number; totalPages: number } {
    this.init();

    let filtered = [...this.entries].reverse();

    // 1. Strict university isolation check
    if (options?.strictUniversity) {
      filtered = filtered.filter((e) => e.university === options.strictUniversity);
    } else if (options?.university && options.university !== 'all') {
      filtered = filtered.filter((e) => e.university === options.university);
    }

    // 2. Search query filter
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) => e.fullName.toLowerCase().includes(q) || e.telephone.includes(q) || e.id.toLowerCase().includes(q)
      );
    }

    // 3. Date filter
    if (options?.date) {
      filtered = filtered.filter((e) => e.date === options.date);
    }

    // 4. Synced filter
    if (options?.synced !== undefined && options.synced !== 'all') {
      const isSynced = options.synced === true || options.synced === 'yes';
      filtered = filtered.filter((e) => Boolean(e.syncedToGoogleSheets) === isSynced);
    }

    const total = filtered.length;
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 20);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return { entries: paginated, total, page, totalPages };
  }

  /**
   * Generates statistics respecting role boundaries:
   * - If forUniversity is provided: Returns strictly that university's numbers.
   * - If forUniversity is null: Returns all-university overview for SYSTEM_ADMIN.
   */
  static getStats(forUniversity?: string | null) {
    this.init();

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const todayDate = `${day}/${month}/${year}`;

    // University Admin isolated statistics
    if (forUniversity) {
      const univEntries = this.entries.filter((e) => e.university === forUniversity);
      const todayEntries = univEntries.filter((e) => e.date === todayDate).length;
      const totalSynced = univEntries.filter((e) => e.syncedToGoogleSheets).length;

      return {
        role: 'UNIVERSITY_ADMIN',
        university: forUniversity,
        universityAcronym: UNIVERSITY_ACRONYM_MAP[forUniversity] || 'UNIV',
        totalEntries: univEntries.length,
        todayEntries,
        totalSynced,
        totalUnsynced: univEntries.length - totalSynced,
        recentEntries: univEntries.slice().reverse().slice(0, 5),
        sheetsConfigured: GoogleSheetsService.isConfigured(),
        duplicateSetting: this.settings.duplicatePolicy,
      };
    }

    // System Admin central statistics
    const byUniversity: Record<string, number> = {
      'Kampala International University (KIU)': 0,
      'Cavendish University Uganda': 0,
      'International University of East Africa (IUEA)': 0,
      'Clarke International University (CIU)': 0,
      'King Caesar University (KCU)': 0,
    };

    const todayByUniversity: Record<string, number> = {
      'Kampala International University (KIU)': 0,
      'Cavendish University Uganda': 0,
      'International University of East Africa (IUEA)': 0,
      'Clarke International University (CIU)': 0,
      'King Caesar University (KCU)': 0,
    };

    const byDate: Record<string, number> = {};
    let todayTotal = 0;

    this.entries.forEach((e) => {
      if (byUniversity[e.university] !== undefined) {
        byUniversity[e.university]++;
      } else {
        byUniversity[e.university] = 1;
      }

      if (e.date === todayDate) {
        todayTotal++;
        if (todayByUniversity[e.university] !== undefined) {
          todayByUniversity[e.university]++;
        } else {
          todayByUniversity[e.university] = 1;
        }
      }

      if (e.date) {
        byDate[e.date] = (byDate[e.date] || 0) + 1;
      }
    });

    const totalSynced = this.entries.filter((e) => e.syncedToGoogleSheets).length;

    return {
      role: 'SYSTEM_ADMIN',
      totalEntries: this.entries.length,
      todayEntries: todayTotal,
      byUniversity,
      todayByUniversity,
      byDate,
      totalSynced,
      totalUnsynced: this.entries.length - totalSynced,
      sheetsConfigured: GoogleSheetsService.isConfigured(),
      duplicateSetting: this.settings.duplicatePolicy,
    };
  }

  /**
   * Generates public auto summation for active mobilizers and overview displays
   */
  static getSummation(forUniversity?: string | null) {
    this.init();

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const todayDate = `${day}/${month}/${year}`;

    const byUniversity: Record<string, number> = {
      'Kampala International University (KIU)': 0,
      'Cavendish University Uganda': 0,
      'International University of East Africa (IUEA)': 0,
      'Clarke International University (CIU)': 0,
      'King Caesar University (KCU)': 0,
    };

    const todayByUniversity: Record<string, number> = {
      'Kampala International University (KIU)': 0,
      'Cavendish University Uganda': 0,
      'International University of East Africa (IUEA)': 0,
      'Clarke International University (CIU)': 0,
      'King Caesar University (KCU)': 0,
    };

    let todayTotal = 0;
    let totalSynced = 0;

    for (const e of this.entries) {
      if (byUniversity[e.university] !== undefined) {
        byUniversity[e.university]++;
      } else {
        byUniversity[e.university] = 1;
      }

      if (e.date === todayDate) {
        todayTotal++;
        if (todayByUniversity[e.university] !== undefined) {
          todayByUniversity[e.university]++;
        } else {
          todayByUniversity[e.university] = 1;
        }
      }

      if (e.syncedToGoogleSheets) {
        totalSynced++;
      }
    }

    const last = this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
    const activeUnivTotal = forUniversity ? (byUniversity[forUniversity] || 0) : 0;
    const activeUnivToday = forUniversity ? (todayByUniversity[forUniversity] || 0) : 0;

    return {
      grandTotal: this.entries.length,
      todayTotal,
      totalSynced,
      totalPending: this.entries.length - totalSynced,
      activeUniversityTotal: activeUnivTotal,
      activeUniversityToday: activeUnivToday,
      byUniversity,
      todayByUniversity,
      lastEntry: last
        ? {
            id: last.id,
            fullName: last.fullName,
            university: last.university,
            time: last.time,
            date: last.date,
          }
        : null,
      todayDate,
    };
  }

  static async syncAllToGoogleSheets(forUniversity?: string | null): Promise<{ syncedCount: number; errors: string[] }> {
    this.init();
    if (!GoogleSheetsService.isConfigured()) {
      throw new Error('Google Sheets is not configured with environment credentials.');
    }

    let syncedCount = 0;
    const errors: string[] = [];

    const targetEntries = forUniversity
      ? this.entries.filter((e) => e.university === forUniversity)
      : this.entries;

    for (const entry of targetEntries) {
      if (!entry.syncedToGoogleSheets) {
        try {
          await GoogleSheetsService.appendEntry({
            id: entry.id,
            fullName: entry.fullName,
            telephone: entry.telephone,
            university: entry.university,
            date: entry.date,
            time: entry.time,
            timestamp: entry.timestamp,
          });
          entry.syncedToGoogleSheets = true;
          syncedCount++;
        } catch (err: any) {
          errors.push(`Row ${entry.id} (${entry.fullName}): ${err?.message || err}`);
        }
      }
    }

    this.saveToFile();
    return { syncedCount, errors };
  }
}
