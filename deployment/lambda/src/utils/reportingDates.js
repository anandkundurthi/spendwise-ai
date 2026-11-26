const REPORTING_TIME_ZONE = 'Asia/Kolkata';

function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORTING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
}

export function getIndiaDateKey(date = new Date()) {
  const { year, month, day } = getIndiaDateParts(date);
  return `${year}-${month}-${day}`;
}

export function getIndiaMonthKey(date = new Date()) {
  return getIndiaDateKey(date).slice(0, 7);
}

export function getPreviousMonthKey(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1));

  return previous.toISOString().slice(0, 7);
}

// Transaction dates are stored as UTC-midnight calendar dates.
// Do not shift these boundaries to India midnight.
export function getStoredDateMonthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1))
  };
}
