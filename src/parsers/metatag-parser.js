import { HTMLSAXParser } from './html-sax-parser.js';

export default (html) => {
  const metatagsData = {};

  const parser = new HTMLSAXParser();

  parser.on('startTag', ({ tagName, attrs }) => {
    if (tagName !== 'meta') return;

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

    if (!metatagsData[name]) {
      metatagsData[name] = [];
    }

    metatagsData[name].push(value);
  });

  parser.end(html);

  return metatagsData;
};
