import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const socketOptions = { reconnectStrategy: () => false }
const client = createClient({ url: redisUrl, socket: socketOptions })
const pubClient = createClient({ url: redisUrl, socket: socketOptions })
const subClient = createClient({ url: redisUrl, socket: socketOptions })

const onError = (name) => (err) => console.error(`${name} Redis error:`, err)
client.on('error', onError('client'))
pubClient.on('error', onError('pubClient'))
subClient.on('error', onError('subClient'))

let redisAvailable = false

try {
  await Promise.all([
    client.connect(),
    pubClient.connect(),
    subClient.connect(),
  ])
  redisAvailable = true
  console.log('Redis connected:', redisUrl)
} catch (err) {
  console.error('Redis unavailable, continuing without Redis adapter:', err)
}

export default client
export { pubClient, subClient, redisAvailable }