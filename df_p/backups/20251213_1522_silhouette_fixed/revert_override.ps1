$path = 'src/scenes/FishingScene.js'
$tempPath = 'src/scenes/FishingScene_temp_revert.js'
$content = Get-Content $path -Raw -Encoding UTF8
# Regex to match the previous Kue block
$blockRegex = '(?s)// \[DEBUG\] Override maiwashi with kue.*?continue;\s*\}\s*\}'

if ($content -match $blockRegex) {
    $newContent = $content -replace $blockRegex, ''
    Set-Content $tempPath -Value $newContent -Encoding UTF8
    Move-Item -Path $tempPath -Destination $path -Force
    Write-Host "Successfully removed override block"
} else {
    Write-Error "Could not match override block to remove"
    exit 1
}
