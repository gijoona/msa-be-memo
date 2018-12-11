'use strict';

// tcp/ip통신을 위한 모듈
const net = require('net'),
      tcpClient = require('./client.js');

/**
  tcpServer 클래스
*/
class tcpServer {

  /**
    생성자
  */
  constructor (name, port, urls) {
    this.logTcpClient = null; // 로그 관리 마이크로서비스 연결 클라이언트

    // 서버정보
    this.context = {
      port: port,
      name: name,
      urls: urls
    };
    this.merge = {};  // client에서 데이터수신 처리 시 사용

    // 서버생성
    this.server = net.createServer((socket) => {
      this.onCreate(socket);

      // 에러 이벤트 처리
      socket.on('error', (exception) => {
        this.onClose(exception, socket);
      });

      // 클라이언트 접속종료 이벤트 처리
      socket.on('close', () => {
        this.onClose(null, socket);
      });

      // 데이터수신 처리
      socket.on('data', (data) => {
        // 데이터수신 시 분할처리로 인한 오류개선.
        // 데이터 전송이 완료되면 Buffer를 활용하여 취합 후 처리하도록 변경
        let key = socket.remoteAddress + ':' + socket.remotePort;
        this.merge[key] = this.merge[key] instanceof Array ? this.merge[key] : [];
        this.merge[key].push(Buffer.from(data));

        let sz = data.toString();
        if (sz.charAt(sz.length - 1) == '¶') {
          let mergeBuf = this.merge[key],
              buf = Buffer.concat(mergeBuf),
              bToS = buf.toString().replace('¶', '');
          if (bToS != "") {
            this.merge[key] = [];
            this.writeLog(bToS);
            this.onRead(socket, JSON.parse(bToS));
          }
        }
      });
    });

    // 서버객체 에러처리
    this.server.on('error', (err) => {
      console.log(err);
    });

    // listen
    this.server.listen(port, () => {
      console.log('listen', this.server.address());
    });
  } // END constructor

  /**
    서버 생성
  */
  onCreate (socket) {
    console.log('onCreate', socket.remoteAddress, socket.remotePort);
  }

  /**
    클라이언트 접속종료
  */
  onClose (err, socket) {
    console.log('onClose', socket.remoteAddress, socket.remotePort, (err || ''));
  }

  // Distributor 접속
  connectToDistributor (host, port, onNoti) {
    var packet = {  // distributor로 전달할 현재 마이크로서비스 정보
      uri: '/distributes',
      method: 'POST',
      key: 0,
      params: this.context
    };
    let isConnectedDistributor = false;

    this.clientDistributor = new tcpClient(
      host,
      port,
      (options) => {  // onCreate
        isConnectedDistributor = true;
        this.clientDistributor.write(packet);
      },
      (options, data) => {  // onRead
        // 로그 관리 마이크로서비스 연결
        if (this.logTcpClient == null && this.context.name != 'logs') {
          for (let n in data.params) {
            const ms = data.params[n];
            if (ms.name == 'logs') {
              this.connectToLog(ms.host, ms.port);
              break;
            }
          }
        }

        onNoti(data);
      },
      (options) => { isConnectedDistributor = false; }, // onEnd
      (options) => { isConnectedDistributor = false; }  // onError
    );

    // 주기적인 Distributor 접속시도(3초)
    setInterval(() => {
      if (!isConnectedDistributor) {
        this.clientDistributor.connect();
      }
    }, 3000)
  }

  // 로그관리 마이크로서비스 연결
  connectToLog (host, port) {
    this.logTcpClient = new tcpClient(host, port
      , (options) => {} // onCreate
      , (options) => { this.logTcpClient = null; } // onRead
      , (options) => { this.logTcpClient = null; } // onEnd
    );
    this.logTcpClient.connect();
  }

  // Log 패킷 전달
  writeLog (log) {
    if (this.logTcpClient) {
      const packet = {
        uri: '/logs',
        method: 'POST',
        key: 0,
        params: log
      };
      this.logTcpClient.write(packet);
    } else {
      console.log(log);
    }
  }
}

module.exports = tcpServer; // export 선언
