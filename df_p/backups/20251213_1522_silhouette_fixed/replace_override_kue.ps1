$path = 'src/scenes/FishingScene.js'
$tempPath = 'src/scenes/FishingScene_temp_kue.js'
$content = Get-Content $path -Raw -Encoding UTF8
# Regex to match the previous Nishin block
$blockRegex = '(?s)// \[DEBUG\] Override maiwashi with nishin.*?continue;\s*\}\s*\}'
$replacement = '// [DEBUG] Override maiwashi with kue
            if (baseDef.id === ''maiwashi'') {
               const tDef = this._fishData.find(f => f.id === ''kue'');
               if (tDef) {
                 const def = { ...tDef, movement: { ...(tDef.movement || {}), polyMove: true } };
                 this._spawnFishFromSide(def, (Math.random() < 0.5 ? ''right'' : ''left''));
                 sp.nextAtSec = now + (0.8 + Math.random() * 0.8);
                 continue;
               }
            }'

if ($content -match $blockRegex) {
    $newContent = $content -replace $blockRegex, $replacement
    Set-Content $tempPath -Value $newContent -Encoding UTF8
    Move-Item -Path $tempPath -Destination $path -Force
    Write-Host "Successfully replaced override block for Kue"
} else {
    Write-Error "Could not match override block for Kue"
    exit 1
}
