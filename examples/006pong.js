/**
 * Pong example.
 * Client receives pong (opcode 0xA) response.
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
    reconnectAttempts: 3, // try to reconnect n times
    reconnectDelay: 3000, // delay between reconnections
    subprotocols: ['jsonRWS'],
    debug: true
  };
  const testClient = new TestClient(wcOpts);
  await testClient.connect();

  await helper.sleep(2000);

  testClient.ping(500);

  testClient.eventEmitter.on('pong', () => {
    console.log('PONG came');
  });
};

main();
