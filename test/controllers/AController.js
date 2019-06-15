const { ControllerBase } = require('../../index');

module.exports = class AController extends ControllerBase {
  static paramsSchema() {
    return {
      type: 'object',
      properties: {
        key: {
          type: 'string'
        }
      },
      required: ['key']
    };
  }
  main() {
    return Promise.resolve({ value: 'A' });
  }
};