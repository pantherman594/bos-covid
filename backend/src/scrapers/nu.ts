import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

// From https://news.northeastern.edu/coronavirus/reopening/testing-dashboard/.
const DATA_URL = 'https://spreadsheets.google.com/feeds/cells/1C8PDCqHB9DbUYbvrEMN2ZKyeDGAMAxdcNkmO2QSZJsE/1/public/full?alt=json';

const scrapeNu = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const data = res.body;

  const entries = data.feed.entry;
  const date = entries[entries.length - 17].content.$t.split('/');

  if (date.length !== 3) {
    throw new Error('Invalid date format.');
  }

  const [month, day, year] = date;
  const tested = tryParseInt(entries[entries.length - 6].content.$t);
  const positive = tryParseInt(entries[entries.length - 5].content.$t);

  return new DataModel({
    collectionId: CollectionId.NU,
    date: ymdToString(year + 2000, month, day),
    tested,
    positive,
  });
};

export default scrapeNu;
