export class HTMLSAXParser {
  constructor() {
    this._events = {};
    this._buffer = '';
    this._currentTagStartPos = 0;
    this._currentTagEndPos = 0;
    this._lastTextEndPos = 0;
  }

  #emit(event, ...args) {
    if (!this._events[event]) {
      return false;
    }
    this._events[event].forEach((handler) => handler(...args));
    return true;
  }

  #emitStartTag(tagName, attrs, selfClosing, start, end) {
    this._currentTagStartPos = start;
    this._currentTagEndPos = end;
    this._lastTextEndPos = end;
    this.#emit('startTag', {
      tagName,
      attrs,
      selfClosing,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  #emitEndTag(tagName, start, end) {
    this._currentTagStartPos = start;
    this._currentTagEndPos = end;
    this._lastTextEndPos = end;
    this.#emit('endTag', {
      tagName,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  #parse(html) {
    this._buffer = html;
    let pos = 0;
    let textStart = 0;
    let inTag = false;
    let inScript = false;
    let scriptStart = 0;
    let inComment = false;

    while (pos < html.length) {
      if (inScript) {
        // Look for </script> while in script mode, but only at a tag boundary
        if (
          html[pos] === '<' &&
          html.slice(pos, pos + 9).toLowerCase() === '</script>'
        ) {
          // Found the end of script
          const scriptEnd = pos;
          // Emit the accumulated script content
          const content = html.slice(scriptStart, scriptEnd).trim();
          if (content) {
            this.#emit('text', {
              text: content,
              sourceCodeLocation: {
                startOffset: scriptStart,
                endOffset: scriptEnd,
              },
            });
          }
          pos += 9; // Skip past </script>
          textStart = pos;
          inScript = false;
          // Emit the end tag
          this.#emitEndTag('script', scriptEnd, pos);
          continue;
        }
        pos++;
        continue;
      }

      if (inComment) {
        // Look for --> while in comment mode, but handle nested comment-like structures
        if (
          html[pos] === '-' &&
          pos + 2 < html.length &&
          html.slice(pos, pos + 3) === '-->'
        ) {
          // End of comment
          inComment = false;
          pos += 3;
          textStart = pos;
          continue;
        }
        pos++;
        continue;
      }

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
          if (text.trim()) {
            this.#handleText(text, textStart, pos);
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
            } else if (char === quote && html[pos - 1] !== '\\') {
              // Only treat quote as closing if it's not escaped
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
            if (
              char === '\\' &&
              pos + 1 < html.length &&
              html[pos + 1] === quote
            ) {
              // Handle escaped quotes in attribute values
              attrValue += quote;
              pos++; // Skip the escape character
            } else {
              attrValue += char;
            }
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
          this.#emitEndTag(tagName, tagStart, pos);
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
            scriptStart = pos; // Start collecting content after the opening script tag
          }
          // For self-closing tags, include the '/' and '>' in the end offset
          const endPos = pos;
          this.#emitStartTag(tagName, attrs, selfClosing, tagStart, endPos);
          // Update textStart to be after the tag
          textStart = pos;
        }
      } else {
        pos++;
      }
    }

    // Handle any remaining text
    if (pos > textStart) {
      const text = html.slice(textStart, pos);
      if (text.trim()) {
        this.#handleText(text, textStart, pos);
      }
    }
  }

  #handleText(text, start, end) {
    if (text.trim() === '') {
      return;
    }

    this.#emit('text', {
      text,
      sourceCodeLocation: {
        startOffset: start,
        endOffset: end,
      },
    });
  }

  on(event, handler) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(handler);
    return this;
  }

  end(html) {
    this.#parse(html);
  }
}
