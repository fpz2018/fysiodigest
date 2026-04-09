const { handler: verwerkHandler } = require('./verwerk-rss.cjs');

exports.handler = async () => {
  console.log('Wekelijkse RSS verwerking gestart:', new Date().toISOString());
  return await verwerkHandler({ queryStringParameters: {} });
};
