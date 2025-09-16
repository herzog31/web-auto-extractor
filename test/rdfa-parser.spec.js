import { promises as fs } from 'fs';
import { assert } from 'chai';

import WebAutoExtractor from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('RDFa Parser', () => {
  let extractor;

  beforeEach(() => {
    extractor = new WebAutoExtractor({ addLocation: true });
  });

  it('parses RDFa from rdfa1.html', async () => {
    const rdfa1 = await fileReader('test/resources/rdfa1.html');
    const { rdfa, errors } = extractor.parse(rdfa1);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(rdfa, {
      Product: [
        {
          '@context': 'http://schema.org/',
          '@location': '127,1572',
          '@type': 'Product',
          brand: 'ACME',
          name: 'Executive Anvil',
          description:
            "Sleeker than ACME's Classic Anvil, the Executive Anvil is perfect for\n        the business traveler looking for something to drop from a height.",
          image: 'anvil_executive.jpg',
          mpn: '925872',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.4',
            reviewCount: '89',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '119.99',
            priceValidUntil: '5 November!',
            seller: {
              '@type': 'Organization',
              name: 'Executive Objects',
            },
            itemCondition: 'http://schema.org/UsedCondition',
            availability: 'http://schema.org/InStock',
          },
        },
      ],
    });
  });

  it('parses @id fields from href attributes in a tags', async () => {
    const rdfa2 = await fileReader('test/resources/rdfa2.html');
    const { rdfa, errors } = extractor.parse(rdfa2);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(rdfa, {
      BreadcrumbList: [
        {
          '@context': 'https://schema.org/',
          '@location': '171,991',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              item: {
                '@type': 'WebPage',
                name: 'Books',
                '@id': 'https://example.com/books',
              },
              position: '1',
            },
            {
              '@type': 'ListItem',
              item: {
                '@type': 'WebPage',
                name: 'Science Fiction',
                '@id': 'https://example.com/books/sciencefiction',
              },
              position: '2',
            },
            {
              '@type': 'ListItem',
              name: 'Award Winners',
              position: '3',
            },
          ],
        },
      ],
    });
  });

  it('adds location information of the parsed data', async () => {
    const rdfa1 = await fileReader('test/resources/rdfa1.html');
    const { rdfa, errors } = extractor.parse(rdfa1);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));

    const productPosition = rdfa.Product[0]['@location'];
    assert.equal(productPosition, '127,1572');
    let [start, end] = productPosition.split(',');

    const productMarkup = rdfa1.substring(start, end);
    assert.equal(
      productMarkup.substring(0, 49),
      '<div vocab="http://schema.org/" typeof="Product">',
    );
    assert.equal(
      productMarkup.substring(productMarkup.length - 6, productMarkup.length),
      '</div>',
    );
  });

  it('embeds source code in rdfa', async () => {
    const rdfa2 = await fileReader('test/resources/rdfa2.html');
    extractor = new WebAutoExtractor({ embedSource: true });
    const { rdfa, errors } = extractor.parse(rdfa2);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.isTrue(
      rdfa.BreadcrumbList[0]['@source'].includes('typeof="BreadcrumbList"'),
    );
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].startsWith('<ol'));
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].endsWith('</ol>'));
  });

  it('embeds source code in rdfa using array syntax', async () => {
    const rdfa2 = await fileReader('test/resources/rdfa2.html');
    extractor = new WebAutoExtractor({ embedSource: ['rdfa'] });
    const { rdfa, errors } = extractor.parse(rdfa2);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.isTrue(
      rdfa.BreadcrumbList[0]['@source'].includes('typeof="BreadcrumbList"'),
    );
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].startsWith('<ol'));
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].endsWith('</ol>'));
  });

  it('adds an error if src is not set for image', async () => {
    const { rdfa, errors } = extractor.parse(
      `<div vocab="http://schema.org/" typeof="ImageObject">
        <img property="contentUrl" alt="My image">
      </div>`,
    );

    assert.deepEqual(errors, [
      {
        message: 'No value found for img tag',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 62, endOffset: 104 },
        source: '<img property="contentUrl" alt="My image">',
      },
    ]);

    assert.deepEqual(rdfa, {
      ImageObject: [
        {
          '@location': '0,117',
          '@context': 'http://schema.org/',
          '@type': 'ImageObject',
          contentUrl: '',
        },
      ],
    });
  });

  it('adds errors when typeof lacks a resolvable context', async () => {
    const html = await fileReader('test/resources/rdfa-missing-context.html');
    const { rdfa, errors } = extractor.parse(html);

    assert.deepEqual(rdfa, {
      BreadcrumbList: [
        {
          '@location': '72,864',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              item: {
                '@id': 'https://example.com/books',
                '@type': 'WebPage',
                name: 'Books',
              },
              position: '1',
            },
            {
              '@type': 'ListItem',
              item: {
                '@id': 'https://example.com/books/sciencefiction',
                '@type': 'WebPage',
                name: 'Science Fiction',
              },
              position: '2',
            },
            {
              '@type': 'ListItem',
              name: 'Award Winners',
              position: '3',
            },
          ],
        },
      ],
    });

    assert.deepEqual(errors, [
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 72, endOffset: 100 },
        source: '<ol typeof="BreadcrumbList">',
      },
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 107, endOffset: 156 },
        source: '<li property="itemListElement" typeof="ListItem">',
      },
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 165, endOffset: 234 },
        source:
          '<a property="item" typeof="WebPage" href="https://example.com/books">',
      },
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 368, endOffset: 417 },
        source: '<li property="itemListElement" typeof="ListItem">',
      },
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 426, endOffset: 549 },
        source:
          '<a\n          property="item"\n          typeof="WebPage"\n          href="https://example.com/books/sciencefiction"\n        >',
      },
      {
        message: 'rdfa itemtype missing valid context',
        format: 'rdfa',
        sourceCodeLocation: { startOffset: 693, endOffset: 742 },
        source: '<li property="itemListElement" typeof="ListItem">',
      },
    ]);
  });
});
