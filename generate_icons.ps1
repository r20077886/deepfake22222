Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$Size, [string]$OutPath)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Dark navy background
    $bg = [System.Drawing.Color]::FromArgb(255, 10, 13, 20)
    $g.Clear($bg)

    # Rounded rect clip
    $r2 = [int]($Size * 0.20)
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $r2*2, $r2*2, 180, 90)
    $gp.AddArc($Size-$r2*2, 0, $r2*2, $r2*2, 270, 90)
    $gp.AddArc($Size-$r2*2, $Size-$r2*2, $r2*2, $r2*2, 0, 90)
    $gp.AddArc(0, $Size-$r2*2, $r2*2, $r2*2, 90, 90)
    $gp.CloseFigure()
    $g.SetClip($gp)

    # Blue tinted background fill
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 14, 20, 40))
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Define magnifier geometry
    $cx   = [int]($Size * 0.40)
    $cy   = [int]($Size * 0.40)
    $cr   = [int]($Size * 0.27)
    $penW = [Math]::Max(1, [int]($Size * 0.07))

    # Handle
    $hc = [System.Drawing.Color]::FromArgb(255, 99, 179, 237)
    $hp = New-Object System.Drawing.Pen($hc, $penW)
    $hp.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hp.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
    $hx1 = [int]($cx + $cr * 0.70)
    $hy1 = [int]($cy + $cr * 0.70)
    $hx2 = [int]($Size * 0.84)
    $hy2 = [int]($Size * 0.84)
    $g.DrawLine($hp, $hx1, $hy1, $hx2, $hy2)

    # Lens fill
    $lBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 99, 179, 237))
    $g.FillEllipse($lBrush, ($cx-$cr), ($cy-$cr), $cr*2, $cr*2)

    # Lens circle
    $lc = [System.Drawing.Color]::FromArgb(255, 99, 179, 237)
    $lp = New-Object System.Drawing.Pen($lc, $penW)
    $g.DrawEllipse($lp, ($cx-$cr), ($cy-$cr), $cr*2, $cr*2)

    # Pupil/eye inside
    $pr = [int]($cr * 0.40)
    $pb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 99, 179, 237))
    $g.FillEllipse($pb, ($cx-$pr), ($cy-$pr), $pr*2, $pr*2)

    # Highlight
    $hl = [int]($pr * 0.35)
    $ho = [int]($pr * 0.18)
    $hb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 255, 255, 255))
    $g.FillEllipse($hb, ($cx-$pr+$ho), ($cy-$pr+$ho), $hl*2, $hl*2)

    # Save
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Dispose
    $g.Dispose(); $bmp.Dispose()
    foreach ($d in @($bgBrush, $lBrush, $pb, $hb, $hp, $lp, $gp)) { $d.Dispose() }
}

@(16,32,48,128) | ForEach-Object {
    $path = "C:\Deepfake\icons\icon$_.png"
    Create-Icon -Size $_ -OutPath $path
    Write-Host "icon$_.png -> OK"
}
Write-Host "Done."
