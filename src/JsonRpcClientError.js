module.exports = class JsonRpcClientError extends Error {
  constructor(result) {
    super('JSON-RPC error');
    this.data = result;
  }
};