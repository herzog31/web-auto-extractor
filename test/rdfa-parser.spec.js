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
    const { rdfa } = extractor.parse(rdfa1);
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
    const { rdfa } = extractor.parse(rdfa2);
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
    const { rdfa } = extractor.parse(rdfa1);

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
    const { rdfa } = extractor.parse(rdfa2);
    assert.isTrue(
      rdfa.BreadcrumbList[0]['@source'].includes('typeof="BreadcrumbList"'),
    );
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].startsWith('<ol'));
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].endsWith('</ol>'));
  });

  it('embeds source code in rdfa using array syntax', async () => {
    const rdfa2 = await fileReader('test/resources/rdfa2.html');
    extractor = new WebAutoExtractor({ embedSource: ['rdfa'] });
    const { rdfa } = extractor.parse(rdfa2);
    assert.isTrue(
      rdfa.BreadcrumbList[0]['@source'].includes('typeof="BreadcrumbList"'),
    );
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].startsWith('<ol'));
    assert.isTrue(rdfa.BreadcrumbList[0]['@source'].endsWith('</ol>'));
  });
});
