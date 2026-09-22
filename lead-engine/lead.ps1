<#
    lead.ps1 — run one OpenOutreach campaign.

    Two campaigns live side by side here, each with its own database, its own
    ICP and its own pricing. OpenOutreach stores one campaign per database, so
    the campaign is chosen by pointing --db at a different SQLite file.

    Usage:
      .\lead.ps1 india  status
      .\lead.ps1 india  find 25         # 25 qualified leads, free, no credits
      .\lead.ps1 india  find 10 emails  # ...carrying a verified email (10 credits)
      .\lead.ps1 global find 25

    `send` and `run` put mail in real inboxes under your own name. They are
    deliberately not wrapped here — read STRATEGY.md before either one.
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('india', 'global')]
    [string]$Campaign,

    # Named $Rest, not $Args: $Args is a PowerShell automatic variable and
    # cannot be used as a parameter name.
    [Parameter(Mandatory = $true, Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# ── load .env into this process only ─────────────────────────────
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "No .env found. Copy .env.example to .env and fill it in first."
}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $pair = $line.Split('=', 2)
    if ($pair.Count -ne 2) { return }
    $key = $pair[0].Trim()
    $value = $pair[1].Trim()
    # Blank means "not answered yet" — setting it to an empty string would look
    # to the tool like an answer, and it would stop asking for it.
    if ($value -ne '') { Set-Item -Path "env:$key" -Value $value }
}

# ── the campaign's own product + target, read from file ──────────
# Passed through the environment rather than the command line: quoting a
# markdown paragraph on a command line corrupts it quietly.
$campaignDir = Join-Path $root "campaigns\$Campaign"
$productFile = Join-Path $campaignDir 'product.md'
$targetFile = Join-Path $campaignDir 'target.md'
foreach ($f in @($productFile, $targetFile)) {
    if (-not (Test-Path $f)) { Write-Error "Missing campaign file: $f" }
}

$product = Get-Content $productFile -Raw
$target = Get-Content $targetFile -Raw
$env:OPENOUTFIND_PRODUCT_DOCS = $product
$env:OPENOUTFIND_CAMPAIGN_TARGET = $target
# The sender reads the same two answers under its own names.
$env:OUTSEND_PRODUCT_DOCS = $product
$env:OUTSEND_CAMPAIGN_TARGET = $target

# ── one database per campaign ────────────────────────────────────
$dataDir = Join-Path $root 'data'
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
$db = Join-Path $dataDir "$Campaign.sqlite3"

$exe = Join-Path $root '.venv\Scripts\openoutreach.exe'
if (-not (Test-Path $exe)) { Write-Error "OpenOutreach is not installed in .venv" }

# A fresh database has no schema, and `status` refuses one rather than creating
# it. Migrating here keeps the first command a person runs from being an error
# about a file they did not know they needed.
if (-not (Test-Path $db)) {
    Write-Host "creating $Campaign database..." -ForegroundColor DarkGray
    & $exe --db $db migrate --no-input | Out-Null
}

Write-Host "campaign: $Campaign   db: $db" -ForegroundColor Cyan
& $exe --db $db @Rest
