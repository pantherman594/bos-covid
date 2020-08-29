import cheerio from 'cheerio';
import PDFParser from 'pdf2json';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { tryParseInt, tryTraverse } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://public.tableau.com/views/BentleyUniversityCOVID-19Statusupdate/COVIDMetrics?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true&%3Alanguage=en&:embed=y&:showVizHome=n&:apiID=host0#navType=1&navSrc=Parse';

const parse = (buffer: Buffer) => new Promise<DocumentType<Data>>((resolve, reject) => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', (errData: any) => {
    reject(errData.parserError);
  });

  pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
    if (pdfData.formImage.Pages.length !== 5) {
      reject(new Error('Unexpected number of pages.'));
      return;
    }

    let tested: number | undefined;
    let positive: number | undefined;
    let date: string | undefined;

    let failed = false;
    pdfData.formImage.Pages.forEach((page: any, i: number) => {
      if (failed) return;

      if (i % 2 !== 0) return;

      const text = page.Texts.map((textEntry: any) => decodeURIComponent(textEntry.R[0].T).trim()).join('');

      if (i === 0) {
        const match = text.match(/^([0-9,]+)TotalPositiveTests$/);
        if (!match || match.length !== 2) {
          failed = true;
          reject(new Error('Failed to find positive tests.'));
          return;
        }

        positive = tryParseInt(match[1].replace(/,/g, ''));
      } else if (i === 2) {
        const match = text.match(/^([0-9,]+)TotalTestsAdministered$/);
        if (!match || match.length !== 2) {
          failed = true;
          reject(new Error('Failed to find total tests.'));
          return;
        }

        tested = tryParseInt(match[1].replace(/,/g, ''));
      } else if (i === 4) {
        const match = text.match(/^Dashboardupdated([0-9]{4}-[0-9]{2}-[0-9]{2})Dateupdated$/);
        if (!match || match.length !== 2) {
          failed = true;
          reject(new Error('Failed to find date.'));
          return;
        }

        date = match[1];
      }
    });

    if (date === undefined || tested === undefined || positive === undefined) {
      reject(new Error('Incomplete data.'));
      return;
    }

    resolve(new DataModel({
      collectionId: CollectionId.BENTLEY,
      date,
      tested,
      positive,
    }));
  });

  pdfParser.parseBuffer(buffer);
});

const scrapeBentley = async (): Promise<DocumentType<Data>> => {
  const res = await superagent.get(DATA_URL);
  if (res.status !== 200) {
    throw new Error(`Request failed with error code ${res.status}.`);
  }

  const findConfig = res.text.match(/<textarea id="tsConfigContainer">(.+)<\/textarea>/);
  if (!findConfig || findConfig.length !== 2) {
    throw new Error('Could not find session config.');
  }

  const doc = cheerio.load(findConfig[1]);
  const config = JSON.parse(doc.root().text());
  const { sessionid, stickySessionKey } = config;

  const setup = await superagent
    .post(`https://public.tableau.com/vizql/w/BentleyUniversityCOVID-19Statusupdate/v/COVIDMetrics/bootstrapSession/sessions/${sessionid}`)
    .field('worksheetPortSize', '{"w":800,"h":1200}')
    .field('dashboardPortSize', '{"w":800,"h":1200}')
    .field('clientDimension', '{"w":1232,"h":945}')
    .field('renderMapsClientSide', true)
    .field('isBrowserRendering', true)
    .field('browserRenderingThreshold', 100)
    .field('formatDataValueLocally', false)
    .field('clientNum', '')
    .field('navType', 'Reload')
    .field('navSrc', 'Top')
    .field('devicePixelRatio', 1)
    .field('clientRenderPixelLimit', 25000000)
    .field('allowAutogenWorksheetPhoneLayouts', true)
    .field('sheet_id', 'COVID%20Metrics')
    .field('showParams', '{"checkpoint":false,"refresh":false,"refreshUnmodified":false}')
    .field('stickySessionKey', JSON.stringify(stickySessionKey))
    .field('filterTileSize', 200)
    .field('locale', 'en_US')
    .field('language', 'en')
    .field('verboseMode', false)
    .field(':session_feature_flags', '{}')
    .field('keychain_version', 1);
  if (setup.status !== 200) {
    throw new Error(`Request failed with error code ${setup.status}.`);
  }

  const dataRes = await superagent
    .post(`https://public.tableau.com/vizql/w/BentleyUniversityCOVID-19Statusupdate/v/COVIDMetrics/sessions/${sessionid}/commands/tabsrv/export-pdf-server`)
    .accept('text/javascript')
    .type('form')
    .field('pdfOptions', `{"currentSheet":"COVID Metrics","exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":1200,"imageWidth":800},"sheetOptions":[{"sheet":"COVID Metrics","isDashboard":true,"isStory":false,"namesOfSubsheets":["Tests by Day","Today's Total","Cume Total","Today's Positive","Today's Positive %","Cume Positive","Cume Positive %","Today's Negative","Today's Negative %","Cume Negative","Cume Negative %","Today's Invalid","Cume Invalid","Detail + 7-Day Avg","Current & Cumulative Title","Bentley + Rate 7 Day","Waltham - Tests & Rate","MA - Tests & Rate","Date updated","Isolated Students","Quarantined Students","Isolation & Quarantine Header"],"isPublished":true,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":1200,"imageWidth":800}},{"sheet":"Bentley + Rate 7 Day","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Invalid","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Negative","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Negative %","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Positive","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":true,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Positive %","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Cume Total","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":true,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Current & Cumulative Title","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Date updated","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":true,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Detail + 7-Day Avg","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Isolated Students","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Isolation & Quarantine Header","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"MA - Tests & Rate","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Quarantined Students","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Tests by Day","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Invalid","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Negative","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Negative %","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Positive","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Positive %","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Today's Total","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}},{"sheet":"Waltham - Tests & Rate","isDashboard":false,"isStory":false,"namesOfSubsheets":[],"isPublished":false,"baseViewThumbLink":"","isSelected":false,"exportLayoutOptions":{"pageSizeOption":"letter","pageOrientationOption":"printer","pageScaleMode":"auto","pageScalePercent":100,"pageFitHorizontal":1,"pageFitVertical":1,"imageHeight":0,"imageWidth":0}}]}`)
    .buffer(true).parse(superagent.parse.image);
  if (dataRes.status !== 200) {
    throw new Error(`Request failed with error code ${dataRes.status}.`);
  }

  const pdfData = JSON.parse(dataRes.body.toString('utf8'));

  const key = tryTraverse(pdfData, ['vqlCmdResponse', 'cmdResultList', 0, 'commandReturn', 'exportResult', 'resultKey']);

  const pdfUrl = `https://public.tableau.com/vizql/w/BentleyUniversityCOVID-19Statusupdate/v/COVIDMetrics/tempfile/sessions/${sessionid}/?key=${key}&keepfile=yes&attachment=yes`;

  const pdfRes = await superagent.get(pdfUrl).buffer(true).parse(superagent.parse.image);
  if (pdfRes.status !== 200) {
    throw new Error(`Request failed with error code ${pdfRes.status}.`);
  }

  return parse(pdfRes.body);
};

export default scrapeBentley;
