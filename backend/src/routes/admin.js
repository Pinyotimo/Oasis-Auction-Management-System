import express from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import pool from '../config/db.js'

const router = express.Router()

// All admin routes require admin role
router.use(authenticate, requireAdmin)

// Get pending auctions
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
    res.status(500).json({ error: 'Failed to fetch pending auctions' })
  }
})

// Approve auction
router.post('/auctions/:id/approve', async (req, res) => {
  try {
    await pool.query(
      `UPDATE auctions SET status = 'active' WHERE id = $1`,
      [req.params.id]
    )
    
    // Log approval
    await pool.query(
      `INSERT INTO auction_approvals (auction_id, admin_id, approved, reason)
       VALUES ($1, $2, true, 'Approved by admin')`,
      [req.params.id, req.userId]
    )
    
    res.json({ message: 'Auction approved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve auction' })
  }
})

// Reject auction
router.post('/auctions/:id/reject', async (req, res) => {
  try {
    await pool.query(
      `UPDATE auctions SET status = 'draft' WHERE id = $1`,
      [req.params.id]
    )
    
    await pool.query(
      `INSERT INTO auction_approvals (auction_id, admin_id, approved, reason)
       VALUES ($1, $2, false, $3)`,
      [req.params.id, req.userId, req.body.reason || 'Rejected by admin']
    )
    
    res.json({ message: 'Auction rejected' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject auction' })
  }
})

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, role, company_name, verified, created_at 
       FROM users 
       ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Verify user
router.post('/users/:id/verify', async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET verified = true WHERE id = $1`,
      [req.params.id]
    )
    res.json({ message: 'User verified' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' })
  }
})

export default router