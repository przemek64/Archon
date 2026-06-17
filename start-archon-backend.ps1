# Starts the Windows Archon backend on port 3090 (reads PORT from .env)
# Prefer git-bash for workflow bash nodes; the System32 bash.exe is the WSL
# shim, which mangles complex `bash -c` scripts (unmatched-quote / EOF errors).
$env:PATH = "C:\Program Files\Git\bin;$env:PATH"
bun run --filter @archon/server dev
