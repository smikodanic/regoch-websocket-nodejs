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
const { jsonRWS, raw, handshake, DataParser, helper, StringExt, Router } = require('./lib');
new StringExt();


class Client13jsonRWS extends DataParser {

  /**
   * @param {{wsURL:string, questionTimeout:number, reconnectAttempts:number, reconnectDelay:number, subprotocols:string[], debug:boolean}} wcOpts - websocket client options
   */
  constructor(wcOpts) {
    super(wcOpts.debug);

    this.wcOpts = wcOpts; // websocket client options
    this.socket; // TCP Socket https://nodejs.org/api/net.html#net_class_net_socket
    this.socketID; // socket ID number, for example: 210214082949459100
    this.attempt = 1; // reconnect attempt counter
    this.resHeaders; // onUpgrade response headers
    this.subprotocolLib;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(8);

    this.wsKey; // the value of 'Sec-Websocket-Key' header
    this.clientRequest; // client HTTP request https://nodejs.org/api/http.html#http_class_http_clientrequest
    this.onProcessEvents();

    this.router = new Router({debug: this.wcOpts.debug});
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
        'Sec-WebSocket-Version': 13,
        'Sec-WebSocket-Protocol': this.wcOpts.subprotocols.join(','),
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        'User-Agent': `@regoch/client-nodejs/${package_json.version}`
      }
    };
    this.clientRequest = http.request(requestOpts);
    this.clientRequest.on('error', err => { console.log(err); });
    this.clientRequest.end();


    // socket events
    this.onEvents();
    this.onUpgrade();

    // return socket as promise
    return new Promise(resolve => {
      // this.eventEmitter.removeAllListeners(); // not needed if once() is used
      this.eventEmitter.once('connected', () => { resolve(this.socket); });
      // console.log(`"connected" listeners: ${this.eventEmitter.listenerCount('connected')}`.cliBoja('yellow'));
    });
  }


  /**
   * Disconnect from the websocket server.
   * @returns {void}
   */
  async disconnect() {
    this.blockReconnect();
    const closeBUF = this.ctrlClose(1);
    await this.socketWrite(closeBUF);
  }


  /**
   * Try to reconnect the client when the socket is closed.
   * This method is fired on every 'close' socket's event.
   */
  async reconnect() {
    const attempts = this.wcOpts.reconnectAttempts;
    const delay = this.wcOpts.reconnectDelay;

    if (this.attempt <= attempts) {
      await helper.sleep(delay);
      this.connect();
      console.log(`Reconnect attempt #${this.attempt} of ${attempts} in ${delay}ms`.cliBoja('blue', 'bright'));
      this.attempt++;
    }
  }


  /**
   * Block reconnect usually after disconnect() method is used.
   */
  blockReconnect() {
    this.attempt = this.wcOpts.reconnectAttempts + 1;
  }




  /************ EVENTS **************/
  /**
   * Catch NodeJS process events and disconnect the client.
   * For example disconnect on crtl+c or on uncaught exception.
   */
  onProcessEvents() {
    process.on('cleanup', this.disconnect.bind(this));

    process.on('exit', () => {
      process.emit('cleanup');
    });

    // catch ctrl+c event and exit normally
    process.on('SIGINT', () => {
      process.exit(2);
    });

    // catch uncaught exceptions, log, then exit normally
    process.on('uncaughtException', (err) => {
      console.log(err.stack.cliBoja('red'));
      process.exit();
    });

    process.on('unhandledRejection', (err) => {
      console.log(err.stack.cliBoja('red'));
      process.exit();
    });
  }


  /**
   * Socket events. According to https://nodejs.org/api/net.html#net_class_net_socket.
   * @param {Socket} socket
   */
  onEvents() {
    this.clientRequest.on('socket', socket => {
      socket.on('connect', () => {
        console.log(`WS Connection opened`.cliBoja('blue'));
        this.attempt = 1;
      });


      // hadError determine if the socket is closed due to emitted 'error' event
      socket.on('close', hadError => {
        console.log(`WS Connection closed`.cliBoja('blue'));
        delete this.clientRequest;
        delete this.socket;
        delete this.socketID;
        this.reconnect();
      });


      socket.on('error', (err) => {
        let errMsg = err.stack;
        if (/ECONNREFUSED/.test(err.stack)) {
          errMsg = `No connection to server ${this.wcOpts.wsURL}`;
        } else {
          this.wcOpts.reconnectAttempts = 0; // do not reconnect
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

      this.resHeaders = res.headers;
      /*res.headers:: {
          connection: 'Upgrade',
          upgrade: 'Websocket',
          'sec-websocket-accept': 'ZPDSZnqDz3a54R5E3LM8k9xMEkw=',
          'sec-websocket-version': '13',
          'sec-websocket-protocol': 'jsonRWS',
          'sec-websocket-server-version': '1.1.9',
          'sec-websocket-socketid': '210714060202279680',
          'sec-websocket-timeout': '604800000'
        }*/

      try {
        this.socket = socket;
        handshake(this.resHeaders, this.wsKey, this.wcOpts.subprotocols);
        this.socketID = this.resHeaders['sec-websocket-socketid'];

        const subprotocol = this.resHeaders['sec-websocket-protocol']; // subprotocol supported by the server
        if (subprotocol === 'raw') { this.subprotocolLib = raw; }
        if (subprotocol === 'jsonRWS') { this.subprotocolLib = jsonRWS; }
        else { this.subprotocolLib = raw; }

        console.log(`
        socketID: ${this.socketID},
        subprotocol(handshaked): "${subprotocol}",
        timeout(inactivity): ${this.resHeaders['sec-websocket-timeout']}ms,
        client(IP:PORT): ${socket.localAddress}:${socket.localPort}
        `.cliBoja('blue'));


        this.eventEmitter.emit('connected');
        this.onMessage(false, true); // emits the messages to eventEmitter
      } catch (err) {
        socket.emit('error', err);
      }
    });
  }


  /**
   * Receive the message event and push it to msgStream.
   * @param {Function} cb - callback function
   * @param {boolean} toEmit - to emit the message into the eventEmitter
   * @returns {void}
   */
  onMessage(cb, toEmit) {
    const subprotocol = this.resHeaders['sec-websocket-protocol']; // jsonRWS || raw
    const msgBUFarr = [];

    this.socket.on('data', msgBUFchunk => {
      try {
        msgBUFarr.push(msgBUFchunk);
        const msgBUF = Buffer.concat(msgBUFarr);
        const msgSTR = this.incoming(msgBUF); // convert buffer to string

        const delimiter_reg = new RegExp(this.subprotocolLib.delimiter);
        if (!delimiter_reg.test(msgSTR)) { return; }

        let msg;
        if (/OPCODE 0x/.test(msgSTR)) {
          this.opcodes(msgSTR);
        } else {
          msg = this.subprotocolLib.incoming(msgSTR);
        }

        if(!!cb) { cb(msg, msgSTR, msgBUF); }

        if (!!toEmit) {
          if (msg.cmd === 'route' && subprotocol === 'jsonRWS') { this.eventEmitter.emit('route', msg, msgSTR, msgBUF); }
          else { this.eventEmitter.emit('message', msg, msgSTR, msgBUF); }
        }

      } catch (err) {
        this.eventEmitter.emit('message-error', err);
      }
    });


  }


  /**
   * Parse websocket operation codes according to https://tools.ietf.org/html/rfc6455#section-5.1
   * @param {string} msgSTR - received message
   */
  opcodes(msgSTR) {
    if (msgSTR === 'OPCODE 0x8 CLOSE') {
      console.log('Opcode 0x8: Server closed the websocket connection'.cliBoja('yellow'));
      this.eventEmitter.emit('closed-by-server');
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
        await this.socketWrite(pingBUF);
        await helper.sleep(ms);
      }
    } else {
      const pingBUF = this.ctrlPing();
      await this.socketWrite(pingBUF);
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
      this.onMessage(msgObj => {
        if (msgObj.cmd === cmd) { resolve(msgObj); }
      }, false);
      await helper.sleep(this.wcOpts.questionTimeout);
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
   * Send message to the websocket server after the message is processed by subprotocol and DataParser.
   * @returns {void}
   */
  async carryOut(to, cmd, payload) {
    const id = helper.generateID(); // the message ID
    const from = +this.socketID; // the sender ID
    if (!to) { to = 0; } // server ID is 0
    const msgObj = {id, from, to, cmd, payload};
    const msg = jsonRWS.outgoing(msgObj);

    // the message must be defined and client must be connected to the server
    if (!!msg) {
      const msgBUF = this.outgoing(msg, 1);
      await new Promise(r => setTimeout(r, 100));
      await this.socketWrite(msgBUF);
    } else {
      throw new Error('The message is not defined.');
    }
  }


  /**
   * Check if socket is writable and not closed (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)
   * and send message in buffer format.
   * @param {Buffer} msgBUF - message to server
   * @returns {void}
   */
  async socketWrite(msgBUF) {
    if (!!this.socket && this.socket.writable && this.socket.readyState === 'open') {
      await new Promise(resolve => {
        this.socket.write(msgBUF, () => { resolve(); });
      });
    } else {
      this.debugger('Socket is not writeble or doesn\'t exist');
    }
  }


  /**
   * Send message (payload) to one client.
   * @param {number} to - 210201164339351900
   * @param {any} msg - message sent to the client
   * @returns {void}
   */
  async sendOne(to, msg) {
    const cmd = 'socket/sendone';
    const payload = msg;
    await this.carryOut(to, cmd, payload);
  }


  /**
   * Send message (payload) to one or more clients.
   * @param {number[]} to - [210205081923171300, 210205082042463230]
   * @param {any} msg - message sent to the clients
   * @returns {void}
   */
  async send(to, msg) {
    const cmd = 'socket/send';
    const payload = msg;
    await this.carryOut(to, cmd, payload);
  }


  /**
   * Send message (payload) to all clients except the sender.
   * @param {any} msg - message sent to the clients
   * @returns {void}
   */
  async broadcast(msg) {
    const to = 0;
    const cmd = 'socket/broadcast';
    const payload = msg;
    await this.carryOut(to, cmd, payload);
  }

  /**
   * Send message (payload) to all clients and the sender.
   * @param {any} msg - message sent to the clients
   * @returns {void}
   */
  async sendAll(msg) {
    const to = 0;
    const cmd = 'socket/sendall';
    const payload = msg;
    await this.carryOut(to, cmd, payload);
  }



  /************* ROOM ************/
  /**
   * Subscribe in the room.
   * @param {string} roomName
   * @returns {void}
   */
  async roomEnter(roomName) {
    const to = 0;
    const cmd = 'room/enter';
    const payload = roomName;
    await this.carryOut(to, cmd, payload);
  }

  /**
   * Unsubscribe from the room.
   * @param {string} roomName
   * @returns {void}
   */
  async roomExit(roomName) {
    const to = 0;
    const cmd = 'room/exit';
    const payload = roomName;
    await this.carryOut(to, cmd, payload);
  }

  /**
   * Unsubscribe from all rooms.
   * @returns {void}
   */
  async roomExitAll() {
    const to = 0;
    const cmd = 'room/exitall';
    const payload = undefined;
    await this.carryOut(to, cmd, payload);
  }

  /**
   * Send message to the room.
   * @param {string} roomName
   * @param {any} msg
   * @returns {void}
   */
  async roomSend(roomName, msg) {
    const to = roomName;
    const cmd = 'room/send';
    const payload = msg;
    await this.carryOut(to, cmd, payload);
  }



  /********* SEND MESSAGE (COMMAND) TO SERVER *********/
  /**
   * Setup a nick name.
   * @param {string} nickname - nick name
   * @returns {void}
   */
  async setNick(nickname) {
    const to = 0;
    const cmd = 'socket/nick';
    const payload = nickname;
    await this.carryOut(to, cmd, payload);
  }


  /**
   * Send route command.
   * @param {string} uri - route URI, for example /shop/product/55
   * @param {any} body - body
   * @returns {void}
   */
  async route(uri, body) {
    const to = 0;
    const cmd = 'route';
    const payload = {uri, body};
    await this.carryOut(to, cmd, payload);
  }





  /*********** MISC ************/
  /**
   * Debugger. Use it as this.debugger(var1, var2, var3)
   * @returns {void}
   */
  debugger(...textParts) {
    const text = textParts.join(' ');
    if (this.wcOpts.debug) { console.log(text.cliBoja('yellow')); }
  }

  /**
   * Wrapper around the eventEmitter
   * @param {string} eventName - event name: 'connected', 'closed-by-server', 'ping', 'pong', 'message', 'message-error',  'route'
   * @param {Function} listener - callback function
   */
  on(eventName, listener) {
    return this.eventEmitter.on(eventName, listener);
  }

  /**
   * Wrapper around the eventEmitter
   * @param {string} eventName - event name: 'connected', 'closed-by-server', 'ping', 'pong', 'message', 'message-error' (error in the received message, usually jsonRWS errors),  'route'
   * @param {Function} listener - callback function
   */
  once(eventName, listener) {
    return this.eventEmitter.once(eventName, listener);
  }



}




module.exports = Client13jsonRWS;
