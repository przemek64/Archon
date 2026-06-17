# Local frontend on port 5173, talking to the Windows backend on 3090
$env:PORT = "5173"
$env:VITE_PROXY_TARGET = "http://127.0.0.1:3090"
$env:VITE_INSTANCE_LABEL = "Windows backend (3090)"
$env:VITE_INSTANCE_COLOR = "#2563eb"
bun run --filter @archon/web dev
