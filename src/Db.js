const { MongoClient } = require('mongodb');

module.exports = class Db {
  static async init(uri, database) {
    this.client = await MongoClient.connect(uri, {
      useNewUrlParser: true
    });
    this.db = this.client.db(database);
  }

  static async collection(name, schema) {
    const collection = await this.db.createCollection(name);
    await this.db.command({
      collMod: 'contacts',
      validator: {
        $jsonSchema: schema
      },
      validationLevel: 'moderate'
    });
    return collection;
  }
};