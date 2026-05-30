
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { startAuctionCloser } from './jobs/auctionCloser.js'
import { pubClient, subClient, redisAvailable } from './config/redis.js'

import authRoutes from './routes/auth.js'
import auctionRoutes from './routes/auctions.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const server = createServer(app)

const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL || 'http://localhost:5173', 
    credentials: true 
  }
})

if (redisAvailable) {
  io.adapter(createAdapter(pubClient, subClient))
  console.log('Socket.IO Redis adapter enabled')
} else {
  console.log('Socket.IO running without Redis adapter')
}

app.set('io', io)

// FIXED: Explicitly allow Authorization header
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Handle preflight explicitly
app.options('*', cors())

// DEBUG: Log all incoming requests (remove after fixing)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Auth: ${req.headers.authorization ? 'YES' : 'NO'}`)
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/auctions', auctionRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('join_auction', (auctionId) => {
    socket.join(`auction_${auctionId}`)
    console.log(`Socket ${socket.id} joined auction_${auctionId}`)
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

startAuctionCloser(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})