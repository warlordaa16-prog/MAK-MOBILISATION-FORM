import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  Phone, 
  User, 
  Building2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX,
  Sparkles,
  CloudUpload,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { UniversityName, MobilizationEntry, MOBILIZATION_METHODS } from '../types';
import { validateAndNormalizeUgandanPhone } from '../utils/phone';
import { OfflineQueueService } from '../services/offlineQueue';
import { useFullConnectivity } from '../hooks/useOnlineStatus';

interface MobilizationFormProps {
  selectedUniversity: UniversityName;
  onSwitchUniversity: () => void;
  onEntrySaved: (entry: MobilizationEntry, isOffline: boolean) => void;
}

type ButtonState = 'idle' | 'saving' | 'saved' | 'error';

interface DuplicateWarningData {
  existingName?: string;
  existingUniversity?: string;
  existingDate?: string;
  telephone: string;
}

const COMMON_PREFIXES = [
  { prefix: '070', label: '070 (Airtel)', carrier: 'Airtel' },
  { prefix: '075', label: '075 (Airtel)', carrier: 'Airtel' },
  { prefix: '077', label: '077 (MTN)', carrier: 'MTN' },
  { prefix: '078', label: '078 (MTN)', carrier: 'MTN' },
  { prefix: '076', label: '076 (MTN)', carrier: 'MTN' },
  { prefix: '074', label: '074 (Airtel)', carrier: 'Airtel' },
];

export const MobilizationForm: React.FC<MobilizationFormProps> = ({
  selectedUniversity,
  onSwitchUniversity,
  onEntrySaved,
}) => {
  const { isOnline, isPhysicalOnline, isManualOffline, toggleManualOffline } = useFullConnectivity();
  const [fullName, setFullName] = useState('');
  const [telephone, setTelephone] = useState('');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningData | null>(null);
  const [carrierTag, setCarrierTag] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => OfflineQueueService.isSoundEnabled());
  const [mobilizationMethod, setMobilizationMethod] = useState<string>(() => {
    return localStorage.getItem('univmob_selected_method') || 'Campus Gate / Main Entrance';
  });
  const [mobilizerName, setMobilizerName] = useState<string>(() => {
    return localStorage.getItem('univmob_current_mobilizer') || 'Field Mobilizer 1';
  });
  const [showMobilizerEdit, setShowMobilizerEdit] = useState<boolean>(false);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const telephoneInputRef = useRef<HTMLInputElement>(null);

  // Autofocus Full Name on mount or university switch
  useEffect(() => {
    focusFullName();
  }, [selectedUniversity]);

  const focusFullName = () => {
    setTimeout(() => {
      fullNameInputRef.current?.focus();
    }, 50);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    OfflineQueueService.setSoundEnabled(next);
  };

  // Handle phone input change with live formatting preview and carrier detection
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTelephone(val);
    setValidationError(null);
    setServerError(null);

    const check = validateAndNormalizeUgandanPhone(val);
    if (check.isValid && check.carrier) {
      setCarrierTag(check.carrier);
    } else {
      setCarrierTag(null);
    }
  };

  // Quick carrier prefix chip click
  const handleApplyPrefix = (prefix: string) => {
    let newPhone = prefix;
    if (telephone) {
      const digitsOnly = telephone.replace(/\D/g, '');
      if (digitsOnly.length > 3) {
        newPhone = prefix + digitsOnly.slice(3);
      }
    }
    setTelephone(newPhone);
    setValidationError(null);
    setServerError(null);

    const check = validateAndNormalizeUgandanPhone(newPhone);
    if (check.carrier) {
      setCarrierTag(check.carrier);
    }

    // Retain focus in telephone input and move cursor to end
    setTimeout(() => {
      if (telephoneInputRef.current) {
        telephoneInputRef.current.focus();
        const len = telephoneInputRef.current.value.length;
        telephoneInputRef.current.setSelectionRange(len, len);
      }
    }, 20);
  };

  // Check duplicate on phone field blur if valid (online or offline check)
  const handlePhoneBlur = async () => {
    const check = validateAndNormalizeUgandanPhone(telephone);
    if (!check.isValid) return;

    // Check offline queues and recents first
    const offlineItems = OfflineQueueService.getQueue();
    const offlineMatch = offlineItems.find((i) => i.telephone === check.normalized);
    if (offlineMatch) {
      setDuplicateWarning({
        existingName: offlineMatch.fullName,
        existingUniversity: offlineMatch.university,
        existingDate: 'Queued locally today',
        telephone: check.normalized,
      });
      return;
    }

    const recentItems = OfflineQueueService.getRecentEntries();
    const recentMatch = recentItems.find((i) => i.telephone === check.normalized);
    if (recentMatch) {
      setDuplicateWarning({
        existingName: recentMatch.fullName,
        existingUniversity: recentMatch.university,
        existingDate: recentMatch.date || 'Recent session',
        telephone: check.normalized,
      });
      return;
    }

    // If online, check server
    if (isOnline) {
      try {
        const res = await fetch(`/api/entries/check-phone?phone=${encodeURIComponent(check.normalized)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isDuplicate && data.existingEntry) {
            setDuplicateWarning({
              existingName: data.existingEntry.fullName,
              existingUniversity: data.existingEntry.university,
              existingDate: data.existingEntry.date,
              telephone: check.normalized,
            });
          }
        }
      } catch {
        // Network silent fail
      }
    }
  };

  // Core submission workflow (resilient both on and off internet)
  const executeSubmission = async (allowDuplicate = false) => {
    setValidationError(null);
    setServerError(null);

    // 1. Validation
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setValidationError('Full Name is required (minimum 2 characters).');
      fullNameInputRef.current?.focus();
      return;
    }

    const phoneValidation = validateAndNormalizeUgandanPhone(telephone);
    if (!phoneValidation.isValid) {
      setValidationError(phoneValidation.error || 'Please enter a valid Ugandan telephone number.');
      telephoneInputRef.current?.focus();
      return;
    }

    const payload = {
      fullName: trimmedName,
      telephone: phoneValidation.normalized,
      university: selectedUniversity,
      allowDuplicate,
      mobilizerName: mobilizerName.trim() || 'Field Mobilizer 1',
      mobilizationMethod: mobilizationMethod,
      intakeMethod: 'rapid-single' as const,
    };

    // 2. OFFLINE PATH: If effectively offline (or in manual offline mode), save instantly to queue!
    const effectivelyOffline = OfflineQueueService.isEffectivelyOffline();
    if (effectivelyOffline) {
      // Local duplicate check if not confirmed
      if (!allowDuplicate) {
        const queued = OfflineQueueService.getQueue();
        const recents = OfflineQueueService.getRecentEntries();
        const localDup = [...queued.map((q) => q.temporaryEntry), ...recents].find(
          (e) => e.telephone === phoneValidation.normalized
        );

        if (localDup) {
          setDuplicateWarning({
            existingName: localDup.fullName,
            existingUniversity: localDup.university,
            existingDate: localDup.date || 'Today',
            telephone: phoneValidation.normalized,
          });
          return;
        }
      }

      setButtonState('saving');
      // Save locally in 50ms
      const queuedItem = OfflineQueueService.addToQueue(payload);
      handleSaveSuccess(queuedItem.temporaryEntry, true);
      return;
    }

    // 3. ONLINE PATH: Save via API directly to central store and Sheets queue
    setButtonState('saving');

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 200 && data.isDuplicate && !allowDuplicate) {
        // Backend detected duplicate in 'warn' mode
        setButtonState('idle');
        setDuplicateWarning({
          existingName: data.existingEntry?.fullName,
          existingUniversity: data.existingEntry?.university,
          existingDate: data.existingEntry?.date,
          telephone: phoneValidation.normalized,
        });
        return;
      }

      if (response.status === 400 && data.isDuplicate) {
        // Backend blocked duplicate
        setButtonState('idle');
        setValidationError(data.message || 'This telephone number is already registered.');
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Server returned an error');
      }

      // Successful online submission
      OfflineQueueService.playSuccessChime(false);
      handleSaveSuccess(data.entry, false);
    } catch (err: any) {
      // Fallback: If network drops mid-request or server is unreachable, save to offline queue safely!
      console.warn('Network request failed, falling back to local offline queue:', err);
      const queuedItem = OfflineQueueService.addToQueue(payload);
      handleSaveSuccess(queuedItem.temporaryEntry, true);
    }
  };

  const handleSaveSuccess = (entry: MobilizationEntry, isOffline: boolean) => {
    setButtonState('saved');
    setDuplicateWarning(null);
    setCarrierTag(null);

    if (isOffline) {
      setSuccessToast(`✓ Saved offline #${entry.id} (Queued for Google Sheets)`);
    } else {
      setSuccessToast(`✓ Entry #${entry.id} saved & synced.`);
    }

    // 1. Notify parent (increments session counter & adds to recent entries)
    onEntrySaved(entry, isOffline);

    // 2. Clear fields and autofocus Full Name immediately for rapid continuous entry
    setFullName('');
    setTelephone('');

    setTimeout(() => {
      setButtonState('idle');
      setSuccessToast(null);
      focusFullName();
    }, 700);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmission(false);
  };

  // Keyboard navigation: Enter on Name jumps straight into Phone
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      telephoneInputRef.current?.focus();
    }
  };

  // Keyboard navigation: Enter on Phone submits immediately
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSubmission(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 px-3 sm:px-0">
      {/* Active University & Mode Status Bar */}
      <div className="bg-slate-100 rounded-2xl p-3 mb-3 border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">
                Active Campus
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate block mt-0.5">
                {selectedUniversity}
              </span>
            </div>
          </div>
          <button
            id="change-univ-btn"
            onClick={onSwitchUniversity}
            className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 border border-blue-200/60 bg-white"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Switch</span>
          </button>
        </div>

        {/* Connectivity & Sound Controls Bar */}
        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Online (Direct Sync)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px]">
                <WifiOff className="w-3 h-3 text-amber-700" />
                <span>Offline Mode (Auto-Queue)</span>
              </div>
            )}

            <button
              onClick={toggleManualOffline}
              type="button"
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              title="Toggle between online sync and manual offline queueing"
            >
              {isManualOffline ? 'Use Online' : 'Work Offline'}
            </button>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* Main Fast Data Entry Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
              Record Mobilized Student
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Works both online and off internet. Auto-saves & resets for the next person.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            Rapid Flow
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Method Selector: "The summations should be done differently under those specific methods" */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Mobilization Outreach Method
              </label>
              <button
                type="button"
                onClick={() => setShowMobilizerEdit(!showMobilizerEdit)}
                className="text-[11px] text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                <span>Mobilizer: {mobilizerName}</span>
              </button>
            </div>

            {showMobilizerEdit && (
              <div className="p-2 bg-white border border-blue-200 rounded-lg flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">Mobilizer Name / ID:</span>
                <input
                  type="text"
                  value={mobilizerName}
                  onChange={(e) => {
                    setMobilizerName(e.target.value);
                    localStorage.setItem('univmob_current_mobilizer', e.target.value);
                  }}
                  placeholder="e.g. Arnold M. / Station 1"
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MOBILIZATION_METHODS.map((m) => {
                const isSelected = mobilizationMethod === m.name;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMobilizationMethod(m.name);
                      localStorage.setItem('univmob_selected_method', m.name);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-700 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span className="truncate">{m.short}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-500 font-medium">
              * Irrespective of who enters data, all records are safely kept and summed under {selectedUniversity}.
            </p>
          </div>

          {/* Field 1: Full Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="full-name-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                FULL NAME <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Press Enter for Phone</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                ref={fullNameInputRef}
                id="full-name-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setValidationError(null);
                  setServerError(null);
                }}
                onKeyDown={handleNameKeyDown}
                placeholder="e.g. Sarah Nalubega"
                required
                autoComplete="off"
                autoCapitalize="words"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Field 2: Telephone Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="telephone-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                TELEPHONE NUMBER <span className="text-rose-500">*</span>
              </label>
              {carrierTag && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-fade-in">
                  ✓ {carrierTag}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-5 h-5" />
              </div>
              <input
                ref={telephoneInputRef}
                id="telephone-input"
                type="tel"
                inputMode="tel"
                value={telephone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                onKeyDown={handlePhoneKeyDown}
                placeholder="0700123456"
                required
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-mono font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-2xs"
              />
            </div>

            {/* Ugandan Carrier Quick-Fill Chips */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">
                Quick Prefixes:
              </span>
              {COMMON_PREFIXES.map((p) => (
                <button
                  key={p.prefix}
                  type="button"
                  onClick={() => handleApplyPrefix(p.prefix)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md border border-slate-200 hover:border-blue-300 transition cursor-pointer font-mono"
                  title={`Insert ${p.carrier} ${p.prefix} prefix`}
                >
                  {p.prefix}
                </button>
              ))}
            </div>
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Server / Network Error Alert */}
          {serverError && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm font-medium space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{serverError}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => executeSubmission(false)}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Force queue locally
                    const queued = OfflineQueueService.addToQueue({
                      fullName: fullName.trim(),
                      telephone: telephone.trim(),
                      university: selectedUniversity,
                    });
                    handleSaveSuccess(queued.temporaryEntry, true);
                  }}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Save to Offline Outbox
                </button>
              </div>
            </div>
          )}

          {/* Duplicate Warning Dialog / Box */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Existing Record Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    This telephone number ({duplicateWarning.telephone}) has already been recorded:
                  </p>
                  <p className="text-xs font-semibold text-amber-950 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                    {duplicateWarning.existingName || 'Previously registered'} • {duplicateWarning.existingUniversity || 'Campus'} • {duplicateWarning.existingDate || 'Today'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id="duplicate-confirm-save-btn"
                  onClick={() => executeSubmission(true)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                >
                  Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateWarning(null);
                    telephoneInputRef.current?.focus();
                  }}
                  className="px-3 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel / Edit
                </button>
              </div>
            </div>
          )}

          {/* Large Fast SAVE ENTRY Button */}
          <button
            id="save-entry-btn"
            type="submit"
            disabled={buttonState === 'saving' || buttonState === 'saved'}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base sm:text-lg tracking-wide uppercase shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none active:scale-[0.99] ${
              buttonState === 'saving'
                ? 'bg-blue-500 text-white cursor-wait opacity-90'
                : buttonState === 'saved'
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : buttonState === 'error'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : !isOnline
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
            }`}
          >
            {buttonState === 'saving' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>SAVING...</span>
              </>
            )}

            {buttonState === 'saved' && (
              <>
                <CheckCircle className="w-5 h-5 animate-bounce" />
                <span>✓ SAVED INSTANTLY</span>
              </>
            )}

            {buttonState === 'error' && (
              <>
                <AlertTriangle className="w-5 h-5" />
                <span>RETRY SAVE</span>
              </>
            )}

            {buttonState === 'idle' && (
              <>
                {!isOnline ? (
                  <>
                    <CloudUpload className="w-5 h-5" />
                    <span>SAVE OFFLINE (PRESS ENTER)</span>
                  </>
                ) : (
                  <>
                    <span>SAVE ENTRY (PRESS ENTER)</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Small Success Notification */}
        {successToast && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};

