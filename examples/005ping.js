/**
 * Ping example.
 * Client is sending pin (opcode 0x9) and the server is responding with pong (opcode 0xA).
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
    debug: true
  };
  const testClient = new TestClient(wcOpts);
  await testClient.connect();

  await helper.sleep(2000);

  testClient.ping(1000, 3); // send ping 3 times, every 1 second
};

main();
