import fs from 'fs';
import superagent from 'superagent';
import tmp from 'tmp';
import { DocumentType } from 'typegoose';
import xlsx from 'xlsx';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const LINK_ROOT = 'https://medical.mit.edu';
const DATA_URL = `${LINK_ROOT}/CovidTestingResults`;

const dlAndParse = (link: string) => new Promise<xlsx.WorkBook>((resolve, _reject) => {
  const tmpFile = tmp.tmpNameSync();
  const writeStream = fs.createWriteStream(tmpFile);

  superagent.get(LINK_ROOT + link).pipe(writeStream);

  writeStream.on('finish', () => {
    const workbook = xlsx.readFile(tmpFile);
    fs.unlinkSync(tmpFile);

    resolve(workbook);
  });
});

const scrapeMit = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);

  const link = res.text.match(/<a href="(\/sites\/default\/files\/covid_testing_([0-9]{4})([0-9]{2})([0-9]{2}).xlsx)">Download table data<\/a>/);
  if (!link) {
    throw new Error('Did not find the data link.');
  }

  // Ignore the total match.
  link.shift();

  const [wbLink, year, month, day] = link;
  const workbook = await dlAndParse(wbLink);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet) as any;

  if (data.length === 0) {
    throw new Error('Invalid data.');
  }

  if (data[0].DATE === undefined || data[0]['Positive tests'] || data[0][' Tests '] === undefined) {
    throw new Error('Invalid data.');
  }

  const tested = data.reduce((sum: number, row: any) => sum + row[' Tests '], 0);
  const positive = data.reduce((sum: number, row: any) => sum + row['Positive tests'], 0);

  return new DataModel({
    collectionId: CollectionId.MIT,
    date: ymdToString(tryParseInt(year), tryParseInt(month), tryParseInt(day)),
    tested,
    positive,
  });
};

export default scrapeMit;
