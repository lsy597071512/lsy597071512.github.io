$src = [System.IO.File]::ReadAllText("$pwd\index.html", [System.Text.Encoding]::UTF8)
$newCSS = [System.IO.File]::ReadAllText("$pwd\new-style.css", [System.Text.Encoding]::UTF8)
$src = $src -replace '(?s)<style>.*?</style>', $newCSS.TrimEnd()
[System.IO.File]::WriteAllText("$pwd\index.html", $src, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done"