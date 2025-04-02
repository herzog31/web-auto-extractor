import { SAXParser } from 'parse5-sax-parser';

const typesWithId = [
  'Thing',
  'WebPage',
  'Place',
  'Organization',
  'Person',
  'Event',
  'Product',
];

function getPropValue(tagName, attribs, TYPE, PROP) {
  if (attribs[TYPE]) {
    return null;
  } else if ((tagName === 'a' || tagName === 'link') && attribs.href) {
    return attribs.href.trim();
  } else if (attribs.content) {
    return attribs.content.trim();
  } else if (attribs[PROP] === 'image' && attribs.src) {
    return attribs.src.trim();
  } else {
    return null;
  }
}

const getAttrNames = (specName) => {
  let TYPE, PROP, ID_PROPS;
  if (specName.toLowerCase().startsWith('micro')) {
    TYPE = 'itemtype';
    PROP = 'itemprop';
    ID_PROPS = ['href', 'itemid'];
  } else if (specName.toLowerCase().startsWith('rdfa')) {
    TYPE = 'typeof';
    PROP = 'property';
    ID_PROPS = ['about', 'href', 'resource'];
  } else {
    throw new Error('Unsupported spec: use either micro or rdfa');
  }
  return { TYPE, PROP, ID_PROPS };
};

const getType = (typeString) => {
  const match = /(.*\/)(\w+)/g.exec(typeString);
  return {
    context: match && match[1] ? match[1] : undefined,
    type: match && match[2] ? match[2] : typeString,
  };
};

const createHandler = function (specName) {
  let scopes = [];
  let tags = [];
  let topLevelScope = {};
  let textForProp = null;
  const { TYPE, PROP, ID_PROPS } = getAttrNames(specName);

  const onOpenTag = function ({
    tagName,
    attrs,
    selfClosing,
    sourceCodeLocation,
  }) {
    const attribs = attrs.reduce((acc, current) => {
      acc[current.name] = current.value;
      return acc;
    }, {});

    let currentScope = scopes[scopes.length - 1];
    let tag = false;

    if (attribs[TYPE]) {
      if (attribs[PROP] && currentScope) {
        let newScope = {};
        currentScope[attribs[PROP]] = currentScope[attribs[PROP]] || [];
        currentScope[attribs[PROP]].push(newScope);
        currentScope = newScope;
      } else {
        currentScope = {};
        const { type } = getType(attribs[TYPE]);
        topLevelScope[type] = topLevelScope[type] || [];
        topLevelScope[type].push(currentScope);
      }
    }

    if (currentScope) {
      if (attribs[TYPE]) {
        const { context, type } = getType(attribs[TYPE]);
        const vocab = attribs.vocab;
        currentScope['@context'] = context || vocab;
        currentScope['@type'] = type;
        currentScope['@location'] = sourceCodeLocation.startOffset;
        if (typesWithId.includes(type)) {
          const id = ID_PROPS.find((prop) => attribs[prop]);
          if (id) {
            currentScope['@id'] = attribs[id];
          }
        }
        tag = TYPE;
        scopes.push(currentScope);
      } else if (attribs[PROP]) {
        if (
          currentScope[attribs[PROP]] &&
          !Array.isArray(currentScope[attribs[PROP]])
        ) {
          // PROP occurs for the second time, storing it as an array
          currentScope[attribs[PROP]] = [currentScope[attribs[PROP]]];
        }

        var value = getPropValue(tagName, attribs, TYPE, PROP);
        if (!value) {
          tag = PROP;
          if (Array.isArray(currentScope[attribs[PROP]])) {
            currentScope[attribs[PROP]].push('');
          } else {
            currentScope[attribs[PROP]] = '';
          }
          textForProp = attribs[PROP];
        } else {
          if (Array.isArray(currentScope[attribs[PROP]])) {
            currentScope[attribs[PROP]].push(value);
          } else {
            currentScope[attribs[PROP]] = value;
          }
        }
      }
    }
    if (!selfClosing) {
      tags.push(tag);
    }
  };

  const onText = function ({ text }) {
    if (textForProp) {
      if (Array.isArray(scopes[scopes.length - 1][textForProp])) {
        scopes[scopes.length - 1][textForProp][
          scopes[scopes.length - 1][textForProp].length - 1
        ] += text.trim();
      } else {
        scopes[scopes.length - 1][textForProp] += text.trim();
      }
    }
  };

  const onCloseTag = function ({ sourceCodeLocation }) {
    const tag = tags.pop();
    if (tag === TYPE) {
      let scope = scopes.pop();
      scope['@location'] =
        `${scope['@location']},${sourceCodeLocation.endOffset}`;
      if (!scope['@context']) {
        delete scope['@context'];
      }
      Object.keys(scope).forEach((key) => {
        if (Array.isArray(scope[key]) && scope[key].length === 1) {
          scope[key] = scope[key][0];
        }
      });
    } else if (tag === PROP) {
      textForProp = false;
    }
  };

  return {
    onOpenTag,
    onText,
    onCloseTag,
    topLevelScope,
  };
};

export default (html, specName) => {
  const parser = new SAXParser({ sourceCodeLocationInfo: true });
  const handler = createHandler(specName);
  parser.on('startTag', handler.onOpenTag);
  parser.on('endTag', handler.onCloseTag);
  parser.on('text', handler.onText);
  parser.end(html);
  return handler.topLevelScope;
};
