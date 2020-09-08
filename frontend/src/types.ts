export interface KeyDate {
  date: string;
  comment: string;
}

export interface Collection {
  [key: string]: any;
  id: string;
  name: string;
  color: string;
  population: number;
  children: string[];
  keyDates: KeyDate[];
}

export interface CovidDataItem {
  [key: string]: any;
  id: string;
  collectionId: string;
  date: string;
  tested: number;
  positive: number;
}

export interface CollectedDataItem {
  [key: string]: string | number;
  date: string;
}

export const create = (collections: string[], date?: string): CollectedDataItem => {
  const entry: CollectedDataItem = {
    date: date || dateToString(new Date()),
  };

  collections.forEach((collectionId: string) => {
    entry[`${collectionId}_tested`] = 0;
    entry[`${collectionId}_positive`] = 0;
  });

  return entry;
};

const pad = (n: number) => {
  if (n < 10) {
    return `0${n}`;
  }
  return n;
};

const ymdToString = (year: number | null, month: number, day: number) => {
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

const dateToString = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return ymdToString(year, month, day);
};
