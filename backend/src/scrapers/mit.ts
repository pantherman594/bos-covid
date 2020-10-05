import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import { tryParseInt, tryTraverse } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://tableau.mit.edu/t/COVID-19/views/COVIDTestResultsforMITMedicalWebpage-2/Dashboard1?:isGuestRedirectFromVizportal=y&:embed=y';

const dateMatch = new RegExp(/^[A-Z][a-z]+\n([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);

const parseDate = (str: string) => {
  const match = str.match(dateMatch);
  if (!match) {
    throw new Error('Invalid date format.');
  }

  const [, month, day, year] = match;

  return ymdToString(tryParseInt(year), tryParseInt(month), tryParseInt(day));
};

const scrapeMit = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL).set('User-Agent', '');

  const findConfig = res.text.match(/<textarea id="tsConfigContainer">(.+)<\/textarea>/);
  if (!findConfig || findConfig.length !== 2) {
    throw new Error('Could not find session config.');
  }

  const doc = cheerio.load(findConfig[1]);
  const config = JSON.parse(doc.root().text());
  const { sessionid, stickySessionKey } = config;

  const setup = await superagent
    .post(`https://tableau.mit.edu/vizql/t/COVID-19/w/COVIDTestResultsforMITMedicalWebpage-2/v/Dashboard1/bootstrapSession/sessions/${sessionid}`)
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
    .field('sheet_id', 'Dashboard%201')
    .field('showParams', '{"checkpoint":false,"refresh":false,"refreshUnmodified":false}')
    .field('stickySessionKey', JSON.stringify(stickySessionKey))
    .field('filterTileSize', 200)
    .field('locale', 'en_US')
    .field('language', 'en')
    .field('verboseMode', false)
    .field(':session_feature_flags', '{}')
    .field('keychain_version', 1)
    .buffer(true)
    .parse(superagent.parse.image);

  const data = setup.body.toString().match(/^[0-9]+;{.+}[0-9]+;(.+)$/);
  if (!data) {
    throw new Error('Invalid data returned.');
  }

  const secondaryData = JSON.parse(data[1]);

  let dataValues = tryTraverse(secondaryData, [
    'secondaryInfo',
    'presModelMap',
    'dataDictionary',
    'presModelHolder',
    'genDataDictionaryPresModel',
    'dataSegments',
    0,
    'dataColumns',
    2,
    'dataValues',
  ]);

  const monthlyRes = await superagent
    .post(`https://tableau.mit.edu/vizql/t/COVID-19/w/COVIDTestResultsforMITMedicalWebpage-2/v/Dashboard1/sessions/${sessionid}/commands/tabdoc/set-parameter-value`)
    .field('globalFieldName', '[Parameters].[Parameter 9]')
    .field('valueString', 'Monthly')
    .field('useUsLocale', 'false')
    .buffer(true)
    .parse(superagent.parse.image);

  const monthlyData = JSON.parse(monthlyRes.body.toString());

  const newDataValues = tryTraverse(monthlyData, [
    'vqlCmdResponse',
    'layoutStatus',
    'applicationPresModel',
    'dataDictionary',
    'dataSegments',
    1,
    'dataColumns',
    0,
    'dataValues',
  ]);

  const positive = tryParseInt(newDataValues[1]);
  const tested = tryParseInt(newDataValues[0]);

  if (positive >= tested) {
    throw new Error('Invalid data parsed.');
  }

  const date = parseDate(dataValues[1]);

  return new DataModel({
    collectionId: CollectionId.MIT,
    date,
    tested,
    positive,
  });
};

export default scrapeMit;
