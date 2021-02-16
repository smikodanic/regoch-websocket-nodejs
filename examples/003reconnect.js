/**
 * The example shows how to activate reconnection after the connection is closed.
 * To test this script first turn off the server and then turn it on. The client should reconnect automatically when server is turned on.
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
  testClient.connect();

  await helper.sleep(3400);
};

main().catch(err => console.log(err));
