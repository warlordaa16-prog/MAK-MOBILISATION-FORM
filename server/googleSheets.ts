import { google, sheets_v4 } from 'googleapis';

export interface SheetEntryRow {
  id: string;
  fullName: string;
  telephone: string;
  university: string;
  date: string;
  time: string;
  timestamp: string;
}

export const UNIVERSITY_WORKSHEET_MAP: Record<string, string> = {
  'Kampala International University (KIU)': 'KIU',
  'Cavendish University Uganda': 'CAVENDISH',
  'International University of East Africa (IUEA)': 'IUEA',
  'Clarke International University (CIU)': 'CIU',
  'King Caesar University (KCU)': 'KCU',
  // Backward compatibility alias
  'Kumi University (KCU)': 'KCU',
};

export const REQUIRED_WORKSHEETS = ['KIU', 'CAVENDISH', 'IUEA', 'CIU', 'KCU'];
export const WORKSHEET_HEADERS = ['ID', 'FULL NAME', 'TELEPHONE NUMBER', 'UNIVERSITY', 'DATE', 'TIME', 'TIMESTAMP'];

export class GoogleSheetsService {
  private static sheetsClient: sheets_v4.Sheets | null = null;
  private static sheetsEnsured = false;

  static isConfigured(): boolean {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

    if (!spreadsheetId || !clientEmail || !privateKey) {
      return false;
    }

    // Validate that credentials have the expected structure
    const hasValidKeyFormat = privateKey.includes('BEGIN') && privateKey.includes('PRIVATE KEY');
    const hasValidEmail = clientEmail.includes('@');
    const hasValidSheetId = !spreadsheetId.includes('@') && spreadsheetId.length >= 10;

    return hasValidKeyFormat && hasValidEmail && hasValidSheetId;
  }

  static getClient(): sheets_v4.Sheets {
    if (this.sheetsClient) {
      return this.sheetsClient;
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    let privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

    if (!clientEmail || !privateKey) {
      throw new Error('Google Sheets service account credentials are not configured in environment variables');
    }

    // Fix escaped newlines in private key string
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      throw new Error('GOOGLE_PRIVATE_KEY is not a valid PEM private key. It must start with "-----BEGIN PRIVATE KEY-----" from your Google Cloud service account JSON key.');
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    return this.sheetsClient;
  }

  static resetClient() {
    this.sheetsClient = null;
    this.sheetsEnsured = false;
  }

  static getWorksheetForUniversity(universityName: string): string {
    const trimmed = (universityName || '').trim();
    const tab = UNIVERSITY_WORKSHEET_MAP[trimmed];
    if (tab) return tab;

    // Check partial matches or acronyms
    const upper = trimmed.toUpperCase();
    if (upper.includes('KIU') || upper.includes('KAMPALA INTERNATIONAL')) return 'KIU';
    if (upper.includes('CAVENDISH')) return 'CAVENDISH';
    if (upper.includes('IUEA') || upper.includes('EAST AFRICA')) return 'IUEA';
    if (upper.includes('CLARKE') || upper.includes('CIU')) return 'CIU';
    if (upper.includes('KING CAESAR') || upper.includes('KCU') || upper.includes('KUMI')) return 'KCU';

    return 'KIU'; // default fallback
  }

  /**
   * Ensures that all five required university worksheets exist with exact headers:
   * KIU, CAVENDISH, IUEA, CIU, KCU
   */
  static async ensureWorksheetsAndHeaders(): Promise<void> {
    if (this.sheetsEnsured || !this.isConfigured()) {
      return;
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()!;
    const sheets = this.getClient();

    try {
      // 1. Fetch metadata to inspect existing sheet tabs
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const existingSheets = (meta.data.sheets || []).map((s) => s.properties?.title || '');
      const missingSheets = REQUIRED_WORKSHEETS.filter((title) => !existingSheets.includes(title));

      // 2. Create missing tabs if any
      if (missingSheets.length > 0) {
        const requests = missingSheets.map((title) => ({
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount: 1000,
                columnCount: 10,
                frozenRowCount: 1,
              },
            },
          },
        }));

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests,
          },
        });
      }

      // 3. Ensure header row in each of the 5 university worksheets
      for (const tab of REQUIRED_WORKSHEETS) {
        try {
          const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${tab}'!A1:G1`,
          });

          const rows = headerCheck.data.values;
          if (!rows || rows.length === 0 || rows[0].length === 0) {
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `'${tab}'!A1:G1`,
              valueInputOption: 'RAW',
              requestBody: {
                values: [WORKSHEET_HEADERS],
              },
            });
          }
        } catch (tabErr) {
          console.warn(`Could not verify header for worksheet ${tab}:`, tabErr);
        }
      }

      this.sheetsEnsured = true;
    } catch (err: any) {
      console.error('Failed to ensure Google Sheets tabs and headers:', err?.message || err);
      throw err;
    }
  }

  /**
   * Appends an entry strictly to its designated university worksheet.
   * KIU -> KIU worksheet
   * Cavendish -> CAVENDISH worksheet
   * IUEA -> IUEA worksheet
   * CIU -> CIU worksheet
   * KCU -> KCU worksheet
   */
  static async appendEntry(entry: SheetEntryRow): Promise<{ success: boolean; targetTab: string; updatedRange?: string }> {
    if (!this.isConfigured()) {
      throw new Error('Google Sheets credentials are not configured.');
    }

    await this.ensureWorksheetsAndHeaders();

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()!;
    const sheets = this.getClient();

    const targetTab = this.getWorksheetForUniversity(entry.university);

    const values = [[
      entry.id,
      entry.fullName,
      entry.telephone,
      entry.university,
      entry.date,
      entry.time,
      entry.timestamp,
    ]];

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${targetTab}'!A:G`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });

    return {
      success: true,
      targetTab,
      updatedRange: res.data.updates?.updatedRange || undefined,
    };
  }

  static async testConnection(): Promise<{
    success: boolean;
    title?: string;
    rowCount?: number;
    tabCounts?: Record<string, number>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

      if (!spreadsheetId || !clientEmail || !privateKey) {
        return {
          success: false,
          error: 'Missing required environment variables: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and/or GOOGLE_PRIVATE_KEY',
        };
      }
      if (spreadsheetId.includes('@')) {
        return {
          success: false,
          error: 'GOOGLE_SHEETS_SPREADSHEET_ID must be the Google Sheets document ID from the URL (e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms), not an email address.',
        };
      }
      if (!clientEmail.includes('@')) {
        return {
          success: false,
          error: 'GOOGLE_SERVICE_ACCOUNT_EMAIL must be a valid Google service account email address (e.g. mobilizer@project.iam.gserviceaccount.com).',
        };
      }
      if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
        return {
          success: false,
          error: 'GOOGLE_PRIVATE_KEY must be a valid RSA PEM private key (beginning with "-----BEGIN PRIVATE KEY-----") from your Google Cloud service account JSON key.',
        };
      }
    }

    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()!;
      const sheets = this.getClient();

      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      // Try ensuring worksheets
      await this.ensureWorksheetsAndHeaders();

      const tabCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const tab of REQUIRED_WORKSHEETS) {
        try {
          const valRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${tab}'!A:A`,
          });
          const rows = (valRes.data.values?.length || 1) - 1; // subtract header
          tabCounts[tab] = Math.max(0, rows);
          totalRows += Math.max(0, rows);
        } catch {
          tabCounts[tab] = 0;
        }
      }

      return {
        success: true,
        title: meta.data.properties?.title || 'University Mobilization Database',
        rowCount: totalRows,
        tabCounts,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to connect to Google Sheets',
      };
    }
  }
}
