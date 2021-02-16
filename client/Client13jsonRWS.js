/**
 * Websocket Client for NodeJS
 * - websocket version: 13
 * - subprotocol: jsonRWS
 */
const http = require('http');
const urlNode = require('url');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const package_json = require('../package.json');
const { jsonRWS, handshake, DataParser, helper, StringExt } = require('./lib');
// const DataParser = require('../../regoch-websocket-server/server/lib/websocket13/DataParser');
new StringExt();


class Client13jsonRWS extends DataParser {

  /**
   * @param {{wsURL:string, timeout:number, recconectAttempts:number, reconnectDelay:number, subprotocols:string[], debug:boolean}} wcOpts - websocket client options
   */
  constructor(wcOpts) {
    super(wcOpts.debug);

    this.wcOpts = wcOpts; // websocket client options
    this.socket; // TCP Socket https://nodejs.org/api/net.html#net_class_net_socket
    this.socketID; // socket ID number, for example: 210214082949459100
    this.attempt = 1; // reconnect attempt counter
    this.eventEmitter = new EventEmitter();

    this.wsKey; // the value of 'Sec-Websocket-Key' header
    this.clientRequest; // client HTTP request https://nodejs.org/api/http.html#http_class_http_clientrequest
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

    // to send 'Sec-WebSocket-Protocol' header

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
        'Sec-WebSocket-Version': 13,
        'Sec-WebSocket-Protocol': this.wcOpts.subprotocols.join(','),
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        'User-Agent': `@regoch/client-nodejs/${package_json.version}`
      }
    };
    this.clientRequest = http.request(requestOpts).on('error', err => {});
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
    this.socketWrite(closeBUF);
  }


  /**
   * Try to reconnect the client when the socket is closed.
   * This method is fired on every 'close' socket's event.
   */
  async reconnect() {
    const attempts = this.wcOpts.recconectAttempts;
    const delay = this.wcOpts.recconectDelay;

    if (this.attempt <= attempts) {
      await helper.sleep(delay);
      this.connect();
      console.log(`Reconnect attempt #${this.attempt} of ${attempts} in ${delay}ms`.cliBoja('yellow'));
      this.attempt++;
    }
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


      // hadError determine if the socket is closed due to emitted 'error' event
      socket.on('close', async (hadError) => {
        delete this.clientRequest;
        delete this.socket;
        delete this.socketID;
        if (hadError) {
          console.log('\nWS Connection closed due to internal error'.cliBoja('blue'));
        } else {
          console.log('\nWS Connection closed'.cliBoja('blue'));
          this.attempt = 1; // socket is probably closed because server is down, so reconnecting should start from the 1.st attempt
        }
        this.reconnect();
      });


      socket.on('error', (err) => {
        let errMsg = err.stack;

        if (/ECONNREFUSED/.test(err.stack)) {
          errMsg = `No connection to server ${this.wcOpts.wsURL}`;
        } else {
          this.wcOpts.recconectAttempts = 0; // do not reconnect
          this.disconnect();
        }

        console.log(errMsg.cliBoja('red'));
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
      try {
        this.socket = socket;
        handshake(res.headers, this.wsKey, this.wcOpts.subprotocols);
        this.socketID = await this.infoSocketId();
      } catch (err) {
        socket.emit('error', err);
      }
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
        this.socket.emit('error', err);
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
      console.log('Opcode 0x8: Server closed wthe websocket connection'.cliBoja('yellow'));
      this.eventEmitter.emit('close');
    } else if (msgSTR === 'OPCODE 0x9 PING') {
      if (this.wcOpts.debug) { console.log('Opcode 0x9: PING received'.cliBoja('yellow')); }
      this.eventEmitter.emit('ping');
    } else if (msgSTR === 'OPCODE 0xA PONG') {
      if (this.wcOpts.debug) { console.log('Opcode 0xA: PONG received'.cliBoja('yellow')); }
      this.eventEmitter.emit('pong');
    }
  }


  /**
   * Send PING to server n times, every ms miliseconds
   * @param {number} ms - sending interval
   * @param {number} n - how many times to send ping (if 0 or undefined send infinitely)
   */
  async ping(ms, n) {
    if (!!n) {
      for (let i = 1; i <= n; i++) {
        const pingBUF = this.ctrlPing();
        this.socketWrite(pingBUF);
        await helper.sleep(ms);
      }
    } else {
      const pingBUF = this.ctrlPing();
      this.socketWrite(pingBUF);
      await helper.sleep(ms);
      this.ping(ms);
    }
  }




  /******************************* QUESTIONS ******************************/
  /*** Send a question to the websocket server and wait for the answer. ***/

  /**
   * Send question and expect the answer.
   * @param {string} cmd - command
   * @returns {Promise<object>}
   */
  question(cmd) {
    // send the question
    const to = this.socketID;
    const payload = undefined;
    this.carryOut(to, cmd, payload);

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
  carryOut(to, cmd, payload) {
    const id = helper.generateID(); // the message ID
    const from = +this.socketID; // the sender ID
    if (!to) { to = 0; } // server ID is 0
    const msgObj = {id, from, to, cmd, payload};
    const msg = jsonRWS.outgoing(msgObj);

    // the message must be defined and client must be connected to the server
    if (!!msg && !!this.socket && this.socket.readyState === 'open') {
      const msgBUF = this.outgoing(msg, 1);
      this.socketWrite(msgBUF);
    } else {
      throw new Error('The message is not defined or the client is disconnected.');
    }
  }


  /**
   * Check if socket is writable and send message in buffer format.
   * @param {Buffer} msgBUF - message to server
   * @returns {void}
   */
  socketWrite(msgBUF) {
    if (!!this.socket && this.socket.writable) {
      this.socket.write(msgBUF);
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
    this.carryOut(to, cmd, payload);
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
