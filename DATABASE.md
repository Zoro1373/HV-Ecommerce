# VERTEX Database Design

## Database
Use PostgreSQL with Prisma ORM and committed migration files. Use database transactions for multi-step order and inventory operations. Do not use floating-point database types for money; use Prisma `Decimal` backed by an appropriate PostgreSQL `DECIMAL/NUMERIC` type.

## Suggested entities

### User
- `id` (primary key)
- `fullName`
- `email` (unique, normalized)
- `passwordHash`
- `phone` (nullable)
- `role` (`CUSTOMER` or `ADMIN`)
- `isActive`
- `emailVerified`
- `createdAt`, `updatedAt`

Never return `passwordHash` through an API.

### Category
- `id`
- `name`
- `slug` (unique)
- `description` (nullable)
- `imageUrl` (nullable)
- `isActive`
- timestamps

### Product
- `id`
- `name`
- `slug` (unique)
- `sku` (unique)
- `description`
- `categoryId` (foreign key)
- `brand` (nullable)
- `price` (Decimal)
- `mrp` (nullable Decimal)
- `stockQuantity` (integer, nonnegative)
- `imageUrl` (nullable)
- `unit` / `packSize` (nullable)
- `isActive`
- timestamps

Plan for variants with their own SKU, price, and inventory when different pack sizes/options are introduced. Do not encode variant pricing only in free-text descriptions.

### Cart
- `id`
- `userId` (unique foreign key for one active cart per user)
- timestamps

### CartItem
- `id`
- `cartId`
- `productId`
- `quantity` (positive integer)
- timestamps
- Unique constraint on `(cartId, productId)`

Guest cart state may live temporarily in the browser, but it is not authentication state. Validate every guest-cart item against the database before merging after login.

### Address
- `id`
- `userId`
- recipient name and phone
- address lines
- city, state, postal code, country
- `isDefault`
- timestamps

### Order
- `id`
- `orderNumber` (unique)
- `userId`
- order status
- payment status
- subtotal, shipping fee, tax amount, total amount (Decimal)
- shipping-address snapshot fields
- timestamps

### OrderItem
- `id`
- `orderId`
- optional product reference according to deletion policy
- product name and SKU snapshots
- quantity
- unit price and line total (Decimal)

Snapshots are required so historical orders remain accurate if a product is renamed or its price changes.

### NewsletterSubscription
- `id`
- `email` (unique, normalized)
- status/consent fields as appropriate
- `createdAt`, `updatedAt`

### QuoteRequest
- `id`
- customer/user reference (nullable for guest requests if supported)
- contact name, email, phone
- company name (optional)
- GSTIN (optional; validate format if collected)
- requested product/details and quantity
- message
- status
- timestamps

### AuditLog
- `id`
- actor user ID (nullable for system actions)
- action
- entity type and entity ID
- safe metadata (no passwords, tokens, or secrets)
- timestamp

## Constraints and indexes
- **Unique Constraints**:
  - `User.email` (unique, normalized case-insensitively)
  - `Session.tokenHash` (unique, SHA-256 token hash)
  - `Category.slug` (unique)
  - `Product.slug` (unique)
  - `ProductVariant.sku` (unique)
  - `Cart.userId` (unique, enforces single active cart per user)
  - `CartItem.(cartId, variantId)` (composite unique)
  - `TieredPrice.(variantId, minQuantity)` (composite unique)
  - `Order.orderNumber` (unique)
  - `NewsletterSubscription.email` (unique)
  - `MfaChallenge.tokenHash` (unique, SHA-256 challenge token hash)
- **Foreign Keys and Referential Integrity**:
  - `Session.userId` -> `User.id`: `ON DELETE CASCADE` (purges user sessions if user is removed)
  - `RecoveryCode.userId` -> `User.id`: `ON DELETE CASCADE` (purges recovery hashes when user is removed)
  - `MfaChallenge.userId` -> `User.id`: `ON DELETE CASCADE` (purges temporary challenges when user is removed)
  - `Category.parentId` -> `Category.id`: `ON DELETE SET NULL`
  - `Product.categoryId` -> `Category.id`: `ON DELETE RESTRICT` (strictly blocks deleting category containing active products)
  - `ProductVariant.productId` -> `Product.id`: `ON DELETE CASCADE`
  - `TieredPrice.variantId` -> `ProductVariant.id`: `ON DELETE CASCADE`
  - `Cart.userId` -> `User.id`: `ON DELETE CASCADE`
  - `CartItem.cartId` -> `Cart.id`: `ON DELETE CASCADE`
  - `CartItem.variantId` -> `ProductVariant.id`: `ON DELETE RESTRICT`
  - `Address.userId` -> `User.id`: `ON DELETE CASCADE`
  - `Order.userId` -> `User.id`: `ON DELETE RESTRICT` (retains historical order records)
  - `OrderItem.orderId` -> `Order.id`: `ON DELETE CASCADE`
  - `OrderItem.variantId` -> `ProductVariant.id`: `ON DELETE SET NULL` (retains historical snapshot of product name, variant name, SKU, unit price, tax, and line total even if variant is later retired)
  - `QuoteRequest.userId` -> `User.id`: `ON DELETE SET NULL`
  - `AuditLog.actorId` -> `User.id`: `ON DELETE SET NULL`
- **Active PostgreSQL Database CHECK Constraints**:
  - `chk_variant_price_non_negative`: `CHECK ("price" >= 0)`
  - `chk_variant_stock_non_negative`: `CHECK ("stockQuantity" >= 0)`
  - `chk_variant_mrp_non_negative`: `CHECK ("mrp" IS NULL OR "mrp" >= 0)`
  - `chk_cart_item_quantity_positive`: `CHECK ("quantity" > 0)`
  - `chk_tiered_quantity_valid`: `CHECK ("minQuantity" > 0 AND ("maxQuantity" IS NULL OR "maxQuantity" >= "minQuantity"))`
  - `chk_tiered_unit_price_non_negative`: `CHECK ("unitPrice" >= 0)`

## Decimal Precision for Monetary Calculations
All financial figures are persisted using PostgreSQL `DECIMAL(10,2)` (and `DECIMAL(5,2)` for tax percentages like GST 18.00%):
- `ProductVariant.price`, `ProductVariant.mrp`
- `TieredPrice.unitPrice`
- `Order.subtotal`, `Order.taxAmount`, `Order.shippingFee`, `Order.totalAmount`
- `OrderItem.unitPrice`, `OrderItem.taxAmount`, `OrderItem.lineTotal`
- `QuoteRequest.quotedAmount`
Floating-point arithmetic (`number` in JS or `FLOAT/REAL` in SQL) is strictly avoided for authoritative monetary calculations. Prisma `Decimal` objects (powered by `decimal.js`) are used on the backend to guarantee decimal-safe arithmetic (e.g. `price.mul(quantity)`).

## Inventory and checkout
- Re-read prices and stock from the database at checkout.
- Calculate totals on the server using decimal-safe arithmetic.
- Create order and order items in a transaction.
- Use conditional updates, row locking, or another concurrency-safe approach so concurrent checkouts cannot oversell inventory.
- If inventory is reserved, track reservation/expiry semantics. On cancellation, restore stock at most once.
- Add idempotency protection to order creation where practical so retries do not create duplicate orders.

## Seed data
The official seed script (`server/prisma/seed.js`) provisions the six products and three categories listed in `PROJECT_SPEC.md`:
1. Electronics: Arduino Uno R3, Motor Driver Module (L298N), Delta DVP Series PLC, Raspberry Pi 4 Model B.
2. Screws & Fasteners: Stainless Steel Hex Bolt (M8 x 30mm) with pack-of-10 and tiered pricing tiers.
3. Nut Types: Nyloc Nut (M8) with pack-of-20 and tiered pricing tiers.

**Idempotency & Safety**:
- Seed operations use `prisma.category.upsert` and `prisma.product.upsert` keyed on unique slugs.
- Running `npm run seed` repeatedly is idempotent and safe; it does not duplicate records or overwrite live data.
- Initial administrator bootstrapping is handled independently and safely via `npm run seed:admin`.

### RecoveryCode
- `id` (primary key, UUID)
- `userId` (foreign key -> `User.id`, `ON DELETE CASCADE`)
- `codeHash` (SHA-256 hash of single-use recovery code, never stored in plaintext)
- `usedAt` (nullable DateTime, marks one-time consumption)
- `createdAt`
- Index on `(userId, usedAt)`

### MfaChallenge
- `id` (primary key, UUID)
- `userId` (foreign key -> `User.id`, `ON DELETE CASCADE`)
- `tokenHash` (unique, SHA-256 hash of high-entropy challenge token)
- `type` (`LOGIN` or `ENROLLMENT`)
- `expiresAt` (DateTime, short-lived challenge expiration, default 5 minutes)
- `usedAt` (nullable DateTime, marks single-use consumption)
- `createdAt`
- Index on `tokenHash` and composite on `(userId, expiresAt)`

## Migrations
- Migration files are stored in `server/prisma/migrations/`.
- `20261014134007_init_vertex_schema`: Baseline VERTEX schema (Users, Sessions, Categories, Products, Variants, Carts, Orders, Quotes).
- `20261015180500_add_mfa_support`: Adds MFA fields to `User` (`mfaEnabled`, `mfaSecret`, `mfaPendingSecret`, `mfaEnrolledAt`, `mfaLastVerifiedStep`), creates `RecoveryCode` and `MfaChallenge` tables with constraints and indexes.
- The database schema is synchronized via Prisma Migrate.
- Use `npx prisma migrate deploy` in production environments.
- Never run destructive reset commands against a database with active user or catalog data.

## Least-Privilege Role Separation & Access Control

To protect production data against unauthorized schema modifications, accidental table drops, or SQL injection privilege escalation, VERTEX separates runtime database access from migration/administrative access using two distinct PostgreSQL roles:

```mermaid
flowchart TD
    subgraph Neon_PostgreSQL["Neon PostgreSQL Cluster (neondb)"]
        OwnerRole["neondb_owner<br/>(Cluster Owner)<br/>• Owns tables and schema<br/>• Full DDL (CREATE, ALTER, DROP)<br/>• Manages _prisma_migrations"]
        AppRole["vertex_app<br/>(Restricted Runtime Role)<br/>• NOSUPERUSER, NOCREATEROLE<br/>• NOCREATEDB, NOREPLICATION<br/>• DML Only: SELECT, INSERT, UPDATE, DELETE<br/>• Blocked from _prisma_migrations and DDL"]
        Tables["Domain Tables (User, Session, Product, Order, etc.)"]
        MigTable["_prisma_migrations"]
    end

    PrismaClient["Node.js Application Runtime<br/>(Prisma Client)"] -->|DATABASE_URL<br/>PgBouncer Pooler| AppRole
    PrismaMigrate["CI/CD Deployments & Admin Seeds<br/>(prisma migrate deploy)"] -->|DIRECT_URL<br/>Direct Connection| OwnerRole

    AppRole -->|SELECT, INSERT, UPDATE, DELETE| Tables
    AppRole -.->|DENIED (Code 42501)| MigTable
    OwnerRole -->|Full DDL & DML| Tables
    OwnerRole -->|Full DDL & DML| MigTable
```

### 1. Runtime Application Role (`vertex_app`)
- **Attributes**: `LOGIN`, `NOSUPERUSER`, `NOCREATEROLE`, `NOCREATEDB`, `NOREPLICATION`, `CONNECTION LIMIT 50`.
- **Allowed Operations**: `SELECT, INSERT, UPDATE, DELETE` on all 16 domain tables, `USAGE` on schema `public`, `USAGE, SELECT` on all current and future sequences.
- **Prohibited Operations (Enforced at DB Engine Level)**:
  - `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE` $\rightarrow$ Blocked (`ERROR: permission denied for schema public`, Code `42501`).
  - `TRUNCATE` $\rightarrow$ Blocked (`has_table_privilege('vertex_app', ..., 'TRUNCATE') = false`).
  - Access to `_prisma_migrations` $\rightarrow$ Blocked (`ERROR: permission denied for table _prisma_migrations`, Code `42501`).
  - Role management, database creation, replication $\rightarrow$ Blocked (`rolcreaterole: false, rolcreatedb: false, rolreplication: false`).
- **Connection**: Connects via Neon PgBouncer connection pooler (`ep-...-pooler.c-6.us-east-2.aws.neon.tech`).

### 2. Migration & Administrative Role (`neondb_owner`)
- **Attributes**: Table and schema owner, `rolcreaterole: true`, `rolcreatedb: true`.
- **Purpose**: Schema migrations (`npx prisma migrate deploy`), administrative seeds (`npm run seed:admin`), and maintenance.
- **Connection**: Connects via direct unpooled Neon endpoint (`DIRECT_URL`).

### 3. Future Migrations & Default Privileges
To ensure newly created tables in future migrations are immediately accessible to `vertex_app` without manual grant interventions, default privileges are configured on `neondb_owner`:
```sql
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vertex_app;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO vertex_app;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public 
  GRANT EXECUTE ON ROUTINES TO vertex_app;
```

### 4. Rollback Strategy
If an emergency rollback is ever required:
1. Revert `DATABASE_URL` in `server/.env` to the commented `ROLLBACK_DATABASE_URL` (connecting as `neondb_owner`).
2. Restart the application process.
3. Because no table structures or catalog data are modified during role switching, rollback executes in under 10 seconds with zero downtime and zero risk of data loss.

