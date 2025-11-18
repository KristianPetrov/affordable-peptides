# Database Setup with Neon and Drizzle

This project uses [Neon](https://neon.tech/) (serverless Postgres) with [Drizzle ORM](https://orm.drizzle.team/) for database management.

## Initial Setup

1. **Create a Neon Database**
   - Sign up at https://neon.tech/
   - Create a new project
   - Copy your connection string

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your Neon database connection string:
     ```
     DATABASE_URL=postgresql://user:password@host/database?sslmode=require
     ```

3. **Push Schema to Database**
   - Run `pnpm db:push` to create the tables in your Neon database
   - This will create the `orders` table with all necessary columns

## Available Scripts

- `pnpm db:push` - Push schema changes directly to the database (recommended for development)
- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

## Migration from Local JSON Storage

If you have existing orders in `data/orders.json`, you can migrate them using the provided script:

```bash
pnpm db:migrate-orders
```

This script will:
- Read orders from `data/orders.json`
- Check if each order already exists in the database (by order number)
- Migrate only new orders
- Skip orders that already exist

The migration script is located at `scripts/migrate-orders.ts` if you need to customize it.

## Schema

The `orders` table includes:
- `id` (text, primary key)
- `order_number` (varchar, unique)
- `status` (varchar)
- `customer_name`, `customer_email`, `customer_phone` (text)
- `shipping_address` (jsonb)
- `items` (jsonb)
- `subtotal` (numeric)
- `total_units` (integer)
- `notes` (text, nullable)
- `created_at`, `updated_at` (timestamp)

