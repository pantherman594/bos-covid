import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://coronavirus.tufts.edu/testing-metrics';

const scrapeTufts = async (): Promise<DocumentType<Data>> => {
  const res = await superagent.get(DATA_URL);

  const match = res.text.match(/<img alt="Tufts COVID-19 testing metrics displayed in tables and graphs. The information reflects test samples collected through ([0-9\/]{6,8}) and results that were received through ([0-9\/]{6,8})." longdesc="([^"]+)" src="/);
  if (!match) {
    throw new Error('Could not find data.');
  }

  const [month, day, year] = match[1].split('/').map((s: string) => tryParseInt(s));
  const txtUrl = cheerio(`<p id="link">${match[3]}</p>`).text().trim();

  const txtRes = await superagent.get(txtUrl);

  const splitLocation = txtRes.text.indexOf('Cumulative from August 3, 2020');

  if (splitLocation === -1) {
    throw new Error('Cumulative data label has changed, please check scraper.');
  }

  const data = txtRes.text.substring(splitLocation);

  const testedMatch = data.match(/Total Number of Tests with Results: ([0-9,]+)/);
  if (!testedMatch) {
    throw new Error('Could not find total tested data.');
  }

  const positivesMatch = data.match(/Positive Tests: ([0-9,]+)/);
  if (!positivesMatch) {
    throw new Error('Could not find positive tested data.');
  }

  return new DataModel({
    collectionId: CollectionId.TUFTS,
    date: ymdToString(year + 2000, month, day),
    tested: tryParseInt(testedMatch[1].replace(/[^0-9]/g, '')),
    positive: tryParseInt(positivesMatch[1].replace(/[^0-9]/g, '')),
  });
};

export default scrapeTufts;
