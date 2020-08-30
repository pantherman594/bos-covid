const pad = (n: number) => {
  if (n < 10) {
    return `0${n}`;
  }
  return n;
};

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
} as any;

export const strToMonth = (month: string) => {
  const m = MONTHS[month.toLowerCase()];
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
