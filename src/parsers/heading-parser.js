import { HTMLSAXParser } from './html-sax-parser.js';

export default class HeadingParser {
  constructor(html, options = {}) {
    this.html = html;
    this.options = {
      skipEmptyHeadings: false,
      ...options,
    };

    this.headings = [];
    this.currentHeading = null;
    this.headingText = '';
    this.headingStart = 0;
    this.headingEnd = 0;

    this.parser = new HTMLSAXParser();

    this.parser.on('startTag', this.#onOpenTag.bind(this));
    this.parser.on('endTag', this.#onCloseTag.bind(this));
    this.parser.on('text', this.#onText.bind(this));
  }

  #onOpenTag({ tagName, attrs, sourceCodeLocation }) {
    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tagName)) {
      this.#startHeading(tagName, attrs, sourceCodeLocation);
    }
  }

  #onCloseTag({ tagName, sourceCodeLocation }) {
    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tagName)) {
      this.#endHeading(sourceCodeLocation);
    }
  }

  #onText({ text }) {
    if (this.currentHeading) {
      this.headingText += text;
    }
  }

  #startHeading(tagName, attrs, sourceCodeLocation) {
    const level = parseInt(tagName.charAt(1));

    this.currentHeading = {
      tag: tagName.toLowerCase(),
      level: level,
      text: '',
      order: this.headings.length,
      attributes: attrs,
    };

    this.headingText = '';
    this.headingStart = sourceCodeLocation.startOffset;
  }

  #endHeading(sourceCodeLocation) {
    if (!this.currentHeading) return;

    this.currentHeading.text = this.headingText.trim();
    this.headingEnd = sourceCodeLocation.endOffset;

    if (this.options.embedSource) {
      this.currentHeading['@source'] = this.html.slice(
        this.headingStart,
        this.headingEnd,
      );
    }

    if (this.options.addLocation) {
      this.currentHeading['@location'] =
        `${this.headingStart},${this.headingEnd}`;
    }

    if (
      !this.options.skipEmptyHeadings ||
      this.currentHeading.text.trim() !== ''
    ) {
      this.headings.push(this.currentHeading);
    }

    this.currentHeading = null;
    this.headingText = '';
    this.headingStart = 0;
    this.headingEnd = 0;
  }

  parse() {
    this.parser.end(this.html);

    return {
      headings: this.headings,
    };
  }
}
