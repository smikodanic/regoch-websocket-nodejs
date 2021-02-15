/**
 * Pong example.
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
    timeout: 3*1000, // 3 secs
    debug: true
  };
  const testClient = new TestClient(wcOpts);
  testClient.connect();

  await helper.sleep(2000);

  testClient.ping(500);

  testClient.eventEmitter.on('pong', () => {
    console.log('PONG came');
  });
};

main();