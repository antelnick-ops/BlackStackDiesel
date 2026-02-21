# Architecture Notes

## Current State (MVP)

The app is a **single-file SPA** (`public/index.html`) with all HTML, CSS, and JS inline. This was intentional for rapid prototyping but should be decomposed for production.

## Data Flow

```
User Login → Vehicle Setup → [App Screens]
                                ├── AI Diagnostics (filtered by vehicle)
                                ├── Marketplace (filtered by engine family)
                                └── Profile (displays vehicle + stats)
```

### Vehicle → Engine Family Mapping

The core concept: once a user selects their vehicle, we determine an **engine family** key that maps to the correct parts catalog and AI behavior.

```
User selects: 2002 Dodge Ram 2500 → 5.9L 24V Cummins ISB
Engine family resolved: "cummins59"
→ Parts catalog: cummins59.prods[]
→ AI suggestions: cummins-specific known issues
→ Marketplace categories: cummins59.cats[]
```

Engine family keys:
- `cummins59` — 5.9L Cummins (12V, 24V, ISB 325)
- `cummins67` — 6.7L Cummins (ISB, ISB 385, HO 420)
- `ps73` — 7.3L Power Stroke
- `ps60` — 6.0L Power Stroke
- `ps64` — 6.4L Power Stroke
- `ps67` — 6.7L Power Stroke (all gens)
- `dmax` — 6.6L Duramax (all variants LB7 through L5P)

### State Object

```javascript
{
  v: { year, make, model, engine },  // Selected vehicle
  cart: [],                           // Cart items
  ef: null,                           // Engine family key
  cat: 'All'                          // Active marketplace category
}
```

## Database Schema (Recommended for Backend)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles (one per user for now, extend to many later)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  year INT NOT NULL,
  make VARCHAR NOT NULL,
  model VARCHAR NOT NULL,
  engine VARCHAR NOT NULL,
  engine_family VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  brand VARCHAR NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR NOT NULL,
  engine_family VARCHAR NOT NULL,
  description TEXT,
  image_url VARCHAR,
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status VARCHAR DEFAULT 'pending',
  total DECIMAL(10,2),
  tracking_number VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT DEFAULT 1,
  price DECIMAL(10,2)
);

-- AI Chat History
CREATE TABLE ai_chats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  messages JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Routes (Recommended)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/vehicles/makes?year=2002
GET    /api/vehicles/models?year=2002&make=Dodge
GET    /api/vehicles/engines?year=2002&make=Dodge&model=Ram+2500
POST   /api/vehicles                    (save user's vehicle)
PUT    /api/vehicles/:id

GET    /api/products?engine_family=cummins59&category=Injectors&q=bosch
GET    /api/products/:id

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id

POST   /api/ai/chat                     (send message, get AI response)
POST   /api/ai/upload                   (upload diagnostic photo)
```
