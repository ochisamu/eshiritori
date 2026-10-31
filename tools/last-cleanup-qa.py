from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent
canvas=Image.new('RGB',(768,1024),(255,249,237));draw=ImageDraw.Draw(canvas)
for row,n in enumerate([14,217,409,411]):
    for col,suffix in enumerate(['','-small','-tiny']):
        path=root/f'public/assets/card-{n:04d}{suffix}.webp'
        with Image.open(path) as image:
            x,y=col*256,row*256;canvas.paste(image,(x+(256-image.width)//2,y+24))
            draw.text((x+8,y+5),f'card-{n:04d} {image.width}px',fill=(25,47,52))
canvas.save(root/'reports/last-cleanup-variants.png')
