import { promises as fs } from 'fs';
import { assert } from 'chai';

import WebAutoExtractor from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('Microdata Parser', () => {
  let extractor;

  beforeEach(() => {
    extractor = new WebAutoExtractor({ addLocation: true });
  });

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

  it('embeds source code in microdata using array syntax', async () => {
    const microdata1 = await fileReader('test/resources/microdata1.html');
    extractor = new WebAutoExtractor({ embedSource: ['microdata'] });
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
