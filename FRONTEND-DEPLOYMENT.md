# Mosaic Frontend (Vercel)

This folder is the React + Vite frontend. The backend is the separate Supabase project.

## Deploy to Vercel
1. Upload/extract this folder into its own GitHub repository.
2. Import that repository in Vercel.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. Install command: `npm install`.
4. Add these Environment Variables in Vercel (Production, Preview and Development as needed):
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase publishable key (or legacy anon key)
5. Redeploy after adding variables.

Do not add a Supabase `service_role` or secret key to Vercel variables beginning with `VITE_`, or to frontend code.

## Local run
`npm install` then create `.env` from `.env.example`, fill in the two public values, then run `npm run dev`.

## Validation
Run `npm test` and `npm run build`.
