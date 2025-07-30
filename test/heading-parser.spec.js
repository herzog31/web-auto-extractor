import { assert } from 'chai';
import { promises as fs } from 'fs';
import HeadingParser from '../src/parsers/heading-parser.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('HeadingParser', () => {
  let parser;

  beforeEach(() => {
    parser = new HeadingParser('');
  });

  describe('Basic heading parsing', () => {
    it('should parse simple h1 heading', () => {
      const html = '<h1>Main Title</h1>';
      parser = new HeadingParser(html, { embedSource: true, addLocation: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.deepEqual(result.headings[0], {
        tag: 'h1',
        level: 1,
        text: 'Main Title',
        '@location': '0,19',
        '@source': '<h1>Main Title</h1>',
        order: 0,
        attributes: []
      });
    });

    it('should parse multiple headings in order', () => {
      const html = '<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 3);
      assert.equal(result.headings[0].tag, 'h1');
      assert.equal(result.headings[0].text, 'Title');
      assert.equal(result.headings[0].order, 0);
      
      assert.equal(result.headings[1].tag, 'h2');
      assert.equal(result.headings[1].text, 'Section');
      assert.equal(result.headings[1].order, 1);
      
      assert.equal(result.headings[2].tag, 'h3');
      assert.equal(result.headings[2].text, 'Subsection');
      assert.equal(result.headings[2].order, 2);
    });

    it('should parse all heading levels (h1-h6)', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 6);
      for (let i = 0; i < 6; i++) {
        assert.equal(result.headings[i].level, i + 1);
        assert.equal(result.headings[i].tag, `h${i + 1}`);
        assert.equal(result.headings[i].text, `H${i + 1}`);
      }
    });
  });

  describe('Heading attributes', () => {
    it('should parse heading with id attribute', async () => {
      const html = await fileReader('test/resources/headings-attributes.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.deepEqual(result.headings[0].attributes, [
        { name: 'id', value: 'main-title' }
      ]);
    });

    it('should parse heading with multiple attributes', async () => {
      const html = await fileReader('test/resources/headings-attributes.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.deepEqual(result.headings[1].attributes, [
        { name: 'id', value: 'section' },
        { name: 'class', value: 'highlight' },
        { name: 'data-test', value: 'value' }
      ]);
    });

    it('should handle heading without attributes', async () => {
      const html = await fileReader('test/resources/headings-attributes.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.deepEqual(result.headings[2].attributes, []);
    });
  });

  describe('Headings with nested tags', () => {
    it('should detect heading with bold text', async () => {
      const html = await fileReader('test/resources/headings-nested-tags.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[0].text, 'Heading with bold text');
      assert.equal(result.headings[0]['@source'], '<h2>Heading with <strong>bold</strong> text</h2>');
    });

    it('should detect heading with link', async () => {
      const html = await fileReader('test/resources/headings-nested-tags.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[1].text, 'Heading with link inside');
      assert.equal(result.headings[1]['@source'], '<h3>Heading with <a href="#">link</a> inside</h3>');
    });

    it('should detect heading with multiple nested tags', async () => {
      const html = await fileReader('test/resources/headings-nested-tags.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[2].text, 'Title with italic and bold text');
      assert.equal(result.headings[2]['@source'], '<h1>Title with <em>italic</em> and <strong>bold</strong> text</h1>');
    });

    it('should not detect tags in simple heading', async () => {
      const html = await fileReader('test/resources/headings-nested-tags.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
    });
  });

  describe('Empty and whitespace headings', () => {
    it('should include empty heading', async () => {
      const html = await fileReader('test/resources/headings-empty.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[0].text, '');
      assert.equal(result.headings[0].tag, 'h1');
      assert.equal(result.headings[0]['@source'], '<h1></h1>');
    });

    it('should include heading with only whitespace', async () => {
      const html = await fileReader('test/resources/headings-empty.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[1].text, '');
      assert.equal(result.headings[1].tag, 'h2');
      assert.equal(result.headings[1]['@source'], '<h2>   </h2>');
    });

    it('should include heading with only newlines', async () => {
      const html = await fileReader('test/resources/headings-empty.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[2].text, '');
      assert.equal(result.headings[2].tag, 'h3');
      assert.equal(result.headings[2]['@source'], '<h3>\n\n</h3>');
    });

    it('should parse heading with leading/trailing whitespace', async () => {
      const html = await fileReader('test/resources/headings-empty.html');
      parser = new HeadingParser(html, { embedSource: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[3].text, 'Title with spaces');
      assert.equal(result.headings[3].tag, 'h1');
      assert.equal(result.headings[3]['@source'], '<h1>  Title with spaces  </h1>');
    });
  });

  describe('Complex HTML structure', () => {
    it('should parse headings in complex HTML document', async () => {
      const html = await fileReader('test/resources/headings-complex.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 4);
      assert.equal(result.headings[0].tag, 'h1');
      assert.equal(result.headings[0].text, 'Main Title');
      assert.equal(result.headings[0].order, 0);
      
      assert.equal(result.headings[1].tag, 'h2');
      assert.equal(result.headings[1].text, 'Section 1');
      assert.equal(result.headings[1].order, 1);
      
      assert.equal(result.headings[2].tag, 'h3');
      assert.equal(result.headings[2].text, 'Subsection');
      assert.equal(result.headings[2].order, 2);
      
      assert.equal(result.headings[3].tag, 'h2');
      assert.equal(result.headings[3].text, 'Section 2');
      assert.equal(result.headings[3].order, 3);
    });

    it('should handle mixed content with headings', async () => {
      const html = await fileReader('test/resources/headings-mixed.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 3);
      assert.equal(result.headings[0].text, 'Title');
      assert.equal(result.headings[1].text, 'Section');
      assert.equal(result.headings[2].text, 'Subsection');
    });
  });

  describe('Parser options', () => {
    it('should include location when addLocation is true', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { addLocation: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0]['@location'], '0,14');
    });

    it('should not include location when addLocation is false', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { addLocation: false });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.isUndefined(result.headings[0]['@location']);
    });

    it('should include HTML source when embedSource is true', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { embedSource: true, addLocation: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0]['@source'], '<h1>Title</h1>');
    });

    it('should not include HTML source when embedSource is false', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { embedSource: false });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.isUndefined(result.headings[0]['@source']);
    });

    it('should work with both options enabled', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { embedSource: true, addLocation: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0]['@location'], '0,14');
      assert.equal(result.headings[0]['@source'], '<h1>Title</h1>');
    });

    it('should work with default options (both false)', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.isUndefined(result.headings[0]['@location']);
      assert.isUndefined(result.headings[0]['@source']);
    });

    it('should include HTML source but not location when embedSource is true and addLocation is false', () => {
      const html = '<h1>Title</h1>';
      parser = new HeadingParser(html, { embedSource: true, addLocation: false });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.isUndefined(result.headings[0]['@location']);
      assert.equal(result.headings[0]['@source'], '<h1>Title</h1>');
    });

    it('should skip empty headings when skipEmptyHeadings is true', async () => {
      const html = await fileReader('test/resources/headings-empty.html');
      parser = new HeadingParser(html, { skipEmptyHeadings: true });
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0].tag, 'h1');
      assert.equal(result.headings[0].text, 'Title with spaces');
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive heading tags', () => {
      const html = '<H1>Title</H1><H2>Section</H2>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 2);
      assert.equal(result.headings[0].tag, 'h1');
      assert.equal(result.headings[1].tag, 'h2');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<h1>Title<h2>Section</h2>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0].text, 'Section');
      assert.equal(result.headings[0].tag, 'h2');
    });

    it('should handle nested headings (though invalid HTML)', () => {
      const html = '<h1>Title <h2>Nested</h2></h1>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 1);
      assert.equal(result.headings[0].text, 'Nested');
      assert.equal(result.headings[0].tag, 'h2');
    });

    it('should handle empty HTML', () => {
      const html = '';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 0);
    });

    it('should handle HTML without headings', () => {
      const html = '<div><p>Content</p></div>';
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 0);
    });
  });

  describe('Text extraction', () => {
    it('should extract text with multiple spaces', async () => {
      const html = await fileReader('test/resources/headings-text-extraction.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 3);
      assert.equal(result.headings[0].text, 'Title   with   spaces');
    });

    it('should extract text with newlines', async () => {
      const html = await fileReader('test/resources/headings-text-extraction.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 3);
      assert.equal(result.headings[1].text, 'Title\nwith\nnewlines');
    });

    it('should extract text with tabs', async () => {
      const html = await fileReader('test/resources/headings-text-extraction.html');
      parser = new HeadingParser(html);
      const result = parser.parse();

      assert.equal(result.headings.length, 3);
      assert.equal(result.headings[2].text, 'Title\twith\ttabs');
    });
  });
}); 