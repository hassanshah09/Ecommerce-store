$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$tsxCli = Join-Path $projectRoot 'node_modules\tsx\dist\cli.mjs'
$serverEntry = Join-Path $projectRoot 'server.ts'

node $tsxCli $serverEntry
