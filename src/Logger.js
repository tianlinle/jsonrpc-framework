const { MongoClient } = require('mongodb');
const serializeError = require('serialize-error');

/**@type {import('mongodb').Collection<{date: Date, level: string, message: string, data: any}>} */
let collection;

const levelValueMap = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
};

module.exports = class Logger {
  constructor(meta = {}, level = 'info') {
    this.meta = meta;
    this.levelValue = Logger.getLevelValue(level);
  }

  static getLevelValue(level) {
    return levelValueMap[level];
  }

  static async init(uri, database, collectionName) {
    const client = await MongoClient.connect(uri, { useNewUrlParser: true });
    const db = client.db(database);
    collection = await db.createCollection(collectionName);
    await db.command({
      collMod: collectionName,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['date', 'level', 'message'],
          properties: {
            date: {
              bsonType: 'date'
            },
            level: {
              bsonType: 'string'
            },
            text: {
              bsonType: 'string'
            }
          }
        }
      },
      validationLevel: 'moderate'
    });
  }

  fork(meta) {
    return new Logger(Object.assign({}, this.meta, meta));
  }

  async write(level, message, data) {
    const levelValue = Logger.getLevelValue(level);
    const doc = Object.assign({
      level: level,
      date: new Date()
    }, this.meta, {
      message
    });
    if (data) {
      doc.data = serializeError(data);
    }
    doc.text = JSON.stringify(doc);
    if (collection && levelValue >= this.levelValue) {
      return await collection.insertOne(doc);
    }
  }

  debug(message, data) {
    return this.write('debug', message, data);
  }

  info(message, data) {
    return this.write('info', message, data);
  }

  warn(message, data) {
    return this.write('warn', message, data);
  }

  error(message, data) {
    return this.write('error', message, data);
  }
};