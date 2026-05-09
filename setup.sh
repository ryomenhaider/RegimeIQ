sudo systemctl start docker 

sudo visudo

docker compose up -d postgres redis

uv run python main.py


alpha ALL=(ALL) NOPASSWD: ALL