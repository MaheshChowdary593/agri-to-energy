mkdir -Force src\frontend | Out-Null
mkdir -Force src\backend | Out-Null
mkdir -Force src\shared | Out-Null

Move-Item lib\i18n.ts src\frontend\
Move-Item lib\ai.ts src\backend\
Move-Item lib\auth.ts src\backend\
Move-Item lib\dynamo-store.ts src\backend\
Move-Item lib\repository.ts src\backend\
Move-Item lib\session.ts src\backend\
Move-Item lib\matching.ts src\backend\
Move-Item lib\matching.test.ts src\backend\
Move-Item lib\types.ts src\shared\
Move-Item lib\config.ts src\shared\
Move-Item lib\locations.ts src\shared\
Move-Item lib\seed.ts src\shared\

Remove-Item lib -Recurse -Force

$map = @{
    "lib/i18n" = "src/frontend/i18n";
    "lib/ai" = "src/backend/ai";
    "lib/auth" = "src/backend/auth";
    "lib/dynamo-store" = "src/backend/dynamo-store";
    "lib/repository" = "src/backend/repository";
    "lib/session" = "src/backend/session";
    "lib/matching" = "src/backend/matching";
    "lib/types" = "src/shared/types";
    "lib/config" = "src/shared/config";
    "lib/locations" = "src/shared/locations";
    "lib/seed" = "src/shared/seed";
}

Get-ChildItem -Path . -Recurse -Include *.ts, *.tsx -Exclude node_modules, .next | ForEach-Object {
    $content = Get-Content -Raw $_.FullName
    $modified = $false
    foreach ($key in $map.Keys) {
        if ($content -match "(@/|\.\./|\.\./\.\./)lib/($key.Split('/')[1])\b") {
            $content = $content -replace "(@/|\.\./|\.\./\.\./)lib/($key.Split('/')[1])\b", "$1$($map[$key])"
            $modified = $true
        }
    }
    # Also fix relative imports inside lib that were moved (e.g. ./types -> ../shared/types)
    $content = $content -replace "'\./types'", "'../shared/types'"
    $content = $content -replace "'\./config'", "'../shared/config'"
    $content = $content -replace "'\./auth'", "'../backend/auth'"
    $content = $content -replace "'\./seed'", "'../shared/seed'"
    $content = $content -replace "'\./repository'", "'../backend/repository'"
    $content = $content -replace "'\./dynamo-store'", "'../backend/dynamo-store'"
    
    Get-Content $_.FullName | Out-String | Set-Content $_.FullName -NoNewline
    Set-Content -Path $_.FullName -Value $content
}
