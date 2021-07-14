/**
 * Subprotocol name: raw
 * HTTP header: "Sec-WebSocket-Protocol": "raw"
 *
 * Subprotocol description:
 *  The simplest subprotocol.
 */


class Raw {

  /*********** INCOMING MESSAGES ***********/
  /**
   * Execute the subprotocol for incoming messages.
   * @param {string} msgSTR -incoming message
   * @returns {string}
   */
  incoming(msgSTR) {
    const msg = msgSTR;
    return msg;
  }



  /*********** OUTGOING MESSAGES ***********/
  /**
   * Execute the subprotocol for outgoing messages.
   * @param {any} msg - outgoing message
   * @returns {string}
   */
  outgoing(msg) {
    let msgSTR = msg;
    if (typeof msg === 'object') { msgSTR = JSON.stringify(msg); }
    return msgSTR;
  }



  /*********** PROCESS MESSAGES ***********/
  /**
   * Process client messages internally.
   * @returns {void}
   */
  async process() {}


}


module.exports = new Raw();
