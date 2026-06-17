# Starts the Archon frontend on port 6173, connecting to the WSL backend on 4090 (via mirrored networking)
$env:PORT = "6173"
$env:VITE_PROXY_TARGET = "http://127.0.0.1:4090"
$env:VITE_INSTANCE_LABEL = "WSL backend (4090)"
$env:VITE_INSTANCE_COLOR = "#d97706"
bun run --filter @archon/web dev
