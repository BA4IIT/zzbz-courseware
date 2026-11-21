from PIL import Image, ImageDraw, ImageFilter
import os

root = r'D:\桌面\新建文件夹\zzbz-courseware'
badge = Image.open(os.path.join(root, 'assets', 'school-badge.png')).convert('RGBA')
S = 1024
# 浅蓝渐变底
base = Image.new('RGB', (S, S))
d = ImageDraw.Draw(base)
for y in range(S):
    t = y / (S - 1)
    r = int(243 - 22 * t)
    g = int(250 - 12 * t)
    b = int(255 - 2 * t)
    d.line([(0, y), (S, y)], fill=(r, g, b))
base = base.convert('RGBA')
mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle((36, 36, S - 36, S - 36), radius=218, fill=255)
base.putalpha(mask)

# 校徽阴影
size = 820
badge2 = badge.resize((size, size), Image.Resampling.LANCZOS)
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
shadow.paste((22, 73, 89, 70), ((S - size) // 2, (S - size) // 2 + 18), badge2)
shadow = shadow.filter(ImageFilter.GaussianBlur(26))
base = Image.alpha_composite(base, shadow)
# 校徽
base.alpha_composite(badge2, ((S - size) // 2, (S - size) // 2))
# 顶部高光
gloss = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(gloss)
gd.ellipse((100, 70, S - 100, 500), fill=(255, 255, 255, 38))
gloss = gloss.filter(ImageFilter.GaussianBlur(80))
base = Image.alpha_composite(base, gloss)

png_path = os.path.join(root, 'assets', 'icon.png')
ico_path = os.path.join(root, 'assets', 'icon.ico')
base.save(png_path, optimize=True)
base.save(ico_path, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
# 图标预览
preview = base.resize((512, 512), Image.Resampling.LANCZOS)
preview.save(os.path.join(root, 'assets', 'icon-preview.png'))
print('saved icon', os.path.getsize(png_path), os.path.getsize(ico_path))
