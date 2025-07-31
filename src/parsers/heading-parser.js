import { HTMLSAXParser } from './html-sax-parser.js';

export default class HeadingParser {
  constructor(html, options = {}) {
    this.html = html;
    this.options = {
      skipEmptyHeadings: false,
      skipLayoutElements: false,
      ...options,
    };

    this.errors = [];
    this.headings = [];
    this.currentHeading = null;
    this.headingText = '';
    this.headingStart = 0;
    this.headingEnd = 0;
    this.layoutStack = [];
    this.isInLayoutElement = false;

    this.parser = new HTMLSAXParser();

    this.parser.on('startTag', this.#onOpenTag.bind(this));
    this.parser.on('endTag', this.#onCloseTag.bind(this));
    this.parser.on('text', this.#onText.bind(this));
  }

  #onOpenTag({ tagName, attrs, sourceCodeLocation }) {
    const tag = tagName.toLowerCase();

    // Track layout elements
    if (['header', 'footer', 'nav', 'aside'].includes(tag)) {
      this.layoutStack.push(tag);
      this.isInLayoutElement = true;
    }

    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tag)) {
      this.#startHeading(tag, attrs, sourceCodeLocation);
    }
  }

  #onCloseTag({ tagName, sourceCodeLocation }) {
    const tag = tagName.toLowerCase();

    // Handle closing layout elements
    if (['header', 'footer', 'nav', 'aside'].includes(tag)) {
      const index = this.layoutStack.lastIndexOf(tag);
      if (index !== -1) {
        this.layoutStack.splice(index, 1);
        this.isInLayoutElement = this.layoutStack.length > 0;
      }
    }

    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tag)) {
      this.#endHeading(tag, sourceCodeLocation);
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

    // Only include isLayoutElement field if we're not skipping layout elements
    if (!this.options.skipLayoutElements) {
      this.currentHeading.isLayoutElement = this.isInLayoutElement;
    }

    this.headingText = '';
    this.headingStart = sourceCodeLocation.startOffset;
  }

  #endHeading(tagName, sourceCodeLocation) {
    if (!this.currentHeading) return;
    if (tagName === this.currentHeading.tag) {
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

      if (this.options.skipLayoutElements && this.isInLayoutElement) {
        // Don't add to headings array
      } else if (
        !this.options.skipEmptyHeadings ||
        this.currentHeading.text.trim() !== ''
      ) {
        this.headings.push(this.currentHeading);
      }
    } else {
      this.errors.push({
        message: 'Heading tags are malformed',
        format: 'headings',
        sourceCodeLocation,
      });
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
      errors: this.errors,
    };
  }
}
