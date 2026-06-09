# Darkside Coffee Shop

Full stack Coffee Shop application with a responsive HTML/CSS/JavaScript frontend and a Node.js, Express, MongoDB, Mongoose, JWT, and bcrypt backend.

Render deployment instructions are in [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md).

## Project Structure

```text
coffee-shop/
├── frontend/
│   ├── index.html
│   ├── about.html
│   ├── menu.html
│   ├── blog.html
│   ├── review.html
│   ├── contact.html
│   ├── admin.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── assets/
└── backend/
    ├── server.js
    ├── package.json
    ├── .env
    ├── config/
    ├── models/
    ├── routes/
    ├── controllers/
    ├── middleware/
    ├── scripts/
    └── uploads/
```

## Requirements For Windows

Install these first:

- Node.js 18 or newer
- MongoDB Community Server
- MongoDB Shell or MongoDB Compass, optional but useful

MongoDB must be running on:

```text
mongodb://127.0.0.1:27017/coffee_shop
```

If MongoDB is not installed, install it from:

[MongoDB Community Server](https://www.mongodb.com/try/download/community)

During installation, choose the option to install MongoDB as a Windows Service. After installation, verify it is running:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

## Backend Setup

Open PowerShell in the project folder:

```powershell
cd "E:\Projects of Darkside\coffee\coffee-shop\backend"
npm install
npm run seed
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

## Frontend Setup

For plain HTML/CSS/JavaScript, use one of these options.

Option 1: Live Server

```powershell
cd "E:\Projects of Darkside\coffee\coffee-shop\frontend"
```

Open `index.html` with VS Code Live Server.

Option 2: serve from the project parent folder

```powershell
cd "E:\Projects of Darkside\coffee"
npx serve . -l 3000
```

Frontend URL:

```text
http://127.0.0.1:3000/coffee-shop/frontend/index.html
```

The frontend calls:

```text
http://localhost:5000/api
```

## Environment Variables

The backend `.env` file is already created:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/coffee_shop
JWT_SECRET=mysecretkey
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5000,http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:5500,http://localhost:5500

ADMIN_NAME=Coffee Admin
ADMIN_EMAIL=admin@coffee.test
ADMIN_PASSWORD=Admin@12345
```

## Default Admin

Run `npm run seed`, then login with:

```text
Email: admin@coffee.test
Password: Admin@12345
```

Change these values before production.

## API Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`

Products:

- `GET /api/products`
- `GET /api/products/meta/options`
- `GET /api/products/:id`
- `POST /api/products` admin only
- `PUT /api/products/:id` admin only
- `DELETE /api/products/:id` admin only

Orders:

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/status` admin only

Contact:

- `POST /api/contact`
- `GET /api/contact` admin only
- `PUT /api/contact/:id/status` admin only

Reviews:

- `GET /api/review`
- `GET /api/review/average`
- `POST /api/review`

Newsletter:

- `POST /api/newsletter`
- `GET /api/newsletter` admin only
- `DELETE /api/newsletter/:id` admin only

Admin:

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`

## Product Catalog

The seed script upserts 60 catalog items:

- Coffee: Espresso, Americano, Cappuccino, Latte, Mocha, Flat White, Macchiato, Affogato, Cold Brew, Nitro Cold Brew, Iced Coffee, Iced Latte, Iced Mocha, Frappuccino, Vanilla Latte, Caramel Latte, Hazelnut Latte, Pumpkin Spice Latte, Irish Coffee, Turkish Coffee, Black Coffee, Filter Coffee, South Indian Filter Coffee, Instant Coffee, Chocolate Coffee, Honey Coffee, Coconut Coffee, Cinnamon Coffee, Mint Coffee, Signature House Blend
- Non-Coffee Drinks: Hot Chocolate, Green Tea, Black Tea, Lemon Tea, Masala Tea, Matcha Latte, Milkshake, Smoothies, Fresh Juice
- Bakery: Croissant, Chocolate Croissant, Garlic Bread, Brownie, Muffin, Donut, Red Velvet Cake, Cheesecake, Chocolate Cake, Tiramisu, Cookies
- Snacks: French Fries, Veg Sandwich, Grilled Sandwich, Club Sandwich, Veg Burger, Chicken Burger, Pizza, Pasta, Wrap, Nachos

Each product supports:

- Name, description, category, department
- Price and discount price
- Main image and multiple images
- Stock, SKU, rating, reviews, availability
- Ingredients, calories, preparation time
- Popular, bestseller, new arrival, and featured badges

Customer customization:

- Size: Small, Medium, Large
- Milk: Regular Milk, Almond Milk, Oat Milk, Soy Milk
- Sugar: No Sugar, Less Sugar, Normal, Extra Sweet
- Ice: No Ice, Less Ice, Normal Ice, Extra Ice

## Verification Checklist

After MongoDB is running:

1. Run `npm run seed`.
2. Run `npm run dev`.
3. Open `http://localhost:5000/api/health`.
4. Open frontend at `http://localhost:3000`.
5. Register a customer account.
6. Login.
7. Open Menu, add a product with customization to cart.
8. Checkout while logged in.
9. Submit the contact form.
10. Login as admin and open `admin.html`.
11. Add, edit, and delete a product.
12. Change an order status from the admin panel.

## Troubleshooting

MongoDB connection failed:

```text
connect ECONNREFUSED 127.0.0.1:27017
```

Fix:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

If the service does not exist, MongoDB Community Server is not installed.

CORS error:

- Make sure backend is running on `http://localhost:5000`.
- Make sure frontend is running on `http://localhost:3000`, `http://localhost:5500`, or `http://127.0.0.1:5500`.
- If using another frontend port, add it to `CLIENT_URL` in `backend/.env`.

Seed fails:

- Confirm MongoDB is running.
- Confirm `MONGODB_URI` in `.env` is correct.
- Run `npm install` again in `backend`.
