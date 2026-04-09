import { handler as verwerkHandler } from './verwerk-rss.js'

export const handler = async () => {
  console.log('Wekelijkse RSS verwerking gestart:', new Date().toISOString())
  return await verwerkHandler({ queryStringParameters: {} })
}
