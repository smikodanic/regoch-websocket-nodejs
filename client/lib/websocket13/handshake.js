const crypto = require('crypto');


/**
 * Websocket handshaking on the client side according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-4 )
 * @param {object} headers - HTTP headers sent from the server
 * @param {string} wsKey - value of the "Sec-Websocket-Key: aKaKNe70S+oNRHWRdM2iVQ==" header sent from the client to the server
 * @param {string[]} subprotocols - array of subprotocols proposed by the client and sent to the server, for example: ['wsuJson', 'xml']
 */
module.exports = (headers, wsKey, subprotocols) => {
  // create hash
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // Globally Unique Identifier (GUID)
  const hash = crypto
    .createHash('sha1')
    .update(wsKey + GUID)
    .digest('base64');


  // test received headers
  const err = new Error();
  if (!headers['connection'] || !/Upgrade/i.test(headers['connection'])) { err.message = 'Required "Connection: Upgrade" server response header.'; }
  else if (!headers['upgrade'] || !/websocket/i.test(headers['upgrade'])) { err.message = 'Required "Upgrade: websocket" server response header.'; }
  else if (!headers['sec-websocket-accept'] || headers['sec-websocket-accept'] !== hash) { err.message = `Required "Sec-Websocket-Key: ${hash}" server response header.`; }
  else if (!headers['sec-websocket-version'] || +headers['sec-websocket-version'] !== 13) { err.message = 'Required "Sec-Websocket-Version: 13" server response header.'; }
  else if (!!headers['sec-websocket-protocol'] && subprotocols.indexOf(headers['sec-websocket-protocol']) === -1) { err.message = `Client doesn\'t support subprotocol "${headers['sec-websocket-protocol']}" sent by the server.`; }

  if (!!err.message) { throw err; }

};
