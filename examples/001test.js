const ClientNodejs = require('../client');


class TestCN extends ClientNodejs {

  constructor(wcOpts) {
    super(wcOpts);
  }


}




const wcOpts = {
  wsURL: 'ws://localhost:3211?authkey=TRTmrt',
  timeout: 3*1000, // 3 secs
  debug: true
};
const testCB = new TestCN(wcOpts);
testCB.connect();
