const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ParsedActorDob {
  month: number | null;
  day: number | null;
  year: number | null;
}

function parseMonth(value: string): number {
  const normalized = value.replace(/\.$/, '').toLowerCase();
  return MONTHS.findIndex((month) => (
    month.toLowerCase() === normalized || month.slice(0, 3).toLowerCase() === normalized
  ));
}

function parseActorDob(value: string): ParsedActorDob | null {
  const dob = value.trim();
  if (!dob) return { month: null, day: null, year: null };

  if (/^\d{4}$/.test(dob)) {
    const year = Number(dob);
    return year > 0 ? { month: null, day: null, year } : null;
  }

  const monthOnly = dob.match(/^([A-Za-z]+\.?)$/);
  if (monthOnly) {
    const month = parseMonth(monthOnly[1]);
    return month >= 0 ? { month, day: null, year: null } : null;
  }

  const monthYear = dob.match(/^([A-Za-z]+\.?),?\s+(\d{4})$/);
  if (monthYear) {
    const month = parseMonth(monthYear[1]);
    const year = Number(monthYear[2]);
    return month >= 0 && year > 0 ? { month, day: null, year } : null;
  }

  const fullDate = dob.match(/^([A-Za-z]+\.?)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!fullDate) return null;
  const month = parseMonth(fullDate[1]);
  const day = Number(fullDate[2]);
  const year = Number(fullDate[3]);
  if (month < 0 || year < 1 || day < 1) return null;

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  return day <= daysInMonth ? { month, day, year } : null;
}

export function normalizeActorDob(value: string): string | null {
  const parsed = parseActorDob(value);
  if (!parsed) return null;
  if (parsed.month === null) return parsed.year === null ? '' : String(parsed.year);
  if (parsed.year === null) return MONTHS[parsed.month];
  if (parsed.day === null) return `${MONTHS[parsed.month]} ${parsed.year}`;
  return `${MONTHS[parsed.month]} ${parsed.day}, ${parsed.year}`;
}

export function formatActorDob(value: string): string {
  const normalized = normalizeActorDob(value);
  if (normalized === null) return value || '—';
  if (!normalized) return '—';

  const parsed = parseActorDob(normalized);
  if (!parsed || parsed.month === null) return normalized;
  if (parsed.day === null) {
    return parsed.year === null
      ? MONTHS[parsed.month].slice(0, 3)
      : `${MONTHS[parsed.month].slice(0, 3)} ${parsed.year}`;
  }
  return `${String(parsed.day).padStart(2, '0')} ${MONTHS[parsed.month].slice(0, 3)} ${parsed.year}`;
}

export function getActorAge(value: string): number | null {
  const parsed = parseActorDob(value);
  if (!parsed || parsed.year === null || parsed.month === null || parsed.day === null) return null;

  const birthDate = new Date(0);
  birthDate.setFullYear(parsed.year, parsed.month, parsed.day);
  birthDate.setHours(0, 0, 0, 0);
  const today = new Date();
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPending = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (birthdayPending) age -= 1;
  return age;
}

export function getActorDobSortValue(value: string): number | null {
  const parsed = parseActorDob(value);
  if (!parsed || parsed.year === null) return null;
  const date = new Date(0);
  date.setFullYear(parsed.year, parsed.month ?? 0, parsed.day ?? 1);
  return date.getTime();
}
