export function calcAgeYears(dob) {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--;
  return y;
}

export function calcAgeDisplay(dob, fallback) {
  if (!dob) return fallback != null ? `Age ${fallback}` : 'Age ?';
  const b = new Date(dob), n = new Date();
  const months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (months < 24) return `${months} months`;
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--;
  return `Age ${y}`;
}

export function isBirthdayToday(dob) {
  if (!dob) return false;
  const b = new Date(dob), n = new Date();
  return b.getMonth() === n.getMonth() && b.getDate() === n.getDate();
}
