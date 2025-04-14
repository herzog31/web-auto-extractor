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

  it('parses meta tags from microdata1.html', async () => {
    const microdata1 = await fileReader('test/resources/microdata1.html');
    const { metatags } = extractor.parse(microdata1);
    assert.deepEqual(metatags, {
      priceCurrency: ['USD'],
    });
  });

  it('parses meta tags from microdata2.html', async () => {
    const microdata2 = await fileReader('test/resources/microdata2.html');
    const { metatags } = extractor.parse(microdata2);
    assert.deepEqual(metatags, {
      datePublished: ['2009-05-08'],
      refresh: ['30'],
      prepTime: ['PT15M'],
      cookTime: ['PT1H'],
      interactionType: ['http://schema.org/CommentAction'],
      userInteractionCount: ['140'],
    });
  });

  it('parses meta tags from rdfa1.html', async () => {
    const rdfa1 = await fileReader('test/resources/rdfa1.html');
    const { metatags } = extractor.parse(rdfa1);
    assert.deepEqual(metatags, {
      priceCurrency: ['USD'],
      title: ['Executive Anvil'],
    });
  });

  it('handles meta tag with missing content attribute', async () => {
    const missingContent = `<meta name="description">`;
    const { metatags, errors } = extractor.parse(missingContent);
    assert.deepEqual(metatags, {});

    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], {
      message: 'Meta tag "description" has no content',
      sourceCodeLocation: {
        startOffset: 0,
        endOffset: 25,
      },
    });
  });

  it('handles meta tag with empty content attribute', async () => {
    const emptyContent = `<meta name="keywords" content="">`;
    const { metatags } = extractor.parse(emptyContent);
    assert.deepEqual(metatags, {
      keywords: [''],
    });
  });

  it('parses both meta tag and title tag', async () => {
    const htmlWithMetaAndTitle = `
      <meta name="description" content="A test page">
      <title>Test Page Title</title>
    `;
    const { metatags } = extractor.parse(htmlWithMetaAndTitle);
    assert.deepEqual(metatags, {
      description: ['A test page'],
      title: ['Test Page Title'],
    });
  });
});
