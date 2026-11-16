# 작물 아이콘 한 개 만들기 — 흰 바탕 그림(파일 또는 주소) → 바탕 지우기 → 물체만 잘라 가운데 → 128px 투명 PNG
# 저장: assets\crop-icons\<작물>.png, 목록 assets\crop-icons\list.json 에 이름을 보탠다
# 홈페이지 농사 Q&A 「작물별로 보기」가 이 목록을 읽는다 (재배력 calendar\icons 에 없는 작물만 여기에 둔다)
# 쓰기: crop-icon.ps1 -Name 보리 -Src https://.../그림.png
param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Src, [int]$Size = 128)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root 'assets\crop-icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

$tmpDir = Join-Path $env:TEMP ('crop-icon-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmpDir | Out-Null
try {
  if ($Src -match '^https?://') { $file = Join-Path $tmpDir 'src.png'; Invoke-WebRequest $Src -OutFile $file -UseBasicParsing }
  else { $file = (Resolve-Path $Src).Path }

  Add-Type -AssemblyName System.Drawing
  if (-not ('CropIcon' -as [type])) {
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class CropIcon {
  public static void Make(string inPath, string outPath, int size, double pad) {
    Bitmap c;
    using (Bitmap src0 = new Bitmap(inPath)) {
      c = new Bitmap(src0.Width, src0.Height, PixelFormat.Format32bppArgb);
      using (Graphics g0 = Graphics.FromImage(c)) g0.DrawImage(src0, 0, 0, src0.Width, src0.Height);
    }
    int W = c.Width, H = c.Height;
    BitmapData d = c.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int n = d.Stride * H; byte[] b = new byte[n]; Marshal.Copy(d.Scan0, b, 0, n);
    Func<int,int,int> L = (x,y) => { int i = y*d.Stride + x*4; return Math.Min(b[i], Math.Min(b[i+1], b[i+2])); };
    // 1) 가장자리에서 이어진 밝은 바탕을 지운다
    bool[] bg = new bool[W*H]; var q = new Queue<int>();
    Action<int,int> push = (x,y) => { int k = y*W+x; if (!bg[k] && L(x,y) > 226) { bg[k] = true; q.Enqueue(k); } };
    for (int x = 0; x < W; x++) { push(x,0); push(x,H-1); }
    for (int y = 0; y < H; y++) { push(0,y); push(W-1,y); }
    while (q.Count > 0) { int k = q.Dequeue(), x = k % W, y = k / W;
      if (x>0) push(x-1,y); if (x<W-1) push(x+1,y); if (y>0) push(x,y-1); if (y<H-1) push(x,y+1); }
    // 2) 바탕은 투명, 바탕에 닿은 밝은 테두리는 반투명으로 부드럽게
    int minX=W, minY=H, maxX=-1, maxY=-1;
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      int k = y*W+x, i = y*d.Stride + x*4;
      if (bg[k]) { b[i+3] = 0; continue; }
      bool edge = (x>0 && bg[k-1]) || (x<W-1 && bg[k+1]) || (y>0 && bg[k-W]) || (y<H-1 && bg[k+W]);
      int l = L(x,y);
      if (edge && l > 190) b[i+3] = (byte)Math.Max(0, Math.Min(255, (255 - l) * 255 / 65));
      if (b[i+3] > 40) { if (x<minX) minX=x; if (x>maxX) maxX=x; if (y<minY) minY=y; if (y>maxY) maxY=y; }
    }
    Marshal.Copy(b, 0, d.Scan0, n); c.UnlockBits(d);
    if (maxX < 0) throw new Exception("물체를 찾지 못함");
    // 3) 물체만 정사각 여백을 두고 가운데로
    int w = maxX-minX+1, h = maxY-minY+1, side = (int)(Math.Max(w,h) * (1 + pad*2));
    Bitmap o = new Bitmap(size, size, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(o)) {
      g.Clear(Color.Transparent);
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
      double s = (double)size / side; int dw = (int)(w*s), dh = (int)(h*s);
      g.DrawImage(c, new Rectangle((size-dw)/2, (size-dh)/2, dw, dh), new Rectangle(minX, minY, w, h), GraphicsUnit.Pixel);
    }
    c.Dispose(); o.Save(outPath, ImageFormat.Png); o.Dispose();
  }
}
"@
  }
  $out = Join-Path $outDir ($Name + '.png')
  [CropIcon]::Make($file, $out, $Size, 0.04)

  # 목록 갱신 (가나다순, 중복 없이)
  $listFile = Join-Path $outDir 'list.json'
  $names = @()
  if (Test-Path $listFile) { $names = @((Get-Content $listFile -Raw -Encoding utf8 | ConvertFrom-Json) | ForEach-Object { $_ }) }
  $names = @($names + $Name | Sort-Object -Unique)
  $json = '[' + (($names | ForEach-Object { '"' + $_ + '"' }) -join ',') + ']'
  [IO.File]::WriteAllText($listFile, $json, (New-Object Text.UTF8Encoding($false)))
  "만듦: $out"
} finally { Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue }
