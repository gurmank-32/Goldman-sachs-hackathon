# Backend setup

1. pip install -r requirements.txt
2. Put `GEMINI_API_KEY=your_key` in **`backend/.env`** or the **project root `.env`** (either works — backend reloads both). Optional alias: `GOOGLE_API_KEY`. If you see “model not found”, set `GEMINI_MODEL` (the server tries several model IDs automatically).
3. Run: python server.py
4. Server starts on http://localhost:5020 (set `FLASK_PORT` to override; avoid 5000 on macOS — AirPlay uses it). Match `vite.config.js` proxy when changing ports.
