import { promises as fs } from 'fs';
import { assert } from 'chai';

import WAE from '../src/index.js';

const fileReader = async (fileName) =>
  await fs.readFile(fileName, { encoding: 'utf-8' });

describe('Web Auto Extractor', () => {
  let expectedResult, testPage, microdata, rdfa, metatags, jsonld;

  before(async () => {
    expectedResult = JSON.parse(
      await fileReader('test/resources/expectedResult.json'),
    );
    testPage = await fileReader('test/resources/testPage.html');
    ({ microdata, rdfa, metatags, jsonld } = WAE().parse(testPage));
  });

  it('should find all elements with microdata', () => {
    assert.deepEqual(microdata, expectedResult.microdata);
  });

  it('should find all elements with rdfa', () => {
    assert.deepEqual(rdfa, expectedResult.rdfa);
  });

  it('should find embedded json-ld', () => {
    assert.deepEqual(jsonld, expectedResult.jsonld);
  });

  it('should find embedded meta tags', () => {
    assert.deepEqual(metatags, expectedResult.metatags);
  });
});
