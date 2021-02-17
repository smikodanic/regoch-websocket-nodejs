/**
 * Catch all 3 forms of message:
 * - msg -> message after DataParser and subprotocol
 * - msgSTR -> message after DataParser
 * - msgBUF -> message as buffer
 * Send messages by using 023broadcat.js in another terminal.
 */
const { Client13jsonRWS, helper } = require('../client');


class TestClient extends Client13jsonRWS {
  constructor(wcOpts) {
    super(wcOpts);
  }
}



const main = async () => {
  // connect to websocket server
  const wcOpts = {
    wsURL: 'ws://localhost:3211?authkey=TRTmrt',
    timeout: 3*1000,
    recconectAttempts: 5, // try to reconnect 5 times
    recconectDelay: 3000, // delay between reconnections is 3 seconds
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  const socket = await testClient.connect();


  /** IMPORTANT!!! Set the message listener before the question is sent. **/

  // 1) This is the best way because it will catch messages after reconnection
  testClient.on('message', (msg, msgSTR, msgBUF) => {
    console.log('-------------- 1.st way -------------------');
    console.log('OBJECT message', msg);
    console.log('STRING message', msgSTR);
    console.log('BUFFER message', msgBUF);
    console.log('-------------------------------------------');
  });

  // 2) This will not work after reconnection because "this.socket" will not be same after reconnection (not recommended)
  testClient.onMessage((msg, msgSTR, msgBUF) => {
    console.log('-------------- 2.nd way -------------------');
    console.log('msg::', msg);
    console.log('msgSTR::', msgSTR);
    console.log('msgBUF::', msgBUF);
    console.log('-------------------------------------------');
  });

  // 3) This will not work after reconnection because "socket" will not be same after reconnection. It's only receiving message in buffer format. (not recommended)
  socket.on('data', msgBUF => {
    console.log('-------------- 3.nd way -------------------');
    console.log('on data', msgBUF);
    console.log('-------------------------------------------');
  });



  // send question about the info
  const rooms = await testClient.infoRoomList();
  console.log('\nrooms::', rooms);
};



main().catch(err => console.log(err));
