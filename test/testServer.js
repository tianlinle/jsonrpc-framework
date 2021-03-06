const { Server } = require('../src/index');
const path = require('path');

const server = new Server();
server.registerFolder(path.resolve(__dirname, 'controllers'))
  .use(function (ctx, next) {
    console.log('before jsonrpc');
    return next();
  })
  .use(function (ctx, next) {
    console.log('after jsonrpc');
    return next();
  })
  .listen(3003);