Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class SafeIconGenerator3 {
    public static void GenerateAppIcon(string srcPath, string destPath) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int cropX = 720;
            int cropY = 566;
            int cropW = 602;
            int cropH = 596;
            
            Rectangle cropRect = new Rectangle(cropX, cropY, cropW, cropH);
            using (Bitmap rawCrop = src.Clone(cropRect, PixelFormat.Format32bppArgb)) {
                int emblemW = 480;
                int emblemH = 475;
                
                using (Bitmap scaledEmblem = new Bitmap(emblemW, emblemH, PixelFormat.Format32bppArgb)) {
                    using (Graphics gS = Graphics.FromImage(scaledEmblem)) {
                        gS.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        gS.SmoothingMode = SmoothingMode.HighQuality;
                        gS.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        gS.DrawImage(rawCrop, 0, 0, emblemW, emblemH);
                    }
                    
                    using (Bitmap finalBmp = new Bitmap(1024, 1024, PixelFormat.Format32bppArgb)) {
                        using (Graphics gF = Graphics.FromImage(finalBmp)) {
                            gF.Clear(Color.FromArgb(255, 255, 255, 255));
                        }
                        
                        // Centered mathematically at EXACT (512, 512)
                        int posX = 277;
                        int posY = 268;
                        
                        BitmapData srcData = scaledEmblem.LockBits(
                            new Rectangle(0, 0, emblemW, emblemH),
                            ImageLockMode.ReadOnly,
                            PixelFormat.Format32bppArgb
                        );
                        BitmapData dstData = finalBmp.LockBits(
                            new Rectangle(0, 0, 1024, 1024),
                            ImageLockMode.ReadWrite,
                            PixelFormat.Format32bppArgb
                        );
                        
                        int srcBytes = srcData.Stride * emblemH;
                        byte[] srcPixels = new byte[srcBytes];
                        Marshal.Copy(srcData.Scan0, srcPixels, 0, srcBytes);
                        
                        int dstBytes = dstData.Stride * 1024;
                        byte[] dstPixels = new byte[dstBytes];
                        Marshal.Copy(dstData.Scan0, dstPixels, 0, dstBytes);
                        
                        for (int y = 0; y < emblemH; y++) {
                            int srcRowIdx = y * srcData.Stride;
                            int dstRowIdx = ((posY + y) * dstData.Stride) + (posX * 4);
                            
                            for (int x = 0; x < emblemW; x++) {
                                int sIdx = srcRowIdx + (x * 4);
                                int dIdx = dstRowIdx + (x * 4);
                                
                                byte b = srcPixels[sIdx];
                                byte g = srcPixels[sIdx + 1];
                                byte r = srcPixels[sIdx + 2];
                                
                                float avg = (r + g + b) / 3.0f;
                                float maxDiff = Math.Max(Math.Abs(r - g), Math.Max(Math.Abs(g - b), Math.Abs(r - b)));
                                
                                bool isGold = (r - b > 20) && (r > 130);
                                bool isShadow = (avg < 185);
                                
                                if (isGold || isShadow) {
                                    dstPixels[dIdx] = b;
                                    dstPixels[dIdx + 1] = g;
                                    dstPixels[dIdx + 2] = r;
                                    dstPixels[dIdx + 3] = 255;
                                } else if (avg >= 225 && maxDiff < 20) {
                                    dstPixels[dIdx] = 255;
                                    dstPixels[dIdx + 1] = 255;
                                    dstPixels[dIdx + 2] = 255;
                                    dstPixels[dIdx + 3] = 255;
                                } else if (avg > 185 && maxDiff < 25) {
                                    float t = (avg - 185.0f) / 40.0f;
                                    if (t > 1.0f) t = 1.0f;
                                    if (t < 0.0f) t = 0.0f;
                                    
                                    dstPixels[dIdx] = (byte)Math.Min(255, Math.Max(0, (int)(b + (255 - b) * t)));
                                    dstPixels[dIdx + 1] = (byte)Math.Min(255, Math.Max(0, (int)(g + (255 - g) * t)));
                                    dstPixels[dIdx + 2] = (byte)Math.Min(255, Math.Max(0, (int)(r + (255 - r) * t)));
                                    dstPixels[dIdx + 3] = 255;
                                } else {
                                    dstPixels[dIdx] = b;
                                    dstPixels[dIdx + 1] = g;
                                    dstPixels[dIdx + 2] = r;
                                    dstPixels[dIdx + 3] = 255;
                                }
                            }
                        }
                        
                        Marshal.Copy(dstPixels, 0, dstData.Scan0, dstBytes);
                        
                        scaledEmblem.UnlockBits(srcData);
                        finalBmp.UnlockBits(dstData);
                        
                        finalBmp.Save(destPath, ImageFormat.Png);
                    }
                }
            }
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$src = Resolve-Path "apps/passenger-mobile/assets/branding/kings-taxi-logo.png"
$dest = "apps/passenger-mobile/assets/kt-crown-app-icon.png"

[SafeIconGenerator3]::GenerateAppIcon($src, $dest)
Write-Output "Successfully generated: $dest"
