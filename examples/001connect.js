/**
 * Connect example.
 */
const {Client13jsonRWS, helper} = require('../client');


class TestClient extends Client13jsonRWS {
  constructor(wcOpts) {
    super(wcOpts);
  }
}



const main = async () => {
  // connect to websocket server
  const wcOpts = {
    wsURL: 'ws://localhost:3211?authkey=TRTmrt',
    timeout: 3*1000, // wait for answer
    recconectAttempts: 3, // try to reconnect n times
    recconectDelay: 3000, // delay between reconnections
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  testClient.connect();

};

main();
