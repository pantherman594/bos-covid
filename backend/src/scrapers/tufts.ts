import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://coronavirus.tufts.edu/testing-metrics';

const scrapeTufts = async (): Promise<DocumentType<Data>> => {
  const res = await superagent.get(DATA_URL);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const match = res.text.match(/<img alt="Tufts COVID-19 testing metrics displayed in tables and graphs. The information reflects test samples collected through ([0-9\/]{6,8}) and results that were received through ([0-9\/]{6,8})." longdesc="([^"]+)" src="/);
  if (!match) {
    throw new Error('Could not find data.');
  }

  const [month, day, year] = match[1].split('/').map((s: string) => tryParseInt(s));
  const txtUrl = match[3];

  const txtRes = await superagent.get(txtUrl);
  if (txtRes.status !== 200) {
    throw new Error(`Request failed with error code ${txtRes.status}.`);
  }

  const data = txtRes.text.split('\r\n');

  const testedMatch = data[2].match(/^Total Tests Performed: ([0-9]+)$/);
  if (!testedMatch) {
    throw new Error('Could not find total tested data.');
  }

  const positivesMatch = data[8].match(/^Unique Positive Individuals: ([0-9]+)$/);
  if (!positivesMatch) {
    throw new Error('Could not find total tested data.');
  }

  return new DataModel({
    collectionId: CollectionId.TUFTS,
    date: ymdToString(year + 2000, month, day),
    tested: testedMatch[1],
    positive: positivesMatch[1],
  });
};

export default scrapeTufts;
