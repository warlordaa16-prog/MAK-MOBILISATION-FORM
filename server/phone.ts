export function cleanPhone(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[\s\-\(\)\.]/g, '');
}

export function normalizeUgandaPhone(input: string): {
  isValid: boolean;
  normalized: string;
  international: string;
  error?: string;
} {
  const cleaned = cleanPhone(input);
  if (!cleaned) {
    return { isValid: false, normalized: '', international: '', error: 'Telephone number is required' };
  }

  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (digits.startsWith('256')) {
    digits = '0' + digits.slice(3);
  }

  if (!/^\d+$/.test(digits)) {
    return { isValid: false, normalized: cleaned, international: '', error: 'Telephone must only contain numbers' };
  }

  if (digits.length !== 10) {
    return { isValid: false, normalized: digits, international: '', error: `Invalid telephone length (${digits.length} digits). Ugandan numbers must be 10 digits.` };
  }

  if (!digits.startsWith('07') && !digits.startsWith('03')) {
    return { isValid: false, normalized: digits, international: '', error: 'Ugandan telephone must start with 07... or 03...' };
  }

  const international = `+256${digits.slice(1)}`;
  return { isValid: true, normalized: digits, international };
}
