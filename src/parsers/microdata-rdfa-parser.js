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
    this.specName = specName.toLowerCase();
    this.options = options;

    this.errors = [];

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
    if (specName === 'microdata') {
      TYPE = 'itemtype';
      PROP = 'itemprop';
      ID_PROPS = ['href', 'itemid'];
    } else if (specName === 'rdfa') {
      TYPE = 'typeof';
      PROP = 'property';
      ID_PROPS = ['about', 'href', 'resource'];
    } else {
      throw new Error('Unsupported spec: use either microdata or rdfa');
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

  #getPropValue(tagName, selfClosing, attribs) {
    if (attribs[this.TYPE]) {
      return null;
    } else if (tagName === 'a' && attribs.href) {
      return attribs.href.trim();
    } else if (selfClosing) {
      const properties = ['src', 'content', 'href', 'resource'];
      const key = properties.find((property) => attribs[property]);
      if (key && attribs[key]) {
        return attribs[key].trim();
      } else {
        throw new Error(`No value found for ${tagName} tag`);
      }
    } else if (attribs.content) {
      return attribs.content.trim();
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

        let value = null;
        try {
          value = this.#getPropValue(tagName, selfClosing, attribs);
        } catch (error) {
          this.errors.push({
            message: error.message,
            format: this.specName,
            sourceCodeLocation,
            source: this.html.slice(
              sourceCodeLocation.startOffset,
              sourceCodeLocation.endOffset,
            ),
          });
        }
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

      if (
        (this.options.embedSource === true ||
          (Array.isArray(this.options.embedSource) &&
            this.options.embedSource.includes(this.specName))) &&
        '@location' in scope
      ) {
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

  #postProcess() {
    this.topLevelScope = this.#processMultiValueProps(this.topLevelScope);
  }

  /**
   * Process multi-value properties recursively and split them into individual properties
   */
  #processMultiValueProps(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.#processMultiValueProps(item));
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@')) {
          continue;
        }

        obj[key] = this.#processMultiValueProps(value);

        // Split the key by spaces to handle multi-value properties
        const propNames = key.trim().split(/\s+/);

        if (propNames.length > 1) {
          // Multi-value property: assign the same value to each individual property
          for (const propName of propNames) {
            if (propName) {
              obj[propName] = obj[key];
            }
          }
          delete obj[key];
        }
      }

      return obj;
    } else {
      return obj;
    }
  }

  parse() {
    this.parser.end(this.html);
    this.#postProcess();
    return { data: this.topLevelScope, errors: this.errors };
  }
}
