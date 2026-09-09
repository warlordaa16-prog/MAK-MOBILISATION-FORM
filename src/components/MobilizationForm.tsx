import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Loader2, ArrowRight, Phone, User, Building2, RefreshCw } from 'lucide-react';
import { UniversityName, MobilizationEntry } from '../types';
import { validateAndNormalizeUgandanPhone } from '../utils/phone';
import { OfflineQueueService } from '../services/offlineQueue';

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

export const MobilizationForm: React.FC<MobilizationFormProps> = ({
  selectedUniversity,
  onSwitchUniversity,
  onEntrySaved,
}) => {
  const [fullName, setFullName] = useState('');
  const [telephone, setTelephone] = useState('');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningData | null>(null);
  const [carrierTag, setCarrierTag] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const telephoneInputRef = useRef<HTMLInputElement>(null);

  // Autofocus Full Name on mount
  useEffect(() => {
    focusFullName();
  }, [selectedUniversity]);

  const focusFullName = () => {
    setTimeout(() => {
      fullNameInputRef.current?.focus();
    }, 50);
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

  // Check duplicate on phone field blur if valid
  const handlePhoneBlur = async () => {
    const check = validateAndNormalizeUgandanPhone(telephone);
    if (!check.isValid) return;

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
      // Offline or network silent fail for background blur check
    }
  };

  // Core submission workflow
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

    setButtonState('saving');

    const payload = {
      fullName: trimmedName,
      telephone: phoneValidation.normalized,
      university: selectedUniversity,
      allowDuplicate,
    };

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

      // Successful submission
      handleSaveSuccess(data.entry, false);
    } catch (err: any) {
      // Offline / Network Failure handling
      if (!navigator.onLine || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        // Queue locally
        const queued = OfflineQueueService.addToQueue(payload);
        handleSaveSuccess(queued.temporaryEntry, true);
      } else {
        setButtonState('error');
        setServerError('Unable to save this entry. Please check your internet connection and try again.');
      }
    }
  };

  const handleSaveSuccess = (entry: MobilizationEntry, isOffline: boolean) => {
    setButtonState('saved');
    setDuplicateWarning(null);
    setCarrierTag(null);

    if (isOffline) {
      setSuccessToast(`✓ Saved to offline queue (#${entry.id}). Will sync to Google Sheets when online.`);
    } else {
      setSuccessToast(`✓ Entry #${entry.id} saved successfully.`);
    }

    // 1. Notify parent (increments session counter & adds to recent entries)
    onEntrySaved(entry, isOffline);

    // 2. Automatically clear fields and refocus Full Name immediately
    setFullName('');
    setTelephone('');

    setTimeout(() => {
      setButtonState('idle');
      setSuccessToast(null);
      focusFullName();
    }, 900);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmission(false);
  };

  // Keyboard navigation: Enter on Name focuses Phone
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      telephoneInputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-2 px-3 sm:px-0">
      {/* Active University Banner */}
      <div className="bg-slate-100 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between border border-slate-200">
        <div className="flex items-center gap-2 overflow-hidden">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active University
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
              {selectedUniversity}
            </span>
          </div>
        </div>
        <button
          id="change-univ-btn"
          onClick={onSwitchUniversity}
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Change</span>
        </button>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="mb-5 pb-3 border-b border-slate-100">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
            ENTER MOBILIZED PERSON
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rapid single-entry flow. Fields automatically reset after save.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Full Name */}
          <div>
            <label
              htmlFor="full-name-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              FULL NAME <span className="text-rose-500">*</span>
            </label>
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
                placeholder="e.g. John Baptist Mukasa"
                required
                autoComplete="off"
                autoCapitalize="words"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
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
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {carrierTag}
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
                placeholder="0700123456 or +256700123456"
                required
                autoComplete="off"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-base font-medium placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ugandan formats accepted: 0700123456, 0750123456, +256700123456
            </p>
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
                  RETRY
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
                  Save to Offline Queue
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
                    Possible Duplicate Telephone
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    This telephone number ({duplicateWarning.telephone}) may already exist in the database:
                  </p>
                  <p className="text-xs font-semibold text-amber-950 mt-1 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                    {duplicateWarning.existingName || 'Previously registered contact'} • {duplicateWarning.existingUniversity || 'University'} • {duplicateWarning.existingDate || 'Recent'}
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

          {/* Large SAVE ENTRY Button */}
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
                <span>✓ SAVED</span>
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
                <span>SAVE ENTRY</span>
                <ArrowRight className="w-5 h-5" />
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
