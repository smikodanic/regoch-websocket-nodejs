/**
 *********** CLIENT DATA PARSER *************
 * Data parser according to RFC6455 ( https://tools.ietf.org/html/rfc6455#section-5 )
 */
class DataParser {


  /**
   * Parse message received from the client.
   * Convert buffer to string according to RFC6455 standard https://tools.ietf.org/html/rfc6455#section-5.2 .
   * @param {Buffer} buff - the websocket message buffer
   * @return {String} - unmasked payload - string message
   */
  incoming(buff) {

    // 1.st byte
    const byte_1 = buff.readUInt8(0);
    const fin = byte_1 >>> 7; // is final fragment
    const rsv1 = (byte_1 & 0b01000000) >>> 6; // reserved
    const rsv2 = (byte_1 & 0b00100000) >>> 5; // reserved
    const rsv3 = (byte_1 & 0b00010000) >>> 4; // reserved
    const opcode = (byte_1 & 0b00001111); // operational code (non-control or control frame) - https://tools.ietf.org/html/rfc6455#section-5.2

    // 2.nd byte
    const byte_2 = buff.readUInt8(1);
    const mask = byte_2 >>> 7; // messages sent from client mask=1. messages sent from server mask=0 (mask will be always 0 because it's on the client side)
    let plen = byte_2 & 0b01111111; // payload length in bytes


    // do not parse message if the connection is closed
    if (opcode === 0x8) {
      throw new Error('Opcode 0x8: Websocket connection is closed by the client.');
    }


    /* Get payload length and masking keys. Notice: masking keys are always 4 bytes.
     * NOTICE: If plen=126 then extend plen with 2 bytes (16bits). If plen=127 extend plen with 8 bytes (64bits). */
    let payload_buff; // sliced buffer to get only payload buffer part
    if (plen < 126) { // very small messages (2^7 = 128bytes)
      payload_buff = buff.slice(2, 2 + plen);

    } else if (plen === 126) { // medium messages (2^16 = 65536bytes)
      const byte_34 = buff.readUInt16BE(1); // byte 3 and 4
      plen = byte_34;
      payload_buff = buff.slice(3, 3 + plen);

    } else if (plen === 127) { // large messages (2^64)
      /*** TODO ***/
    }

    // convert buffer to string
    const payload_decoded = payload_buff.toString('utf8'); // this also works


    console.log('\n\n--------------------- _parseMessage ------------------------');
    console.log(`byte_1::: ${byte_1.toString(2)} ---> fin:${fin} rsv1:${rsv1} rsv2:${rsv2} rsv3:${rsv3} opcode:0x${opcode.toString(16)}`);
    console.log(`byte_2::: ${byte_2.toString(2)} ---> mask:${mask} plen:0b${plen.toString(2)} -- 0x${plen.toString(16)} -- ${plen}`);
    console.log();
    console.log('buff:', buff.length + 'bytes', buff);
    console.log('payload_buff:', payload_buff.length, payload_buff);
    console.log('payload_decoded:', typeof payload_decoded, payload_decoded);

    return payload_decoded;

  }



  /**
   * Format message sent to the websocket client.
   * Convert string to valid buffer according to RFC6455 standard.
   * @param {String} msg - message string (payload)
   * @return {ArrayBuffer} - valid buffer
   */
  outgoing(msg) {
    // const payload = textEncoder.encode(msg);
    const payload_buff = Buffer.from(msg);
    const msglen = payload_buff.length; // payload message length in bytes

    let dbg, plen_2, byte_34, byte_3456;
    if (msglen < 126) {
      dbg = 'Small message';
      plen_2 = msglen; // bits for 2.nd byte
    } else if (msglen >= 126 && msglen <= 0xFFFF) { // 0xFFFF = 65535
      dbg = 'Medium message';
      plen_2 = 126;
      byte_34 = msglen; // bits for 3.rd and 4.th byte (16bit)
    } else if (msglen > 0xFFFF && msglen <= 0xFFFFFFFFFFFFFFFF) { // 0xFFFFFFFFFFFFFFFF = 18 446 744 073 709 551 615 = 18,446774^18 = 2^64-1
      dbg = 'Large message';
      plen_2 = 127;
      byte_3456 = msglen; // bits for 3,4,5 and 6.th byte (64bit)
    }

    // 1.st byte
    const fin = 1; // final message fragment
    const rsv1 = 0;
    const rsv2 = 0;
    const rsv3 = 0;
    const opcode = 0x1; // 0x1 is text frame (or 0b0001)
    const byte_1 = (((((((fin << 1) | rsv1) << 1) | rsv2) << 1) | rsv3) << 4) | opcode;

    // 2. nd byte
    const mask_2 = 0; // it's always 0 when server is sending message to the client
    const byte_2 = (mask_2 << 7) | plen_2;

    // create frame buffer
    let frame_buff = Buffer.from([byte_1, byte_2]);
    if (msglen < 126) {
      frame_buff = Buffer.concat([frame_buff, payload_buff]);
    } else if (msglen >= 126 && msglen <= 0xFFFF) {
      const buff_34 = Buffer.alloc(2); // write bits into 2 bytes
      buff_34.writeUInt16BE(byte_34); // write bits into allocated memory
      frame_buff = Buffer.concat([frame_buff, buff_34, payload_buff]);
    }



    /*
    console.log('\n\n--------------------- _formatResponse ------------------------');
    console.log('payload_buff:', msglen, payload_buff);
    console.log(dbg + ` with ${msglen} bytes`);
    console.log('byte_1', byte_1.toString(2), byte_1.toString(16));
    console.log('byte_2', byte_2.toString(2), byte_2.toString(16));
    if (!!byte_34) console.log('byte_34', byte_34.toString(2), byte_34);
    if (!!byte_3456) console.log('byte_3456', byte_3456.toString(2), byte_3456);
    console.log('frame_buff', frame_buff);
    */


    // this._debug(frame_buff);

    return frame_buff;

  }


}

module.exports = DataParser;
