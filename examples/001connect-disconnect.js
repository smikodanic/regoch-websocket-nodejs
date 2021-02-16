/**
 * Connect and disconnect example.
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
    timeout: 3*1000, // wait 3 secs for answer
    recconectAttempts: 0, // try to reconnect 5 times
    recconectDelay: 6000, // delay between reconnections is 6 seconds
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  testClient.connect();

  await helper.sleep(2000);

  // disconnect from websocket server
  testClient.disconnect();
};

main();
