import { promises as fs } from 'fs';
import { assert } from 'chai';

import WebAutoExtractor from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('Web Auto Extractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new WebAutoExtractor({ addLocation: true });
  });

  describe('Meta tags', () => {
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
      const { metatags } = extractor.parse(missingContent);
      assert.deepEqual(metatags, {});
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

  describe('JSON-LD', () => {
    it('parses JSON-LD from jsonld1.html', async () => {
      const jsonld1 = await fileReader('test/resources/jsonld1.html');
      const { jsonld } = extractor.parse(jsonld1);
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
      const { jsonld } = extractor.parse(jsonld2);
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
      const { jsonld } = extractor.parse(jsonld3);
      assert.deepEqual(jsonld, {
        Movie: [
          {
            '@type': 'Movie',
            '@location': '35,435',
            name: 'The Matrix',
            director: { '@type': 'Person', name: 'Lana Wachowski' },
          },
        ],
        Person: [
          {
            '@type': 'Person',
            '@location': '35,435',
            name: 'Keanu Reeves',
            actor: { '@type': 'Movie', name: 'The Matrix' },
          },
        ],
      });
    });

    it('parses the position from jsonld4.html', async () => {
      const jsonld4 = await fileReader('test/resources/jsonld4.html');
      const { jsonld } = extractor.parse(jsonld4);
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
      const { jsonld } = extractor.parse(jsonld4);
      assert.isTrue(
        jsonld.Product[0]['@source'].includes('"@type": "Product"'),
      );
      assert.isTrue(
        jsonld.Organization[0]['@source'].includes('"@type": "Organization"'),
      );
    });

    it('embeds source code in jsonld with @graph syntax', async () => {
      const jsonld3 = await fileReader('test/resources/jsonld3.html');
      extractor = new WebAutoExtractor({ embedSource: true });
      const { jsonld } = extractor.parse(jsonld3);
      assert.isTrue(jsonld.Movie[0]['@source'].includes('@graph'));
      assert.isTrue(jsonld.Person[0]['@source'].includes('@graph'));
    });

    it('parses JSON-LD with HTML tags in content from jsonld5.html', async () => {
      const jsonld5 = await fileReader('test/resources/jsonld5.html');
      const { jsonld } = extractor.parse(jsonld5);
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
  });

  describe('RDFa', () => {
    it('parses RDFa from rdfa1.html', async () => {
      const rdfa1 = await fileReader('test/resources/rdfa1.html');
      const { rdfa } = extractor.parse(rdfa1);
      assert.deepEqual(rdfa, {
        Product: [
          {
            '@context': 'http://schema.org/',
            '@location': '75,1520',
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
      assert.equal(productPosition, '75,1520');
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
  });

  describe('Microdata', () => {
    it('parses Microdata from microdata1.html', async () => {
      const microdata1 = await fileReader('test/resources/microdata1.html');
      const { microdata } = extractor.parse(microdata1);
      assert.deepEqual(microdata, {
        Product: [
          {
            '@context': 'http://schema.org/',
            '@location': '0,1389',
            '@type': 'Product',
            brand: 'ACME',
            name: 'Executive Anvil',
            image: 'anvil_executive.jpg',
            description:
              "Sleeker than ACME's Classic Anvil, the Executive Anvil is perfect for the\n    business traveler looking for something to drop from a height.",
            mpn: '925872',
            aggregateRating: {
              '@context': 'http://schema.org/',
              '@type': 'AggregateRating',
              ratingValue: '4.4',
              reviewCount: '89',
            },
            offers: {
              '@context': 'http://schema.org/',
              '@type': 'Offer',
              priceCurrency: 'USD',
              price: '119.99',
              priceValidUntil: '5 November!',
              seller: {
                '@context': 'http://schema.org/',
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

    it('parses Microdata from microdata2.html', async () => {
      const microdata2 = await fileReader('test/resources/microdata2.html');
      const { microdata } = extractor.parse(microdata2);
      assert.deepEqual(microdata, {
        Recipe: [
          {
            '@context': 'http://schema.org/',
            '@location': '47,1854',
            '@type': 'Recipe',
            name: "Mom's World Famous Banana Bread",
            author: 'John Smith',
            datePublished: '2009-05-08',
            image: 'bananabread.jpg',
            description:
              'This classic banana bread recipe comes from my mom -- the walnuts add a nice\n    texture and flavor to the banana bread.',
            prepTime: 'PT15M',
            cookTime: 'PT1H',
            recipeYield: '1 loaf',
            suitableForDiet: 'http://schema.org/LowFatDiet',
            nutrition: {
              '@context': 'http://schema.org/',
              '@type': 'NutritionInformation',
              calories: '240 calories',
              fatContent: '9 grams fat',
            },
            recipeIngredient: [
              '3 or 4 ripe bananas, smashed',
              '1 egg',
              '3/4 cup of sugar',
            ],
            recipeInstructions:
              'Preheat the oven to 350 degrees. Mix in the ingredients in a bowl. Add the\n    flour last. Pour the mixture into a loaf pan and bake for one hour.',
            interactionStatistic: {
              '@context': 'http://schema.org/',
              '@type': 'InteractionCounter',
              interactionType: 'http://schema.org/CommentAction',
              userInteractionCount: '140',
            },
          },
        ],
      });
    });

    it('parses @id fields from href attributes in item scopes', async () => {
      const microdata3 = await fileReader('test/resources/microdata3.html');
      const { microdata } = extractor.parse(microdata3);
      assert.deepEqual(microdata, {
        BreadcrumbList: [
          {
            '@context': 'https://schema.org/',
            '@location': '72,1298',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                item: 'https://example.com/books',
                name: 'Books',
                position: '1',
              },
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                item: {
                  '@context': 'https://schema.org/',
                  '@id': 'https://example.com/books/sciencefiction',
                  '@type': 'WebPage',
                  name: 'Science Fiction',
                },
                position: '2',
              },
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                item: 'https://example.com/books/sciencefiction/awardwinners',
                name: 'Award Winners',
                position: '3',
              },
            ],
          },
          {
            '@context': 'https://schema.org/',
            '@location': '1303,1918',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                item: 'https://example.com/literature',
                name: 'Literature',
                position: '1',
              },
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                name: 'Award Winners',
                position: '2',
              },
            ],
          },
        ],
      });
    });

    it('adds location information of the parsed data', async () => {
      const microdata3 = await fileReader('test/resources/microdata3.html');
      const { microdata } = extractor.parse(microdata3);

      const breadcrumbPosition = microdata.BreadcrumbList[0]['@location'];
      assert.equal(breadcrumbPosition, '72,1298');
      let [start, end] = breadcrumbPosition.split(',');

      const breadcrumbMarkup = microdata3.substring(start, end);
      assert.equal(
        breadcrumbMarkup.substring(0, 59),
        '<ol itemscope itemtype="https://schema.org/BreadcrumbList">',
      );
      assert.equal(
        breadcrumbMarkup.substring(
          breadcrumbMarkup.length - 5,
          breadcrumbMarkup.length,
        ),
        '</ol>',
      );
    });

    it('embeds source code in microdata', async () => {
      const microdata1 = await fileReader('test/resources/microdata1.html');
      extractor = new WebAutoExtractor({ embedSource: true });
      const { microdata } = extractor.parse(microdata1);
      assert.isTrue(
        microdata.Product[0]['@source'].includes(
          'itemtype="http://schema.org/Product"',
        ),
      );
      assert.isTrue(microdata.Product[0]['@source'].startsWith('<div'));
      assert.isTrue(microdata.Product[0]['@source'].endsWith('</div>'));
    });
  });
});
