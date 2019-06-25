const { MongoClient } = require('mongodb');

module.exports = class Db {
  static async connect(uri) {
    this.client = await MongoClient.connect(uri, {
      useNewUrlParser: true
    });
    this.db = this.client.db();
    this.collectionPromises = [];
  }

  static collection(name, schema) {
    this.collectionPromises.push((async () => {
      await this.db.createCollection(name);
      await this.db.command({
        collMod: name,
        validator: {
          $jsonSchema: schema
        },
        validationLevel: 'moderate'
      });
    })());
    return this.db.collection(name);
  }
};