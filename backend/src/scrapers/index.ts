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

const process = async (scraper: () => Promise<DocumentType<Data> | DocumentType<Data>[]>) => {
  log('>', scraper.name, 'starting.');
  const start = new Date().getTime();
  let scrapeResult;
  try {
    scrapeResult = await scraper();
    log('=', scraper.name, 'finished in', new Date().getTime() - start, 'ms.');
  } catch (err) {
    log('!', scraper.name, 'errored after', new Date().getTime() - start, 'ms.');
    error(err);
    return;
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

    // Find the newest entry with the same collection.
    const entries = await DataModel
      .find({ collectionId: testData.collectionId })
      .sort({ date: -1 })
      .limit(1)
      .exec();

    if (entries.length === 1) {
      // Check that the new entry differs from the latest entry.
      const lastEntry = entries[0].toObject();

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

      if (lastEntry.date === testData.date) {
        // If they have the same date, delete the out of date one.
        log('<', scraper.name, `${testData.collectionId} data is different, replacing the old entry.`);

        await DataModel.deleteOne({ _id: lastEntry._id }).exec();
      }
    } else if (entries.length > 1) {
      throw new Error('Unexpected number of entries returned.');
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
