import { promises as fs } from 'fs';
import { assert } from 'chai';

import WebAutoExtractor from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('Meta Tags', () => {
  let extractor;

  beforeEach(() => {
    extractor = new WebAutoExtractor({ addLocation: true });
  });

  it('skips meta tags outside of <head>in microdata notation', async () => {
    const microdata1 = await fileReader('test/resources/microdata1.html');
    const { metatags, errors } = extractor.parse(microdata1);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(metatags, {});
  });

  it('parses meta tags from rdfa1.html', async () => {
    const rdfa1 = await fileReader('test/resources/rdfa1.html');
    const { metatags, errors } = extractor.parse(rdfa1);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(metatags, {
      priceCurrency: ['USD'],
      title: ['Executive Anvil'],
    });
  });

  it('handles meta tag with missing content attribute', async () => {
    const missingContent = `<head><meta name="description"></head>`;
    const { metatags, errors } = extractor.parse(missingContent);
    assert.deepEqual(metatags, {});

    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], {
      message: 'Meta tag "description" has no content',
      format: 'metatags',
      sourceCodeLocation: {
        startOffset: 6,
        endOffset: 31,
      },
    });
  });

  it('handles meta tag with empty content attribute', async () => {
    const emptyContent = `<head><meta name="keywords" content=""></head>`;
    const { metatags, errors } = extractor.parse(emptyContent);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(metatags, {
      keywords: [''],
    });
  });

  it('parses both meta tag and title tag', async () => {
    const htmlWithMetaAndTitle = `<head>
      <meta name="description" content="A test page">
      <title>Test Page Title</title>
    </head>`;
    const { metatags, errors } = extractor.parse(htmlWithMetaAndTitle);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(metatags, {
      description: ['A test page'],
      title: ['Test Page Title'],
    });
  });
});
