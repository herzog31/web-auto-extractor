import { HTMLSAXParser } from './html-sax-parser.js';

export default class JsonldParser {
  constructor(html, options = {}) {
    this.html = html;
    this.options = options;
    this.jsonldData = [];
    this.scriptScope = false;
    this.parser = new HTMLSAXParser();
    this.errors = [];

    this.parser.on('startTag', this.#onOpenTag.bind(this));
    this.parser.on('text', this.#onText.bind(this));
    this.parser.on('endTag', this.#onCloseTag.bind(this));
  }

  #onOpenTag({ tagName, attrs }) {
    if (
      tagName === 'script' &&
      attrs.find(
        (attr) => attr.name === 'type' && attr.value === 'application/ld+json',
      )
    ) {
      this.scriptScope = true;
    }
  }

  #onText({ text, sourceCodeLocation }) {
    if (!this.scriptScope) {
      return;
    }

    try {
      const parsed = JSON.parse(text);

      // Adjust offsets by removing leading and trailing whitespace
      let startOffset = sourceCodeLocation.startOffset;
      let endOffset = sourceCodeLocation.endOffset;
      const leadingWhitespace = text.match(/^\s*/)[0].length;
      startOffset += leadingWhitespace;
      const trailingWhitespace = text.match(/\s*$/)[0].length;
      endOffset -= trailingWhitespace;

      // Add script tag location to root items
      if (!Array.isArray(parsed)) {
        if (this.options.addLocation) {
          parsed['@location'] = `${startOffset},${endOffset}`;
        }
        if (this.options.embedSource) {
          parsed['@source'] = this.html.slice(startOffset, endOffset);
        }
      } else {
        parsed.forEach((item) => {
          if (this.options.addLocation) {
            item['@location'] = `${startOffset},${endOffset}`;
          }
          if (this.options.embedSource) {
            item['@source'] = this.html.slice(startOffset, endOffset);
          }
        });
      }

      this.jsonldData.push(parsed);
    } catch (e) {
      this.errors.push({
        message: 'Could not parse JSON-LD',
        sourceCodeLocation,
      });
    }
  }

  #onCloseTag({ tagName }) {
    if (tagName === 'script' && this.scriptScope) {
      this.scriptScope = false;
    }
  }

  #errorMissingType(item) {
    const sourceCodeLocation = {};
    if (item['@location']) {
      sourceCodeLocation.startOffset = parseInt(
        item['@location'].split(',')[0],
      );
      sourceCodeLocation.endOffset = parseInt(item['@location'].split(',')[1]);
    }
    this.errors.push({
      message: 'JSON-LD object missing @type attribute',
      sourceCodeLocation,
    });
  }

  #normalizeJsonldData() {
    const normalizedData = {};

    this.jsonldData.forEach((item) => {
      if (!Array.isArray(item)) {
        item = [item];
      }

      item.forEach((item) => {
        if (item['@graph']) {
          item['@graph'].forEach((graphItem) => {
            // Move location and scope down to new root items
            if (item['@location']) {
              graphItem['@location'] = item['@location'];
            }
            if (item['@source']) {
              graphItem['@source'] = item['@source'];
            }

            if (!graphItem['@type']) {
              this.#errorMissingType(graphItem);
              return;
            }

            normalizedData[graphItem['@type']] =
              normalizedData[graphItem['@type']] || [];
            normalizedData[graphItem['@type']].push(graphItem);
          });
        } else {
          if (!item['@type']) {
            this.#errorMissingType(item);
            return;
          }

          normalizedData[item['@type']] = normalizedData[item['@type']] || [];
          normalizedData[item['@type']].push(item);
        }
      });
    });

    return normalizedData;
  }

  parse() {
    this.parser.end(this.html);
    return { jsonld: this.#normalizeJsonldData(), errors: this.errors };
  }
}
