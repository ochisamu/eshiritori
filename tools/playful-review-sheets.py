import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
rows=json.loads(Path('reports/playful-review/prepared.json').read_text())['rows']
font=ImageFont.truetype('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',18)
for page in range(32):
    canvas=Image.new('RGB',(1024,1200),'#faf8ee'); draw=ImageDraw.Draw(canvas)
    for j,a in enumerate(rows[page*4:page*4+4]):
        x=(j%2)*512;y=(j//2)*600
        canvas.paste(Image.open('public/'+a['detail'].removeprefix('./')).convert('RGB'),(x,y))
        text=a['id']+' '+a['conceptKey']+'\n'+'\n'.join(r['kana'] for r in a['readings'])
        draw.multiline_text((x+12,y+515),text,font=font,fill='#233b40',spacing=4)
    canvas.save(f'reports/playful-review/detail-{page+1:02}.jpg',quality=94)
