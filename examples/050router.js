/**
 * The example shows how to implement router
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
  testClient.once('route', (msg, msgSTR, msgBUF) => {
    console.log('msg::', msg);
    // router transitional variable
    const router = testClient.router;
    const payload = msg.payload; // {uri:string, body?:any}

    // router transitional varaible
    router.trx = {
      uri: payload.uri,
      body: payload.body,
      client: testClient
    };

    // route definitions
    router.def('/returned/back/:n', (trx) => { console.log('trx.params::', trx.params); });
    router.notfound((trx) => { console.log(`The URI not found: ${trx.uri}`); });

    // execute the router
    router.exe().catch(err => {
      console.log(err);
    });
  });


  console.log('sending /send/me/back route...');
  await helper.sleep(400);
  testClient.route('/send/me/back');

};


console.log('toooooo');
main().catch(err => console.log(err));
