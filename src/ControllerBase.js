module.exports = class ControllerBase {
  constructor(params, logger) {
    this.params = params;
    this.logger = logger;
  }

  /**
   * @abstract
   */
  main() {
    throw new Error('Need to implement the main method');
  }

  static paramsSchema() { }
};