$path = 'src/scenes/FishingScene.js'
$tempPath = 'src/scenes/FishingScene_temp.js'
$lines = Get-Content $path -Encoding UTF8
$newLines = @()
$skip = $false

foreach ($line in $lines) {
    if ($line -match '// \[DEBUG\] Override maiwashi with ishigakidai') {
        $skip = $true
        $newLines += '            // [DEBUG] Override maiwashi with kingusaamon'
        $newLines += "            if (baseDef.id === 'maiwashi') {"
        $newLines += "               const tDef = this._fishData.find(f => f.id === 'kingusaamon');"
        $newLines += "               if (tDef) {"
        $newLines += "                 const def = { ...tDef, movement: { ...(tDef.movement || {}), pattern: 'sine' } };"
        $newLines += "                 this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'));"
        $newLines += "                 sp.nextAtSec = now + (0.8 + Math.random() * 0.8);"
        $newLines += "                 continue;"
        $newLines += "               }"
        $newLines += "            }"
    }
    
    if ($skip) {
        if ($line -match '^\s*}$') { # Empty line ends the block roughly, or just check for closing brace logic if complex
             # Simple block skip logic: assume the block is 10 lines long as per previous view
        }
    }
    
    # Actually, safer to just read the whole file and replace the known block string if possible, 
    # but since exact string match failed, line-by-line with state is better.
    # Let's try a simpler approach: Filter out the old block lines.
}

# Re-reading to implement simpler "skip until" logic
$content = Get-Content $path -Raw -Encoding UTF8
# Construct regex for the block. 
# Note: Escape special chars.
$blockRegex = '(?s)// \[DEBUG\] Override maiwashi with ishigakidai.*?continue;\s*\}\s*\}'
$replacement = '// [DEBUG] Override maiwashi with kingusaamon
            if (baseDef.id === ''maiwashi'') {
               const tDef = this._fishData.find(f => f.id === ''kingusaamon'');
               if (tDef) {
                 const def = { ...tDef, movement: { ...(tDef.movement || {}), pattern: ''sine'' } };
                 this._spawnFishFromSide(def, (Math.random() < 0.5 ? ''right'' : ''left''));
                 sp.nextAtSec = now + (0.8 + Math.random() * 0.8);
                 continue;
               }
            }'

if ($content -match $blockRegex) {
    $newContent = $content -replace $blockRegex, $replacement
    Set-Content $tempPath -Value $newContent -Encoding UTF8
    Move-Item -Path $tempPath -Destination $path -Force
    Write-Host "Successfully replaced override block"
} else {
    Write-Error "Could not match override block with regex"
    exit 1
}
