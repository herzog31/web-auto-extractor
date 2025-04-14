import { HTMLSAXParser } from './html-sax-parser.js';

export default (html) => {
  const metatagsData = {};
  let currentTitle = null;

  const parser = new HTMLSAXParser();

  parser.on('startTag', ({ tagName, attrs }) => {
    if (tagName === 'meta') {
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
        if (!metatagsData[name]) {
          metatagsData[name] = [];
        }

        metatagsData[name].push(value);
      }
    } else if (tagName === 'title') {
      currentTitle = '';
    }
  });

  parser.on('text', ({ text }) => {
    if (currentTitle !== null) {
      currentTitle += text;
    }
  });

  parser.on('endTag', ({ tagName }) => {
    if (tagName === 'title') {
      if (!metatagsData.title) {
        metatagsData.title = [];
      }
      metatagsData.title.push(currentTitle.trim());
      currentTitle = null;
    }
  });

  parser.end(html);

  return metatagsData;
};
