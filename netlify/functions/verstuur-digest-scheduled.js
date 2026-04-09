import { handler as verstuurHandler } from './verstuur-digest.js'

export const handler = async () => {
  console.log('Wekelijkse digest versturing gestart:', new Date().toISOString())
  return await verstuurHandler({ queryStringParameters: {} })
}
