# One-off dev tool, run manually (requires PowerShell 5+ and ffmpeg on PATH) —
# NOT part of any build step. Its output, install-loading.gif, is committed and
# wired into forge.config.cjs as Squirrel.Windows' `loadingGif` (the installer's
# only UI). Re-run only if the icon or branding changes.
#
# Generates the Squirrel install animation: icon + title + operation label.
# Timeline approximates a typical 20-25s install, then holds at "Almost done"
# for the slow-machine tail. Frame every 0.5s (ffmpeg -framerate 2). No progress
# bar — Squirrel gives no real progress signal, so a bar would be a fake timeline.
$ErrorActionPreference = 'Stop'

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconPath = Join-Path $dir 'icon.png'
$outFile = Join-Path $dir 'install-loading.gif'
$frames = Join-Path $env:TEMP 'crabapple-install-frames'

$framesCount = 110  # 55s total at 0.5s/frame
$font = 'Microsoft YaHei UI'
$title = '正在安装 Crabapple Bot'

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw 'ffmpeg not found on PATH'
}

Remove-Item -Recurse -Force $frames -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $frames | Out-Null

Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Image]::FromFile($iconPath)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'

for ($i = 0; $i -lt $framesCount; $i++) {
  $t = $i * 0.5
  $label = if ($t -lt 14) { '正在安装' } elseif ($t -lt 21) { '正在创建快捷方式' } else { '即将完成' }
  $dots = '. ' * ($i % 4)

  $bmp = New-Object System.Drawing.Bitmap(480, 320)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::FromArgb(37, 37, 37))
  $g.DrawImage($icon, 198, 46, 84, 84)

  $fontTitle = New-Object System.Drawing.Font($font, 21)
  $fontSmall = New-Object System.Drawing.Font($font, 14)
  $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232, 232, 232))
  $labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(154, 154, 154))
  $dotsBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(111, 111, 111))

  $g.DrawString($title, $fontTitle, $titleBrush, (New-Object System.Drawing.RectangleF(0, 150, 480, 40)), $fmt)
  $g.DrawString($label, $fontSmall, $labelBrush, (New-Object System.Drawing.RectangleF(0, 230, 480, 30)), $fmt)
  $g.DrawString($dots, $fontSmall, $dotsBrush, (New-Object System.Drawing.RectangleF(0, 252, 480, 30)), $fmt)

  $bmp.Save((Join-Path $frames ('f{0:d3}.png' -f $i)), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
$icon.Dispose()

ffmpeg -y -loglevel error -framerate 2 -i (Join-Path $frames 'f%03d.png') `
  -vf 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse' -loop 0 $outFile

Remove-Item -Recurse -Force $frames
Write-Host "frames: $framesCount"
Get-Item $outFile | Select-Object FullName, Length
