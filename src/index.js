import MetaTagsParser from './parsers/metatag-parser.js';
import MicroRdfaParser from './parsers/micro-rdfa-parser.js';
import JsonldParser from './parsers/jsonld-parser.js';

class WebAutoExtractor {
  constructor(options = {}) {
    this.options = {
      // Add location information to the parsed data in the @location property as comma separated start and end values
      addLocation: false,
      // Embed the source HTML in the parsed data in the @source property
      embedSource: false,
      ...options,
    };
  }

  parse(html) {
    return {
      metatags: MetaTagsParser(html),
      microdata: new MicroRdfaParser(html, 'micro', this.options).parse(),
      rdfa: new MicroRdfaParser(html, 'rdfa', this.options).parse(),
      jsonld: new JsonldParser(html, this.options).parse(),
    };
  }
}

export default WebAutoExtractor;
