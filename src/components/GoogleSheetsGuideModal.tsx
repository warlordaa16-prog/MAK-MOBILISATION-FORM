import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, HelpCircle, FileSpreadsheet, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';

interface GoogleSheetsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceAccountEmail?: string;
  spreadsheetId?: string;
}

export const GoogleSheetsGuideModal: React.FC<GoogleSheetsGuideModalProps> = ({
  isOpen,
  onClose,
  serviceAccountEmail,
  spreadsheetId,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sampleHeaders = 'ID, Full Name, Telephone Number, University, Date, Time, Timestamp';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Google Sheets Integration Guide</h3>
              <p className="text-xs text-slate-400">Step-by-step setup for central real-time synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-slate-700 text-sm">
          {/* Overview Callout */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs sm:text-sm text-blue-900 leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Secure Server-Side Architecture
            </p>
            The system connects to Google Sheets exclusively via a Google Cloud Service Account on the backend API. Mobilizers submit securely without needing individual Google accounts or exposing private credentials.
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
                <span>Create Google Cloud Project & Enable Sheets API</span>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>, create a new project (e.g., <em>"Univ-Mobilization-System"</em>), and enable the <strong>Google Sheets API</strong> in the API Library.
              </p>
            </div>

            {/* Step 2 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                <span>Create a Service Account & Download JSON Key</span>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                In <em>IAM & Admin &gt; Service Accounts</em>, click <strong>Create Service Account</strong> (e.g. <code className="bg-slate-200 px-1 rounded text-slate-800">sheets-mobilizer@...</code>). Once created, click on it, go to the <strong>Keys</strong> tab, click <strong>Add Key &gt; Create new key &gt; JSON</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
                <span>Create the Central Google Sheet & Share with Service Account</span>
              </div>
              <div className="text-xs text-slate-600 pl-8 space-y-2">
                <p>
                  Create a new blank Google Spreadsheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a>.
                </p>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900">
                  <strong>Crucial Step:</strong> Click the green <strong>Share</strong> button in your Google Sheet and invite your service account email as an <strong>Editor</strong>:
                  <div className="mt-1 flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-md border border-amber-300 font-mono text-[11px] text-slate-800">
                    <span className="truncate">{serviceAccountEmail || 'your-service-account@project.iam.gserviceaccount.com'}</span>
                    {serviceAccountEmail && (
                      <button
                        onClick={() => copyToClipboard(serviceAccountEmail, 'email')}
                        className="text-blue-600 hover:text-blue-800 font-sans font-semibold text-xs shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'email' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <p>
                  The system automatically creates row 1 headers if absent:
                </p>
                <div className="bg-slate-100 p-2 rounded-lg font-mono text-[11px] text-slate-700 flex items-center justify-between">
                  <span>{sampleHeaders}</span>
                  <button
                    onClick={() => copyToClipboard(sampleHeaders, 'headers')}
                    className="text-blue-600 text-xs font-sans font-semibold cursor-pointer"
                  >
                    {copiedKey === 'headers' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">4</span>
                <span>Configure Environment Variables</span>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed mb-2">
                Add the following 3 variables to your environment (in <code>.env</code> locally, in AI Studio Settings, or in Vercel project settings):
              </p>
              <div className="pl-8 space-y-2 font-mono text-[11px]">
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-x-auto space-y-1">
                  <div><span className="text-emerald-400">GOOGLE_SHEETS_SPREADSHEET_ID</span>=&quot;your_spreadsheet_id_here&quot;</div>
                  <div><span className="text-emerald-400">GOOGLE_SERVICE_ACCOUNT_EMAIL</span>=&quot;your-sa@project.iam.gserviceaccount.com&quot;</div>
                  <div><span className="text-emerald-400">GOOGLE_PRIVATE_KEY</span>=&quot;-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----&quot;</div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">5</span>
                <span>Test Live Connection & Sync</span>
              </div>
              <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                Click the <strong>Test Connection</strong> button in the Admin Dashboard to verify live read/write capability. Any records entered prior to connecting can be synced with one click using <strong>Sync All to Google Sheets</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
