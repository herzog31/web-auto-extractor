import { SAXParser } from 'parse5-sax-parser';

const createHandler = function () {
  const jsonldData = [];
  let scriptScope = false;

  const onOpenTag = function ({ tagName, attrs }) {
    if (
      tagName === 'script' &&
      attrs.find(
        (attr) => attr.name === 'type' && attr.value === 'application/ld+json',
      )
    ) {
      scriptScope = true;
    }
  };

  const onText = function ({ text, sourceCodeLocation }) {
    if (!scriptScope) {
      return;
    }

    try {
      const parsed = JSON.parse(text);

      // Adjust offsets by removing leading and trailing whitespace
      let startOffset = sourceCodeLocation.startOffset;
      let endOffset = sourceCodeLocation.endOffset;
      const leadingWhitespace = text.match(/^\s*/)[0].length;
      startOffset += leadingWhitespace;
      const trailingWhitespace = text.match(/\s*$/)[0].length;
      endOffset -= trailingWhitespace;

      // Add script tag location to root items
      if (!Array.isArray(parsed)) {
        parsed['@location'] = `${startOffset},${endOffset}`;
      } else {
        parsed.forEach((item) => {
          item['@location'] = `${startOffset},${endOffset}`;
        });
      }

      jsonldData.push(parsed);
    } catch (e) {
      console.error('Could not parse jsonld', e);
    }
  };

  const onCloseTag = function ({ tagName }) {
    if (tagName === 'script' && scriptScope) {
      scriptScope = false;
    }
  };

  return {
    onOpenTag,
    onText,
    onCloseTag,
    jsonldData,
  };
};

export default function (html) {
  const parser = new SAXParser({ sourceCodeLocationInfo: true });
  const handler = createHandler();
  parser.on('startTag', handler.onOpenTag);
  parser.on('text', handler.onText);
  parser.on('endTag', handler.onCloseTag);
  parser.write(html);
  parser.end();

  const collectedJsonldData = handler.jsonldData;

  // Normalize the jsonld data
  const jsonldData = {};

  collectedJsonldData.forEach((item) => {
    if (!Array.isArray(item)) {
      item = [item];
    }

    item.forEach((item) => {
      if (item['@graph']) {
        item['@graph'].forEach((graphItem) => {
          // Move location down to new root items
          graphItem['@location'] = item['@location'];

          jsonldData[graphItem['@type']] = jsonldData[graphItem['@type']] || [];
          jsonldData[graphItem['@type']].push(graphItem);
        });
      } else {
        jsonldData[item['@type']] = jsonldData[item['@type']] || [];
        jsonldData[item['@type']].push(item);
      }
    });
  });

  return jsonldData;
}
