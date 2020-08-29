import PDFParser from 'pdf2json';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

// From https://www.brandeis.edu/fall-2020/dashboard.html.
const DATA_URL = 'https://www.brandeis.edu/fall-2020/brandeis-covid-dashboard.pdf';
const PDF_LINE_BUFFER = 0.5;

enum PdfParseState {
  FIND_TABLE = 0,
  GET_ROW,
  DONE,
}

interface IParsedData {
  date: string;
  tested: number;
  positive: number;
}

const parse = (buffer: Buffer) => new Promise<IParsedData>((resolve, reject) => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', (errData: any) => {
    reject(errData.parserError);
  });

  pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
    let y = -1;
    let text: string[] = [];
    let state: number = PdfParseState.FIND_TABLE;

    let lastDate: string = '';
    let totalTests: number = 0;
    let totalPositives: number = 0;

    let nextTests: number = 0;
    let nextPositives: number = 0;

    pdfData.formImage.Pages[0].Texts.forEach((textEntry: any) => {
      if (state === PdfParseState.DONE) return;

      if (y === -1) y = textEntry.y;

      if (textEntry.y > y + PDF_LINE_BUFFER) {
        // Find the data table.
        if (state === PdfParseState.FIND_TABLE && text.length === 1 && text[0] === 'Positive') {
          // If we've found it, change the state so we can start collecting data.
          state = PdfParseState.GET_ROW;
        } else if (state === PdfParseState.GET_ROW) {
          if (text.length === 4) {
            // If this is a data row, save the date and number of tests and positives. The
            // tests and positives will be a week behind what the Brandeis dashboard has,
            // because Brandeis's data is being updated inconsistently and I don't want
            // to store incorrect data relationships.

            lastDate = text[0];

            totalTests += nextTests;
            totalPositives += nextPositives;

            nextTests = tryParseInt(text[1]);
            nextPositives = tryParseInt(text[3]);
          } else {
            state = PdfParseState.DONE;
          }
        }

        y = textEntry.y;
        text = [];
      }

      text.push(decodeURIComponent(textEntry.R[0].T).trim());
    });

    if (state === PdfParseState.DONE) {
      resolve({ date: lastDate, tested: totalTests, positive: totalPositives });
    } else {
      reject(new Error('Could not find data.'));
    }
  });

  pdfParser.parseBuffer(buffer);
});

const scrapeBrandeis = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL).buffer(true).parse(superagent.parse.image);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const data = await parse(res.body);

  const date = data.date.split('/');
  if (date.length !== 3) {
    throw new Error('Invalid date format.');
  }

  const [month, day, year] = date.map((n: string) => tryParseInt(n));

  return new DataModel({
    collectionId: CollectionId.BRANDEIS,
    date: ymdToString(year, month, day),
    tested: data.tested,
    positive: data.positive,
  });
};

export default scrapeBrandeis;
