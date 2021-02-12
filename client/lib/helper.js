class Helper {

  /**
   * Get message size in bytes.
   * For example: A -> 1 , Š -> 2 , ABC -> 3
   * @param {string} msg - message sent to server
   * @returns {number}
   */
  getMessageSize(msg) {
    const bytes = new Blob([msg]).size;
    return +bytes;
  }


  /**
   * Pause the code execution
   * @param {number} ms - miliseconds
   * @returns {void}
   */
  async sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }


  /**
   * Create unique id. It's combination of wsOpts and random number 'r'
   * in format: YYMMDDHHmmssSSSrrr ---> YY year, MM month, DD day, HH hour, mm min, ss sec, SSS ms, rrr 3 random digits
   * 18 digits in total, for example: 210129163129492100
   * @returns {number}
   */
  generateID() {
    const rnd = Math.random() * 1000;
    const rrr = Math.floor(rnd);

    const timestamp = new Date();
    const tsp = timestamp.toISOString()
      .replace(/^20/, '')
      .replace(/\-/g, '')
      .replace(/\:/g, '')
      .replace('T', '')
      .replace('Z', '')
      .replace('.', '');

    const id = +(tsp + rrr);
    return id;
  }



}

const helper = new Helper();
module.exports = helper;
