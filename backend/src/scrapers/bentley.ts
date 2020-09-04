import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { tryTraverse } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

const DATA_URL = 'https://public.tableau.com/views/BentleyUniversityCOVID-19Statusupdate/COVIDMetrics?%3Aembed=y&%3AshowVizHome=no&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true&%3Alanguage=en&:embed=y&:showVizHome=n&:apiID=host0#navType=1&navSrc=Parse';

const scrapeBentley = async (): Promise<DocumentType<Data>> => {
  const res = await superagent.get(DATA_URL);

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
    .field('keychain_version', 1)
    .buffer(true)
    .parse(superagent.parse.image);

  const data = setup.body.toString().match(/^[0-9]+;{.+}[0-9]+;(.+)$/);
  if (!data) {
    throw new Error('Invalid data returned.');
  }

  const secondaryData = JSON.parse(data[1]);

  const dataColumns = tryTraverse(secondaryData, [
    'secondaryInfo',
    'presModelMap',
    'dataDictionary',
    'presModelHolder',
    'genDataDictionaryPresModel',
    'dataSegments',
    0,
    'dataColumns',
  ]);

  const dataValues = tryTraverse(dataColumns, [0, 'dataValues']);

  const modelMap = tryTraverse(secondaryData, [
    'secondaryInfo',
    'presModelMap',
    'vizData',
    'presModelHolder',
    'genPresModelMapPresModel',
    'presModelMap',
  ]);

  const getData = (label: string) => {
    const index = tryTraverse(modelMap, [
      label,
      'presModelHolder',
      'genVizDataPresModel',
      'paneColumnsData',
      'paneColumnsList',
      0,
      'vizPaneColumns',
      1,
      'aliasIndices',
      0,
    ]);

    const value = dataValues[index];
    if (label === undefined) {
      throw new Error('Invalid data.');
    }

    return value;
  };

  const tested = getData('Cume Total');
  const positive = getData('Cume Positive');

  const strings = tryTraverse(dataColumns, [2, 'dataValues']);
  const dateMatch = new RegExp(/^Dashboard updated ([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  let date = '';

  for (let i = strings.length - 1; i >= 0; i -= 1) {
    const updatedText = strings[strings.length - 2];

    const match = updatedText.match(dateMatch);
    if (match) {
      [, date] = match;
      break;
    }
  }

  if (!date) {
    throw new Error('Invalid date format.');
  }

  return new DataModel({
    collectionId: CollectionId.BENTLEY,
    date,
    tested,
    positive,
  });
};

export default scrapeBentley;
