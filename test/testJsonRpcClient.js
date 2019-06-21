const JsonRpcClient = require('../src/JsonRpcClient');

(async function () {
  const client = new JsonRpcClient('http://localhost:4001/appmanage');
  try {
    const result = await client.call('Generate', {

    });
    console.log(result);
  } catch (error) {
    console.error(error);
  }
})();