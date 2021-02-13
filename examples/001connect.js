const Client13jsonRWS = require('../client/Client13jsonRWS');


class TestClient extends Client13jsonRWS {

  constructor(wcOpts) {
    super(wcOpts);
  }


}




const wcOpts = {
  wsURL: 'ws://localhost:3211?authkey=TRTmrt',
  timeout: 3*1000, // 3 secs
  debug: true
};
const testCB = new TestClient(wcOpts);
testCB.connect();
