import jwt from 'jsonwebtoken'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  
  console.log('=== AUTH DEBUG ===')
  console.log('Auth header present:', !!authHeader)
  console.log('Token present:', !!token)
  console.log('JWT_SECRET set:', !!process.env.JWT_SECRET)
  
  if (!token) {
    console.log('ERROR: No token provided')
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log('Auth success:', decoded.userId)
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch (err) {
    console.error('Auth failed:', err.message)
    return res.status(403).json({ error: 'Invalid token' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}