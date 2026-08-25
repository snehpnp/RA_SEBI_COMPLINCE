export const formatPan = (val: string) => {
  let v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  let formatted = '';
  for (let i = 0; i < v.length; i++) {
    if (i < 5) formatted += v[i].replace(/[^A-Z]/, '');
    else if (i < 9) formatted += v[i].replace(/[^0-9]/, '');
    else formatted += v[i].replace(/[^A-Z]/, '');
  }
  return formatted;
};

export const formatAadhaar = (val: string) => {
  return val.replace(/\D/g, '').slice(0, 12);
};
