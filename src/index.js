import MetaTagsParser from './parsers/metatag-parser.js';
import MicroRdfaParser from './parsers/micro-rdfa-parser.js';
import JsonldParser from './parsers/jsonld-parser.js';

export default () => {
  function parse(html) {
    return {
      metatags: MetaTagsParser(html),
      microdata: MicroRdfaParser(html, 'micro'),
      rdfa: MicroRdfaParser(html, 'rdfa'),
      jsonld: JsonldParser(html),
    };
  }

  return {
    parse,
  };
};
