from PIL import Image, ImageDraw, ImageFilter
import math, os

S = 1024
base = Image.new('RGBA', (S, S), (0, 0, 0, 0))

# 对角线浅蓝渐变
grad = Image.new('RGB', (S, S))
gd = ImageDraw.Draw(grad)
for y in range(S):
    t = y / (S - 1)
    for_x = t
    r = int(72 + (26 - 72) * t)
    g = int(153 + (103 - 153) * t)
    b = int(222 + (170 - 222) * t)
    gd.line([(0, y), (S, y)], fill=(r, g, b))
# 左上亮度
overlay = Image.new('L', (S, S), 0)
od = ImageDraw.Draw(overlay)
od.ellipse((-260, -360, 700, 520), fill=90)
overlay = overlay.filter(ImageFilter.GaussianBlur(120))
white = Image.new('RGB', (S, S), (255, 255, 255))
grad = Image.composite(white, grad, overlay.point(lambda p: int(p * 0.55)))
grad = grad.convert('RGBA')

# 圆角方形裁切
mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle((80, 80, S - 80, S - 80), radius=218, fill=255)
base.paste(grad, (0, 0), mask)

# 内描边
border = Image.new('RGBA', (S, S), (0, 0, 0, 0))
bd = ImageDraw.Draw(border)
bd.rounded_rectangle((82, 82, S - 82, S - 82), radius=216, outline=(255, 255, 255, 55), width=6)
base = Image.alpha_composite(base, border)

draw = ImageDraw.Draw(base, 'RGBA')

# 书页下方柔和阴影
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.ellipse((250, 690, 790, 810), fill=(15, 62, 104, 70))
shadow = shadow.filter(ImageFilter.GaussianBlur(28))
base = Image.alpha_composite(base, shadow)
draw = ImageDraw.Draw(base, 'RGBA')

# 白色书页
left = [(188, 350), (246, 334), (498, 402), (498, 716), (246, 662), (188, 638)]
right = [(836, 350), (778, 334), (526, 402), (526, 716), (778, 662), (836, 638)]
draw.polygon(left, fill=(255, 255, 255, 246))
draw.polygon(right, fill=(243, 250, 255, 246))
# 封面边缘蓝色衬底
draw.line([(188, 350), (188, 638)], fill=(197, 226, 248, 240), width=5)
draw.line([(836, 350), (836, 638)], fill=(197, 226, 248, 240), width=5)
draw.line([(188, 350), (246, 334), (498, 402)], fill=(220, 239, 253, 230), width=4)
draw.line([(836, 350), (778, 334), (526, 402)], fill=(220, 239, 253, 230), width=4)
# 书脊
draw.line([(512, 410), (512, 728)], fill=(178, 214, 241, 255), width=8)
draw.line([(500, 405), (500, 720)], fill=(255, 255, 255, 80), width=3)

# 页内淡蓝横线
for i, y in enumerate(range(470, 650, 44)):
    inset = 34 + (i % 2) * 8
    draw.line([(238, y), (466 - inset, y - 14)], fill=(181, 219, 246, 150), width=5)
    draw.line([(558 + inset, y - 14), (786, y)], fill=(181, 219, 246, 150), width=5)

# 金色书签
draw.polygon([(662, 392), (734, 414), (734, 552), (698, 526), (662, 550)], fill=(255, 199, 108, 240))
draw.line([(662, 392), (734, 414)], fill=(255, 226, 167, 220), width=3)

# 书页高光
highlight = Image.new('RGBA', (S, S), (0, 0, 0, 0))
hd = ImageDraw.Draw(highlight)
hd.polygon([(214, 360), (458, 420), (458, 606), (214, 560)], fill=(255, 255, 255, 70))
highlight = highlight.filter(ImageFilter.GaussianBlur(18))
base = Image.alpha_composite(base, highlight)

# 左上高光弧
draw = ImageDraw.Draw(base, 'RGBA')
draw.arc((110, 92, 530, 510), start=188, end=266, fill=(255, 255, 255, 75), width=16)

os.makedirs(r'D:\桌面\新建文件夹\zzbz-courseware\assets', exist_ok=True)
png_path = r'D:\桌面\新建文件夹\zzbz-courseware\assets\icon.png'
ico_path = r'D:\桌面\新建文件夹\zzbz-courseware\assets\icon.ico'
base.save(png_path)
base.save(ico_path, sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('saved', png_path, os.path.getsize(png_path), os.path.getsize(ico_path))
