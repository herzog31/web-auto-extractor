import MetaTagsParser from './parsers/metatag-parser.js';
import MicroRdfaParser from './parsers/microdata-rdfa-parser.js';
import JsonldParser from './parsers/jsonld-parser.js';
import HeadingParser from './parsers/heading-parser.js';

class WebAutoExtractor {
  constructor(options = {}) {
    this.options = {
      // Add location information to the parsed data in the @location property as comma separated start and end values
      addLocation: false,
      // Embed the source HTML in the parsed data in the @source property. Either boolean or list of data types
      embedSource: false,
      ...options,
    };
  }

  parse(html) {
    const { metatags, errors: metatagErrors } = MetaTagsParser(html);
    const { data: microdata, errors: microdataErrors } = new MicroRdfaParser(
      html,
      'microdata',
      this.options,
    ).parse();
    const { data: rdfa, errors: rdfaErrors } = new MicroRdfaParser(
      html,
      'rdfa',
      this.options,
    ).parse();
    const { jsonld, errors: jsonldErrors } = new JsonldParser(
      html,
      this.options,
    ).parse();
    const { headings, errors: headingErrors } = new HeadingParser(
      html,
      this.options,
    ).parse();

    return {
      metatags,
      microdata,
      rdfa,
      jsonld,
      headings,
      errors: [
        ...metatagErrors,
        ...microdataErrors,
        ...rdfaErrors,
        ...jsonldErrors,
        ...headingErrors,
      ],
    };
  }
}

export default WebAutoExtractor;
