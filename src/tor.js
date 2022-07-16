const net = require('net');
let util = require('util');

class TorService {

  constructor(auth = config.proxy.auth.tor.HashedControlPassword, host = config.proxy.host, port = config.proxy.auth.tor.ControlPort) {
    this.auth = auth;
    this.host = host;
    this.port = port;
  }

  async reset() {

    const socket = new net.Socket({ allowHalfOpen: false });

    try {
      await this.connect(socket);
      await this.write(socket, util.format('AUTHENTICATE %s', this.auth));
      await this.write(socket, 'signal NEWNYM');

      socket.destroy();
      return true;
    } catch (error) {
      socket.destroy();
      return false;
    }
  }

  async write(socket, cmd) {
    return new Promise((resolve, reject) => {
      if (!socket.writable) {
        reject(new Error('Socket for TOR is not writable'));
      }

      socket.removeAllListeners('error');
      socket.removeAllListeners('data');

      socket.once('data', function(data) {
        const res    = data.toString().replace(/[\r\n]/g, '');
        const tokens = res.split(' ')
        const code   = parseInt(tokens[0]);

        if (code !== 250) {
          reject(new Error(res));
        } else {
          resolve(true);
        }
      });

      socket.once('err', reject);
      socket.write(cmd + '\r\n');
    })
  }

  async connect(sock) {
    return new Promise((resolve, reject) => {
      sock.once('connect', resolve);
      sock.once('error', reject);
      sock.connect(this.port, this.host);
    })
  }
}

module.exports = TorService;
