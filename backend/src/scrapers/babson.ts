import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { strToMonth, ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://www.babson.edu/emergency-preparedness/return-to-campus/covid-dashboard/';

const EXPECTED_ROWS = [
  'Students',
  'Employees',
  'Service Providers**',
];

const scrapeBabson = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const $ = cheerio.load(res.text);

  // Extract the grid of data items from the page.
  const testedBox = $('#id-1248929 > table:nth-child(2) > thead:nth-child(1) > tr:nth-child(2) > td:nth-child(1)');

  // Ensure that we found the grid.
  if (testedBox.length !== 1) {
    throw new Error('Did not find the tested box.');
  }

  const testedTitle = testedBox.find('p');
  const testedValue = testedBox.find('h2');

  // Ensure we have the expected labels and fields.
  if (testedTitle.length !== 1 || testedValue.length !== 1) {
    throw new Error('Did not find the correct tested box.');
  }

  if (testedTitle.text().trim() !== 'Tests Conducted') {
    throw new Error('Labels have changed, please fix scraper.');
  }

  const tested = tryParseInt(testedValue.text().trim());

  // Extract the grid of data items from the page.
  const positivesTable = $('#id-1248929 > table:nth-child(2) > thead:nth-child(1) > tr:nth-child(2) > td:nth-child(3) > table:nth-child(2)');

  // Ensure that we found the grid.
  if (positivesTable.length !== 1) {
    throw new Error('Did not find the positives table.');
  }

  const rows = positivesTable.find('tr');

  // Ensure we have the expected labels and fields.
  if (rows.length !== EXPECTED_ROWS.length) {
    throw new Error('Did not find the correct number of positive rows.');
  }

  const data: string[] = [];

  const failedLabels: string[] = [];
  rows.each(function f(this: Cheerio, i: number, _elem: any) {
    const cols = $(this).find('td');
    if (cols.length !== 2) {
      throw new Error('Invalid table structure found.');
    }

    if ($(cols[0]).text().trim() !== EXPECTED_ROWS[i]) {
      failedLabels.push(EXPECTED_ROWS[i]);
    }

    data.push($(cols[1]).text());
  });

  if (failedLabels.length > 0) {
    throw new Error(`Labels have changed, please fix scraper. Failed labels: ${failedLabels.join(', ')}.`);
  }

  const positive = data.reduce((total: number, value: string) => {
    return total + tryParseInt(value.replace(/[^0-9]/g, ''));
  }, 0);

  const updated = $('#id-1245136 > p:nth-child(3)');

  // Ensure that we found the date.
  if (updated.length !== 1) {
    throw new Error('Did not find the updated date.');
  }

  const updatedText = updated.text().trim();

  const match = updatedText.match(/^Data as of ([A-Z][a-z]+) ([0-9]{1,2}), ([0-9]{4})$/);
  if (!match) {
    throw new Error('Updated date format invalid.');
  }

  const month = strToMonth(match[1]);
  const day = tryParseInt(match[2]);
  const year = tryParseInt(match[3]);

  return new DataModel({
    collectionId: CollectionId.BABSON,
    date: ymdToString(year, month, day),
    tested,
    positive,
  });
};

export default scrapeBabson;
