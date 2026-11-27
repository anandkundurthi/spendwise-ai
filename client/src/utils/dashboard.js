export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0);

export const categories = [
  'Food', 'Groceries', 'Transport', 'Housing', 'Health',
  'Shopping', 'Bills', 'Education', 'Entertainment', 'Salary', 'Other'
];

export const REPORTING_TIME_ZONE = 'Asia/Kolkata';

export const getIndiaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORTING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

export const getIndiaMonthKey = (date = new Date()) =>
  getIndiaDateKey(date).slice(0, 7);

export const dateForInput = (value) => {
  if (!value) return getIndiaDateKey();

  const dateString = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    return dateString.slice(0, 10);
  }

  return getIndiaDateKey(new Date(value));
};
