const { Server } = require('../index');
const path = require('path');

const server = new Server();
server.registerFolder(path.resolve(__dirname, 'controllers')).startup('/api', 3003);