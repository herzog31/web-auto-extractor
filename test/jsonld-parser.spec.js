import { promises as fs } from 'fs';
import { assert } from 'chai';

import WebAutoExtractor from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('JSON-LD Parser', () => {
  let extractor;

  beforeEach(() => {
    extractor = new WebAutoExtractor({ addLocation: true });
  });

  it('parses JSON-LD from jsonld1.html', async () => {
    const jsonld1 = await fileReader('test/resources/jsonld1.html');
    const { jsonld, errors } = extractor.parse(jsonld1);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      Product: [
        {
          '@context': 'http://schema.org/',
          '@location': '35,907',
          '@type': 'Product',
          name: 'Executive Anvil',
          image: 'http://www.example.com/anvil_executive.jpg',
          description:
            "Sleeker than ACME's Classic Anvil, the Executive Anvil is perfect for the business traveler looking for something to drop from a height.",
          mpn: '925872',
          brand: {
            '@type': 'Thing',
            name: 'ACME',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.4',
            reviewCount: '89',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '119.99',
            priceValidUntil: '2020-11-05',
            itemCondition: 'http://schema.org/UsedCondition',
            availability: 'http://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'Executive Objects',
            },
          },
        },
      ],
    });
  });

  it('parses JSON-LD from jsonld2.html', async () => {
    const jsonld2 = await fileReader('test/resources/jsonld2.html');
    const { jsonld, errors } = extractor.parse(jsonld2);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      TheaterEvent: [
        {
          '@context': 'http://schema.org',
          '@type': 'TheaterEvent',
          '@location': '35,545',
          name: 'Random Theater Show #1',
          startDate: '2016-12-15T19:30:00-06:00',
          location: {
            '@type': 'Place',
            name: 'Theatre',
          },
        },
        {
          '@context': 'http://schema.org',
          '@location': '35,545',
          '@type': 'TheaterEvent',
          name: 'Random Theater Show #2',
          startDate: '2016-12-16T19:30:00-06:00',
          location: {
            '@type': 'Place',
            name: 'Theatre',
          },
        },
      ],
    });
  });

  it('parses @graph syntax from jsonld3.html', async () => {
    const jsonld3 = await fileReader('test/resources/jsonld3.html');
    const { jsonld, errors } = extractor.parse(jsonld3);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      Movie: [
        {
          '@type': 'Movie',
          '@location': '35,534',
          name: 'The Matrix',
          director: { '@type': 'Person', name: 'Lana Wachowski' },
          '@context': 'http://schema.org',
        },
        {
          '@type': ['Movie', 'CreativeWork'],
          '@location': '35,534',
          name: 'The Matrix Reloaded',
          '@context': 'http://schema.org',
        },
      ],
      Person: [
        {
          '@type': 'Person',
          '@location': '35,534',
          name: 'Keanu Reeves',
          actor: { '@type': 'Movie', name: 'The Matrix' },
          '@context': 'http://schema.org',
        },
      ],
      CreativeWork: [
        {
          '@type': ['Movie', 'CreativeWork'],
          '@location': '35,534',
          name: 'The Matrix Reloaded',
          '@context': 'http://schema.org',
        },
      ],
    });
  });

  it('parses the position from jsonld4.html', async () => {
    const jsonld4 = await fileReader('test/resources/jsonld4.html');
    const { jsonld, errors } = extractor.parse(jsonld4);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      Organization: [
        {
          '@context': 'https://schema.org',
          '@location': '106,539',
          '@type': 'Organization',
          name: 'Tech Corp',
          url: 'https://www.techcorp.com',
          logo: 'https://www.techcorp.com/logo.png',
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+1-555-123-4567',
            contactType: 'customer service',
            availableLanguage: ['English', 'Spanish'],
          },
        },
      ],
      Product: [
        {
          '@context': 'https://schema.org',
          '@location': '588,1197',
          '@type': 'Product',
          name: 'Smart Widget Pro',
          description: 'Next generation smart widget with AI capabilities',
          brand: {
            '@type': 'Brand',
            name: 'Tech Corp',
          },
          offers: {
            '@type': 'Offer',
            price: '299.99',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '1250',
          },
        },
      ],
    });

    const organizationPosition = jsonld.Organization[0]['@location'];
    assert.equal(organizationPosition, '106,539');
    let [start, end] = organizationPosition.split(',');

    // Need to trim as the jsonld is indented
    const organizationMarkup = jsonld4.substring(start, end).trim();
    assert.equal(organizationMarkup.startsWith('{'), true);
    assert.equal(organizationMarkup.endsWith('}'), true);
    assert.isTrue(organizationMarkup.includes('"@type": "Organization"'));

    const productPosition = jsonld.Product[0]['@location'];
    assert.equal(productPosition, '588,1197');
    [start, end] = productPosition.split(',');

    const productMarkup = jsonld4.substring(start, end).trim();
    assert.equal(productMarkup.startsWith('{'), true);
    assert.equal(productMarkup.endsWith('}'), true);
    assert.isTrue(productMarkup.includes('"@type": "Product"'));
  });

  it('embeds source code in jsonld', async () => {
    const jsonld4 = await fileReader('test/resources/jsonld4.html');
    extractor = new WebAutoExtractor({ embedSource: true });
    const { jsonld, errors } = extractor.parse(jsonld4);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.isTrue(jsonld.Product[0]['@source'].includes('"@type": "Product"'));
    assert.isTrue(
      jsonld.Organization[0]['@source'].includes('"@type": "Organization"'),
    );
  });

  it('embeds source code in jsonld using array syntax', async () => {
    const jsonld4 = await fileReader('test/resources/jsonld4.html');
    extractor = new WebAutoExtractor({ embedSource: ['jsonld'] });
    const { jsonld, errors } = extractor.parse(jsonld4);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.isTrue(jsonld.Product[0]['@source'].includes('"@type": "Product"'));
    assert.isTrue(
      jsonld.Organization[0]['@source'].includes('"@type": "Organization"'),
    );
  });

  it('embeds source code in jsonld with @graph syntax', async () => {
    const jsonld3 = await fileReader('test/resources/jsonld3.html');
    extractor = new WebAutoExtractor({ embedSource: true });
    const { jsonld, errors } = extractor.parse(jsonld3);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.isTrue(jsonld.Movie[0]['@source'].includes('@graph'));
    assert.isTrue(jsonld.Person[0]['@source'].includes('@graph'));
  });

  it('parses JSON-LD with HTML tags in content from jsonld5.html', async () => {
    const jsonld5 = await fileReader('test/resources/jsonld5.html');
    const { jsonld, errors } = extractor.parse(jsonld5);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      Product: [
        {
          '@context': 'http://schema.org/',
          '@location': '35,955',
          '@type': 'Product',
          name: 'Premium Widget',
          image: 'http://www.example.com/premium_widget.jpg',
          description:
            'Our <b>Premium Widget</b> is the <i>ultimate solution</i> for your needs. It features <ul><li>Advanced technology</li><li>Durable construction</li><li>Eco-friendly materials</li></ul>',
          mpn: 'PW-12345',
          brand: {
            '@type': 'Thing',
            name: 'WidgetCo',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '156',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '249.99',
            priceValidUntil: '2023-12-31',
            itemCondition: 'http://schema.org/NewCondition',
            availability: 'http://schema.org/InStock',
            seller: {
              '@type': 'Organization',
              name: 'WidgetCo Store',
            },
          },
        },
      ],
    });
  });

  it('handles JSON-LD with missing @type attribute', async () => {
    const jsonldMissingType = await fileReader(
      'test/resources/jsonld-missing-type.html',
    );
    const { jsonld, errors } = extractor.parse(jsonldMissingType);
    assert.deepEqual(jsonld, {});
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], {
      message: 'JSON-LD object missing @type attribute',
      format: 'jsonld',
      source:
        '{"@context":"http://schema.org/","name":"Product Without Type","description":"This is a product without a @type attribute","brand":{"@type":"Brand","name":"TestBrand"}}',
      sourceCodeLocation: {
        startOffset: 116,
        endOffset: 376,
      },
    });
  });

  it('handles invalid JSON-LD that cannot be parsed', async () => {
    const jsonldInvalid = await fileReader(
      'test/resources/jsonld-invalid.html',
    );
    const { jsonld, errors } = extractor.parse(jsonldInvalid);
    assert.deepEqual(jsonld, {});
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], {
      message: 'Could not parse JSON-LD',
      format: 'jsonld',
      source: jsonldInvalid.substring(118, 251),
      sourceCodeLocation: {
        startOffset: 111,
        endOffset: 256,
      },
    });
  });

  it('parses JSON-LD from jsonld6.html with multiple types', async () => {
    const jsonld6 = await fileReader('test/resources/jsonld6.html');
    const { jsonld, errors } = extractor.parse(jsonld6);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));
    assert.deepEqual(jsonld, {
      WebPage: [
        {
          '@type': ['WebPage', 'FAQPage'],
          '@id': 'http://www.example.com/faq',
          url: 'http://www.example.com/faq',
          '@location': '35,614',
          name: 'My FAQ page',
          datePublished: '2023-04-27T10:56:45+01:00',
          dateModified: '2024-01-09T10:10:03+00:00',
          primaryImageOfPage: {
            '@id': 'http://www.example.com/logo.jpg',
          },
          inLanguage: 'en-GB',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is a question?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'What is an answer?',
              },
            },
          ],
        },
      ],
      FAQPage: [
        {
          '@type': ['WebPage', 'FAQPage'],
          '@id': 'http://www.example.com/faq',
          '@location': '35,614',
          url: 'http://www.example.com/faq',
          name: 'My FAQ page',
          datePublished: '2023-04-27T10:56:45+01:00',
          dateModified: '2024-01-09T10:10:03+00:00',
          primaryImageOfPage: {
            '@id': 'http://www.example.com/logo.jpg',
          },
          inLanguage: 'en-GB',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is a question?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'What is an answer?',
              },
            },
          ],
        },
      ],
    });
  });
  it('handles empty JSON-LD', async () => {
    const emptyJsonld = await fileReader('test/resources/jsonld-empty.html');
    const { jsonld, errors } = extractor.parse(emptyJsonld);
    assert.deepEqual(jsonld, {});
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0], {
      message: 'JSON-LD object is empty',
      format: 'jsonld',
      source: '{}',
      sourceCodeLocation: {
        startOffset: 35,
        endOffset: 41,
      },
    });
  });

  it('propagates context from first item to all subsequent items in @graph', async () => {
    const jsonldContextAll = await fileReader(
      'test/resources/jsonld-context-propogate-all.html',
    );
    const { jsonld, errors } = extractor.parse(jsonldContextAll);
    assert.isTrue(errors.length === 0, JSON.stringify(errors));

    assert.equal(jsonld.Movie[0]['@context'], 'http://schema.org');
    assert.equal(jsonld.Movie[1]['@context'], 'http://schema.org');
    assert.equal(jsonld.Person[0]['@context'], 'http://schema.org');
    assert.equal(jsonld.CreativeWork[0]['@context'], 'http://schema.org');
  });

  it('context on last item only applies to that item', async () => {
    const jsonldContextLast = await fileReader(
      'test/resources/jsonld-context-propogate-last.html',
    );
    const { jsonld, errors } = extractor.parse(jsonldContextLast);
    assert.isTrue(errors.length === 2, JSON.stringify(errors));
    assert.deepEqual(errors[0], {
      message: 'JSON-LD object missing @context attribute',
      format: 'jsonld',
      sourceCodeLocation: {},
      source:
        '{"@type":"Movie","name":"The Matrix","director":{"@type":"Person","name":"Lana Wachowski"}}',
    });
    assert.deepEqual(errors[1], {
      message: 'JSON-LD object missing @context attribute',
      format: 'jsonld',
      sourceCodeLocation: {},
      source:
        '{"@type":"Person","name":"Keanu Reeves","actor":{"@type":"Movie","name":"The Matrix"}}',
    });

    assert.isUndefined(jsonld.Movie[0]['@context']);
    assert.isUndefined(jsonld.Person[0]['@context']);
    assert.equal(jsonld.Movie[1]['@context'], 'http://schema.org');
    assert.equal(jsonld.CreativeWork[0]['@context'], 'http://schema.org');
  });
});
