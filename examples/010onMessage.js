/**
 * Catch all 3 forms of message:
 * - msg -> message after DataParser and subprotocol
 * - msgSTR -> message after DataParser
 * - msgBUF -> message as buffer
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
  await testClient.connect();


  // IMPORTANT!!! Set the message listener before the question is sent.
  testClient.onMessage((msg, msgSTR, msgBUF) => {
    console.log('msg::', msg);
    console.log('msgSTR::', msgSTR);
    console.log('msgBUF::', msgBUF);
  });


  // send question about the info
  const socketID = await testClient.infoSocketId();
  console.log('\nsocketID::', socketID);
};



main().catch(err => console.log(err));
