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
    this.headingContainsTags = false;
    this.headingTagStack = [];
    
    this.parser = new HTMLSAXParser();
    
    this.parser.on('startTag', this.#onOpenTag.bind(this));
    this.parser.on('endTag', this.#onCloseTag.bind(this));
    this.parser.on('text', this.#onText.bind(this));
  }

  #onOpenTag({ tagName, attrs, sourceCodeLocation }) {
    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tagName)) {
      this.#startHeading(tagName, attrs, sourceCodeLocation);
    } else if (this.currentHeading) {
      // If we're inside a heading, track that it contains other tags
      this.headingContainsTags = true;
      this.headingTagStack.push(tagName);
    }
  }

  #onCloseTag({ tagName, sourceCodeLocation }) {
    // Check if this is a heading tag (h1-h6)
    if (/^h[1-6]$/i.test(tagName)) {
      this.#endHeading(sourceCodeLocation);
    } else if (this.currentHeading && this.headingTagStack.length > 0) {
      // Remove the tag from stack if it matches
      const lastTag = this.headingTagStack[this.headingTagStack.length - 1];
      if (lastTag === tagName) {
        this.headingTagStack.pop();
      }
    }
  }

  #onText({ text }) {
    if (this.currentHeading) {
      this.headingText += text;
    }
  }

  #startHeading(tagName, attrs, sourceCodeLocation) {
    const level = parseInt(tagName.charAt(1));
    const attribs = attrs.reduce((acc, current) => {
      acc[current.name] = current.value;
      return acc;
    }, {});

    this.currentHeading = {
      tag: tagName.toLowerCase(),
      level: level,
      text: '',
      containsTags: false,
      order: this.headings.length,
      attributes: attribs
    };

    // Add location if requested or if embedSource is enabled
    if (this.options.addLocation || this.options.embedSource) {
      this.currentHeading.location = sourceCodeLocation.startOffset;
      this.currentHeading.endLocation = null;
    }

    this.headingText = '';
    this.headingContainsTags = false;
    this.headingTagStack = [];
  }

  #endHeading(sourceCodeLocation) {
    if (!this.currentHeading) return;

    this.currentHeading.text = this.headingText.trim();
    this.currentHeading.containsTags = this.headingContainsTags;

    // Add location if requested or if embedSource is enabled
    if (this.options.addLocation || this.options.embedSource) {
      this.currentHeading.endLocation = sourceCodeLocation.endOffset;
    }

    // Add HTML source if requested
    if (this.options.embedSource) {
      this.currentHeading.html = this.html.slice(
        this.currentHeading.location,
        sourceCodeLocation.endOffset
      );
    }

    if (this.options.embedSource && !this.options.addLocation) {
      delete this.currentHeading.location;
      delete this.currentHeading.endLocation;
    }

    if (!this.options.skipEmptyHeadings || this.currentHeading.text.trim() !== '') {
      this.headings.push(this.currentHeading);
    }

    this.currentHeading = null;
    this.headingText = '';
    this.headingContainsTags = false;
    this.headingTagStack = [];
  }

  parse() {
    this.parser.end(this.html);

    return {
      headings: this.headings
    };
  }
} 