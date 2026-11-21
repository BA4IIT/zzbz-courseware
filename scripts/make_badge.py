from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

src = r'D:\桌面\新建文件夹\zzbz-courseware\assets\school-badge-source.jpg'
out = r'D:\桌面\新建文件夹\zzbz-courseware\assets\school-badge.png'
preview = r'D:\桌面\新建文件夹\zzbz-courseware\assets\school-badge-preview.png'

img = Image.open(src).convert('RGBA')
arr = np.array(img.convert('RGB')).astype(np.int16)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
# 识别深绿色外环（徽章主体）
mask = (g > r + 20) & (g > b + 5) & (g < 175) & (r < 110)
ys, xs = np.where(mask)
print('image', img.size)
print('dark bbox', xs.min(), ys.min(), xs.max(), ys.max())
cx = (xs.min() + xs.max()) / 2
cy = (ys.min() + ys.max()) / 2
# 深绿外环半径估计，加白边留出约 5.5% 的边距
radius = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 24
print('center/radius', cx, cy, radius)

# 以 4 倍超采样绘制圆形遮罩，获得平滑边缘
scale = 4
w, h = img.size
big_mask = Image.new('L', (w * scale, h * scale), 0)
d = ImageDraw.Draw(big_mask)
d.ellipse(
    ((cx - radius) * scale, (cy - radius) * scale, (cx + radius) * scale, (cy + radius) * scale),
    fill=255
)
big_mask = big_mask.resize((w, h), Image.Resampling.LANCZOS)
big_mask = big_mask.filter(ImageFilter.GaussianBlur(0.7))
img.putalpha(big_mask)

# 裁切到圆形外接框
pad = 4
box = (max(0, int(cx - radius) - pad), max(0, int(cy - radius) - pad),
       min(w, int(cx + radius) + pad), min(h, int(cy + radius) + pad))
img = img.crop(box)
# 统一为正方形，避免边缘被截断
side = max(img.size)
canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
canvas.alpha_composite(img, ((side - img.size[0]) // 2, (side - img.size[1]) // 2))
# 缩放到 640 以便界面显示
canvas = canvas.resize((640, 640), Image.Resampling.LANCZOS)
canvas.save(out, optimize=True)
print('saved', out, canvas.size, os.path.getsize(out))

# 浅蓝底预览图，便于肉眼检查抠图边缘
bg = Image.new('RGB', (760, 760), '#e8f4ff')
bg.paste(canvas, (60, 60), canvas)
bg.save(preview)
print('preview', preview)
