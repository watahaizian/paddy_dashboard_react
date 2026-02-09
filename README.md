# paddy_dashboard_react

Frontend-only repository.

## Structure

- `src/`, `public/`: React + Vite app
- `compose.yaml`: Docker setup for frontend development

## Start

```bash
docker compose up --build
```

- Front URL: `http://localhost:5173`
- API: `/api` is proxied to backend `http://localhost:8080`

## Backend

Run backend from `../paddy_db`:

```bash
cd ../paddy_db
docker compose up --build
```
