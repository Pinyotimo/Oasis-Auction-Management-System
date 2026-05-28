import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  const { email, password, name, phone, companyName, role = 'buyer' } = req.body
  
  const validRoles = ['buyer', 'seller']  // Admin only via direct DB insert
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be buyer or seller' })
  }
  
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, company_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, role, company_name, verified`,
      [email, hashedPassword, name || null, phone || null, companyName || null, role]
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    )
    const user = result.rows[0]
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        company_name: user.company_name,
        verified: user.verified
      } 
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router