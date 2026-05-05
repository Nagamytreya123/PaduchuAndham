# PaduchuAndham

E-commerce web app: React (Vite) frontend and Express + MongoDB backend.

## Prerequisites

- **Node.js** 18+ (includes npm)
- **MongoDB** connection string (Atlas or local)

## Setup

1. Clone the repository and open the project root folder.

2. Install dependencies (root, server, and client):

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. Configure environment variables. Copy `.env.example` to `.env` in the **project root**, or to **`server/.env`** (`server/.env` overrides values from the root `.env` if both exist).

   Edit `.env` and set at least:

   - `MONGODB_URI` — your MongoDB URI  
   - `JWT_SECRET` — at least 16 characters  
   - `CLIENT_URL` — e.g. `http://localhost:5173` for local dev  

   Optional: Google OAuth, Razorpay, Cloudinary — see comments in `.env.example`.

   The client uses a **Vite dev proxy** to `/api` and `/uploads` on port **4000**, so you usually do **not** need `client/.env` unless you change ports or call the API directly via `VITE_API_URL`.

## Run in development

From the **project root**:

```bash
npm run dev
```

This starts:

- API server on **http://localhost:4000**
- Vite dev server on **http://localhost:5173** — open this URL in the browser

## Seed data (optional)

From the project root:

```bash
npm run seed
npm run seed:products
```

Ensure seed-related variables in `.env` match what you need (see `.env.example`).

## Production build

From the project root:

```bash
npm run build
npm run start
```

`npm run start` runs the compiled server from `server/dist`. Serve the client build (`client/dist`) with your host or CDN as needed, and point `CLIENT_URL` / API URLs to your deployed URLs.
