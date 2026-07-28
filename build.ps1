# Define the project file and configuration
$projectFile = "./ContentLock/ContentLock.csproj"
$configuration = "Release"
$outputDirectory = "./build.out"
$version = "17.2.0"

$clientDir = "./ContentLock/Client"
$compiledPackageJsonPath = "./ContentLock/wwwroot/App_Plugins/ContentLock/umbraco-package.json"

# ---------------------------------------------------------------------------
# 1. Clean output directory
# ---------------------------------------------------------------------------
if (Test-Path $outputDirectory) {
    Remove-Item "$outputDirectory/*"
}

# ---------------------------------------------------------------------------
# 2. Fresh npm install
# ---------------------------------------------------------------------------
Write-Output "Running npm install in $clientDir..."
Push-Location $clientDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed."
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 3. npm run build (compiles TypeScript + Vite, outputs to wwwroot)
# ---------------------------------------------------------------------------
Write-Output "Running npm run build in $clientDir..."
Push-Location $clientDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm run build failed."
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 4. Update version in the compiled umbraco-package.json (Vite output)
# ---------------------------------------------------------------------------
if (Test-Path $compiledPackageJsonPath) {
    $packageJson = Get-Content $compiledPackageJsonPath -Raw | ConvertFrom-Json
    $packageJson.version = $version
    $packageJson | ConvertTo-Json -Depth 32 | Set-Content $compiledPackageJsonPath
    Write-Output "Updated umbraco-package.json version to $version."
} else {
    Write-Error "Compiled umbraco-package.json not found at $compiledPackageJsonPath."
    exit 1
}

# ---------------------------------------------------------------------------
# 5. dotnet pack
# ---------------------------------------------------------------------------
Write-Output "Packing NuGet package..."
dotnet pack $projectFile --configuration $configuration --output $outputDirectory /p:Version=$version

if ($LASTEXITCODE -eq 0) {
    Write-Output "Pack successful."
} else {
    Write-Error "Pack failed."
    exit $LASTEXITCODE
}
