# PoliRadar · Supabase

Project ref: `nbzcmywmbjgcbkqdyggh`  
URL: `https://nbzcmywmbjgcbkqdyggh.supabase.co`

El CLI no puede `link` desde un agente sin TTY. En **Terminal.app**:

```bash
cd "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/GitHub/uxtools"
npx supabase login
npx supabase link --project-ref nbzcmywmbjgcbkqdyggh
npx supabase db push
```

Luego copiá la **anon/publishable key** (Settings → API) a `.env`:

```bash
cp .env.example .env
```

En el dashboard de Auth → URL Configuration:

- Site URL: `https://vientonorte.github.io/uxtools/app.html`
- Redirects:
  - `http://127.0.0.1:5173/uxtools/app.html`
  - `https://vientonorte.github.io/uxtools/app.html`

GitHub Actions (opcional, Pages): secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
Sin esas vars el juego sigue jugable sin cuenta (no rompe Pages).
