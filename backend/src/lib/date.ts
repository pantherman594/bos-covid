const pad = (n: number) => {
  if (n < 10) {
    return `0${n}`;
  }
  return n;
};

const MONTHS = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
} as any;

export const strToMonth = (month: string) => {
  const m = MONTHS[month];
  if (!m) {
    throw new Error('Month not found.');
  }

  return m;
};

export const ymdToString = (year: number, month: number, day: number) => {
  return [year, pad(month), pad(day)].join('-');
};

export const dateToString = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return ymdToString(year, month, day);
};

export default dateToString;
