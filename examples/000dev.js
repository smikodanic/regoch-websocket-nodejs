/**
 * Test and develop here !
 */
const Client13jsonRWS = require('../client/Client13jsonRWS');


class TestClient extends Client13jsonRWS {

  constructor(wcOpts) {
    super(wcOpts);
  }


  sendMsg() {
    /* A) test raw string messages (tests for DataParser.js ) */
    const msg1 = 'A'; // 1 byte
    const msg2 = 'Š'; // 2 bytes
    const msg3 = 'ABC'; // 3 bytes
    const msg125 = 'xUac8eSgyRI1mNfBbEbxVtnHQ9LWmnchFCM6GvF2P5EQ4VyUrHyYelLoW6LrRNa81atLZevh5ofs5xDSvDEIdm2sUNbYPFDhQPKobBRdwwqaz4GfoJkEoyi0sGEh3';
    const msg126 = 'dZOW1eAD7f9CB3w8vJas6kNrx7cPDjJc8p0VhpzkJq3WCOyinmpJpYQdjKuIWKWRA0kbfqV4A1hQ3Rsl6kh0i9Gi6DO99kYRA7TdNtGgVXyK4Dqj1PL9tA4N5cIuSD';
    const msg127 = 'ndRZamQMj1F7Rxse361L8WUDuEEELzroEmltsNBN6HS9KBmr1Y2wootvVHsIeHn6eM2fcwnSTohpYklqs2gfuSu8B6RnrQTjap7jqKahT8FHXJmHfRipRrE1JnUctar';
    const msg128 = 'tUMjZbHP0SMGyIJTAn3223rrzEW41AXwqh9xGmrSQmJ21gJXBIpHwjt49MhADN07m9AhE9qia9BaIHrAgz36zzetRb9wlVMR8JKQfAvEiAPZSwLBGQPjFhvojw81Fzo6';
    const msg129 = 'IkxUhzvZpJAgkjkqbR2NLIbydyaUf6WrTCLKR9xxoiMPlWq3XEgrXJScADOSFInldzk5ppZ3Jvc7fBmMcBFjKgIWETc7OKuw2aCAGZd7sTWBoMedO9pKO9XsMw63vRHrY';
    const msg200 = 'iWQH8JTNqeCA1OJMJXlxjSpA9kR5pA2Y6srrlZeAOa9cDPJHUHyxgBcIjZHqgbg1PChlBfINCfTVyqH3h05yHh0kb6aK4HjI24o6sbuAi9g7b99ttT3ka2ssve48cxZSyAh5Ou9Vdk3FFnTvJrWERIxYRhXWKe0fe9r45YOD2UCcKNb07zeSbwmPcuhOWUgKTfaHN85m';
    const msg400 = 'iWQH8JTNqeCA1OJMJXlxjSpA9kR5pA2Y6srrlZeAOa9cDPJHUHyxgBcIjZHqgbg1PChlBfINCfTVyqH3h05yHh0kb6aK4HjI24o6sbuAi9g7b99ttT3ka2ssve48cxZSyAh5Ou9Vdk3FFnTvJrWERIxYRhXWKe0fe9r45YOD2UCcKNb07zeSbwmPcuhOWUgKTfaHN85miWQH8JTNqeCA1OJMJXlxjSpA9kR5pA2Y6srrlZeAOa9cDPJHUHyxgBcIjZHqgbg1PChlBfINCfTVyqH3h05yHh0kb6aK4HjI24o6sbuAi9g7b99ttT3ka2ssve48cxZSyAh5Ou9Vdk3FFnTvJrWERIxYRhXWKe0fe9r45YOD2UCcKNb07zeSbwmPcuhOWUgKTfaHN85m';
    const msgHR = 'Aćčžšđ'; // must have <meta charset="utf-8">
    const msgIcons1 = '😂';
    const msgIcons2 = '\u23F0\u0020\u2620\u0020\u2623'; // \u0020 is space

    /* B) test room messages */
    const mRoom1 = {id: 210129163129492000, from: 210129163129492111, cmd: 'room/subscribe', payload: 'My Chat Room'};
    const mRoom2 = {id: 210129163129492000, from: 210129163129492111, cmd: 'room/unsubscribe', payload: 'My Chat Room'};
    const mRoom4 = {id: 210129163129492000, from: 210129163129492111, cmd: 'room/message', to: 'My Chat Room', payload: 'Some message to room'};

    /* C) test route messages */
    const mRoute1 = {id: 210129163129492000, from: 210129163129492111, cmd: 'route', payload: {uri: 'shop/login', body: {username:'mark', password:'thG5$#w'}}};
    const mRoute2 = {id: 210129163129492000, from: 210129163129492111, cmd: 'route', payload: {uri: 'shop/product/55'}};

    /* D) test info messages */
    const mInf1 = {id: 210129163129492000, from: 210129163129492111, cmd: 'info/socket/id'};
    const mInf2 = {id: 210129163129492000, from: 210129163129492111, cmd: 'info/socket/list'};
    const mInf3 = {id: 210129163129492000, from: 210129163129492111, cmd: 'info/room/list'};

    /* E) test socket messages */
    const iSock1 = {id: 210129163129492000, from: 210129163129492111, cmd: 'socket/send', to: [210204110115751900], payload: 'Some message to another client'};
    const iSock2 = {id: 210129163129492000, from: 210129163129492111, cmd: 'socket/broadcast', payload: 'Some message to all clients except the sender'};
    const iSock3 = {id: 210129163129492000, from: 210129163129492111, cmd: 'socket/sendall', payload: 'Some message to all clients and the sender'};


    // format the message
    const msg = msg400;
    // const msg = JSON.stringify(iSock1);


    /* how many bytes in the message string (for example A is 1 byte and Č is 2 bytes, so msg.length will not give exact result)*/
    console.log(`\nSent(${this.getMessageSize(msg)}): ${msg}`);

    this.sendRaw(msg);
  }


}




const wcOpts = {
  wsURL: 'ws://localhost:3211?authkey=TRTmrt',
  timeout: 3*1000, // 3 secs
  debug: false
};
const testClient = new TestClient(wcOpts);
testClient.connect();





setTimeout(() => {
  // testClient.sendMsg();
  // testClient.infoSocketId();
}, 1300);

