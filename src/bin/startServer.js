const { Server, Logger } = require('../index');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

(async function () {
  const { SERVER_NAME, PORT, LOGGER_URI, LOGGER_DB, LOGGER_COLLECTION } = process.env;
  await Logger.init(LOGGER_URI, LOGGER_DB, LOGGER_COLLECTION);
  const server = new Server(SERVER_NAME);
  server.useFolder(path.resolve(process.cwd(), 'src', 'controllers')).listen(PORT);
})();