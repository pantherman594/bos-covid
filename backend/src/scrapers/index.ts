import chalk from 'chalk';
import { DocumentType } from 'typegoose';

import collections from './collections';
import DataModel, { Data } from '../models/Data';
import connectDB from '../lib/db';
import error from '../lib/error';

import scrapers from './scrapers';

const IGNORE_KEYS = [
  '_id',
  '__v',
];

const COLORS = [
  'black.bgGray',
  'black.bgRed',
  'black.bgGreen',
  'black.bgYellow',
  'black.bgBlue',
  'black.bgMagenta',
  'black.bgCyan',
  'black.bgWhite',
];

const logColors = new Map<string, number>();

let lastColor = -1;

const log = (prefix: string, title: string, ...message: any[]) => {
  if (!logColors.has(title)) {
    lastColor = (lastColor + 1) % COLORS.length;
    logColors.set(title, lastColor);
  }

  const color = COLORS[logColors.get(title)!];

  console.log(`${chalk.bold(prefix)} ${chalk`{${color} ${title}}`} ${message.join(' ')}`);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const process = async (scraper: () => Promise<DocumentType<Data> | DocumentType<Data>[]>) => {
  log('>', scraper.name, 'starting.');
  let scrapeResult;

  // Try to scrape 3 times.
  let i = 0;
  while (true) {
    const start = new Date().getTime();
    try {
      scrapeResult = await scraper();
      log('=', scraper.name, 'finished in', new Date().getTime() - start, 'ms.');
      break;
    } catch (err) {
      i += 1;
      if (i >= 3) {
        log(
          '!', scraper.name,
          'errored on attempt', i,
          'after', new Date().getTime() - start, 'ms. Giving up.'
        );
        error(err);
        return;
      }

      log(
        '!', scraper.name,
        'errored on attempt', i,
        'after', new Date().getTime() - start, 'ms. Retrying in 10s...'
      );
      await sleep(10 * 1000);
    }
  }

  let datas: DocumentType<Data>[];

  if (Array.isArray(scrapeResult)) {
    datas = scrapeResult;
  } else {
    datas = [scrapeResult];
  }

  await Promise.all(datas.map(async (testData: DocumentType<Data>) => {
    if (!collections[testData.collectionId]) {
      throw new Error('Collection does not exist.');
    }

    // Find the entry in the collection with the same date.
    const lastEntry = await DataModel
      .findOne({ collectionId: testData.collectionId, date: testData.date })
      .exec() as any;

    if (lastEntry) {
      // Check that the new entry differs from the latest entry.

      const keys = Object.keys(testData.toObject()) as string[];

      const differs = keys.reduce((diff: boolean, key: string) => {
        if (diff) return diff;
        return !IGNORE_KEYS.includes(key) && lastEntry[key] !== (testData as any)[key];
      }, false);

      if (!differs) {
        // If they are exactly the same, don't create a new entry.
        log('<', scraper.name, `${testData.collectionId} data is the same.`);
        return;
      }

      log('<', scraper.name, `${testData.collectionId} data is different, replacing the old entry.`);
      await DataModel.deleteOne({ _id: lastEntry._id }).exec();
    }

    // Save the new entry.
    await testData.save();
    log('<', scraper.name, `${testData.collectionId} data saved.`);
  }));
};

const scrape = async () => {
  await connectDB();

  console.log('Scraping data...');
  const start = new Date().getTime();

  // Run all the scrapes.
  try {
    await Promise.all(scrapers.map(process));
  } catch (err) {
    error(err);
    console.log('At least one of the scrapes failed, see above. Exiting.');
    return;
  }

  console.log(`Scraping completed in ${new Date().getTime() - start} ms.`);
};

export default scrape;
