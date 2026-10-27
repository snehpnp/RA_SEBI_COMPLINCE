export const formatPan = (val) => {
  if (!val) return '';
  const raw = String(val).toUpperCase().replace(/[^A-Z0-9]/g, '');
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

export const isPanValid = (val) => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val);
};

export const formatAadhaar = (val) => {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(0, 12);
};
