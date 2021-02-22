/**
 * Send question about all rooms in the server.
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
    reconnectAttempts: 5, // try to reconnect 5 times
    reconnectDelay: 3000, // delay between reconnections is 3 seconds
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  await testClient.connect();


  // IMPORTANT!!! Set the message listener before the question is sent.
  testClient.on('message', (msg, msgSTR, msgBUF) => {
    console.log('STRING message', msgSTR);
  });


  // send question about the info
  const rooms = await testClient.infoRoomList();
  console.log('\nrooms::', rooms);
};



main().catch(err => console.log(err));
