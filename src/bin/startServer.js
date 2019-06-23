#!/usr/bin/env node

const { Server, Logger, Db } = require('../index');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

(async function () {
  const { SERVER_NAME, PORT, LOGGER_DB, LOGGER_COLLECTION, MONGODB_URI, MONGODB_DB } = process.env;
  await Db.init(MONGODB_URI, MONGODB_DB);
  await Logger.init(Db.client.db(LOGGER_DB), LOGGER_COLLECTION);
  const server = new Server(SERVER_NAME);
  server.useFolder(path.resolve(process.cwd(), 'src', 'controllers')).listen(PORT);
})();