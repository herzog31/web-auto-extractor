export class HTMLSAXParser {
  constructor() {
    this._events = {};
    this._buffer = '';
    this._currentTagStartPos = 0;
    this._currentTagEndPos = 0;
    this._lastTextEndPos = 0;
  }

  on(event, handler) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(handler);
    return this;
  }

  addListener(event, handler) {
    return this.on(event, handler);
  }

  emit(event, ...args) {
    if (!this._events[event]) {
      return false;
    }
    this._events[event].forEach((handler) => handler(...args));
    return true;
  }

  _emitStartTag(tagName, attrs, selfClosing, start, end) {
    this._currentTagStartPos = start;
    this._currentTagEndPos = end;
    this._lastTextEndPos = end;
    this.emit('startTag', {
      tagName,
      attrs,
      selfClosing,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  _emitEndTag(tagName, start, end) {
    this._currentTagStartPos = start;
    this._currentTagEndPos = end;
    this._lastTextEndPos = end;
    this.emit('endTag', {
      tagName,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  parse(html) {
    this._buffer = html;
    let pos = 0;
    let textStart = 0;
    let inTag = false;
    let inScript = false;
    let scriptContent = '';
    let scriptStart = 0;
    let inComment = false;

    while (pos < html.length) {
      if (html[pos] === '<') {
        // Check for comments
        if (pos + 3 < html.length && html.slice(pos, pos + 4) === '<!--') {
          inComment = true;
          pos += 4;
          continue;
        }

        // Check for DOCTYPE
        if (
          pos + 8 < html.length &&
          html.slice(pos, pos + 9).toUpperCase() === '<!DOCTYPE'
        ) {
          // Skip DOCTYPE declaration
          while (pos < html.length && html[pos] !== '>') {
            pos++;
          }
          if (pos < html.length) pos++; // Skip the closing '>'
          continue;
        }

        // Handle any text content before this tag
        if (!inTag && pos > textStart) {
          const text = html.slice(textStart, pos);
          if (!inScript && !inComment) {
            this._handleText(text, textStart, pos);
          } else if (inScript) {
            scriptContent = text;
          }
        }
        inTag = true;
        const tagStart = pos;
        pos++;

        // Check if it's an end tag
        const isEndTag = html[pos] === '/';
        if (isEndTag) pos++;

        // Get tag name
        let tagName = '';
        while (pos < html.length && /[a-zA-Z0-9]/.test(html[pos])) {
          tagName += html[pos];
          pos++;
        }

        // Parse attributes
        const attrs = [];
        let attrName = '';
        let attrValue = '';
        let inAttr = false;
        let inValue = false;
        let quote = '';

        while (pos < html.length && html[pos] !== '>') {
          const char = html[pos];

          if (!inAttr && /[a-zA-Z]/.test(char)) {
            inAttr = true;
            attrName = char;
          } else if (inAttr && !inValue && char === '=') {
            inValue = true;
            pos++; // Skip the equals sign
            // Skip any whitespace after the equals sign
            while (pos < html.length && /\s/.test(html[pos])) {
              pos++;
            }
            continue;
          } else if (inAttr && !inValue && /\s/.test(char)) {
            attrs.push({ name: attrName, value: '' });
            inAttr = false;
            attrName = '';
          } else if (
            inValue &&
            (char === '"' || char === "'" || char === '`')
          ) {
            if (!quote) {
              quote = char;
            } else if (char === quote) {
              attrs.push({ name: attrName, value: attrValue });
              inAttr = false;
              inValue = false;
              attrName = '';
              attrValue = '';
              quote = '';
            } else {
              attrValue += char;
            }
          } else if (inAttr && !inValue) {
            attrName += char;
          } else if (inValue && quote) {
            attrValue += char;
          } else if (inValue && !quote) {
            // Handle unquoted attribute values
            if (/[\s>]/.test(char)) {
              attrs.push({ name: attrName, value: attrValue });
              inAttr = false;
              inValue = false;
              attrName = '';
              attrValue = '';
              if (char === '>') {
                pos--; // Back up one character to handle the '>' in the next iteration
                break;
              }
            } else {
              attrValue += char;
            }
          }

          pos++;
        }

        // Handle any remaining attribute
        if (inAttr) {
          if (inValue) {
            attrs.push({ name: attrName, value: attrValue });
          } else {
            attrs.push({ name: attrName, value: '' });
          }
        }

        // Skip the closing '>'
        pos++;
        inTag = false;
        textStart = pos;

        // Handle the tag
        if (isEndTag) {
          if (tagName.toLowerCase() === 'script') {
            inScript = false;
            if (scriptContent.trim()) {
              this.emit('text', {
                text: scriptContent,
                sourceCodeLocation: {
                  startOffset: scriptStart,
                  endOffset: tagStart,
                },
              });
            }
          }
          this._emitEndTag(tagName, tagStart, pos);
        } else {
          const selfClosing = html[pos - 2] === '/';
          if (
            tagName.toLowerCase() === 'script' &&
            attrs.find(
              (attr) =>
                attr.name === 'type' && attr.value === 'application/ld+json',
            )
          ) {
            inScript = true;
            scriptStart = pos;
          }
          // For self-closing tags, include the '/' and '>' in the end offset
          const endPos = pos;
          this._emitStartTag(tagName, attrs, selfClosing, tagStart, endPos);
          // Update textStart to be after the tag
          textStart = pos;
        }
      } else if (
        inComment &&
        pos + 2 < html.length &&
        html.slice(pos, pos + 3) === '-->'
      ) {
        // End of comment
        inComment = false;
        pos += 3;
        textStart = pos;
      } else {
        pos++;
      }
    }

    // Handle any remaining text
    if (pos > textStart) {
      const text = html.slice(textStart, pos);
      if (!inScript && !inComment) {
        this._handleText(text, textStart, pos);
      }
    }
  }

  _handleText(text, start, end) {
    if (text.trim() === '') {
      return;
    }

    this.emit('text', {
      text,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  end(html) {
    this.parse(html);
  }
}
