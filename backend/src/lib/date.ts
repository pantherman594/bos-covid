const pad = (n: number) => {
  if (n < 10) {
    return `0${n}`;
  }
  return n;
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
