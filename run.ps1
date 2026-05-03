$ErrorActionPreference = "Stop"

$javac = Get-Command javac -ErrorAction SilentlyContinue
if ($null -eq $javac) {
  Write-Error "javac was not found. Install JDK 7 or newer and add javac to PATH."
  exit 1
}

$jdkBin = Split-Path -Parent $javac.Source
$java = Join-Path $jdkBin "java.exe"
if (!(Test-Path $java)) {
  Write-Error "java.exe was not found next to javac. Check your JDK installation."
  exit 1
}

New-Item -ItemType Directory -Force -Path "out" | Out-Null
$sources = @(Get-ChildItem -Path "src/main/java" -Recurse -Filter "*.java" | ForEach-Object { $_.FullName })
if ($sources.Count -eq 0) {
  Write-Error "No Java source files were found."
  exit 1
}

& $javac.Source -encoding UTF-8 -d "out" $sources
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& $java -cp "out;src/main/resources" com.shampoocalendar.ShampooCalendarApplication
