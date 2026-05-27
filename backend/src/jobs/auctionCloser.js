import cron from 'node-cron'
import pool from '../config/db.js'

export function startAuctionCloser() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[' + new Date().toISOString() + '] Checking expired auctions...')
    
    try {
      const expired = await pool.query(
        `SELECT id, reserve_price, seller_id 
         FROM auctions 
         WHERE status = 'active' AND ends_at < NOW()`
      )

      for (const auction of expired.rows) {
        const highestBid = await pool.query(
          `SELECT bidder_id, amount 
           FROM bids 
           WHERE auction_id = $1 
           ORDER BY amount DESC 
           LIMIT 1`,
          [auction.id]
        )

        if (highestBid.rows.length > 0) {
          const winner = highestBid.rows[0]
          await pool.query(
            `UPDATE auctions 
             SET status = 'completed', winner_id = $1, final_price = $2 
             WHERE id = $3`,
            [winner.bidder_id, winner.amount, auction.id]
          )
          console.log(`✓ Auction ${auction.id} completed. Winner: ${winner.bidder_id} at $${winner.amount}`)
        } else {
          await pool.query(
            `UPDATE auctions SET status = 'closed' WHERE id = $1`,
            [auction.id]
          )
          console.log(`✓ Auction ${auction.id} closed with no bids`)
        }
      }
    } catch (err) {
      console.error('Auction closer error:', err)
    }
  })
}