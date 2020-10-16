import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { dateToString, ymdToString } from '../lib/date';
import connectDB from '../lib/db';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

// Milliseconds per day.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// From https://www.wellesley.edu/coronavirus/dashboard
const DATA_URL = 'https://spreadsheets.google.com/feeds/cells/1g1O96eAOENy81mLBTll_7KoNq5fpaoNpofM47eKIITY/1/public/full?alt=json';

const scrapeWellesley = async (): Promise< DocumentType<Data>[]> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);

  const data = res.body;

  const entries = data.feed.entry;
  const dateParts = entries[1].content.$t.split('/');

  if (dateParts.length !== 3) {
    throw new Error('Invalid date format.');
  }

  const [month, day, year] = dateParts.map((s: string) => tryParseInt(s));
  const tested = tryParseInt(entries[3].content.$t);
  const positive = tryParseInt(entries[5].content.$t);

  const date = ymdToString(year, month, day);
  const dateObj = new Date(date);

  const lastDateObj = new Date(dateObj.getTime() - 7 * MS_PER_DAY);
  const lastDate = dateToString(lastDateObj);

  await connectDB();

  // Try to find data from at least 1 week ago.
  const last = await DataModel
    .findOne({ collectionId: CollectionId.WELLESLEY, date: lastDate })
    .exec();

  const dataModels: DocumentType<Data>[] = [];

  // If there is data from last week, today's total is today's numbers + 7 days ago's
  // numbers.
  if (last) {
    // Fetch the latest entry to compare, to make sure the values are in nondecreasing order.
    const latest = (await DataModel
      .find({ collectionId: CollectionId.WELLESLEY, date: { $lt: date } })
      .sort({ date: -1 })
      .limit(1)
      .exec())[0];

    dataModels.push(new DataModel({
      collectionId: CollectionId.WELLESLEY,
      date,
      tested: Math.max(latest ? latest.tested : 0, tested + last.tested),
      positive: Math.max(latest ? latest.positive : 0, positive + last.positive),
    }));
  } else {
    const searchNewestBefore = await DataModel
      .find({ collectionId: CollectionId.WELLESLEY, date: { $lt: lastDate } })
      .sort({ date: -1 })
      .limit(1)
      .exec();

    const searchOldestAfter = await DataModel
      .find({ collectionId: CollectionId.WELLESLEY, date: { $gt: lastDate } })
      .sort({ date: +1 })
      .limit(1)
      .exec();

    const newestBefore = searchNewestBefore[0] || new DataModel({
      collectionId: CollectionId.WELLESLEY,
      date: lastDate,
      tested: 0,
      positive: 0,
    });

    const includeNewestBefore = searchNewestBefore.length !== 1;

    const oldestAfter = searchOldestAfter[0] || new DataModel({
      collectionId: CollectionId.WELLESLEY,
      date,
      tested,
      positive,
    });

    const includeOldestAfter = searchOldestAfter.length !== 1;

    // startDays is the number of days between the new day and the oldest entry less than
    // 1 week ago. Defaults to 0.
    const startDays = (dateObj.getTime() - new Date(oldestAfter.date).getTime()) / MS_PER_DAY;

    // endDays is the number of days between the new day and the newest entry more than
    // 1 week ago. Defaults to 7
    const endDays = (dateObj.getTime() - new Date(newestBefore.date).getTime()) / MS_PER_DAY;

    const diffDays = endDays - startDays;
    const diffTested = Math.max(oldestAfter.tested - newestBefore.tested, 0);
    const diffPositive = Math.max(oldestAfter.positive - newestBefore.positive, 0);

    let oneWeekPrior: DocumentType<Data> | undefined;

    // Populate the totals prior, guessing that an equal number of tests/positives were
    // done each day. i is the number of days since 1 week ago.
    for (let i = 0; i <= diffDays; i += 1) {
      /* eslint-disable no-continue */
      if (!includeNewestBefore && i === 0) continue;
      if (!includeOldestAfter && i === diffDays) continue;

      const thisDate = dateToString(new Date(new Date(newestBefore.date).getTime() + i * MS_PER_DAY));

      const thisModel = new DataModel({
        collectionId: CollectionId.WELLESLEY,
        date: thisDate,
        tested: Math.floor(newestBefore.tested + (diffTested / diffDays) * i),
        positive: Math.floor(newestBefore.positive + (diffPositive / diffDays) * i),
      });

      if (thisDate === lastDate) {
        oneWeekPrior = thisModel;
      }

      dataModels.push(thisModel);
    }

    if (oneWeekPrior === undefined) {
      throw new Error('One week prior should not be undefined, why didn\'t we insert it?');
    }

    if (!includeOldestAfter) {
      dataModels.push(new DataModel({
        collectionId: CollectionId.WELLESLEY,
        date,
        tested: Math.max(tested + oneWeekPrior.tested, oldestAfter.tested),
        positive: Math.max(positive + oneWeekPrior.positive, oldestAfter.positive),
      }));
    }
  }

  return dataModels;
};

export default scrapeWellesley;
