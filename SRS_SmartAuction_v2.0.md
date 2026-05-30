# Smart Auction Management System

## Software Requirements Specification (SRS)

**Version:** 2.0

**Date:** May 2026

**Target Organization:** Davis & Shirtliff (D&S)

---

## 1. Executive Summary

The Smart Auction Management System is a web-based B2B auction platform specifically designed for industrial distributors like Davis & Shirtliff (D&S). The platform replaces inefficient manual tender systems by enabling asset managers to liquidate surplus equipment transparently through real-time bidding, automated lifecycle workflows, and total bid visibility. The system maximizes asset recovery value while minimizing time-to-sale from several weeks to a matter of days.

**Status:** Full Production System (Post-MVP)

## 2. Product Overview

### 2.1 Vision

To reduce the traditional time-to-sale for surplus industrial hardware from several weeks down to a matter of days. By transitioning to an open, digital marketplace, the system increases buyer competition and transparency, ensuring fair market value and efficient inventory turnover across all D&S operational territories.

### 2.2 Target Users

| Role | Description | Capabilities |
|---|---|---|
| Sellers | D&S inventory managers and authorized field agents | Create listings, monitor auctions, manage post-auction collection, track sales analytics |
| Buyers | Pre-verified businesses, engineering contractors, technical institutions | Browse, filter, bid, track bids, manage winnings, communicate with sellers |
| Admins | D&S finance and operations teams | Approve listings, verify buyers, oversee all auctions, manage disputes, generate reports, system configuration |
| Super Admins | System administrators / IT operations | User management, system health, configuration, audit logs, backup/restore |

### 2.3 Project Scope (Full System)

**In-Scope Capabilities**

- Role-based user authentication with SSO/OAuth 2.0 support (Google, Microsoft, SAML)
- Listing creation pipeline with image uploads (up to 10 photos), reserve pricing, and dynamic increment rules
- Real-time bidding synchronization via WebSocket with automatic countdown clocks
- Sniper protection with configurable anti-sniping rules and maximum extension caps
- Transparent bid histories with configurable anonymity levels (full, masked, anonymous)
- Post-auction collection confirmation workflows with automated reminders and SLA tracking
- Admin dashboards for buyer verification, listing approval queues, dispute resolution, and analytics
- Integrated offline payment tracking (invoices, receipts, payment status) — actual payment processing remains offline
- Automated email and SMS notification triggers for bid events, outbid alerts, auction endings, and collection reminders
- Multi-currency support (KES, UGX, TZS, USD) with configurable exchange rates
- Advanced analytics dashboard with demand forecasting, seller performance metrics, and market trend reports
- Mobile-optimized responsive design with offline capability for field agents
- Full audit logging for compliance and dispute resolution
- API access for third-party integrations (ERP, inventory management systems)

**Out-of-Scope (Future Phases)**

- Integrated payment gateway processing (Stripe, M-Pesa, bank transfers) — actual payment remains offline
- Automated KYC/compliance verification pipelines (manual verification for now)
- Multi-language localized support (English only for Phase 1)
- AI-powered predictive pricing recommendations
- Blockchain-based bid verification for high-value items
- Mobile native applications (iOS/Android) — PWA only

## 3. Functional Requirements

### 3.1 User Authentication & Access Controls

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F1.1 | Users must register with email, secure password (min 8 chars, complexity requirements), phone number, official company name, and tax identification number (PIN/VAT) | P0 | Passwords hashed with bcrypt (cost factor 12), email verification required before login |
| F1.2 | Strict role-based access control (RBAC) separating Seller, Buyer, Admin, and Super Admin views and API endpoints | P0 | JWT tokens with role claims, middleware authorization checks on all protected routes |
| F1.3 | Buyers must be explicitly whitelisted/pre-verified by an Admin before placing bids. Verification includes company documents, trade license, and reference checks | P0 | verified flag on User entity, Admin verification workflow with approval/rejection and reason |
| F1.4 | Sellers must also be verified by Admin with company authorization letter and field agent credentials | P0 | Same verification workflow as buyers, with additional seller-specific document requirements |
| F1.5 | User sessions persist for maximum 24 hours absolute ceiling, with sliding 30-minute inactivity timeout. Users are warned 5 minutes before timeout | P0 | Session stored in Redis with TTL, refresh token rotation, concurrent session limit (3 per user) |
| F1.6 | Support SSO/OAuth 2.0 integration (Google Workspace, Microsoft Azure AD, SAML 2.0) for corporate clients | P1 | OAuth 2.0 + PKCE flow, SAML assertion mapping to internal roles |
| F1.7 | Two-factor authentication (2FA) via TOTP (Google Authenticator, Authy) for Admin and Super Admin roles | P1 | TOTP secret generation, QR code enrollment, backup codes |
| F1.8 | Account lockout after 5 failed login attempts, with 15-minute cooldown and email notification | P0 | Rate limiting per IP + username, exponential backoff |
| F1.9 | Password reset via secure email token (expires in 1 hour) | P0 | Cryptographically secure token, single-use, logged |

### 3.2 Auction Listing Management (Sellers)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F2.1 | Sellers create listings with: title, detailed description, equipment category (from taxonomy), item condition (new, used-good, used-fair, refurbished, salvage), reserve price, starting price, quantity, location/depot, and warranty information | P0 | All fields validated, category from predefined taxonomy, condition affects buyer confidence scoring |
| F2.2 | Upload 1-10 high-resolution photos per listing (max 5MB each, JPEG/PNG/WebP). System auto-generates thumbnails (3 sizes) and optimized versions for mobile | P0 | Image validation, virus scanning, EXIF stripping, CDN upload with signed URLs |
| F2.3 | Configure auction duration: 4-72 hours for standard auctions, or fixed-date auctions with specific start/end times. Schedule listings for future publication | P0 | Duration validation, timezone handling (EAT UTC+3), scheduled job activation |
| F2.4 | Complete listing modifications allowed until bidding goes live (status = active). After activation, only description corrections and photo additions allowed (requires Admin approval for significant changes) | P0 | Audit trail of all edits, version history maintained |
| F2.5 | Explicit state transitions: Draft → Pending Approval → Rejected (with reason) → Draft → Active → Extended (anti-sniping) → Closed → Pending Collection → Completed → Cancelled/Disputed | P0 | State machine enforced at database level, invalid transitions blocked, all transitions logged |
| F2.6 | Live seller dashboard: real-time bid count, current highest bid, bidder count, time remaining, bid velocity (bids per hour), and projected final price | P0 | WebSocket subscription per auction, updates within 1 second |
| F2.7 | Seller analytics: historical performance (sell-through rate, average time-to-sale, price vs. reserve ratio), buyer demographics, and equipment category demand trends | P1 | Aggregated data, privacy-preserving, exportable to CSV/PDF |
| F2.8 | Bulk listing creation via CSV/Excel upload for large inventory liquidations | P1 | Template validation, error reporting with row numbers, preview before submission |
| F2.9 | Listing duplication/cloning for recurring similar items | P2 | Copy all fields except photos, new draft status |

### 3.3 Bidding Subsystem (Buyers)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F3.1 | Buyers sort/filter active auctions by: category, price range, time remaining, location/depot, condition, seller rating, and keyword search | P0 | Multi-filter combination, pagination (20 per page), sorting persistence in URL |
| F3.2 | Every bid must be ff MAX(reserve_price, current_highest_bid + minimum_increment). System calculates and displays the minimum acceptable bid | P0 | Server-side validation mandatory, client-side pre-validation for UX |
| F3.3 | Minimum increment rules: Fixed KES 500 for items < KES 50,000; KES 1,000 for KES 50,000-200,000; KES 2,500 for KES 200,000-500,000; KES 5,000 for > KES 500,000. Configurable per auction by Admin | P0 | Dynamic increment calculation, displayed to buyer before bidding |
| F3.4 | Modal confirmation showing: item name, proposed bid amount, previous high bid, your current exposure (total active bids), and confirmation checkbox | P0 | Non-dismissible for 3 seconds, explicit “I confirm” action required |
| F3.5 | Successful bid generates on-screen confirmation receipt with bid ID, timestamp, auction details, and email/SMS notification | P0 | Receipt stored in bid history, notification queued via job system |
| F3.6 | Immediate outbid notification: WebSocket push + email + SMS when another buyer surpasses the user’s active bid. Notification includes new highest bid amount and option to increase | P0 | Notification within 5 seconds of bid acceptance, user preference controls |
| F3.7 | Proxy/maximum bidding: Buyers can set a maximum bid amount; system automatically bids on their behalf up to that limit using minimum increments | P1 | Proxy bidding engine, auto-bid execution, privacy of max bid (not exposed to other users) |
| F3.8 | Bid retraction: Allowed within 5 minutes of placement IF no higher bid has been placed since. Retraction logged and visible to Admin | P1 | Time window check, no subsequent bids check, retraction reason required |
| F3.9 | Watchlist: Buyers can save auctions to watchlist with optional price threshold alerts | P2 | Watchlist CRUD, email alert when threshold reached or auction ending soon |
| F3.10 | Bid history export: Buyers can export their bid history to CSV/PDF for accounting | P2 | Filtered export, date range selection, includes all bid details |

### 3.4 Auction Lifecycle & Bid Sniping Protection

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F4.1 | Synchronized countdown timer updating every 1 second across all connected clients, with server-side authoritative time | P0 | NTP-synchronized server time, WebSocket broadcast, drift correction |
| F4.2 | Anti-Sniping Rule: If bid submitted within final 5 minutes, deadline extends by 2 minutes from bid timestamp. Maximum total extension: 10 minutes (5 extensions max) | P0 | Atomic check-and-extend, extension count tracked, displayed to all users |
| F4.3 | All bid execution requests blocked when auction status = closed or ends_at < now(). Graceful rejection with “Auction Ended” message | P0 | Database-level check, race condition handling with optimistic locking |
| F4.4 | Winning bidder declared programmatically within 1 second of closure. If reserve not met, no winner declared; auction transitions to “Reserve Not Met” state | P0 | Winner evaluation: highest bid ff reserve, ties broken by earliest bid timestamp |
| F4.5 | Closed auction displays: “Won by [Buyer Name]” or “Reserve Not Met” or “No Bids” with final price prominently. Public outcome for 30 days | P0 | Outcome page accessible without login, SEO-friendly |
| F4.6 | Auto-relist for “Reserve Not Met”: Option for seller to auto-relist with 10% reduced reserve or manual edit. If no action within 48 hours, returns to Draft | P1 | Seller notification, one-click relist, configurable reduction percentage |
| F4.7 | Auction extension notification: All watchers and bidders notified when anti-sniping triggers, with new end time | P0 | WebSocket push + email, new end time prominently displayed |
| F4.8 | Graceful degradation: If WebSocket fails, system falls back to 5-second polling with visual indicator | P1 | Connection health monitoring, automatic reconnection, user notification |

### 3.5 Transparency & Bid Histories

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F5.1 | Bid history on item detail view shows: bidder identifier (configurable per auction), bid amount, timestamp, and bid sequence number. All bids visible, not just highest | P0 | Configurable anonymity: Full Name / Masked (“Bidder #123”) / Anonymous (“Anonymous Bidder”) |
| F5.2 | Historical logs sorted descending (newest first). Current leader highlighted with distinct styling (gold crown, green background) | P0 | Leader recalculation on every new bid, visual distinction clear |
| F5.3 | Total active bid tally displayed at top: “X bids from Y bidders” | P0 | Real-time count, unique bidder count |
| F5.4 | Bid history export (Admin only): Full CSV with bidder details, bid amounts, timestamps, IP addresses, and user agent strings for audit | P1 | Admin-only, date range filter, compliance-ready formatting |
| F5.5 | Public API endpoint for bid history (anonymized) for third-party integrations and market research | P2 | Rate-limited, no PII, paginated |

### 3.6 Management Dashboards (Administrators)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F6.1 | Central processing queue: All new listings awaiting approval, sortable by submission time, seller, category, and urgency | P0 | Real-time queue, SLA indicators (target: <5 min review time), bulk actions |
| F6.2 | Approve or reject listings with mandatory textual reason for rejection. Rejection returns to Draft with reason visible to seller | P0 | Approval transitions to Active (or Scheduled), rejection stores reason, email notification to seller |
| F6.3 | Buyer verification tools: Review submitted documents, approve/reject with reason, bulk verification, verification status tracking | P0 | Document viewer (PDF/image), verification notes, audit trail |
| F6.4 | Comprehensive oversight: All auction states (Draft, Pending, Active, Extended, Closed, Completed, Cancelled, Disputed) with filtering, search, and bulk actions | P0 | Status-based filtering, keyword search, pagination, export |
| F6.5 | Manual auction closure override for compliance/exceptional conditions. Requires dual authorization (two Admin approvals) for auctions with bids > KES 100,000 | P0 | Override logged with reason, dual-auth for high-value, immediate notification to all bidders |
| F6.6 | System configuration: Default auction durations, increment rules, anti-sniping settings, currency defaults, notification templates, maintenance mode | P1 | Configuration UI, change logging, immediate effect or scheduled |
| F6.7 | Audit log viewer: All user actions, system events, state transitions, with filtering by user, action type, date range, and auction | P1 | Immutable logs, tamper-evident, exportable, 7-year retention |
| F6.8 | Dispute management: Log disputes, assign to Admin, track resolution status, communicate with parties, record resolution | P1 | Ticket system, status tracking, deadline alerts, resolution templates |
| F6.9 | Analytics and reporting: Platform-wide metrics (GMV, active users, sell-through rate, average bids per auction, category performance), exportable | P1 | Dashboard charts, date range selection, scheduled reports |
| F6.10 | User management: View all users, edit roles, suspend/activate accounts, reset passwords, view user activity | P1 | CRUD operations, bulk actions, activity timeline |

### 3.7 Post-Auction Operational Flow

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F7.1 | Post-auction victory screen: Contact seller actions (email, phone, in-app message), invoice download, payment instructions, and collection deadline (default 7 business days) | P0 | Contact info from seller profile, auto-generated invoice PDF, payment status tracking |
| F7.2 | “Mark as Collected” workflow: Both seller and buyer must confirm. Auction transitions: Closed → Pending Collection → Completed or Disputed | P0 | Two-party confirmation, timeout handling (auto-disputed after 14 days), reminder notifications |
| F7.3 | Payment tracking: Seller records payment receipt (amount, date, method), buyer confirms. Offline payment methods: bank transfer, cheque, cash (with receipt upload) | P1 | Payment status: pending, partial, paid, refunded. Receipt upload, verification |
| F7.4 | Automated reminders: Daily reminders to buyer for uncollected items starting 3 days before deadline; daily reminders to seller for unconfirmed collections | P1 | Scheduled job, email + SMS, escalation to Admin after deadline |
| F7.5 | Dispute initiation: Either party can initiate dispute within 7 days of collection deadline. Requires reason and evidence upload | P1 | Dispute ticket creation, Admin assignment, communication thread, resolution tracking |
| F7.6 | Seller rating: Buyer can rate seller (1-5 stars) and leave feedback after completion. Ratings affect seller reputation score and visibility | P2 | Rating aggregation, review moderation, seller response capability |
| F7.7 | Re-listing from non-payment: If buyer fails to pay within 7 days, Admin can cancel win and re-list (with 2nd highest bidder option or full re-list) | P1 | Non-payment detection, Admin action, 2nd bidder notification, re-list workflow |

### 3.8 Notification System

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F8.1 | Email notifications: Account verification, bid confirmation, outbid alert, auction win, auction ending soon (1 hour, 15 min), collection reminder, payment receipt, dispute update | P0 | HTML templates, plain text fallback, deliverability tracking, bounce handling |
| F8.2 | SMS notifications: Outbid alert, auction win, collection deadline reminder, payment confirmation. Configurable by user | P1 | Twilio/Africa’s Talking integration, opt-out compliance, character limit handling |
| F8.3 | In-app notifications: Real-time toast notifications for all bid events, persistent notification center with read/unread status | P0 | WebSocket delivery, notification bell UI, mark all read, 30-day retention |
| F8.4 | Notification preferences: Users can configure which events trigger email/SMS/in-app, frequency settings, and quiet hours | P2 | Per-event toggles, quiet hours (no SMS 10pm-7am), digest mode (daily summary) |
| F8.5 | Digest emails: Daily summary of watched auctions, bid status, and upcoming deadlines. Weekly platform newsletter (opt-in) | P2 | Scheduled jobs, template system, unsubscribe |

### 3.9 Multi-Currency Support

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F9.1 | Support KES (default), UGX, TZS, USD. Auction currency set by seller based on item location/depot | P1 | Currency field on Auction, display formatting, conversion for analytics |
| F9.2 | Exchange rates: Admin-configurable rates, updated daily from Central Bank API fallback. Historical rates stored for accurate reporting | P1 | Rate table, API integration, fallback to manual, audit trail |
| F9.3 | Currency display: User sees auction in original currency, with optional conversion to preferred currency (stored in profile) | P2 | Conversion indicator, rate timestamp, approximate disclaimer |

### 3.10 API & Integrations

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| F10.1 | RESTful API with OpenAPI 3.0 documentation, rate limiting (100 req/min for standard, 1000 req/min for enterprise), and API key authentication | P1 | Swagger UI, versioning (/v1/), HMAC signature option |
| F10.2 | Webhook support for external systems: bid events, auction state changes, payment updates | P2 | Configurable endpoints, retry logic (3 attempts), signature verification |
| F10.3 | ERP integration endpoints: Inventory sync, sales order creation, customer master data sync | P2 | SAP/Oracle/Custom ERP connectors, batch sync, error handling |

## 4. Non-Functional Requirements

| ID | Category | Requirement | Target KPI |
|---|---|---|---|
| NF1 | Latency | Page load < 2s; bid execution < 500ms; API response < 300ms (p95) | 99th percentile metrics |
| NF2 | Availability | 99.9% uptime (excluding planned maintenance) | < 8.76 hours downtime/year |
| NF3 | Concurrency | 500+ simultaneous active bidders per auction, 100+ concurrent live auctions | < 1s latency under peak load |
| NF4 | Synchronization | Bid state broadcast to all observers within 1-2 seconds | WebSocket message delivery confirmation |
| NF5 | Responsiveness | Mobile-first design, optimized for 3G/4G networks. Image lazy loading, code splitting, service worker caching | Lighthouse score > 90 on mobile |
| NF6 | Security | End-to-end HTTPS (TLS 1.3), bcrypt password hashing (cost 12), strict SQL injection prevention, XSS/CSRF protection, CSP headers, input sanitization | OWASP Top 10 compliance, annual penetration test |
| NF7 | Scalability | Horizontal scaling to 100+ concurrent live auctions, 50,000+ concurrent users. Auto-scaling based on CPU/memory/WebSocket connections | Kubernetes HPA, database read replicas |
| NF8 | Data Integrity | ACID compliance for bid transactions, optimistic locking for concurrent bids, database transactions for state transitions | Zero lost bids, zero double-counting |
| NF9 | Backup & Recovery | Daily automated backups (database + files), point-in-time recovery (7 days), disaster recovery RTO < 4 hours, RPO < 1 hour | Automated backup verification, quarterly DR drill |
| NF10 | Compliance | GDPR/Kenya Data Protection Act compliance, data retention policies, right to erasure, data portability | Legal review, privacy policy, DPO appointment |
| NF11 | Monitoring | Application performance monitoring (APM), error tracking, log aggregation, alerting (PagerDuty/Opsgenie), custom dashboards | 99.9% alert coverage, < 5 min alert latency |
| NF12 | Accessibility | WCAG 2.1 AA compliance, screen reader support, keyboard navigation, color contrast ratios | Automated a11y testing, manual audit |

## 5. Relational Core Data Model

### 5.1 User Entity

- id (UUID, PK)
- email (String, Unique, Indexed)
- password_hash (String, bcrypt)
- phone (String, Unique, Indexed)
- company_name (String, Required)
- tax_id (String, Unique, Required for sellers/buyers)
- role (Enum: 'seller' | 'buyer' | 'admin' | 'super_admin')
- verified (Boolean, Default: false)
- verification_status (Enum: 'pending' | 'approved' | 'rejected')
- verification_notes (Text, Admin-only)
- verification_documents (JSON Array: [{type, url, uploaded_at}])
- preferred_currency (Enum: 'KES' | 'UGX' | 'TZS' | 'USD', Default: 'KES')
- notification_preferences (JSON: {email: {}, sms: {}, in_app: {}})
- two_factor_enabled (Boolean, Default: false)
- two_factor_secret (String, Encrypted, Nullable)
- last_login_at (Timestamp)
- login_attempts (Integer, Default: 0)
- locked_until (Timestamp, Nullable)
- created_at (Timestamp)
- updated_at (Timestamp)
- deleted_at (Timestamp, Soft delete)

### 5.2 Auction Entity

- id (UUID, PK)
- title (String, 255 chars max)
- description (Text)
- category_id (UUID, FK → Category.id)
- condition (Enum: 'new' | 'used_good' | 'used_fair' | 'refurbished' | 'salvage')
- seller_id (UUID, FK → User.id)
- reserve_price (Decimal, 10,2)
- starting_price (Decimal, 10,2)
- currency (Enum: 'KES' | 'UGX' | 'TZS' | 'USD', Default: 'KES')
- quantity (Integer, Default: 1)
- location (String, Depot/branch location)
- warranty_info (Text, Nullable)
- photo_urls (JSON Array of Strings, Max 10)
- thumbnail_urls (JSON Array: {small, medium, large})
- status (Enum: 'draft' | 'pending' | 'active' | 'extended' | 'closed' | 'reserve_not_met' | 'pending_collection' | 'completed' | 'cancelled' | 'disputed')
- visibility (Enum: 'public' | 'private' | 'invite_only')
- bidder_anonymity (Enum: 'full' | 'masked' | 'anonymous', Default: 'masked')
- minimum_increment (Decimal, 10,2, Calculated or overridden)
- anti_sniping_enabled (Boolean, Default: true)
- anti_sniping_minutes (Integer, Default: 5)
- anti_sniping_extension (Integer, Default: 2)
- anti_sniping_max_extensions (Integer, Default: 5)
- created_at (Timestamp)
- updated_at (Timestamp)
- starts_at (Timestamp)
- ends_at (Timestamp)
- original_ends_at (Timestamp, For anti-sniping tracking)
- extension_count (Integer, Default: 0)
- winner_id (UUID, FK → User.id, Nullable)
- final_price (Decimal, 10,2, Nullable)
- winning_bid_id (UUID, FK → Bid.id, Nullable)
- collection_deadline (Timestamp, Nullable)
- seller_confirmed_collection (Boolean, Default: false)
- buyer_confirmed_collection (Boolean, Default: false)
- payment_status (Enum: 'pending' | 'partial' | 'paid' | 'refunded', Default: 'pending')
- payment_method (String, Nullable)
- payment_receipt_url (String, Nullable)
- rejection_reason (Text, Nullable)
- admin_notes (Text, Nullable)
- view_count (Integer, Default: 0)
- watch_count (Integer, Default: 0)
- deleted_at (Timestamp, Soft delete)

### 5.3 Bid Entity

- id (UUID, PK)
- auction_id (UUID, FK → Auction.id, Indexed)
- bidder_id (UUID, FK → User.id, Indexed)
- amount (Decimal, 10,2)
- currency (Enum: 'KES' | 'UGX' | 'TZS' | 'USD')
- status (Enum: 'active' | 'outbid' | 'won' | 'cancelled' | 'retracted')
- is_proxy_bid (Boolean, Default: false)
- proxy_maximum (Decimal, 10,2, Nullable)
- sequence_number (Integer, Auto-increment per auction)
- ip_address (String, IPv4/IPv6)
- user_agent (String)
- created_at (Timestamp)
- updated_at (Timestamp)
- retracted_at (Timestamp, Nullable)
- retraction_reason (Text, Nullable)
- deleted_at (Timestamp, Soft delete)

### 5.4 Category Entity (New)

- id (UUID, PK)
- name (String, Unique)
- slug (String, Unique, URL-friendly)
- description (Text, Nullable)
- parent_id (UUID, FK → Category.id, Nullable, Self-referencing for hierarchy)
- icon (String, Nullable)
- sort_order (Integer, Default: 0)
- is_active (Boolean, Default: true)
- created_at (Timestamp)
- updated_at (Timestamp)

### 5.5 Notification Entity (New)

- id (UUID, PK)
- user_id (UUID, FK → User.id)
- type (Enum: 'bid_confirmation' | 'outbid' | 'auction_win' | 'auction_end' | 'collection_reminder' | 'payment_received' | 'verification' | 'system')
- title (String)
- message (Text)
- data (JSON, Contextual payload)
- channel (Enum: 'email' | 'sms' | 'in_app' | 'push')
- status (Enum: 'pending' | 'sent' | 'delivered' | 'failed' | 'read')
- sent_at (Timestamp, Nullable)
- read_at (Timestamp, Nullable)
- created_at (Timestamp)
- updated_at (Timestamp)

### 5.6 Audit Log Entity (New)

- id (UUID, PK)
- user_id (UUID, FK → User.id, Nullable for system actions)
- action (String, e.g., 'bid_placed', 'auction_created', 'user_verified')
- entity_type (String, e.g., 'auction', 'bid', 'user')
- entity_id (UUID)
- old_values (JSON, Nullable)
- new_values (JSON, Nullable)
- ip_address (String)
- user_agent (String)
- created_at (Timestamp)
- INDEX on (entity_type, entity_id, created_at)

### 5.7 Exchange Rate Entity (New)

- id (UUID, PK)
- from_currency (Enum)
- to_currency (Enum)
- rate (Decimal, 10,6)
- source (Enum: 'central_bank' | 'manual' | 'api')
- effective_date (Date)
- created_at (Timestamp)
- UNIQUE(from_currency, to_currency, effective_date)

## 6. End-to-End User Flows

### 6.1 Inventory Listing Journey (Sellers)

1. Seller authenticates via credentials or SSO, lands on Inventory Dashboard
2. Clicks “Create Auction” → multi-step form: Item Details → Photos → Pricing → Duration → Review
3. Enters: title, description, selects category from taxonomy, condition, reserve price, starting price, quantity, location, warranty
4. Uploads 1-10 photos with auto-thumbnail generation and preview
5. Sets auction duration (4-72 hours) or scheduled start time, reviews all details
6. Submits → status transitions to “Pending Approval”, email confirmation sent
7. Admin reviews in queue (target <5 min), approves or rejects with reason
8. On approval: status → “Active” (or “Scheduled” if future start), public visibility, countdown begins
9. Seller monitors live dashboard: bid count, highest bid, bidder count, bid velocity, projected price
10. On closure: seller receives winner notification, accesses post-auction screen for collection coordination
11. Both parties confirm collection → status → “Completed”

### 6.2 Search & Bid Placement Journey (Buyers)

1. Pre-verified Buyer authenticates, lands on marketplace homepage
2. Browses active listings with filters (category, price, time, location, condition) and keyword search
3. Selects item → detail view: specifications, photos, bid history (anonymized), countdown timer, seller info
4. Enters bid amount → system validates against minimum bid (reserve or current highest + increment)
5. Modal confirmation: item name, bid amount, previous high bid, total exposure, “I confirm” checkbox (3-second delay)
6. On confirm: system atomically validates, records bid, broadcasts update, returns confirmation receipt
7. If outbid: immediate WebSocket toast + email + SMS with new highest bid and “Increase Bid” button
8. If winner at closure: victory screen with seller contact, invoice download, payment instructions, 7-day collection deadline
9. Buyer marks “Collected” when item received, can rate seller

### 6.3 Verification & Moderation Journey (Administrators)

1. Admin authenticates with 2FA, lands on Admin Dashboard
2. Monitors queues: Pending Listings, Pending Verifications, Active Auctions, Disputes
3. Reviews listing: photos, description, reserve reasonableness, seller history → Approve/Reject with reason
4. Reviews buyer verification: company documents, trade license, references → Approve/Reject with notes
5. Monitors active auctions: can view all, filter by state, search, perform manual override (dual-auth for high-value)
6. Handles disputes: view ticket, communicate with parties, request evidence, render decision
7. Generates reports: platform metrics, seller performance, category trends, financial summaries
8. Manages system configuration: increment rules, anti-sniping settings, currencies, notification templates

## 7. Core System Success Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Functional Demo Pass Rate | 100% | End-to-end testing suite, automated + manual |
| Bid Processing Success Rate | > 99.9% | Error tracking, transaction logs, reconciliation |
| Real-Time Sync Delay | < 2 seconds | WebSocket message timing, client-side telemetry |
| Admin Verification Velocity | < 5 minutes | Queue timestamp tracking, SLA dashboard |
| Mobile UX Score | > 9/10 | User surveys, Lighthouse performance score |
| Page Load Time (p95) | < 2 seconds | Real user monitoring (RUM), synthetic monitoring |
| API Response Time (p95) | < 300ms | APM tools, endpoint-level tracking |
| System Uptime | 99.9% | Infrastructure monitoring, incident tracking |
| Concurrent User Capacity | 50,000+ | Load testing, chaos engineering |
| Security Audit | Zero critical vulnerabilities | Annual penetration test, automated scanning |
| Data Recovery RTO | < 4 hours | Quarterly DR drill, backup restoration testing |

## 8. Constraints, Assumptions & Operational Context

### 8.1 Authentication

- Primary: Email/password with bcrypt
- Secondary: OAuth 2.0 (Google, Microsoft), SAML 2.0 for enterprise
- 2FA mandatory for Admin/Super Admin via TOTP
- Session management: Redis-backed, 24h absolute max, 30min inactivity timeout

### 8.2 Financial Settlement

- Auction lifecycle managed through “Completed” status
- Payment tracking: offline methods (bank transfer, cheque, cash) with receipt upload
- No integrated payment gateway in Phase 1 (manual reconciliation)
- Payment status tracked: pending → partial → paid → refunded

### 8.3 Infrastructure

- Cloud-native deployment (AWS/Azure/GCP)
- Containerized microservices (Kubernetes)
- Database: PostgreSQL 15+ (primary), Redis (caching/sessions), MinIO/S3 (object storage)
- WebSocket: Socket.io or native WS with Redis adapter for horizontal scaling
- CDN: CloudFront/Cloudflare for static assets and image delivery

### 8.4 Network & Geography

- Primary market: East Africa (Kenya, Uganda, Tanzania)
- Network optimization: 3G/4G cellular, image compression, lazy loading, service workers
- Timezone: East Africa Time (EAT, UTC+3) for all timestamps
- Legal: Compliant with Kenya Data Protection Act 2019, GDPR for EU contacts

### 8.5 Browser Support

- Chrome 110+, Safari 16+, Firefox 110+, Edge 110+
- Mobile: iOS Safari 16+, Chrome Android 110+
- Progressive Web App (PWA) with offline capability for viewing cached listings

## 9. Development Timeline (12-Week Iterative Sprint)

| Phase | Weeks | Deliverables | Milestone |
|---|---|---|---|
| Phase 1: Foundation | 1-2 | Project setup, CI/CD, database schema, authentication (email/password, JWT, RBAC), basic user management | Core infrastructure ready |
| Phase 2: Core Auction | 3-4 | Listing creation (with photos), auction state machine, bid placement, real-time sync (WebSocket), countdown timers, basic bid history | Auction engine functional |
| Phase 3: Advanced Features | 5-6 | Anti-sniping, proxy bidding, outbid notifications, search/filter, seller dashboard, buyer watchlist, bid retraction | Full bidding experience |
| Phase 4: Admin & Ops | 7-8 | Admin dashboard, approval queues, buyer verification, manual overrides, audit logging, system configuration | Operations ready |
| Phase 5: Post-Auction | 9 | Collection workflow, payment tracking, invoice generation, dispute management, rating system | Transaction completion |
| Phase 6: Notifications | 10 | Email system (SendGrid/AWS SES), SMS (Twilio/Africa’s Talking), in-app notifications, preference management | Full communication |
| Phase 7: Polish & Scale | 11 | Performance optimization, load testing, security hardening, mobile optimization, accessibility (WCAG) | Production-ready |
| Phase 8: Deploy & Monitor | 12 | Production deployment, monitoring setup (Datadog/New Relic), documentation, training, handover | Go-live |

## 10. Strategic Decisions (Resolved)

| Question | Decision | Rationale |
|---|---|---|
| Seller Anonymity | Full transparency for sellers (company name visible), configurable for buyers (default: masked as “Bidder #123”) | Builds trust in B2B context, protects buyer competitive intelligence |
| Bidding Increment | Dynamic tiered: KES 500 (<50K), KES 1,000 (50K-200K), KES 2,500 (200K-500K), KES 5,000 (>500K). Admin can override per auction | Scales with asset value, prevents micro-bidding on high-value items |
| Unmet Reserve | Auto-transition to “Reserve Not Met” state. Seller has 48 hours to: (a) accept highest bid anyway, (b) re-list with 10% lower reserve, (c) return to Draft. After 48h, auto-return to Draft | Maximizes seller flexibility, prevents stale listings |
| Dispute Management | 7-day dispute window from collection deadline. Admin-mediated with evidence upload. Resolution: confirm completion, refund, or re-list. All disputes logged for seller reputation | Balances buyer protection with seller fairness |
| Bid Retraction | Allowed within 5 minutes if no higher bid placed since. Requires reason. Retraction visible to Admin and in audit log. Retracted bids don’t count toward bid tally | Prevents abuse while allowing genuine mistakes |
| Currency | Multi-currency support from launch: KES (default), UGX, TZS, USD. Exchange rates updated daily from Central Bank API with manual override | D&S operates across East Africa, USD needed for international buyers |
| Payment | Offline payment tracking only (no gateway). Methods: bank transfer, cheque, cash. Receipt upload required. Payment status tracked through system | MVP constraint respected, but full tracking enables Phase 2 gateway integration |
| Notifications | Email + in-app from launch. SMS for critical events (outbid, win, deadline). User-configurable preferences with quiet hours | Critical for engagement, SMS essential for East African market |

## 11. Glossary

- **Anti-Sniping**: Automatic auction extension when bids are placed near closing time
- **Bid Velocity**: Rate of bidding (bids per hour) indicating auction heat
- **Collection Deadline**: Time limit (7 business days) for winner to collect item and complete transaction
- **GMV**: Gross Merchandise Value — total value of all auction transactions
- **Proxy Bid**: Automatic bidding on behalf of user up to their specified maximum
- **Reserve Price**: Minimum price seller will accept; auction can close below this but no winner declared
- **Sell-Through Rate**: Percentage of listed items that successfully sell
- **Sniper**: User who places bid at last second to avoid counter-bids
- **Starting Price**: Initial bid amount, can be below reserve
- **Watchlist**: User’s saved auctions for easy tracking

**Document Version:** 2.0

**Last Updated:** May 2026

**Author:** D&S Engineering Team

**Reviewers:** Product, Engineering, Legal, Operations
