export const formatPan = (val: string): string => {
  if (!val) return '';
  const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let result = '';
  for (let i = 0; i < raw.length && result.length < 10; i++) {
    const char = raw[i];
    const len = result.length;
    if (len < 5) {
      if (/[A-Z]/.test(char)) {
        result += char;
      }
    } else if (len < 9) {
      if (/[0-9]/.test(char)) {
        result += char;
      }
    } else if (len === 9) {
      if (/[A-Z]/.test(char)) {
        result += char;
      }
    }
  }
  return result;
};

export const isPanValid = (val: string): boolean => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val);
};

export const formatAadhaar = (val: string) => {
  return val.replace(/\D/g, '').slice(0, 12);
};
