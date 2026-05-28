import express from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import pool from '../config/db.js'

const router = express.Router()

// All routes require authentication + admin role
router.use(authenticate, requireAdmin)

// GET pending auctions
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.email as seller_email 
       FROM auctions a 
       JOIN users u ON a.seller_id = u.id 
       WHERE a.status = 'pending' 
       ORDER BY a.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Pending auctions error:', err)
    res.status(500).json({ error: 'Failed to fetch pending auctions' })
  }
})

// GET expired auctions
router.get('/expired', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.email as seller_email,
        COALESCE(
          (SELECT MAX(amount) FROM bids b WHERE b.auction_id = a.id),
          a.reserve_price
        ) as final_price
       FROM auctions a 
       JOIN users u ON a.seller_id = u.id 
       WHERE a.status IN ('closed', 'completed') 
          OR (a.status = 'active' AND a.ends_at < NOW())
       ORDER BY a.ends_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Expired auctions error:', err)
    res.status(500).json({ error: 'Failed to fetch expired auctions' })
  }
})

// GET all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, company_name, verified, created_at 
       FROM users 
       ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('Users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// POST approve auction
router.post('/auctions/:id/approve', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `UPDATE auctions SET status = 'active' WHERE id = $1 RETURNING *`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' })
    }
    res.json({ message: 'Auction approved', auction: result.rows[0] })
  } catch (err) {
    console.error('Approve error:', err)
    res.status(500).json({ error: 'Failed to approve auction' })
  }
})

// POST reject auction
router.post('/auctions/:id/reject', async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  
  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Rejection reason required' })
  }

  try {
    const result = await pool.query(
      `UPDATE auctions SET status = 'rejected', rejection_reason = $1 WHERE id = $2 RETURNING *`,
      [reason, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' })
    }
    res.json({ message: 'Auction rejected', auction: result.rows[0] })
  } catch (err) {
    console.error('Reject error:', err)
    res.status(500).json({ error: 'Failed to reject auction' })
  }
})

// POST verify user
router.post('/users/:id/verify', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `UPDATE users SET verified = true WHERE id = $1 RETURNING *`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ message: 'User verified', user: result.rows[0] })
  } catch (err) {
    console.error('Verify error:', err)
    res.status(500).json({ error: 'Failed to verify user' })
  }
})

export default router