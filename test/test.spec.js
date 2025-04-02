import { promises as fs } from 'fs';
import { assert } from 'chai';

import WAE from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('Web Auto Extractor', () => {
  describe('Meta tags', () => {
    it('parses meta tags from microdata1.html', async () => {
      const microdata1 = await fileReader('test/resources/microdata1.html');
      const { metatags } = WAE().parse(microdata1);
      assert.deepEqual(metatags, {
        priceCurrency: ['USD'],
      });
    });

    it('parses meta tags from microdata2.html', async () => {
      const microdata2 = await fileReader('test/resources/microdata2.html');
      const { metatags } = WAE().parse(microdata2);
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
      const { metatags } = WAE().parse(rdfa1);
      assert.deepEqual(metatags, {
        priceCurrency: ['USD'],
      });
    });
  });

  describe('JSON-LD', () => {
    it('parses JSON-LD from jsonld1.html', async () => {
      const jsonld1 = await fileReader('test/resources/jsonld1.html');
      const { jsonld } = WAE().parse(jsonld1);
      assert.deepEqual(jsonld, {
        Product: [
          {
            '@context': 'http://schema.org/',
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
      const { jsonld } = WAE().parse(jsonld2);
      assert.deepEqual(jsonld, {
        TheaterEvent: [
          {
            '@context': 'http://schema.org',
            '@type': 'TheaterEvent',
            name: 'Random Theater Show #1',
            startDate: '2016-12-15T19:30:00-06:00',
            location: {
              '@type': 'Place',
              name: 'Theatre',
            },
          },
          {
            '@context': 'http://schema.org',
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
  });

  describe('RDFa', () => {
    it('parses RDFa from rdfa1.html', async () => {
      const rdfa1 = await fileReader('test/resources/rdfa1.html');
      const { rdfa } = WAE().parse(rdfa1);
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
              '@location': '592,784',
              '@type': 'AggregateRating',
              ratingValue: '4.4',
              reviewCount: '89',
            },
            offers: {
              '@location': '792,1509',
              '@type': 'Offer',
              priceCurrency: 'USD',
              price: '119.99',
              priceValidUntil: '5 November!',
              seller: {
                '@location': '1103,1222',
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
      const { rdfa } = WAE().parse(rdfa2);
      assert.deepEqual(rdfa, {
        BreadcrumbList: [
          {
            '@context': 'https://schema.org/',
            '@location': '171,991',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                '@location': '234,480',
                item: {
                  '@type': 'WebPage',
                  '@location': '292,419',
                  name: 'Books',
                  '@id': 'https://example.com/books',
                },
                position: '1',
              },
              {
                '@type': 'ListItem',
                '@location': '495,805',
                item: {
                  '@type': 'WebPage',
                  name: 'Science Fiction',
                  '@location': '553,744',
                  '@id': 'https://example.com/books/sciencefiction',
                },
                position: '2',
              },
              {
                '@location': '820,981',
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
      const { rdfa } = WAE().parse(rdfa1);

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

      const sellerPosition = rdfa.Product[0].offers.seller['@location'];
      assert.equal(sellerPosition, '1103,1222');
      [start, end] = sellerPosition.split(',');

      const sellerMarkup = rdfa1.substring(start, end);
      assert.equal(
        sellerMarkup.substring(0, 46),
        '<span property="seller" typeof="Organization">',
      );
      assert.equal(
        sellerMarkup.substring(sellerMarkup.length - 7, sellerMarkup.length),
        '</span>',
      );
    });
  });

  describe('Microdata', () => {
    it('parses Microdata from microdata1.html', async () => {
      const microdata1 = await fileReader('test/resources/microdata1.html');
      const { microdata } = WAE().parse(microdata1);
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
              '@location': '454,679',
              '@type': 'AggregateRating',
              ratingValue: '4.4',
              reviewCount: '89',
            },
            offers: {
              '@context': 'http://schema.org/',
              '@location': '683,1382',
              '@type': 'Offer',
              priceCurrency: 'USD',
              price: '119.99',
              priceValidUntil: '5 November!',
              seller: {
                '@context': 'http://schema.org/',
                '@location': '989,1130',
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
      const { microdata } = WAE().parse(microdata2);
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
              '@location': '845,1078',
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
              '@location': '1519,1795',
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
      const { microdata } = WAE().parse(microdata3);
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
                '@location': '138,429',
                item: 'https://example.com/books',
                name: 'Books',
                position: '1',
              },
              {
                '@context': 'https://schema.org/',
                '@location': '444,917',
                '@type': 'ListItem',
                item: {
                  '@context': 'https://schema.org/',
                  '@id': 'https://example.com/books/sciencefiction',
                  '@location': '564,856',
                  '@type': 'WebPage',
                  name: 'Science Fiction',
                },
                position: '2',
              },
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                '@location': '932,1288',
                item: 'https://example.com/books/sciencefiction/awardwinners',
                name: 'Award Winners',
                position: '3',
              },
            ],
          },
          {
            '@context': 'https://schema.org/',
            '@type': 'BreadcrumbList',
            '@location': '1303,1918',
            itemListElement: [
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                '@location': '1369,1670',
                item: 'https://example.com/literature',
                name: 'Literature',
                position: '1',
              },
              {
                '@context': 'https://schema.org/',
                '@type': 'ListItem',
                '@location': '1685,1908',
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
      const { microdata } = WAE().parse(microdata3);

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

      const itemListPosition =
        microdata.BreadcrumbList[0].itemListElement[1]['@location'];
      assert.equal(itemListPosition, '444,917');
      [start, end] = itemListPosition.split(',');

      const itemListMarkup = microdata3.substring(start, end);
      assert.equal(
        itemListMarkup.substring(0, 111),
        `<li
        itemprop="itemListElement"
        itemscope
        itemtype="https://schema.org/ListItem"
      >`,
      );
      assert.equal(
        itemListMarkup.substring(
          itemListMarkup.length - 5,
          itemListMarkup.length,
        ),
        '</li>',
      );
    });
  });
});
