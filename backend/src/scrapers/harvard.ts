import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://www.harvard.edu/coronavirus/harvard-university-wide-covid-19-testing-dashboard';

const EXPECTED_POSITIVE_LABELS = [
  'Total positive cases',
  'Total undergraduate student positive cases',
  'Total graduate student positive cases',
  'Total faculty, staff, or other affiliates positive cases',
];

const EXPECTED_TESTED_LABELS = [
  'Total tests conducted',
  'Total undergraduate student tests',
  'Total graduate student tests',
  'Total faculty, staff, or other affiliates tests',
];

const scrapeHarvard = async (): Promise<DocumentType<Data>[]> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);

  const $ = cheerio.load(res.text);

  // Remove all the superscripts.
  $('sup').remove();

  // Extract the grid of data items from the page.
  const positiveDataBoxes = $('.stitle-key-stats-1-cumulative > div:nth-child(2) > div:nth-child(1)');

  // Ensure that we found the grid.
  if (positiveDataBoxes.length !== 1) {
    throw new Error('Did not find the positive data boxes.');
  }

  const positiveLabels = positiveDataBoxes.find('.card__title');
  const positiveFields = positiveDataBoxes.find('.card__text');

  // Ensure we have the expected labels and fields.
  if (positiveFields.length !== EXPECTED_POSITIVE_LABELS.length
    || positiveLabels.length !== EXPECTED_POSITIVE_LABELS.length) {
    throw new Error('Did not find the correct number of positive data fields.');
  }

  const positiveFailedLabels: string[] = [];
  positiveLabels.each(function f(this: Cheerio, i: number, _elem: any) {
    if ($(this).text().trim() !== EXPECTED_POSITIVE_LABELS[i]) {
      positiveFailedLabels.push(EXPECTED_POSITIVE_LABELS[i]);
    }
  });

  if (positiveFailedLabels.length > 0) {
    throw new Error(`Labels have changed, please fix scraper. Failed labels: ${positiveFailedLabels.join(', ')}.`);
  }

  const positiveData: number[] = [];

  // Convert the fields into numbers, stripping commas, and add to the data array.
  positiveFields.each(function f(this: Cheerio, _i: number, _elem: any) {
    positiveData.push(tryParseInt($(this).text().replace(/,/g, '')));
  });

  if (positiveData.length !== EXPECTED_POSITIVE_LABELS.length) {
    throw new Error(`Did not store the correct number of data fields. Found: ${positiveData.length}, Expected: ${EXPECTED_POSITIVE_LABELS.length}.`);
  }

  // Extract the grid of data items from the page.
  const testedDataBoxes = $('.stitle-key-stats-2-cumulative > div:nth-child(1) > div:nth-child(1)');

  // Ensure that we found the grid.
  if (testedDataBoxes.length !== 1) {
    throw new Error('Did not find the tested data boxes.');
  }

  const testedLabels = testedDataBoxes.find('.card__title');
  const testedFields = testedDataBoxes.find('.card__text');

  // Ensure we have the expected labels and fields.
  if (testedFields.length !== EXPECTED_TESTED_LABELS.length
    || testedLabels.length !== EXPECTED_TESTED_LABELS.length) {
    throw new Error('Did not find the correct number of tested data fields.');
  }

  const testedFailedLabels: string[] = [];
  testedLabels.each(function f(this: Cheerio, i: number, _elem: any) {
    if ($(this).text().trim() !== EXPECTED_TESTED_LABELS[i]) {
      testedFailedLabels.push(EXPECTED_TESTED_LABELS[i]);
    }
  });

  if (testedFailedLabels.length > 0) {
    throw new Error(`Labels have changed, please fix scraper. Failed labels: ${testedFailedLabels.join(', ')}.`);
  }

  const testedData: number[] = [];

  // Convert the fields into numbers, stripping commas, and add to the data array.
  testedFields.each(function f(this: Cheerio, _i: number, _elem: any) {
    testedData.push(tryParseInt($(this).text().replace(/,/g, '')));
  });

  if (testedData.length !== EXPECTED_TESTED_LABELS.length) {
    throw new Error(`Did not store the correct number of data fields. Found: ${testedData.length}, Expected: ${EXPECTED_TESTED_LABELS.length}.`);
  }

  const cumulativeLabel = $('.stitle-key-stats-1-cumulative > header:nth-child(1) > h2:nth-child(1)');
  if (cumulativeLabel.length !== 1) {
    throw new Error('Did not find the cumulative label.');
  }
  if (cumulativeLabel.text().trim() !== 'Cases & Testing: Cumulative Since June 1, 2020') {
    throw new Error('Cumulative label changed, please check scraper.');
  }

  const updated = $('.field-item > p:last-child');

  // Ensure that we found the date.
  if (updated.length !== 1) {
    throw new Error('Did not find the updated date.');
  }

  const updatedText = updated.text().trim();
  const match = updatedText.match(/^All data is as of [^,]+, ([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);
  if (!match) {
    throw new Error('Updated date format invalid.');
  }

  const month = tryParseInt(match[1]);
  const day = tryParseInt(match[2]);
  const year = tryParseInt(match[3]);

  const date = ymdToString(year, month, day);

  const [totalPositive, undergradPositive, gradPositive, otherPositive] = positiveData;
  const [totalTested, undergradTested, gradTested, otherTested] = testedData;

  if (totalPositive !== undergradPositive + gradPositive + otherPositive) {
    throw new Error('Parsing failed, total positive does not equal the sum of others.');
  }

  if (totalTested !== undergradTested + gradTested + otherTested) {
    throw new Error('Parsing failed, total tested does not equal the sum of others.');
  }

  return [
    new DataModel({
      collectionId: CollectionId.HARVARD_UNDERGRAD,
      date,
      tested: undergradTested,
      positive: undergradPositive,
    }),
    new DataModel({
      collectionId: CollectionId.HARVARD_GRAD,
      date,
      tested: gradTested,
      positive: gradPositive,
    }),
    new DataModel({
      collectionId: CollectionId.HARVARD_OTHER,
      date,
      tested: otherTested,
      positive: otherPositive,
    }),
  ];
};

export default scrapeHarvard;
