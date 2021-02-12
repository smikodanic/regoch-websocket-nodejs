/**
 * Websocket Client for NodeJS
 * - websocket version: 13
 * - subprotocol: jsonRWS
 */
const http = require('http');
const url_node = require('url');
const crypto = require('crypto');
const package_json = require('../package.json');
const { jsonRWS, DataParser, handshake, helper } = require('./lib');


class ClientNodejs extends DataParser {

  /**
   * @param {{wsURL:string, timeout:number, debug:boolean}} wcOpts - websocket client options
   */
  constructor(wcOpts) {
    super();
    this.wcOpts = wcOpts;
    this.version = 13;
    this.subprotocol = 'jsonRWS';

    this.ws;

    this.clientRequest; // client HTTP request
    this.socket; // TCP Socket https://nodejs.org/api/net.html#net_class_net_socket
  }



  /************* CLIENT CONNECTOR ************/
  /**
   * Connect to the websocket server.
   * @returns {void}
   */
  connect() {
    // http.request() options https://nodejs.org/api/http.html#http_http_request_url_options_callback
    const wsURL = this.wcOpts.wsURL; // websocket URL: ws://localhost:3211/something?authkey=TRTmrt
    const httpURL = wsURL.replace('ws://', 'http://');
    const urlObj  = new url_node.URL(httpURL);
    const hostname = urlObj.hostname;
    const port = urlObj.port;
    const path = !!urlObj.search ? urlObj.pathname + urlObj.search : urlObj.pathname;

    // create hash
    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // Globally Unique Identifier (GUID)
    this.wsKey = crypto
      .createHash('sha1')
      .update(GUID)
      .digest('base64');

    // send HTTP request
    const requestOpts = {
      hostname,
      port,
      path,
      method: 'GET',
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-Websocket-Key': this.wsKey,
        'Sec-WebSocket-Version': this.version,
        'Sec-WebSocket-Protocol': this.subprotocol,
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        'User-Agent': `@regoch/client-nodejs/${package_json.version}`
      }
    };
    this.clientRequest = http.request(requestOpts);
    this.clientRequest.end();

    this.onEvents();
    this.onUpgrade();

  }



  /**
   * Activate socket events. According to https://nodejs.org/api/net.html#net_class_net_socket.
   * @param {Socket} socket
   */
  onEvents() {
    this.clientRequest.on('socket', socket => {
      socket.on('connect', () => {
        console.log('WS Connection opened');
      });

      socket.on('close', () => {
        console.log('WS Connection closed');
      });

      socket.on('error', (err) => {
        console.log(err);
      });
    });
  }



  /**
   * When "Connection: Upgrade" header is sent from the server.
   * https://nodejs.org/api/http.html#http_event_upgrade
   * Notice: 'res.socket' is same as 'socket'
   */
  onUpgrade() {
    this.clientRequest.on('upgrade', (res, socket, firstDataChunk) => {
      // console.log('isSame:::', res.socket === socket); // true
      const headers = res.headers;
      this.socket = socket;

      /********** HANDSHAKE ***********/
      handshake(socket, headers, this.wsKey, this.subprotocol);

      /********** DATA TRANSFER ***********/
      this.onMessage();
    });

  }




  onMessage(cb) {
    this.socket.on('data', (buff) => {
      const msg = this.incoming(buff); // convert buffer to string
      console.log(msg);
      // this.debug('Received: ', msg);
      const msgObj = jsonRWS.incoming(msg); // convert string to object
      if(!!cb) { cb(msgObj); }
    });

  }





  /*********** HELPERS ************/
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
   * Debugger. Use it as this.debug(var1, var2, var3)
   * @returns {void}
   */
  debug(...textParts) {
    const text = textParts.join('');
    if (this.wcOpts.debug) { console.log(text); }
  }



}




module.exports = ClientNodejs;
