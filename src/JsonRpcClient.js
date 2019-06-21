const request = require('request-promise-native');
const uuid = require('uuid/v4');
const JsonRpcClientError = require('./JsonRpcClientError');

module.exports = class JsonRpcClient {
  constructor(url) {
    this.url = url;
  }

  /**
   * Make a JSON-RPC call
   * @param {string} method
   * @param {*} params 
   * @param {string} [id] uuid by default
   */
  async call(method, params, id) {
    const result = await request({
      method: 'POST',
      uri: this.url,
      body: {
        jsonrpc: '2.0',
        id: id || uuid(),
        method,
        params
      },
      json: true
    });
    if (result.error) {
      throw new JsonRpcClientError(result);
    }
    return result.result;
  }
};