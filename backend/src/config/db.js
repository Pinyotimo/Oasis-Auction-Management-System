import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: 'localhost',
  port: 5437,
  database: 'Auction_System',
  user: 'postgres',
  password: 'steve123',
})

export default pool