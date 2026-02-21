# Architecture Notes — Black Stack Diesel

## Current State

- `index.html` — Early access landing page (live on Vercel)
- `app/index.html` — Full BSD mobile app prototype (in development)

## Engine Family Mapping

| Key | Engines | Trucks |
|-----|---------|--------|
| `cummins59` | 5.9L 12V, 24V, ISB 325 | Ram 2500/3500 1994–2007 |
| `cummins67` | 6.7L ISB, ISB 385, HO 420 | Ram 2500/3500 2007–2024 |
| `ps73` | 7.3L Power Stroke | F-250/350 1999–2003 |
| `ps60` | 6.0L Power Stroke | F-250/350 2003–2007 |
| `ps64` | 6.4L Power Stroke | F-250/350 2008–2010 |
| `ps67` | 6.7L Power Stroke (all gens) | F-250/350 2011–2024 |
| `dmax` | 6.6L Duramax LB7–L5P | Silverado/Sierra 2500/3500 2001–2024 |

## Database Schema (Planned)

```sql
CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR UNIQUE NOT NULL, name VARCHAR, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE vehicles (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), year INT, make VARCHAR, model VARCHAR, engine VARCHAR, engine_family VARCHAR, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE products (id UUID PRIMARY KEY, name VARCHAR, brand VARCHAR, price DECIMAL(10,2), category VARCHAR, engine_family VARCHAR, image_url VARCHAR, stock INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE orders (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), status VARCHAR DEFAULT 'pending', total DECIMAL(10,2), tracking_number VARCHAR, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE order_items (id UUID PRIMARY KEY, order_id UUID REFERENCES orders(id), product_id UUID REFERENCES products(id), quantity INT DEFAULT 1, price DECIMAL(10,2));
CREATE TABLE ai_chats (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), vehicle_id UUID REFERENCES vehicles(id), messages JSONB, created_at TIMESTAMP DEFAULT NOW());
```

## API Routes (Planned)

```
POST /api/auth/register    POST /api/auth/login    GET /api/auth/me
GET  /api/vehicles/makes   GET  /api/vehicles/models  GET /api/vehicles/engines
GET  /api/products         GET  /api/products/:id
POST /api/orders           GET  /api/orders           GET /api/orders/:id
POST /api/ai/chat          POST /api/ai/upload
```
