import { HTMLSAXParser } from './html-sax-parser.js';

export default (html) => {
  const metatags = {};
  const errors = [];
  let currentTitle = null;
  let inHead = false;

  const parser = new HTMLSAXParser();

  parser.on('startTag', ({ tagName, attrs, sourceCodeLocation }) => {
    if (tagName === 'head') {
      inHead = true;
    } else if (tagName === 'meta' && inHead) {
      // Convert attrs array to object for easier access
      const attribs = attrs.reduce((acc, current) => {
        acc[current.name] = current.value;
        return acc;
      }, {});

      // Find the name key (name, property, itemprop, or http-equiv)
      const nameKey = Object.keys(attribs).find(
        (attr) =>
          ['name', 'property', 'itemprop', 'http-equiv'].indexOf(attr) !== -1,
      );

      if (!nameKey) return;

      const name = attribs[nameKey];
      const value = attribs['content'];

      if (value !== undefined) {
        if (!metatags[name]) {
          metatags[name] = [];
        }

        metatags[name].push(value);
      } else {
        errors.push({
          message: `Meta tag "${name}" has no content`,
          sourceCodeLocation,
        });
      }
    } else if (tagName === 'title' && inHead) {
      currentTitle = '';
    }
  });

  parser.on('text', ({ text }) => {
    if (currentTitle !== null) {
      currentTitle += text;
    }
  });

  parser.on('endTag', ({ tagName }) => {
    if (tagName === 'head') {
      inHead = false;
    } else if (tagName === 'title' && inHead) {
      if (!metatags.title) {
        metatags.title = [];
      }
      metatags.title.push(currentTitle.trim());
      currentTitle = null;
    }
  });

  parser.end(html);

  return { metatags: metatags, errors };
};
