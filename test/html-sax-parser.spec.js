import { assert } from 'chai';
import { HTMLSAXParser } from '../src/parsers/html-sax-parser.js';

describe('HTMLSAXParser', () => {
  let parser;
  let events;

  beforeEach(() => {
    parser = new HTMLSAXParser();
    events = {
      startTag: [],
      endTag: [],
      text: [],
    };

    parser.on('startTag', (data) => events.startTag.push(data));
    parser.on('endTag', (data) => events.endTag.push(data));
    parser.on('text', (data) => events.text.push(data));
  });

  describe('Basic HTML parsing', () => {
    it('should parse a simple HTML document', () => {
      const html =
        '<html><head><title>Test</title></head><body><p>Hello</p></body></html>';
      parser.end(html);

      assert.equal(events.startTag.length, 5);
      assert.equal(events.endTag.length, 5);
      assert.equal(events.text.length, 2);

      // Check first start tag
      assert.deepEqual(events.startTag[0], {
        tagName: 'html',
        attrs: [],
        selfClosing: false,
        sourceCodeLocation: {
          startOffset: 0,
          endOffset: 6,
        },
      });

      // Check text content
      assert.deepEqual(events.text[0], {
        text: 'Test',
        sourceCodeLocation: {
          startOffset: 19,
          endOffset: 23,
        },
      });

      // Check end tag
      assert.deepEqual(events.endTag[0], {
        tagName: 'title',
        sourceCodeLocation: {
          startOffset: 23,
          endOffset: 31,
        },
      });
    });

    it('should handle self-closing tags', () => {
      const html = '<div><img src="test.jpg" /><br/></div>';
      parser.end(html);

      assert.equal(events.startTag.length, 3);
      assert.equal(events.endTag.length, 1);

      // Check self-closing tags
      assert.deepEqual(events.startTag[1], {
        tagName: 'img',
        attrs: [{ name: 'src', value: 'test.jpg' }],
        selfClosing: true,
        sourceCodeLocation: {
          startOffset: 5,
          endOffset: 27,
        },
      });

      assert.deepEqual(events.startTag[2], {
        tagName: 'br',
        attrs: [],
        selfClosing: true,
        sourceCodeLocation: {
          startOffset: 27,
          endOffset: 32,
        },
      });
    });

    it('should handle self-closing tags without closing slash', () => {
      const html = '<div><img src="test.jpg"><br></div>';
      parser.end(html);

      assert.equal(events.startTag.length, 3);
      assert.equal(events.endTag.length, 1);

      // Check self-closing tags
      assert.deepEqual(events.startTag[1], {
        tagName: 'img',
        attrs: [{ name: 'src', value: 'test.jpg' }],
        selfClosing: true,
        sourceCodeLocation: {
          startOffset: 5,
          endOffset: 25,
        },
      });

      assert.deepEqual(events.startTag[2], {
        tagName: 'br',
        attrs: [],
        selfClosing: true,
        sourceCodeLocation: {
          startOffset: 25,
          endOffset: 29,
        },
      });
    });
  });

  describe('Attribute parsing', () => {
    it('should parse attributes with and without values', () => {
      const html = '<div class="container" id="main" data-test hidden>';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [
        { name: 'class', value: 'container' },
        { name: 'id', value: 'main' },
        { name: 'data-test', value: '' },
        { name: 'hidden', value: '' },
      ]);
    });

    it('should handle attributes with different quote types', () => {
      const html = '<div class="double" title=\'single\' data-test=`backtick`>';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [
        { name: 'class', value: 'double' },
        { name: 'title', value: 'single' },
        { name: 'data-test', value: 'backtick' },
      ]);
    });

    it('should handle attributes with spaces and special characters', () => {
      const html =
        '<div class="test class" data-value="special & characters" style="color: var(--primary-color);">';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [
        { name: 'class', value: 'test class' },
        { name: 'data-value', value: 'special & characters' },
        { name: 'style', value: 'color: var(--primary-color);' },
      ]);
    });
  });

  describe('Text handling', () => {
    it('should handle text with whitespace', () => {
      const html = '<p>  Hello  World  </p>';
      parser.end(html);

      assert.equal(events.text.length, 1);
      assert.deepEqual(events.text[0], {
        text: '  Hello  World  ',
        sourceCodeLocation: {
          startOffset: 3,
          endOffset: 19,
        },
      });
    });

    it('should handle multiple text nodes', () => {
      const html = '<p>Hello <strong>World</strong>!</p>';
      parser.end(html);

      assert.equal(events.text.length, 3);
      assert.deepEqual(events.text[0], {
        text: 'Hello ',
        sourceCodeLocation: {
          startOffset: 3,
          endOffset: 9,
        },
      });
      assert.deepEqual(events.text[1], {
        text: 'World',
        sourceCodeLocation: {
          startOffset: 17,
          endOffset: 22,
        },
      });
      assert.deepEqual(events.text[2], {
        text: '!',
        sourceCodeLocation: {
          startOffset: 31,
          endOffset: 32,
        },
      });
    });

    it('should handle empty text nodes', () => {
      const html = '<div></div>';
      parser.end(html);

      assert.equal(events.text.length, 0);
    });
  });

  describe('Script tag handling', () => {
    it('should handle JSON-LD script tags', () => {
      const html =
        '<script type="application/ld+json">{"test": "value"}</script>';
      parser.end(html);

      assert.equal(events.text.length, 1);
      assert.deepEqual(events.text[0], {
        text: '{"test": "value"}',
        sourceCodeLocation: {
          startOffset: 35,
          endOffset: 52,
        },
      });
    });

    it('should handle regular script tags', () => {
      const html = '<script>console.log("test");</script>';
      parser.end(html);

      assert.equal(events.text.length, 1);
      assert.deepEqual(events.text[0], {
        text: 'console.log("test");',
        sourceCodeLocation: {
          startOffset: 8,
          endOffset: 28,
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed HTML', () => {
      const html = '<div>Unclosed div';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.equal(events.text.length, 1);
      assert.equal(events.endTag.length, 0);
    });

    it('should handle empty attributes', () => {
      const html = '<div attr="">';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [{ name: 'attr', value: '' }]);
    });

    it('should handle unquoted attribute values', () => {
      const html = '<div class=test>';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [
        { name: 'class', value: 'test' },
      ]);
    });

    it('should handle nested quotes in attributes', () => {
      const html = '<div title="He said \'Hello\'">';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0].attrs, [
        { name: 'title', value: "He said 'Hello'" },
      ]);
    });

    it('should handle HTML comments', () => {
      const html = '<div><!-- This is a comment -->Text</div>';
      parser.end(html);

      assert.equal(events.text.length, 1);
      assert.deepEqual(events.text[0], {
        text: 'Text',
        sourceCodeLocation: {
          startOffset: 31,
          endOffset: 35,
        },
      });
    });

    it('should handle HTML tags in HTML comments', () => {
      const html =
        '<div><!-- <script>console.log("test");</script> -->Text</div>';
      parser.end(html);

      // Assume that script tags within comments are not parsed
      assert.equal(events.startTag.length, 1);
      assert.equal(events.endTag.length, 1);

      assert.equal(events.text.length, 1);
      assert.deepEqual(events.text[0], {
        text: 'Text',
        sourceCodeLocation: {
          startOffset: 51,
          endOffset: 55,
        },
      });
    });

    it('should handle DOCTYPE declarations', () => {
      const html = '<!DOCTYPE html><html></html>';
      parser.end(html);

      assert.equal(events.startTag.length, 1);
      assert.deepEqual(events.startTag[0], {
        tagName: 'html',
        attrs: [],
        selfClosing: false,
        sourceCodeLocation: {
          startOffset: 15,
          endOffset: 21,
        },
      });
    });
  });
});
