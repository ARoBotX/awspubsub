const net = require('net');

const PIPE_NAME = 'pipebridges';
const PIPE_PATH = '\\\\.\\pipe\\';

let client = net.createConnection(PIPE_PATH + PIPE_NAME, () => {
  console.log('Connected to named pipe server!');
});

module.exports = { client };
