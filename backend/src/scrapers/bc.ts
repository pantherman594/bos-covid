import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://www.bc.edu/content/bc-web/sites/reopening-boston-college.html';

const EXPECTED_LABELS = [
  'BC Community tests performed',
  'Total Positives',
  'Undergrads Tested',
  'Undergrads Testing Positive',
];

interface IBCData {
  undergrads: DocumentType<Data>;
  community: DocumentType<Data>;
}

const scrapeBc = async (): Promise<IBCData> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const $ = cheerio.load(res.text);

  // Extract the grid of data items from the page.
  const dataBoxes = $('.fact-gray-new > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)');

  // Ensure that we found the grid.
  if (dataBoxes.length !== 1) {
    throw new Error('Did not find the data boxes.');
  }

  const fields = dataBoxes.find('.figure');
  const labels = dataBoxes.find('.fact');

  // Ensure we have the expected labels and fields.
  if (fields.length !== EXPECTED_LABELS.length || labels.length !== EXPECTED_LABELS.length) {
    throw new Error('Did not find the correct number of data fields.');
  }

  const failedLabels: string[] = [];
  labels.each(function f(this: Cheerio, i: number, _elem: any) {
    if ($(this).text().trim() !== EXPECTED_LABELS[i]) {
      failedLabels.push(EXPECTED_LABELS[i]);
    }
  });

  if (failedLabels.length > 0) {
    throw new Error(`Labels have changed, please fix scraper. Failed labels: ${failedLabels.join(', ')}.`);
  }

  const data: number[] = [];

  // Convert the fields into numbers, stripping commas, and add to the data array.
  fields.each(function f(this: Cheerio, _i: number, _elem: any) {
    data.push(tryParseInt($(this).text().replace(/,/g, '')));
  });

  if (data.length !== EXPECTED_LABELS.length) {
    throw new Error(`Did not store the correct number of data fields. Found: ${data.length}, Expected: ${EXPECTED_LABELS.length}.`);
  }

  const updated = $('div.bc-padded-section:nth-child(2) > section:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p:nth-child(2)');

  // Ensure that we found the date.
  if (updated.length !== 1) {
    throw new Error('Did not find the updated date.');
  }

  const updatedText = updated.text().trim();

  if (!updatedText.startsWith('Through: ')) {
    throw new Error('Updated date format invalid.');
  }

  const match = updatedText.match(/^Through: ([0-9]{1,2})\/([0-9]{1,2})$/);

  if (!match) {
    throw new Error('Updated date format invalid.');
  }

  const month = tryParseInt(match[1]);
  const day = tryParseInt(match[2]);
  let year = new Date().getUTCFullYear();

  // If it's already January and the most up to date data is from December, use the previous year.
  if (month > new Date().getUTCMonth() + 1) {
    year -= 1;
  }

  const date = ymdToString(year, month, day);

  const [totalTested, totalPositive, undergradTested, undergradPositive] = data;

  return {
    undergrads: new DataModel({
      collectionId: CollectionId.BC_UNDERGRAD,
      date,
      tested: undergradTested,
      positive: undergradPositive,
    }),
    community: new DataModel({
      collectionId: CollectionId.BC_COMMUNITY,
      date,
      tested: totalTested - undergradTested,
      positive: totalPositive - undergradPositive,
    }),
  };
};

export default scrapeBc;
