$ErrorActionPreference = "Stop"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
  Write-Error "node was not found. Install Node.js and add node to PATH."
  exit 1
}

& $node.Source "server.js"
