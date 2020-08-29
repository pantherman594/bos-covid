import puppeteer, { Page } from 'puppeteer';
import { DocumentType } from 'typegoose';

import { strToMonth, ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://umasscovid19dashboard.shinyapps.io/tracker/';

const TESTED_TITLE_SELECTOR = 'div.m4:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1) > span:nth-child(1) > center:nth-child(1)';
const TESTED_SELECTOR = 'div.m4:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(3) > center:nth-child(1)';

const POSITIVE_TITLE_SELECTOR = 'div.col:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(1) > span:nth-child(1) > center:nth-child(1)';
const POSITIVE_SELECTOR = 'div.col:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(3) > center:nth-child(1)';

const UPDATED_SELECTOR = 'div.card:nth-child(5) > div:nth-child(1) > span:nth-child(1) > div:nth-child(1) > div:nth-child(1)';

const getText = async (page: Page, selector: string): Promise<string> => {
  const elem = await page.$(selector);

  if (!elem) {
    throw new Error('Element not found.');
  }

  return (await (await elem.getProperty('textContent')).jsonValue() as string).trim();
};

const scrapeUmassAmherst = async (): Promise<DocumentType<Data>> => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(DATA_URL);

  await page.waitForSelector(TESTED_SELECTOR);

  if (await getText(page, TESTED_TITLE_SELECTOR) !== 'Cumulative tests') {
    throw new Error('Page has changed, please fix scraper.');
  }

  if (await getText(page, POSITIVE_TITLE_SELECTOR) !== 'Cumulative positive cases') {
    throw new Error('Page has changed, please fix scraper.');
  }

  const tested = tryParseInt(await getText(page, TESTED_SELECTOR));
  const positive = tryParseInt(await getText(page, POSITIVE_SELECTOR));

  const updatedText = await getText(page, UPDATED_SELECTOR);
  browser.close();

  const match = updatedText.match(/^Last Updated: ([A-Z][a-z]+) ([0-9]{1,2})/);
  if (!match) {
    throw new Error('Updated date format invalid.');
  }

  const month = strToMonth(match[1]);
  const day = tryParseInt(match[2]);

  return new DataModel({
    collectionId: CollectionId.UMASS_AMHERST,
    date: ymdToString(null, month, day),
    tested,
    positive,
  });
};

export default scrapeUmassAmherst;
