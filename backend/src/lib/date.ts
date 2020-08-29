const pad = (n: number) => {
  if (n < 10) {
    return `0${n}`;
  }
  return n;
};

const MONTHS = {
  January: 1,
  Jan: 1,
  February: 2,
  Feb: 2,
  March: 3,
  Mar: 3,
  April: 4,
  Apr: 4,
  May: 5,
  June: 6,
  Jun: 6,
  July: 7,
  Jul: 7,
  August: 8,
  Aug: 8,
  September: 9,
  Sep: 9,
  Sept: 9,
  October: 10,
  Oct: 10,
  November: 11,
  Nov: 11,
  December: 12,
  Dec: 12,
} as any;

export const strToMonth = (month: string) => {
  const m = MONTHS[month];
  if (!m) {
    throw new Error('Month not found.');
  }

  return m;
};

export const ymdToString = (year: number | null, month: number, day: number) => {
  let newYear: number;
  if (year === null) {
    newYear = new Date().getUTCFullYear();

    // If it's already January and the most up to date data is from December, use the previous year.
    if (month > new Date().getUTCMonth() + 1) {
      newYear -= 1;
    }
  } else {
    newYear = year;
  }

  return [newYear, pad(month), pad(day)].join('-');
};

export const dateToString = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return ymdToString(year, month, day);
};

export default dateToString;
