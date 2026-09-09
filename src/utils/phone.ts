/**
 * Phone number validation and normalization for Uganda.
 * Validates formats such as:
 * - 0700123456
 * - 0750123456
 * - +256700123456
 * - 256750123456
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // Standard 10-digit format: 07XXXXXXXX
  international: string; // E.164-like: +2567XXXXXXXX
  display: string; // Formatted for reading: +256 700 123 456
  carrier?: string; // MTN, Airtel, UTL, Lyca, etc.
  error?: string;
}

export function cleanPhoneInput(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[\s\-\(\)\.]/g, '');
}

export function validateAndNormalizeUgandanPhone(input: string): PhoneValidationResult {
  const cleaned = cleanPhoneInput(input);

  if (!cleaned) {
    return {
      isValid: false,
      normalized: '',
      international: '',
      display: '',
      error: 'Telephone number is required',
    };
  }

  // Remove leading '+' if present
  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

  // If starts with Uganda country code 256
  if (digits.startsWith('256')) {
    digits = '0' + digits.slice(3);
  }

  // Check if it's purely numbers
  if (!/^\d+$/.test(digits)) {
    return {
      isValid: false,
      normalized: cleaned,
      international: '',
      display: cleaned,
      error: 'Telephone number must only contain digits',
    };
  }

  // Ugandan mobile numbers must be 10 digits starting with 07 or 03 (e.g. 070, 075, 077, 078, 039)
  if (digits.length !== 10) {
    return {
      isValid: false,
      normalized: digits,
      international: '',
      display: digits,
      error: `Invalid length (${digits.length} digits). Ugandan numbers require 10 digits (e.g., 0700123456)`,
    };
  }

  if (!digits.startsWith('07') && !digits.startsWith('03')) {
    return {
      isValid: false,
      normalized: digits,
      international: '',
      display: digits,
      error: 'Ugandan telephone numbers must begin with 07... or 03... (or +256...)',
    };
  }

  // Detect telecom network
  const prefix = digits.slice(0, 3);
  let carrier = 'Uganda Mobile';

  if (['070', '074', '075'].includes(prefix)) {
    carrier = 'Airtel Uganda';
  } else if (['076', '077', '078'].includes(prefix)) {
    carrier = 'MTN Uganda';
  } else if (['071'].includes(prefix)) {
    carrier = 'Uganda Telecom (UTL)';
  } else if (['072', '073'].includes(prefix)) {
    carrier = 'Lycamobile / Smile';
  } else if (prefix.startsWith('03')) {
    carrier = 'Fixed / Regional';
  }

  const international = `+256${digits.slice(1)}`;
  const display = `+256 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;

  return {
    isValid: true,
    normalized: digits,
    international,
    display,
    carrier,
  };
}
