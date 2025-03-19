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
            '@type': 'Product',
            brand: 'ACME',
            name: 'Executive Anvil',
            description:
              "Sleeker than ACME's Classic Anvil, the Executive Anvil is perfect for the\n    business traveler looking for something to drop from a height.",
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
      const { rdfa } = WAE().parse(rdfa2);
      assert.deepEqual(rdfa, {
        BreadcrumbList: [
          {
            '@context': 'https://schema.org/',
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
  });

  describe('Microdata', () => {
    it('parses Microdata from microdata1.html', async () => {
      const microdata1 = await fileReader('test/resources/microdata1.html');
      const { microdata } = WAE().parse(microdata1);
      assert.deepEqual(microdata, {
        Product: [
          {
            '@context': 'http://schema.org/',
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
      const { microdata } = WAE().parse(microdata2);
      assert.deepEqual(microdata, {
        Recipe: [
          {
            '@context': 'http://schema.org/',
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
      const { microdata } = WAE().parse(microdata3);
      assert.deepEqual(microdata, {
        BreadcrumbList: [
          {
            '@context': 'https://schema.org/',
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
  });
});
