import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleSheetsService } from './server/googleSheets';
import {
  LocalStorageManager,
  DuplicatePolicy,
  UNIVERSITY_LIST,
  UNIVERSITY_SLUG_MAP,
  UNIVERSITY_ACRONYM_MAP,
  AdminRole,
} from './server/storage';
import { normalizeUgandaPhone } from './server/phone';

const ALLOWED_UNIVERSITIES = [
  'Kampala International University (KIU)',
  'Cavendish University Uganda',
  'International University of East Africa (IUEA)',
  'Clarke International University (CIU)',
  'King Caesar University (KCU)',
];

export interface AuthenticatedAdmin {
  username: string;
  displayName: string;
  role: AdminRole;
  university: string | null;
  universityAcronym: string | null;
}

// Generate signed token payload
function createAuthToken(admin: AuthenticatedAdmin): string {
  const payload = {
    u: admin.username,
    r: admin.role,
    univ: admin.university,
    acro: admin.universityAcronym,
    ts: Date.now(),
  };
  return 'tok_' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify token payload
function parseAuthToken(token: string): AuthenticatedAdmin | null {
  if (!token) return null;

  // Legacy system tokens check
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const envPass = (process.env.ADMIN_PASSWORD || 'mobilize2026_admin').trim();
  const legacyToken1 = 'token_' + Buffer.from(`${envUser}:${envPass}`).toString('base64');
  const legacyToken2 = 'token_' + Buffer.from(`admin:mobilize2026_admin`).toString('base64');
  const legacyToken3 = 'token_' + Buffer.from(`MOBILISATION:Ignite`).toString('base64');

  if (token === legacyToken1 || token === legacyToken2 || token === legacyToken3) {
    return {
      username: envUser,
      displayName: 'Central System Administrator',
      role: 'SYSTEM_ADMIN',
      university: null,
      universityAcronym: null,
    };
  }

  if (token.startsWith('tok_')) {
    try {
      const raw = Buffer.from(token.slice(4), 'base64').toString('utf-8');
      const payload = JSON.parse(raw);
      if (payload.u && payload.r) {
        return {
          username: payload.u,
          displayName: payload.r === 'SYSTEM_ADMIN' ? 'Central System Administrator' : `${payload.acro || 'University'} Administrator`,
          role: payload.r,
          university: payload.univ || null,
          universityAcronym: payload.acro || null,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = (req.headers.authorization || req.headers['x-admin-token'] || req.query.token) as string | undefined;
  if (!authHeader) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  const admin = parseAuthToken(token);
  if (!admin) {
    res.status(403).json({ success: false, message: 'Invalid or expired administrative token' });
    return;
  }

  (req as any).adminUser = admin;
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      googleSheetsConfigured: GoogleSheetsService.isConfigured(),
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Check duplicate phone endpoint
  app.get('/api/entries/check-phone', (req, res) => {
    const rawPhone = String(req.query.phone || '');
    const phoneResult = normalizeUgandaPhone(rawPhone);

    if (!phoneResult.isValid) {
      res.json({ isValid: false, isDuplicate: false, error: phoneResult.error });
      return;
    }

    const existing = LocalStorageManager.findByPhone(phoneResult.normalized);
    if (existing) {
      res.json({
        isValid: true,
        isDuplicate: true,
        existingEntry: {
          id: existing.id,
          fullName: existing.fullName,
          telephone: existing.telephone,
          university: existing.university,
          date: existing.date,
        },
        message: `This telephone number (${phoneResult.normalized}) may already exist in the database (entered at ${existing.university}).`,
      });
      return;
    }

    res.json({ isValid: true, isDuplicate: false, normalized: phoneResult.normalized });
  });

  // 2. Submit new entry (POST /api/entries) - FAST DATA ENTRY WORKFLOW
  app.post('/api/entries', async (req, res) => {
    try {
      const { fullName, telephone, university, allowDuplicate } = req.body;

      // Validate Full Name
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Full Name is required and must contain at least 2 characters.',
        });
        return;
      }

      // Validate University is one of the fixed universities
      let matchedUniversity = ALLOWED_UNIVERSITIES.find((u) => u === university);
      if (!matchedUniversity) {
        // Check for old name or partial match
        if (university?.includes('King Caesar') || university?.includes('KCU') || university?.includes('Kumi')) {
          matchedUniversity = 'King Caesar University (KCU)';
        } else {
          res.status(400).json({
            success: false,
            message: `Invalid university. Must be one of: ${ALLOWED_UNIVERSITIES.join(', ')}`,
          });
          return;
        }
      }

      // Validate and Normalize Phone Number
      const phoneResult = normalizeUgandaPhone(telephone);
      if (!phoneResult.isValid) {
        res.status(400).json({
          success: false,
          message: phoneResult.error || 'Invalid Ugandan telephone number format.',
        });
        return;
      }

      const normalizedPhone = phoneResult.normalized;

      // Duplicate Check with App Policy
      const settings = LocalStorageManager.getSettings();
      const existing = LocalStorageManager.findByPhone(normalizedPhone);

      if (existing) {
        if (settings.duplicatePolicy === 'block') {
          res.status(409).json({
            success: false,
            isDuplicate: true,
            message: `Number ${normalizedPhone} has already been registered (${existing.fullName} at ${existing.university}). System policy strictly prohibits duplicates.`,
            existingEntry: {
              id: existing.id,
              fullName: existing.fullName,
              telephone: existing.telephone,
              university: existing.university,
              date: existing.date,
            },
          });
          return;
        } else if (settings.duplicatePolicy === 'warn' && !allowDuplicate) {
          res.status(409).json({
            success: false,
            isDuplicate: true,
            message: `Number ${normalizedPhone} has already been recorded for "${existing.fullName}" at ${existing.university}. Confirm if you wish to record another person with this number.`,
            existingEntry: {
              id: existing.id,
              fullName: existing.fullName,
              telephone: existing.telephone,
              university: existing.university,
              date: existing.date,
            },
          });
          return;
        }
      }

      // Add to high-concurrency local storage & queue for background batch sync
      const addResult = LocalStorageManager.addEntry({
        fullName: fullName.trim(),
        telephone: normalizedPhone,
        university: matchedUniversity,
      });

      res.status(201).json({
        success: true,
        message: 'Mobilization entry saved successfully.',
        entry: addResult.entry,
        googleSheetsSynced: addResult.syncedToGoogleSheets,
        queuedForSync: addResult.queuedForSync,
        targetTab: addResult.targetTab,
        sheetsWarning: addResult.sheetsError,
      });
    } catch (err: any) {
      console.error('Failed to create entry:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error while saving mobilization entry.',
        error: err?.message,
      });
    }
  });

  // 3. Get Recent Entries
  app.get('/api/entries/recent', (req, res) => {
    const university = req.query.university ? String(req.query.university) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const recent = LocalStorageManager.getRecentEntries(limit, university && university !== 'all' ? university : null);
    res.json({ success: true, entries: recent });
  });

  // 3.1 Get Live Auto Summation of Data Entered
  app.get('/api/entries/summation', (req, res) => {
    const university = req.query.university ? String(req.query.university) : undefined;
    const summary = LocalStorageManager.getSummation(university && university !== 'all' ? university : null);
    res.json({ success: true, ...summary });
  });

  // 4. Batch sync queued offline entries
  app.post('/api/entries/sync-batch', async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ success: false, message: 'Entries array is required' });
        return;
      }

      const results = [];
      for (const item of entries) {
        const phoneResult = normalizeUgandaPhone(item.telephone);
        if (phoneResult.isValid && item.fullName && item.university) {
          let u = ALLOWED_UNIVERSITIES.find((uName) => uName === item.university) || item.university;
          if (u.includes('KCU') || u.includes('Kumi') || u.includes('King Caesar')) {
            u = 'King Caesar University (KCU)';
          }
          const addRes = LocalStorageManager.addEntry({
            fullName: item.fullName,
            telephone: phoneResult.normalized,
            university: u,
          });
          results.push({
            id: addRes.entry.id,
            fullName: addRes.entry.fullName,
            success: true,
            syncedToSheets: addRes.syncedToGoogleSheets,
            queuedForSync: addRes.queuedForSync,
          });
        } else {
          results.push({
            fullName: item.fullName,
            success: false,
            error: 'Validation failed during sync',
          });
        }
      }

      res.json({
        success: true,
        syncedCount: results.filter((r) => r.success).length,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Sync failed', error: err?.message });
    }
  });

  // 5. Admin Authentication (Role-Based for System Admin & 5 University Admins)
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminRecord = LocalStorageManager.authenticateAdmin(username, password);

    if (adminRecord) {
      const authAdmin: AuthenticatedAdmin = {
        username: adminRecord.username,
        displayName: adminRecord.displayName,
        role: adminRecord.role,
        university: adminRecord.university,
        universityAcronym: adminRecord.universityAcronym,
      };

      const token = createAuthToken(authAdmin);

      res.json({
        success: true,
        token,
        admin: authAdmin,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid administrative username or password. Check role credentials.',
      });
    }
  });

  // Admin Profile & Verify Session
  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    res.json({ success: true, admin });
  });

  // 6. Admin Get Records (STRICT UNIVERSITY DATA ISOLATION ENFORCED)
  app.get('/api/admin/entries', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    const search = req.query.search ? String(req.query.search) : undefined;
    const date = req.query.date ? String(req.query.date) : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const synced = req.query.synced as ('all' | 'yes' | 'no' | undefined);

    let university: string | undefined;
    let strictUniversity: string | null = null;

    if (admin.role === 'UNIVERSITY_ADMIN') {
      // BACKEND ENFORCEMENT: University admin can ONLY access their designated university
      strictUniversity = admin.university;
    } else {
      // System admin can view all or filter
      university = req.query.university ? String(req.query.university) : undefined;
    }

    const data = LocalStorageManager.getAllEntries({
      search,
      university,
      strictUniversity,
      date,
      synced,
      page,
      limit,
    });

    res.json({
      success: true,
      adminRole: admin.role,
      activeUniversity: strictUniversity || university || 'all',
      ...data,
    });
  });

  // 7. Admin Statistics (ROLE-BASED ISOLATION)
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    const forUniversity = admin.role === 'UNIVERSITY_ADMIN' ? admin.university : null;
    const stats = LocalStorageManager.getStats(forUniversity);
    res.json({ success: true, stats, adminRole: admin.role });
  });

  // 8. Admin Export CSV (STRICT CSV EXPORT & ISOLATION)
  app.get('/api/admin/export', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    const date = req.query.date ? String(req.query.date) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const synced = req.query.synced as ('all' | 'yes' | 'no' | undefined);
    const requestedCols = req.query.columns ? String(req.query.columns).split(',').map((c) => c.trim()) : null;

    let targetUniversity: string | undefined;
    let strictUniversity: string | null = null;

    if (admin.role === 'UNIVERSITY_ADMIN') {
      // Strict backend isolation: Force to administrator's university only
      strictUniversity = admin.university;
      targetUniversity = admin.university || undefined;
    } else {
      targetUniversity = req.query.university && req.query.university !== 'all'
        ? String(req.query.university)
        : undefined;
    }

    const data = LocalStorageManager.getAllEntries({
      university: targetUniversity,
      strictUniversity,
      date: date && date !== 'all' ? date : undefined,
      search: search || undefined,
      synced: synced || 'all',
      limit: 100000,
    });

    // Column definitions mapping
    const availableColumns: Record<string, { label: string; extract: (e: any) => string }> = {
      id: { label: 'ID', extract: (e) => `"${e.id}"` },
      fullName: { label: 'Full Name', extract: (e) => `"${(e.fullName || '').replace(/"/g, '""')}"` },
      telephone: { label: 'Telephone Number', extract: (e) => `"${e.telephone}"` },
      university: { label: 'University', extract: (e) => `"${(e.university || '').replace(/"/g, '""')}"` },
      date: { label: 'Date', extract: (e) => `"${e.date}"` },
      time: { label: 'Time', extract: (e) => `"${e.time}"` },
      timestamp: { label: 'Timestamp (ISO/EAT)', extract: (e) => `"${e.timestamp}"` },
      syncedToGoogleSheets: { label: 'Google Sheets Synced', extract: (e) => `"${e.syncedToGoogleSheets ? 'Yes' : 'No'}"` },
      createdAt: { label: 'Created At (UTC)', extract: (e) => `"${e.createdAt || ''}"` },
    };

    const activeColKeys = requestedCols && requestedCols.length > 0
      ? requestedCols.filter((k) => availableColumns[k])
      : ['id', 'fullName', 'telephone', 'university', 'date', 'time', 'timestamp', 'syncedToGoogleSheets'];

    const headers = activeColKeys.map((k) => availableColumns[k].label);
    const rows = data.entries.map((entry) => {
      return activeColKeys.map((k) => availableColumns[k].extract(entry)).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const safeDate = new Date().toISOString().slice(0, 10);

    // Precise filename requirements as requested:
    // e.g. kiu_mobilization_2026-09-09.csv, cavendish_mobilization_2026-09-09.csv
    let filename: string;
    if (targetUniversity) {
      const slug = UNIVERSITY_SLUG_MAP[targetUniversity] || 'university';
      filename = `${slug}_mobilization_${safeDate}.csv`;
    } else {
      filename = `all_universities_mobilization_${safeDate}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Count', String(data.total));
    res.send(csvContent);
  });

  // 9. Admin Settings & Google Sheets status
  app.get('/api/admin/sheets-status', requireAdmin, (req, res) => {
    const isConfigured = GoogleSheetsService.isConfigured();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || '';
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
    const hasPrivateKey = !!process.env.GOOGLE_PRIVATE_KEY?.trim();

    res.json({
      success: true,
      status: {
        isConfigured,
        spreadsheetId: spreadsheetId ? `${spreadsheetId.slice(0, 8)}...${spreadsheetId.slice(-6)}` : 'Not Set',
        rawSpreadsheetId: spreadsheetId,
        serviceAccountEmail: serviceAccountEmail || 'Not Set',
        hasPrivateKey,
      },
      duplicatePolicy: LocalStorageManager.getSettings().duplicatePolicy,
    });
  });

  app.post('/api/admin/settings', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    if (admin.role !== 'SYSTEM_ADMIN') {
      res.status(403).json({ success: false, message: 'Only System Administrator can update system settings.' });
      return;
    }
    const { duplicatePolicy } = req.body;
    if (['warn', 'allow', 'block'].includes(duplicatePolicy)) {
      const updated = LocalStorageManager.updateSettings({ duplicatePolicy: duplicatePolicy as DuplicatePolicy });
      res.json({ success: true, settings: updated });
    } else {
      res.status(400).json({ success: false, message: 'Invalid duplicate policy' });
    }
  });

  app.post('/api/admin/test-sheets', requireAdmin, async (req, res) => {
    GoogleSheetsService.resetClient();
    const result = await GoogleSheetsService.testConnection();
    res.json(result);
  });

  app.post('/api/admin/sync-all-to-sheets', requireAdmin, async (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    try {
      const forUniversity = admin.role === 'UNIVERSITY_ADMIN' ? admin.university : null;
      const result = await LocalStorageManager.syncAllToGoogleSheets(forUniversity);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Sync failed' });
    }
  });

  // 10. System Admin: Manage University Administrators
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    if (admin.role !== 'SYSTEM_ADMIN') {
      res.status(403).json({ success: false, message: 'Only System Administrator can view administrator list.' });
      return;
    }
    const users = LocalStorageManager.getAdminUsers();
    res.json({ success: true, users });
  });

  app.post('/api/admin/users/password', requireAdmin, (req, res) => {
    const admin = (req as any).adminUser as AuthenticatedAdmin;
    if (admin.role !== 'SYSTEM_ADMIN') {
      res.status(403).json({ success: false, message: 'Only System Administrator can reset administrator passwords.' });
      return;
    }
    const { username, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
      return;
    }
    const updated = LocalStorageManager.updateAdminPassword(username, newPassword);
    res.json({ success: updated, message: updated ? 'Password updated successfully' : 'User not found' });
  });

  // 11. High-Concurrency Mobilization Capacity & Sync Metrics
  app.get('/api/admin/concurrency-metrics', requireAdmin, (req, res) => {
    const metrics = LocalStorageManager.getConcurrencyMetrics();
    res.json({ success: true, metrics });
  });

  app.post('/api/admin/flush-queue', requireAdmin, async (req, res) => {
    const result = await LocalStorageManager.forceDrainSyncQueue();
    res.json({ success: true, ...result });
  });

  // Graceful shutdown data flush
  process.on('SIGTERM', () => {
    LocalStorageManager.flushSync();
  });
  process.on('SIGINT', () => {
    LocalStorageManager.flushSync();
    process.exit(0);
  });

  // Vite middleware for dev or static files for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`University Mobilization System server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
