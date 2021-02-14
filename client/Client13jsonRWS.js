/**
 * Websocket Client for NodeJS
 * - websocket version: 13
 * - subprotocol: jsonRWS
 */
const http = require('http');
const urlNode = require('url');
const crypto = require('crypto');
const package_json = require('../package.json');
const { jsonRWS, handshake, helper, StringExt } = require('./lib');
const DataParser = require('../../regoch-websocket-server/server/lib/websocket13/DataParser');
new StringExt();


class Client13jsonRWS extends DataParser {

  /**
   * @param {{wsURL:string, timeout:number, debug:boolean}} wcOpts - websocket client options
   */
  constructor(wcOpts) {
    super(wcOpts.debug);
    this.wcOpts = wcOpts; // websocket client options
    this.version = 13;
    this.subprotocol = 'jsonRWS';

    this.clientRequest; // client HTTP request https://nodejs.org/api/http.html#http_class_http_clientrequest
    this.socket; // TCP Socket https://nodejs.org/api/net.html#net_class_net_socket
    this.socketID; // socket ID number, for example: 210214082949459100
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
    const urlObj  = new urlNode.URL(httpURL);
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

    // socket events
    this.onEvents();
    this.onUpgrade();
  }


  /**
   * Disconnect from the websocket server.
   * @returns {void}
   */
  disconnect() {
    const closeBUF = this.ctrlClose(1);
    this.socket.write(closeBUF);
    this.socket.destroy();
  }



  /**
   * Activate socket events. According to https://nodejs.org/api/net.html#net_class_net_socket.
   * @param {Socket} socket
   */
  onEvents() {
    this.clientRequest.on('socket', socket => {
      socket.on('connect', () => {
        console.log('WS Connection opened'.cliBoja('blue'));
      });

      socket.on('close', () => {
        console.log('WS Connection closed'.cliBoja('blue'));
      });

      socket.on('error', (err) => {
        console.log(err.stack.cliBoja('red'));
      });
    });
  }



  /**
   * When "Connection: Upgrade" header is sent from the server.
   * https://nodejs.org/api/http.html#http_event_upgrade
   * Notice: 'res.socket' is same as 'socket'
   */
  onUpgrade() {
    this.clientRequest.on('upgrade', async (res, socket, firstDataChunk) => {
      // console.log('isSame:::', res.socket === socket); // true
      this.socket = socket;
      this.socketID = await this.infoSocketId();
      const headers = res.headers;
      handshake(socket, headers, this.wsKey, this.subprotocol);
    });

  }



  /************* RECEIVER ************/
  /**
   * Receive the message event and push it to msgStream.
   * @param {Function} - callback function
   * @returns {void}
   */
  onMessage(cb) {
    this.socket.on('data', (buff) => {
      try {

        const msgSTR = this.incoming(buff); // convert buffer to string

        if (!/OPCODE 0x/.test(msgSTR)) {
          const msgObj = jsonRWS.incoming(msgSTR); // convert string to object
          if(!!cb) { cb(msgObj); }
        } else {
          this.opcodes(msgSTR, this.socket);
        }

      } catch (err) {
        console.log(err.stack.cliBoja('red'));
      }
    });
  }


  /**
   * Parse websocket operation codes according to https://tools.ietf.org/html/rfc6455#section-5.1
   * @param {string} msgSTR - received message
   * @param {Socket} socket
   */
  opcodes(msgSTR, socket) {
    if (msgSTR === 'OPCODE 0x8 CLOSE') {
      throw new Error('Opcode 0x8: Websocket connection is closed by the server.');
    } else if (msgSTR === 'OPCODE 0x9 PING') {
      console.log('PING received');
    } else if (msgSTR === 'OPCODE 0xA PONG') {
      console.log('PONG received');
    }
  }



  /************* QUESTIONS ************/
  /*** Send a question to the websocket server and wait for the answer. */
  /**
   * Send question and expect the answer.
   * @param {string} cmd - command
   * @returns {Promise<object>}
   */
  question(cmd) {
    // send the question
    const payload = undefined;
    const to = this.socketID;
    this.carryOut(cmd, payload, to);

    // receive the answer
    return new Promise(async (resolve, reject) => {
      this.onMessage(async (msgObj) => {
        if (msgObj.cmd === cmd) { resolve(msgObj); }
      });
      await helper.sleep(this.wcOpts.timeout);
      reject(new Error(`No answer for the question: ${cmd}`));
    });
  }

  /**
   * Send question about my socket ID.
   * @returns {Promise<number>}
   */
  async infoSocketId() {
    const answer = await this.question('info/socket/id');
    this.socketID = +answer.payload;
    return this.socketID;
  }

  /**
   * Send question about all socket IDs connected to the server.
   * @returns {Promise<number[]>}
   */
  async infoSocketList() {
    const answer = await this.question('info/socket/list');
    return answer.payload;
  }

  /**
   * Send question about all rooms in the server.
   * @returns {Promise<{name:string, socketIds:number[]}[]>}
   */
  async infoRoomList() {
    const answer = await this.question('info/room/list');
    return answer.payload;
  }

  /**
   * Send question about all rooms where the client was entered.
   * @returns {Promise<{name:string, socketIds:number[]}[]>}
   */
  async infoRoomListmy() {
    const answer = await this.question(`info/room/listmy`);
    return answer.payload;
  }



  /************* SEND MESSAGE TO OTHER CLIENTS ************/
  /**
   * Send message to the websocket server if the connection is not closed (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState).
   * @returns {void}
   */
  carryOut(cmd, payload, to) {
    const id = helper.generateID(); // the message ID
    const from = +this.socketID; // the sender ID
    if (!to) { to = 0; } // server ID is 0
    const msgObj = {id, from, to, cmd, payload};
    const msg = jsonRWS.outgoing(msgObj);

    // the message must be defined and client must be connected to the server
    if (!!msg && !!this.socket && this.socket.readyState === 'open') {
      const msgBUF = this.outgoing(msg, 1);
      this.socket.write(msgBUF);
    } else {
      throw new Error('The message is not defined or the client is disconnected.');
    }
  }


  /**
   * Send message (payload) to one client.
   * @param {number} to - 210201164339351900
   * @param {any} msg - message sent to the client
   * @returns {void}
   */
  sendOne(to, msg) {
    const cmd = 'socket/sendone';
    const payload = msg;
    this.carryOut(cmd, payload, to);
  }


  sendRaw(msg) {
    const msgBUF = this.outgoing(msg, 1);
    this.socket.write(msgBUF);
  }



  /**
   * Send PING to server n times, every ms miliseconds
   * @param {number} n - how many times to send ping
   * @param {number} ms - sending interval
   */
  async ping(n, ms) {
    for (let i = 0; i <= n; i++) {
      const pingBUF = this.ctrlPing();
      this.socket.write(pingBUF);
      console.log('ping...');
      await helper.sleep(ms);
    }
  }





  /*********** HELPERS ************/
  /**
   * Get message size in bytes.
   * For example: A -> 1 , Š -> 2 , ABC -> 3
   * @param {string} msg - message sent to server
   * @returns {number}
   */
  getMessageSize(msg) {
    const bytes = Buffer.byteLength(msg, 'utf8');
    return +bytes;
  }


  /**
   * Debugger. Use it as this.debug(var1, var2, var3)
   * @returns {void}
   */
  debugger(...textParts) {
    const text = textParts.join('');
    if (this.wcOpts.debug) { console.log(text); }
  }



}




module.exports = Client13jsonRWS;
