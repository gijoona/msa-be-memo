'use strict';

const business = require('./modules/monolithic_memo.js'),
      cluster = require('cluster'),
      conf = require('./conf/config').setting;

/**
  Memo 클래스
*/
class memo extends require('./server.js') {
  /**
    생성자
  */
  constructor () {
    // 서버정보 초기화
    super('memo',
      process.argv[2] ? Number(process.argv[2]) : conf.service.port,
      ['POST/memo', 'GET/memo', 'PUT/memo', 'DELETE/memo']
    );

    // Distributor 접속
    this.connectToDistributor(conf.distribute.ip, conf.distribute.port, (data) => {
      console.log('Distributor Notification', data);  // onNoti를 통해 전달된 데이터
    });
  }

  onRead (socket, data) { // onRead 구현
    console.log('onRead', socket.remoteAddress, socket.remotePort);
    business.onRequest(socket, data.method, data.uri, data.params, (s, packet) => {
      socket.write(JSON.stringify(packet) + '¶'); // 응답 패킷 전송
    });
  }
}

if (cluster.isMaster) { // 부모 프로세스일 경우 자식 프로세스 실행
  cluster.fork();

  // exit 이벤트가 발생하면 새로운 자식 프로세스 실행
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  new memo(); // 인스턴스 생성
}
