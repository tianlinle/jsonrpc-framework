const request = require('request-promise-native');
const uuid = require('uuid/v4');
const JsonRpcClientError = require('./JsonRpcClientError');

module.exports = class JsonRpcClient {
  constructor(url, logger) {
    this.url = url;
    this.logger = logger;
  }

  /**
   * Make a JSON-RPC call
   * @param {string} method
   * @param {*} params 
   * @param {string} [id] uuid by default
   */
  async call(method, params, id) {
    try {
      this.logger && this.logger.info('request to another json-rpc server', {
        url: this.url,
        jsonrpc: {
          id,
          method,
          params
        }
      });
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
      this.logger && this.logger.info('response from another json-rpc server', {
        url: this.url,
        result
      });
      if (result.error) {
        throw new JsonRpcClientError(result);
      }
      return result.result;
    } catch (error) {
      this.logger && this.logger.error('error when request to another json-rpc server', {
        url: this.url,
        error
      });
      throw error;
    }
  }
};