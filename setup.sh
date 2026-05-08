sudo systemctl start docker  
sudo visudo
docker compose up -d postgres redis
uv run dev python main.py
cd frontend
npm run dev

alpha ALL=(ALL) NOPASSWD: ALL