# Deploy To Render

This project deploys as one Render Web Service:

- Express backend runs the API.
- Express also serves the static frontend from `coffee-shop/frontend`.
- MongoDB must be hosted externally, for example MongoDB Atlas.

## 1. Push To GitHub

Push the repository that contains:

```text
render.yaml
coffee-shop/
```

The `render.yaml` file should stay in the repository root.

## 2. Create MongoDB Atlas Database

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Add Render outbound access. For a beginner deploy, allow `0.0.0.0/0`; tighten this later if needed.
4. Copy the connection string.

Example:

```text
mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/coffee_shop?retryWrites=true&w=majority
```

## 3. Deploy With Render Blueprint

In Render:

1. New.
2. Blueprint.
3. Connect your GitHub repository.
4. Render reads `render.yaml`.
5. Fill the secret environment variables.

Required environment variables:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
ADMIN_EMAIL=admin@coffee.test
ADMIN_PASSWORD=Admin@12345
UPI_ID=yourupiid@upi
UPI_PAYEE_NAME=Darkside Coffee
```

The blueprint sets:

```text
NODE_ENV=production
DISABLE_DEV_FALLBACK=true
JWT_EXPIRES_IN=7d
```

## 4. Manual Render Settings

If you do not use the blueprint, create a Web Service with:

```text
Root Directory: coffee-shop/backend
Runtime: Node
Build Command: npm install
Start Command: npm run seed && npm start
```

Environment variables:

```text
NODE_ENV=production
DISABLE_DEV_FALLBACK=true
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=7d
ADMIN_NAME=Coffee Admin
ADMIN_EMAIL=admin@coffee.test
ADMIN_PASSWORD=Admin@12345
UPI_ID=yourupiid@upi
UPI_PAYEE_NAME=Darkside Coffee
```

## 5. Open The App

After deploy, open:

```text
https://your-service-name.onrender.com
```

API health:

```text
https://your-service-name.onrender.com/api/health
```

Admin login:

```text
admin@coffee.test
Admin@12345
```

Change the admin password after first deploy.

## Notes

- Do not deploy with the local development fallback as your database.
- Product image uploads are saved to the Render instance filesystem. On free services this is not durable storage. For production image uploads, use Cloudinary, S3, or another object storage service.
- First request on Render free services can be slow because the service may spin down when idle.
- Replace `yourupiid@upi` with the receiving merchant UPI ID before accepting payments.
- UPI and QR orders are stored as `Verification Pending` after the customer clicks "I have paid". Connect a payment gateway webhook before automatically marking these orders as paid.
