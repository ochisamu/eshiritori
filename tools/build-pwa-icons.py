from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'public/icons'
root.mkdir(exist_ok=True)
for size in [180,192,512]:
 im=Image.new('RGB',(32,32),'#faf8ee');d=ImageDraw.Draw(im)
 d.rounded_rectangle((5,5,26,26),radius=4,fill='#164b48')
 for box in [(13,8,18,13),(8,13,13,18),(18,13,23,18),(13,18,18,23)]:d.rectangle(box,fill='#f8ce58')
 d.rectangle((13,13,18,18),fill='#ea7d63')
 im.resize((size,size),Image.Resampling.NEAREST).save(root/f'app-{size}.png')
