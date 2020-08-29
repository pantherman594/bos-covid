import { DocumentType } from 'typegoose';

import collections from './collections';
import DataModel, { Data } from '../models/Data';
import connectDB from '../lib/db';
import error from '../lib/error';

import {
  scrapeBabson,
  scrapeBc,
  scrapeBentley,
  scrapeBrandeis,
  scrapeBu,
  scrapeNu,
  scrapeTufts,
  scrapeMass,
} from './scrapers';

const IGNORE_KEYS = [
  '_id',
  '__v',
];

const process = async (scraper: () => (Promise<DocumentType<Data>> | DocumentType<Data>)) => {
  const testData = await scraper();

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
      console.log(`${testData.collectionId} data is the same.`);
      return;
    }

    if (lastEntry.date === testData.date) {
      // If they have the same date, delete the out of date one.
      console.log(`${testData.collectionId} data is different, replacing the old entry.`);

      await DataModel.deleteOne({ _id: lastEntry._id }).exec();
    }
  } else if (entries.length > 1) {
    throw new Error('Unexpected number of entries returned.');
  }

  // Save the new entry.
  await testData.save();
  console.log(`${testData.collectionId} data saved.`);
};

const processBc = async () => {
  const { undergrads, community } = await scrapeBc();

  await Promise.all([process(() => undergrads), process(() => community)]);
};

const scrape = async () => {
  await connectDB();

  console.log('Scraping data...');
  const start = new Date().getTime();

  // Run all the scrapes as well as connectDB asynchronously.
  try {
    await Promise.all([
      processBc(),
      process(scrapeBabson),
      process(scrapeBentley),
      process(scrapeBrandeis),
      process(scrapeBu),
      process(scrapeNu),
      process(scrapeTufts),
      process(scrapeMass),
    ]);
  } catch (err) {
    error(err);
    console.log('At least one of the scrapes failed, see above. Exiting.');
    return;
  }

  console.log(`Scraping completed in ${new Date().getTime() - start} ms.`);
};

export default scrape;
