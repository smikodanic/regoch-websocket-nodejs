/**
 * Send to one client several consecutive messages.
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
    wsURL: 'ws://localhost:8001?authkey=TRTmrt252',
    timeout: 3*60*1000, // wait 3secs for answer
    reconnectAttempts: 5, // try to reconnect 5 times
    reconnectDelay: 3000, // delay between reconnections is 3 seconds
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  const socket = await testClient.connect();

  const body = {
    user_id: '5eec761a790f891791d48fa8',
    robot_id: '5ef5a545790f891791d73223',
    task_id: '60ab4fcc17c14b29e642a6d7',
    echo_method: 'log',
    echo_msg: 'Task \"050infinite_run\" is resumed - 25.5.2021 12:51:22',
    time: '2021-05-25T10:51:22.254Z'
  };
  testClient.sendOne(210525151337366880, 'some message 1');
  testClient.sendOne(210525151337366880, 'some message 2');
  testClient.sendOne(210525151337366880, 'some message 3');
  testClient.route('echo/distribute', body);
  testClient.sendOne(210525151337366880, 'some message 4');
  testClient.sendOne(210525151337366880, 'some message 5');
  testClient.route('echo/distribute', body);

  console.log('Messages sent');

  await helper.sleep(1000);
  process.exit();
};



main().catch(err => console.log(err));
