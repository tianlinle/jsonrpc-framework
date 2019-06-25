const serializeError = require('serialize-error');

/**@type {import('mongodb').Collection<{date: Date, level: string, message: string, data: any}>} */
let collection;

const levelValueMap = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
};

/**
 * @typedef {'debug'|'info'|'warn'|'error'} Level
 * @typedef {{name: string, level: Level, writer: Function, [key: string]: any}} Meta
 */
module.exports = class Logger {
  /**
   * Constructor
   * @param {Meta} meta
   */
  constructor(meta) {
    this.meta = meta;
  }

  /**
   * Connect to mongodb.
   * @param {import('mongodb').Db} db 
   * @param {string} collectionName 
   */
  static async useMongodb(db, collectionName) {
    collection = await db.createCollection(collectionName);
    await db.command({
      collMod: collectionName,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'time', 'level', 'text'],
          properties: {
            name: {
              bsonType: 'string'
            },
            time: {
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

  /**
   * Fork a logger
   * @param {Meta} meta
   */
  fork(meta) {
    return new Logger(Object.assign({}, this.meta, meta));
  }

  /**
   * Write data using logger
   * @param {Level} level 
   * @param {string} message 
   * @param {Object} data 
   */
  write(level, message, data) {
    if (levelValueMap[level] >= levelValueMap[this.meta.level]) {
      const json = serializeError(Object.assign({
        message,
        time: new Date(),
      }, data, this.meta));
      if (this.meta.writer) {
        return this.meta.writer(json);
      } else {
        console[level](json);
      }
    }
  }

  /**
   * @param {string} message 
   * @param {Object} data 
   */
  debug(message, data) {
    return this.write('debug', message, data);
  }

  /**
   * @param {string} message 
   * @param {Object} data 
   */
  info(message, data) {
    return this.write('info', message, data);
  }

  /**
   * @param {string} message 
   * @param {Object} data 
   */
  warn(message, data) {
    return this.write('warn', message, data);
  }

  /**
   * @param {string} message 
   * @param {Object} data 
   */
  error(message, data) {
    return this.write('error', message, data);
  }
};