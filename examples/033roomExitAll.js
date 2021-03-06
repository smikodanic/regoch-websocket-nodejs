/**
 * Exit from all rooms.
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
    questionTimeout: 8*1000,
    reconnectAttempts: 5, // try to reconnect 5 times
    reconnectDelay: 3000, // delay between reconnections is 3 seconds
    subprotocols: ['jsonRWS'],
    debug: false
  };
  const testClient = new TestClient(wcOpts);
  await testClient.connect();

  // IMPORTANT!!! Set the message listener before the question is sent.
  testClient.onMessage(msg => {
    // console.log('msg::', msg);
  });


  console.log('entering the room...');
  testClient.roomEnter('sasa');

  console.log('\nlisting rooms...');
  const rooms1 = await testClient.infoRoomList();
  console.log('rooms before exit::', rooms1);

  console.log('\nexiting the room...');
  testClient.roomExitAll();

  console.log('\nlisting my rooms...');
  const rooms2 = await testClient.infoRoomList();
  console.log('rooms after exit::', rooms2);
};



main().catch(err => console.log(err));
