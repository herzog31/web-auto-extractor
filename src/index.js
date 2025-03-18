import * as cheerio from 'cheerio';

import MetaTagsParser from './parsers/metatag-parser.js';
import MicroRdfaParser from './parsers/micro-rdfa-parser.js';
import JsonldParser from './parsers/jsonld-parser.js';

export default () => {
  function parse(html, options) {
    const $ = cheerio.load(html, options);

    return {
      metatags: MetaTagsParser($),
      microdata: MicroRdfaParser(html, 'micro'),
      rdfa: MicroRdfaParser(html, 'rdfa'),
      jsonld: JsonldParser($),
    };
  }

  return {
    parse,
  };
};
