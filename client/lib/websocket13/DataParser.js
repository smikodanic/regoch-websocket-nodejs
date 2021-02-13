/**
 * Data parser according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-5 )
 */
class DataParser {

  constructor(debug) {
    this.debug = debug || false;
  }


  /**
   * Parse incoming message.
   * Convert buffer to string according to RFC6455 standard https://tools.ietf.org/html/rfc6455#section-5.2 .
   * @param {Buffer} msgBUF - the websocket message buffer
   * @return {String} - unmasked payload string message
   */
  incoming(msgBUF) {
    // 1.st byte
    const byte_1 = msgBUF.readUInt8(0);
    const fin = byte_1 >>> 7; // is final fragment
    const rsv1 = (byte_1 & 0b01000000) >>> 6; // reserved
    const rsv2 = (byte_1 & 0b00100000) >>> 5; // reserved
    const rsv3 = (byte_1 & 0b00010000) >>> 4; // reserved
    const opcode = (byte_1 & 0b00001111); // operational code (non-control or control frame) - https://tools.ietf.org/html/rfc6455#section-5.2

    // 2.nd byte
    const byte_2 = msgBUF.readUInt8(1);
    const mask = byte_2 >>> 7; // messages sent from client mask=1. messages sent from server mask=0
    const plen_byte2 = byte_2 & 0b01111111; // payload length defined in the second byte


    // do not parse message if the connection is closed
    if (opcode === 0x8) {
      throw new Error('Opcode 0x8: Websocket connection is closed by the client.');
    }


    /* Extract payload length, masking keys and payload buffer.
     * Notice 1: If plen=126 then extend plen with 2 bytes (16bits). If plen=127 extend plen with 8 bytes (64bits).
     * Notice 2: Masking keys are always 4 bytes and after payload length.
     * Notice 3: Masked messages are always sent from client to server. Messages sent from server to client are not masked.
     * Notice 4: Payload bytes are always after mask keys.
     */
    let plen; // payload length in bytes
    let mask_keys; // masking keys exists only when message is sent from client to server
    let payload_buff; // sliced mesage buffer to get only payload buffer part
    let payload_buff_unmasked; // unmasked paylod as buffer
    let payload_str; // unmasked payload as string

    ///// SMALL messages (0 <= bytes < 126 ~ 0b1111110) /////
    if (plen_byte2 < 126) {
      plen = plen_byte2;
      payload_buff = msgBUF.slice(2, 2 + plen);

      if (mask === 1) {
        const byte_3 = msgBUF.readUInt8(2);
        const byte_4 = msgBUF.readUInt8(3);
        const byte_5 = msgBUF.readUInt8(4);
        const byte_6 = msgBUF.readUInt8(5);
        mask_keys = [byte_3, byte_4, byte_5, byte_6];
        payload_buff = msgBUF.slice(6, 6 + plen);
        const payload_nums_unmasked = this.masking(payload_buff, mask_keys); // unmask the payload
        payload_buff_unmasked = Buffer.from(payload_nums_unmasked); // get buffer from array of bytes (numbers)
        payload_str = payload_buff_unmasked.toString('utf8'); // convert unmasked payload buffer to string
      } else {
        payload_str = payload_buff.toString('utf8');
      }

    ///// MEDIUM messages (126 <= bytes <= 2^16 ~ 65536) /////
    } else if (plen_byte2 === 126) {
      const byte_34 = msgBUF.readUInt16BE(1); // byte 3 and 4
      plen = byte_34;
      payload_buff = msgBUF.slice(3, 3 + plen);

      // get mask keys (mask keys are always 4 bytes - after payload length)
      if (mask === 1) { // only for messages from the client to the server
        const byte_5 = msgBUF.readUInt8(4);
        const byte_6 = msgBUF.readUInt8(5);
        const byte_7 = msgBUF.readUInt8(6);
        const byte_8 = msgBUF.readUInt8(7);
        mask_keys = [byte_5, byte_6, byte_7, byte_8];
        payload_buff = msgBUF.slice(8, 8 + plen);
        const payload_nums_unmasked = this.masking(payload_buff, mask_keys); // unmask the payload
        payload_buff_unmasked = Buffer.from(payload_nums_unmasked); // get buffer from array of bytes (numbers)
        payload_str = payload_buff_unmasked.toString('utf8'); // convert unmasked payload buffer to string
      } else {
        payload_str = payload_buff.toString('utf8');
      }

    ///// LARGE messages (2^16 < bytes <= 2^64) /////
    } else if (plen_byte2 === 127) {
      // TODO
    }



    if (this.debug) {
      console.log('\n\n--------------------- DataParser.incoming ------------------------');
      console.log('msgBUFF:', msgBUF.length + ' bytes -- ', msgBUF);
      console.log();
      console.log(`byte_1::: ${this.toBinStr(byte_1)} ---> fin:${fin} rsv1:${rsv1} rsv2:${rsv2} rsv3:${rsv3} opcode:0x${this.toHexStr(opcode)}`);
      console.log(`byte_2::: ${this.toBinStr(byte_2)} ---> mask:${mask} plen_byte2:0b${this.toBinStr(plen_byte2)} -- 0x${this.toHexStr(plen_byte2)} -- ${plen_byte2}`);
      console.log();
      console.log(`plen: 0b${this.toBinStr(plen)} -- 0x${this.toHexStr(plen)} -- ${plen}`);
      console.log(`mask: ${mask}`);
      if (mask === 1)  console.log(`mask_keys: 0x${this.toHexStr(mask_keys[0])} 0x${this.toHexStr(mask_keys[1])} 0x${this.toHexStr(mask_keys[1])} 0x${this.toHexStr(mask_keys[2])}`);
      console.log();
      console.log('payload_buff:', payload_buff.length, payload_buff);
      if (mask === 1) console.log('payload_buff_unmasked:', payload_buff_unmasked.length, payload_buff_unmasked);
      console.log('payload_str:', typeof payload_str, payload_str);
      console.log('--------------------- DataParser.incoming END ------------------------\n\n');
    }


    return payload_str;

  }



  /**
   * Parse outgoing message.
   * Convert string to buffer according to RFC6455 standard https://tools.ietf.org/html/rfc6455#section-5.2 .
   * @param {String} msgSTR - message string (payload)
   * @param {0|1} mask - mask 0 if message is sent from server to client or 1 in opposite direction
   * @return {ArrayBuffer} - buffer
   */
  outgoing(msgSTR, mask) {
    if (mask !== 0 && mask !== 1) { throw new Error('mask must be 0 or 1'); }

    const payload_buff = Buffer.from(msgSTR); // 3.rd and other bytes
    const msglen = payload_buff.length; // payload message length in bytes

    // 1.st byte
    const fin = 1; // final message fragment
    const rsv1 = 0;
    const rsv2 = 0;
    const rsv3 = 0;
    const opcode = 0x1; // 0x1 is text frame (or 0b0001)
    const byte_1 = (((((((fin << 1) | rsv1) << 1) | rsv2) << 1) | rsv3) << 4) | opcode;

    // 2. nd byte
    let dbg, plen_byte2;
    if (msglen < 126) {
      dbg = 'Small message';
      plen_byte2 = msglen;
    } else if (msglen >= 126 && msglen <= 0xFFFF) { // 0xFFFF = 65535
      dbg = 'Medium message';
      plen_byte2 = 126;
    } else if (msglen > 0xFFFF && msglen <= 0xFFFFFFFFFFFFFFFF) { // 0xFFFFFFFFFFFFFFFF = 18 446 744 073 709 551 615 = 18,446774^18 = 2^64-1
      dbg = 'Large message';
      plen_byte2 = 127;
    }
    const byte_2 = (mask << 7) | plen_byte2;


    // convert 1.st and 2.nd byte numbers to buffer
    const buff_12 = Buffer.from([byte_1, byte_2]);


    /*** create frame buffer which will be sent ***/
    let frame_buff; // frame buffer which will be sent via websocket connection
    let payload_buff_masked;
    let byte_34;
    let byte_3_10;

    ///// SMALL messages (0 <= bytes < 126 ~ 0b1111110) /////
    if (plen_byte2 < 126) {
      if (mask === 1) {
        const mask_keys = this.randomMaskingKeys();
        const payload_nums_masked = this.masking(payload_buff, mask_keys); // mask the payload
        payload_buff_masked = Buffer.from(payload_nums_masked); // get buffer from array of bytes (numbers)
        const mask_keys_buff = Buffer.from(mask_keys);
        frame_buff = Buffer.concat([buff_12, mask_keys_buff, payload_buff_masked]);
      } else {
        frame_buff = Buffer.concat([buff_12, payload_buff]);
      }

    ///// MEDIUM messages (126 <= bytes <= 2^16 ~ 65536) /////
    } else if (plen_byte2 === 126) {
      byte_34 = msglen; // bits for 3.rd and 4.th byte (16bit)
      const buff_34 = Buffer.alloc(2); // write bits into 2 bytes
      buff_34.writeUInt16BE(byte_34); // write bits into allocated memory
      if (mask === 1) {
        const mask_keys = this.randomMaskingKeys();
        const payload_nums_masked = this.masking(payload_buff, mask_keys); // mask the payload
        payload_buff_masked = Buffer.from(payload_nums_masked); // get buffer from array of bytes (numbers)
        const mask_keys_buff = Buffer.from(mask_keys);
        frame_buff = Buffer.concat([buff_12, buff_34, mask_keys_buff, payload_buff_masked]);
      } else {
        frame_buff = Buffer.concat([buff_12, buff_34, payload_buff]);
      }

    ///// LARGE messages (2^16 < bytes <= 2^64) /////
    } else if (plen_byte2 === 127) {
      byte_3_10 = msglen; // bits for 3,4,5,6,7,8,9 and 10.th byte (8bytes or 64bit)
      // TODO
    }


    if (this.debug) {
      console.log('\n\n--------------------- DataParser.outgoing ------------------------');
      console.log(dbg + ` with ${msglen} bytes`);
      console.log('msgSTR::', msgSTR);
      console.log();
      console.log('byte_1::', this.toBinStr(byte_1), this.toHexStr(byte_1));
      console.log('byte_2::', this.toBinStr(byte_2), this.toHexStr(byte_2));
      if (!!byte_34) console.log('byte_34::', this.toBinStr(byte_34, 2), this.toHexStr(byte_34, 2)); // msglen >= 126 && msglen <= 0xFFFF
      if (!!byte_3_10) console.log('byte_3_10::', this.toBinStr(byte_3_10, 8)); // msglen > 0xFFFF && msglen <= 0xFFFFFFFFFFFFFFFF
      console.log('payload_buff::', msglen, payload_buff);
      if (mask === 1) console.log('payload_buff_masked::', msglen, payload_buff_masked);
      console.log('frame_buff::', frame_buff);
      console.log('--------------------- DataParser.outgoing END ------------------------\n\n');
    }

    const msgBUF = frame_buff;
    return msgBUF;

  }




  /********* HELPERS  *********/
  /**
   * Convert number to readable binary string (showing leading zeros).
   * @param {number} num - number to be converted
   * @param {number} bytes - number of bytes contained in the num
   */
  toBinStr(num, bytes = 1) {
    if (!num) return;
    const n = num.toString(2);
    let str;
    if (bytes === 1) { str = '00000000'.substr(n.length) + n; }
    if (bytes === 2) { str = '0000000000000000'.substr(n.length) + n; }
    if (bytes === 8) { str = '0000000000000000000000000000000000000000000000000000000000000000'.substr(n.length) + n; }
    return str;
  }


  /**
   * Convert number to readable hex string (showing leading zeros).
   * @param {number} num - number to be converted
   * @param {number} bytes - number of bytes contained in the num
   */
  toHexStr(num, bytes = 1) {
    if (!num) return;
    const n = num.toString(16);
    let str;
    if (bytes === 1) { str = '00'.substr(n.length) + n; }
    else if (bytes === 2) str = '0000'.substr(n.length) + n;
    else if (bytes === 8) str = '0000000000000000'.substr(n.length) + n;
    return str;
  }


  /**
   * Generate 4 masking keys (numbers) randomly
   * 0 <= n <= 255  or  0x00 <= n <= 0xFF
   * @returns {[number, number, number, number]}
   */
  randomMaskingKeys() {
    const digits = '0123456789ABCDEF';
    const mask_keys = [];
    for (let i = 0; i < 4; i++) {
      const digit1 = digits.charAt(Math.floor(Math.random() * digits.length));
      const digit2 = digits.charAt(Math.floor(Math.random() * digits.length));
      const str = `0x${digit1}${digit2}`;
      mask_keys.push(+str);
    }
    return mask_keys;
  }


  /**
   * Masking/unmasking the payload according to https://tools.ietf.org/html/rfc6455#section-5.3
   * Every payload byte value (number) should be XOR-ed with the masking key (number).
   * As the XOR is inverse math function it can be used both for masking (on the client side) or for unmasking (on the server side).
   * inversibility: x = (x ^ y) ^ y
   *
   * PAYLOAD UNMASKING PROCESS
   * iteration        -->   0      1      2      3      4      5      6      7      8      9
   * payload_num      --> byte0  byte1  byte2  byte3  byte4  byte5  byte6  byte7  byte8  byte9
   * mask_key index   -->   0      1      2      3      0      1      2      3      0      1
   * @param {Buffer} payload_buff - payload buffer
   * @param {[number, number, number, number]} mask_keys - 4 random number
   */
  masking(payload_buff, mask_keys) {
    const payload_nums_masked = [];
    let i = 0;
    for (const payload_num of payload_buff.values()) {
      const mask_key = mask_keys[i % 4]; // get next mask key on every next iteration (0%4=0, 1%4=1, 2%4=2, 3%4=3, 4%4=0, 5%4=1, 6%4=2, 7%4=3, 8%4=0)
      const payload_num_masked = payload_num ^ mask_key; // decode every payload byte value
      payload_nums_masked.push(payload_num_masked);
      i++;
    }
    return payload_nums_masked;
  }



}

module.exports = DataParser;
