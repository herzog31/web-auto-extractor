# Web Auto Extractor 2.0

![GitHub License](https://img.shields.io/github/license/herzog31/web-auto-extractor)
[![CI](https://github.com/herzog31/web-auto-extractor/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/herzog31/web-auto-extractor/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/%40marbec%2Fweb-auto-extractor?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40marbec%2Fweb-auto-extractor)](https://www.npmjs.com/package/@marbec/web-auto-extractor)
![Node Current](https://img.shields.io/node/v/%40marbec%2Fweb-auto-extractor)

> This project is a fork of [indix/web-auto-extractor](https://github.com/indix/web-auto-extractor).

Parse semantically structured information from any HTML webpage.

**Supported formats:**

- Encodings that support [Schema.org](http://schema.org/) vocabularies:
  - Microdata
  - RDFa-lite
  - JSON-LD
- Meta tags
- Heading tags

Popularly, many websites mark up their webpages with Schema.org vocabularies for better SEO. This library helps you parse that information to JSON.

## Installation

`npm i --save @marbec/web-auto-extractor`

## [Usage](#usage)

```js
import WebAutoExtractor from '@marbec/web-auto-extractor';

const parsed = new WebAutoExtractor({
  // Add location information to the root elements in the parsed data.
  // Location is stored as start,end offset values in the @location property.
  addLocation: false,

  // Embed the source HTML in the root elements in the parsed data using the @source property.
  // This property is either a boolean to embed sources for all data types or an array of data types to embed sources for.
  embedSource: false,

  // Skip headings with empty or whitespace-only text content.
  // When true, headings like <h1></h1> or <h2>   </h2> will be excluded from results.
  skipEmptyHeadings: false,

  // Skip headings that are inside layout elements (header, footer, nav, aside).
  // When true, headings within these semantic layout containers will be excluded from results.
  // The isLayoutElement field is only included when this option is false.
  skipLayoutElements: false,
}).parse(sampleHTML);

// Output format
/* {
    "metatags": {},
    "microdata": {},
    "rdfa": {},
    "jsonld": {},
    "headings": {}
} */
```

### Browser

You can run the parser directly in the browser on any website using the following commands:

```js
const { default: WebAutoExtractor } = await import(
  'https://unpkg.com/@marbec/web-auto-extractor@latest/dist/index.js'
);
new WebAutoExtractor().parse(document.documentElement.outerHTML);
```

### Examples

See test cases for sample in- and outputs.
