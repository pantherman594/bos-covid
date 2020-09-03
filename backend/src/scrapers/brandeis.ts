import cheerio from 'cheerio';
import superagent from 'superagent';
import { DocumentType } from 'typegoose';

import { ymdToString } from '../lib/date';
import connectDB from '../lib/db';
import { tryParseInt, tryTraverse } from '../lib/try';
import DataModel, { Data } from '../models/Data';
import { CollectionId } from '../types';

// From https://www.brandeis.edu/fall-2020/dashboard.html.
const DATA_URL = 'https://public.tableau.com/views/BrandeisUniversityCOVID-19PublicDashboard/BrandeisCOVIDDashboard?%3Aembed=y&%3AshowVizHome=no&%3AshowVizHome=n&%3Adisplay_count=y&%3Adisplay_static_image=y&%3AbootstrapWhenNotified=true&%3Alanguage=en&%3AapiID=host0&:embed=y&:showVizHome=n&:apiID=host1#navType=1&navSrc=Parse';

const scrapeBrandeis = async (): Promise<DocumentType<Data>> => {
  // Attempt to load the webpage.
  const res = await superagent.get(DATA_URL);

  const findConfig = res.text.match(/<textarea id="tsConfigContainer">(.+)<\/textarea>/);
  if (!findConfig || findConfig.length !== 2) {
    throw new Error('Could not find session config.');
  }

  const doc = cheerio.load(findConfig[1]);
  const config = JSON.parse(doc.root().text());
  const { sessionid, stickySessionKey } = config;

  const setup = await superagent
    .post(`https://public.tableau.com/vizql/w/BrandeisUniversityCOVID-19PublicDashboard/v/BrandeisCOVIDDashboard/bootstrapSession/sessions/${sessionid}`)
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
    .field('sheet_id', 'Brandeis%20COVID%20Dashboard')
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

  const dataValues = tryTraverse(secondaryData, [
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

  const columns = tryTraverse(secondaryData, [
    'secondaryInfo',
    'presModelMap',
    'vizData',
    'presModelHolder',
    'genPresModelMapPresModel',
    'presModelMap',
    'Brandeis Test Results Statistics',
    'presModelHolder',
    'genVizDataPresModel',
    'paneColumnsData',
    'paneColumnsList',
    0,
    'vizPaneColumns',
  ]);

  const thisWeekIndex = -1 - tryTraverse(columns, [1, 'aliasIndices', 0]);
  if (thisWeekIndex === undefined) {
    throw new Error('Invalid data returned.');
  }

  const thisWeek = dataValues[thisWeekIndex];
  if (thisWeek === undefined) {
    throw new Error('Invalid data returned.');
  }

  const weekMatch = thisWeek.match(/^Week of ([0-9]+)\/([0-9]+)$/);
  if (!weekMatch) {
    throw new Error('Invalid week label format.');
  }

  const week = ymdToString(null, tryParseInt(weekMatch[1]), tryParseInt(weekMatch[2]));

  await connectDB();

  // Try to find data from at least 1 week ago.
  const prevSearch = await DataModel
    .find({ collectionId: CollectionId.BRANDEIS, date: { $lte: week } })
    .sort({ date: -1 })
    .limit(1)
    .exec();

  const prev = prevSearch[0] || {
    collectionId: CollectionId.BRANDEIS,
    date: week,
    tested: 0,
    positive: 0,
  };

  const testedIndex = -1 - tryTraverse(columns, [3, 'aliasIndices', 8]);
  const positiveIndex = -1 - tryTraverse(columns, [3, 'aliasIndices', 0]);

  const tested = tryParseInt(dataValues[testedIndex]) + prev.tested;
  const positive = tryParseInt(dataValues[positiveIndex]) + prev.positive;

  const dateMatch = new RegExp(/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}.+$/);

  let date = [];

  // Start with the last value in dataValues, then loop from the first until a valid date
  // is found. We start with the last because it is likely that correct one is either the
  // first or the last, so we can break out early if that is the case.
  for (let i = -1; i < dataValues.length - 2; i += 1) {
    const updated = dataValues[i < 0 ? dataValues.length - 1 : i];
    if (updated.match(dateMatch)) {
      date = updated.split(' ')[0].split('/');
      break;
    }
  }

  if (date.length !== 3) {
    throw new Error('Invalid date format.');
  }

  const [month, day, year] = date.map((n: string) => tryParseInt(n));

  return new DataModel({
    collectionId: CollectionId.BRANDEIS,
    date: ymdToString(year, month, day),
    tested,
    positive,
  });
};

export default scrapeBrandeis;
