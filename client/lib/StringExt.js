/**
 * Extended String methods
 */

class StringExt {

  constructor() {
    this._trimall();
    this._clean();
    this._beautify();
    this._cliBoja();
  }


  /**
   * Trim empty spaces from left and right and remove tab spaces inside text
   * @param string str - string to be modified
   * @return string - modified string is returned
   */
  _trimall() {
    Object.assign(String.prototype, {
      trimall() {
        let that = this;
        that = that.trim();
        that = that.replace(/\t\t+/g, ' ');
        that = that.replace(/\s\s+/g, ' ');
        that = that.replace(/\n\n+/g, '\n');
        that = that.replace(/\r\r+/g, '\r');
        that = that.replace(/\. /g, '.\r'); //new sentence in new line
        return this;
      }
    });
  }


  /**
   * Remove all whitespaces.
   * @param str - input string
   */
  _clean() {
    Object.assign(String.prototype, {
      clean() {
        let that = this;
        that = that.trim();
        that = that.replace(/\\s+/g, ' ');
        that = that.replace(/\\n+/g, '');
        that = that.replace(/\\r+/g, '');
        that = that.replace(/\\t+/g, '');
        return that;
      }
    });
  }


  /**
   * Clear text from unwanted characters
   * @param string str - string to be modified
   * @return string - modified string is returned
   */
  _beautify() {
    Object.assign(String.prototype, {
      beautify() {
        let that = this;
        that = that.replace(/_/g, ' ');
        that = that.replace(/:/g, '');
        that = that.replace(/\./g, '');
        return this;
      }
    });
  }


  /**
   * Format string for the CLI
   * @return string - modified string is returned
   */
  _cliBoja() {
    Object.assign(String.prototype, {
      cliBoja(optFG, optSPEC) {
        let that = this;

        const c = {
          reset: '\x1b[0m',
          bright: '\x1b[1m',
          bold: '\x1b[2m',
          italic: '\x1b[3m',
          underscore: '\x1b[4m',
          blink: '\x1b[5m',
          reverse: '\x1b[7m',
          hidden: '\x1b[8m',
          overwritten: '\x1b[9m',

          fg: {
            black: '\x1b[30m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            crimson: '\x1b[38m' // Scarlet
          },
          bg: {
            black: '\x1b[40m',
            red: '\x1b[41m',
            green: '\x1b[42m',
            yellow: '\x1b[43m',
            blue: '\x1b[44m',
            magenta: '\x1b[45m',
            cyan: '\x1b[46m',
            white: '\x1b[47m',
            crimson: '\x1b[48m'
          }
        };

        that = that.replace(/\n/g, '__newline__');

        if (!!optFG && !optSPEC) {
          that = that.replace(/(.*)/, `${c.fg[optFG]}$1${c.reset}`);
        } else if (!!optFG && !!optSPEC) {
          that = that.replace(/(.*)/, `${c.fg[optFG]}${c[optSPEC]}$1${c.reset}`);
        }

        that = that.replace(/__newline__/g, '\n');

        return that;
      }
    });
  }


}


module.exports = StringExt; // CommonJS Modules
// export { StringExt }; // ES6 module
