const { ControllerBase } = require('../../src/index');

module.exports = class AController extends ControllerBase {
  static paramsSchema() {
    return {
      type: 'object',
      properties: {
        code: {
          type: 'string'
        }
      },
      required: ['code']
    };
  }
  main() {
    return Promise.resolve({ value: 'A' });
  }
};