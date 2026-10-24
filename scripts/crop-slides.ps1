param([string]$Out)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Out | Out-Null

$s1 = "D:\powerpoint\SLIDE 1\The House Outlives Its Creator.png"
$s1d = "D:\powerpoint\SLIDE 1\Daemon Vaastu purusha.png"
$who = "D:\powerpoint\SLIDE 2\Vaastu Purusha_ The Cosmic House Grid.png"
$sys = "D:\powerpoint\SLIDE 3\The System_ Voice, State, Response.png"
$trad = "D:\powerpoint\SLIDE 4\From Tradition to Game_ Vaastu Purusha.png"

# name, source, x, y, w, h  (w=0 => whole image)
$crops = @(
  @('s1-city',        $s1,   0, 450, 650, 491),
  @('s1-hearing',     $s1, 672, 318, 515, 545),
  @('body',           $s1d,  44,  56, 354, 364),
  @('s2-voice',       $sys,  40, 455, 560, 250),
  @('s2-daemon',      $sys, 688, 455, 300, 310),
  @('s3-pinned',      $who, 625, 125, 540, 615),
  @('s3-mandala',     $who,1272, 205, 290, 295),
  @('s3-house',       $who,1408, 627, 227, 160),
  @('s4-plan',        $trad, 595, 470, 395, 200),
  @('s4-daemon',      $trad, 595, 655, 385, 215),
  @('s4-abandoned',   $trad,1165, 505, 475, 325)
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]84)

foreach ($c in $crops) {
  $src = [System.Drawing.Image]::FromFile($c[1])
  $w = $c[4]; $h = $c[5]
  if ($w -eq 0) { $w = $src.Width; $h = $src.Height }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $c[2], $c[3], $w, $h), 'Pixel')
  # cover the tail of the slide heading ("?") that reaches into this crop
  if ($c[0] -eq 's3-pinned') {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(7, 7, 7))
    $g.FillRectangle($brush, 0, 70, 62, 70); $brush.Dispose()
  }
  $path = Join-Path $Out ($c[0] + '.jpg')
  $bmp.Save($path, $codec, $params)
  $g.Dispose(); $bmp.Dispose(); $src.Dispose()
  "{0,-14} {1}x{2}  {3:N0} KB" -f $c[0], $w, $h, ((Get-Item $path).Length / 1KB)
}
