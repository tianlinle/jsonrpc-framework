const Ajv = require('ajv');
const { JsonRpcError } = require('tian-jsonrpc');

class ControllerBase {
  constructor(params) {
    this.params = params;
  }

  /**
   * @abstract
   */
  main() {
    throw new Error('Need to implement the main method');
  }

  static paramsSchema() { }

  async run() {
    const schema = this.constructor.paramsSchema();
    if (schema) {
      const { paramsValidator } = this.constructor;
      if (!paramsValidator.validate(schema, this.params)) {
        throw JsonRpcError.invalidParams({
          errorText: paramsValidator.errorsText(undefined, {
            dataVar: 'params'
          })
        });
      }
    }
    return await this.main();
  }
}

ControllerBase.paramsValidator = new Ajv({ verbose: true });
module.exports = ControllerBase;