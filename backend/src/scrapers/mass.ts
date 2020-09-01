import fs from 'fs';
import superagent from 'superagent';
import tmp from 'tmp';
import { DocumentType } from 'typegoose';
import unzipper from 'unzipper';
import xlsx from 'xlsx';

import DataModel, { Data } from '../models/Data';
import { dateToString } from '../lib/date';
import { CollectionId } from '../types';

const LINK_ROOT = 'https://www.mass.gov';
const DATA_URL = `${LINK_ROOT}/info-details/covid-19-response-reporting`;

const dlAndParse = (link: string) => new Promise<xlsx.WorkBook>((resolve, _reject) => {
  const tmpFile = tmp.tmpNameSync();

  superagent
    .get(LINK_ROOT + link)
    .pipe(unzipper.Parse())
    .on('entry', (entry) => {
      const fileName = entry.path;
      if (fileName === 'Key Metrics.xlsx') {
        const writeStream = fs.createWriteStream(tmpFile);
        entry.pipe(writeStream);
        writeStream.on('finish', () => {
          const workbook = xlsx.readFile(tmpFile);
          fs.unlinkSync(tmpFile);

          resolve(workbook);
        });
      } else {
        entry.autodrain();
      }
    });
});

const scrapeMass = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);

  const link = res.text.match(/\/doc\/covid-19-raw-data-[a-z]+-[0-9]{1,2}-20[0-9]{2}\/download/);
  if (!link || link.length !== 1) {
    throw new Error('Did not find the data link.');
  }

  const workbook = await dlAndParse(link[0]);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet) as any;

  if (data.length === 0) {
    throw new Error('Invalid data.');
  }

  if (data[0].Date === undefined || data[0]['Positive tests'] || data[0]['Total Tests'] === undefined) {
    throw new Error('Invalid data.');
  }

  const tested = data[data.length - 1]['Total Tests'];
  const positive = data.reduce((sum: number, row: any) => sum + row['Positive tests'], 0);

  const date = new Date(Date.UTC(0, 0, data[data.length - 1].Date));
  if (Number.isNaN(date.getTime())) {
    throw new Error('Unable to convert date.');
  }

  return new DataModel({
    collectionId: CollectionId.MASS,
    date: dateToString(date),
    tested,
    positive,
  });
};

export default scrapeMass;
