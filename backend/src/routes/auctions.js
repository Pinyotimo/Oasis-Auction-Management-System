import express from 'express'
import { authenticate } from '../middleware/auth.js'
import pool from '../config/db.js'

const router = express.Router()

// GET all active auctions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.email as seller_email,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as bid_count,
        COALESCE(
          (SELECT MAX(amount) FROM bids b WHERE b.auction_id = a.id),
          a.reserve_price
        ) as current_price
       FROM auctions a 
       JOIN users u ON a.seller_id = u.id 
       WHERE a.status = 'active' 
       ORDER BY a.ends_at ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('DB Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PROFILE ROUTES — MUST BE BEFORE /:id
router.get('/my-bids', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, a.title, a.status, a.photo_urls, a.ends_at
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bids' })
  }
})

router.get('/my-auctions', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as bid_count
       FROM auctions a
       WHERE a.seller_id = $1
       ORDER BY a.created_at DESC`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch auctions' })
  }
})

router.get('/won', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM auctions
       WHERE winner_id = $1 AND status = 'completed'
       ORDER BY ends_at DESC`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch won auctions' })
  }
})

// GET single auction with bids
router.get('/:id', async (req, res) => {
  try {
    const auction = await pool.query(
      `SELECT a.*, u.email as seller_email 
       FROM auctions a 
       JOIN users u ON a.seller_id = u.id 
       WHERE a.id = $1`,
      [req.params.id]
    )
    
    if (auction.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' })
    }

    const bids = await pool.query(
      `SELECT b.*, u.email as bidder_email 
       FROM bids b 
       JOIN users u ON b.bidder_id = u.id 
       WHERE b.auction_id = $1 
       ORDER BY b.amount DESC, b.created_at DESC 
       LIMIT 20`,
      [req.params.id]
    )

    const auctionData = auction.rows[0]
    const currentPrice = bids.rows.length > 0 
      ? parseFloat(bids.rows[0].amount) 
      : parseFloat(auctionData.reserve_price)

    res.json({ 
      ...auctionData, 
      bids: bids.rows,
      current_price: currentPrice
    })
  } catch (err) {
    console.error('Fetch auction error:', err)
    res.status(500).json({ error: 'Failed to fetch auction' })
  }
})

// CREATE auction (seller only)
router.post('/', authenticate, async (req, res) => {
  const { title, description, category, reserve_price, starts_at, ends_at, photo_urls } = req.body
  
  if (!title || !reserve_price || !ends_at) {
    return res.status(400).json({ error: 'Title, reserve price, and end date are required' })
  }

  try {
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const userRole = userCheck.rows[0].role
    if (userRole !== 'seller' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only sellers can create auctions' })
    }

    const result = await pool.query(
      `INSERT INTO auctions (title, description, category, reserve_price, seller_id, starts_at, ends_at, photo_urls, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING *`,
      [
        title, 
        description || null, 
        category || null,
        reserve_price, 
        req.userId, 
        starts_at || new Date().toISOString(),
        ends_at, 
        photo_urls || null
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create auction error:', err)
    res.status(500).json({ error: 'Failed to create auction' })
  }
})

// PLACE BID — matches actual schema (no current_price column)
router.post('/:id/bids', authenticate, async (req, res) => {
  const auctionId = parseInt(req.params.id)
  const { amount } = req.body
  const bidderId = req.userId

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'Valid bid amount is required' })
  }

  const bidAmount = parseFloat(amount)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const auctionResult = await client.query(
      'SELECT * FROM auctions WHERE id = $1 FOR UPDATE',
      [auctionId]
    )

    if (auctionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Auction not found' })
    }

    const auction = auctionResult.rows[0]

    if (auction.status !== 'active') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Auction is not active' })
    }

    if (new Date(auction.ends_at) < new Date()) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Auction has ended' })
    }

    if (auction.seller_id === bidderId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Cannot bid on your own auction' })
    }

    const highestBidResult = await client.query(
      'SELECT MAX(amount) as max_bid FROM bids WHERE auction_id = $1',
      [auctionId]
    )
    
    const currentHighestBid = parseFloat(highestBidResult.rows[0].max_bid) || parseFloat(auction.reserve_price)
    const minimumBid = currentHighestBid + (highestBidResult.rows[0].max_bid ? 100 : 0)

    if (bidAmount < minimumBid) {
      await client.query('ROLLBACK')
      return res.status(400).json({ 
        error: `Bid must be at least ${minimumBid}` 
      })
    }

    const bidResult = await client.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [auctionId, bidderId, bidAmount]
    )

    await client.query('COMMIT')

    const bidderResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [bidderId]
    )

    const bid = {
      ...bidResult.rows[0],
      bidder_email: bidderResult.rows[0]?.email
    }

    const io = req.app.get('io')
    if (io) {
      io.to(`auction_${auctionId}`).emit('bid_placed', {
        auctionId,
        bid,
        currentPrice: bidAmount
      })
    }

    res.status(201).json(bid)

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Place bid error:', err)
    res.status(500).json({ error: 'Failed to place bid' })
  } finally {
    client.release()
  }
})

async function getBidCount(auctionId) {
  const result = await pool.query('SELECT COUNT(*) FROM bids WHERE auction_id = $1', [auctionId])
  return parseInt(result.rows[0].count)
}

export default router