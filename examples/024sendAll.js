/**
 * Send message (payload) to all clients included to the sender.
 * Open clients in other two terminals.
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


  console.log('message sent to everybody');
  testClient.sendAll('Message to all clients');
};



main().catch(err => console.log(err));
