import { HTMLSAXParser } from './html-sax-parser.js';

const typesWithId = [
  'Thing',
  'WebPage',
  'Place',
  'Organization',
  'Person',
  'Event',
  'Product',
];

export default class MicroRdfaParser {
  constructor(html, specName, options = {}) {
    this.html = html;
    this.specName = specName;
    this.options = options;

    this.scopes = [];
    this.tags = [];
    this.topLevelScope = {};
    this.textForProp = null;
    this.parser = new HTMLSAXParser();

    const { TYPE, PROP, ID_PROPS } = this.#getAttrNames(specName);
    this.TYPE = TYPE;
    this.PROP = PROP;
    this.ID_PROPS = ID_PROPS;

    this.parser.on('startTag', this.#onOpenTag.bind(this));
    this.parser.on('endTag', this.#onCloseTag.bind(this));
    this.parser.on('text', this.#onText.bind(this));
  }

  #getAttrNames(specName) {
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
  }

  #getType(typeString) {
    const match = /(.*\/)(\w+)/g.exec(typeString);
    return {
      context: match && match[1] ? match[1] : undefined,
      type: match && match[2] ? match[2] : typeString,
    };
  }

  #getPropValue(tagName, attribs) {
    if (attribs[this.TYPE]) {
      return null;
    } else if ((tagName === 'a' || tagName === 'link') && attribs.href) {
      return attribs.href.trim();
    } else if (attribs.content) {
      return attribs.content.trim();
    } else if (attribs[this.PROP] === 'image' && attribs.src) {
      return attribs.src.trim();
    } else {
      return null;
    }
  }

  #onOpenTag({ tagName, attrs, selfClosing, sourceCodeLocation }) {
    const attribs = attrs.reduce((acc, current) => {
      acc[current.name] = current.value;
      return acc;
    }, {});

    let currentScope = this.scopes[this.scopes.length - 1];
    let tag = false;

    if (attribs[this.TYPE]) {
      if (attribs[this.PROP] && currentScope) {
        let newScope = {};
        currentScope[attribs[this.PROP]] =
          currentScope[attribs[this.PROP]] || [];
        currentScope[attribs[this.PROP]].push(newScope);
        currentScope = newScope;
      } else {
        currentScope = {};
        const { type } = this.#getType(attribs[this.TYPE]);
        this.topLevelScope[type] = this.topLevelScope[type] || [];
        this.topLevelScope[type].push(currentScope);

        // Only add location and source to top level scope, ignore the option for now as the values are needed for @source
        currentScope['@location'] = sourceCodeLocation.startOffset;
      }
    }

    if (currentScope) {
      if (attribs[this.TYPE]) {
        const { context, type } = this.#getType(attribs[this.TYPE]);
        const vocab = attribs.vocab;
        currentScope['@context'] = context || vocab;
        currentScope['@type'] = type;

        if (typesWithId.includes(type)) {
          const id = this.ID_PROPS.find((prop) => attribs[prop]);
          if (id) {
            currentScope['@id'] = attribs[id];
          }
        }
        tag = this.TYPE;
        this.scopes.push(currentScope);
      } else if (attribs[this.PROP]) {
        if (
          currentScope[attribs[this.PROP]] &&
          !Array.isArray(currentScope[attribs[this.PROP]])
        ) {
          currentScope[attribs[this.PROP]] = [currentScope[attribs[this.PROP]]];
        }

        var value = this.#getPropValue(tagName, attribs);
        if (!value) {
          tag = this.PROP;
          if (Array.isArray(currentScope[attribs[this.PROP]])) {
            currentScope[attribs[this.PROP]].push('');
          } else {
            currentScope[attribs[this.PROP]] = '';
          }
          this.textForProp = attribs[this.PROP];
        } else {
          if (Array.isArray(currentScope[attribs[this.PROP]])) {
            currentScope[attribs[this.PROP]].push(value);
          } else {
            currentScope[attribs[this.PROP]] = value;
          }
        }
      }
    }
    if (!selfClosing) {
      this.tags.push(tag);
    }
  }

  #onText({ text }) {
    if (this.textForProp) {
      if (
        Array.isArray(this.scopes[this.scopes.length - 1][this.textForProp])
      ) {
        this.scopes[this.scopes.length - 1][this.textForProp][
          this.scopes[this.scopes.length - 1][this.textForProp].length - 1
        ] += text.trim();
      } else {
        this.scopes[this.scopes.length - 1][this.textForProp] += text.trim();
      }
    }
  }

  #onCloseTag({ sourceCodeLocation }) {
    const tag = this.tags.pop();
    if (tag === this.TYPE) {
      let scope = this.scopes.pop();

      if (this.options.embedSource && '@location' in scope) {
        scope['@source'] = this.html.slice(
          scope['@location'],
          sourceCodeLocation.endOffset,
        );
      }
      if (this.options.addLocation && '@location' in scope) {
        scope['@location'] =
          `${scope['@location']},${sourceCodeLocation.endOffset}`;
      } else if (!this.options.addLocation && '@location' in scope) {
        delete scope['@location'];
      }

      if (!scope['@context']) {
        delete scope['@context'];
      }
      Object.keys(scope).forEach((key) => {
        if (Array.isArray(scope[key]) && scope[key].length === 1) {
          scope[key] = scope[key][0];
        }
      });
    } else if (tag === this.PROP) {
      this.textForProp = false;
    }
  }

  parse() {
    this.parser.end(this.html);
    return this.topLevelScope;
  }
}
