from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
root=Path(__file__).resolve().parent.parent
assets=json.loads((root/'src/generated/content.json').read_text())
remaining=[a for a in assets if not any(r['kind'] in ['part','action','scene','wordplay'] for r in a['readings'])]
out=root/'reports/remaining-review';out.mkdir(exist_ok=True)
for page in range((len(remaining)+15)//16):
    canvas=Image.new('RGB',(2048,2160),(255,249,237));draw=ImageDraw.Draw(canvas)
    for j,a in enumerate(remaining[page*16:page*16+16]):
        image=Image.open(root/'public'/a['detail'].split('?')[0].removeprefix('./'))
        x,y=(j%4)*512,(j//4)*540;canvas.paste(image,(x,y));draw.text((x+12,y+516),a['id']+' '+a['conceptKey'],fill=(25,47,52))
    canvas.save(out/f'remaining-{page+1:02d}.png')
(out/'selection.json').write_text(json.dumps({'method':'Census of every remaining basic/synonym/category-only card. 940/1024 have mandatory detailed-reading QA, leaving only 84; inspect all remaining 84 in addition to the separate fixed-seed random200 review.','count':len(remaining),'sample':[{'assetId':a['id'],'sha256':hashlib.sha256((root/'public'/a['detail'].split('?')[0].removeprefix('./')).read_bytes()).hexdigest()}for a in remaining],'status':'prepared_not_reviewed'},ensure_ascii=False,indent=2))
print(len(remaining))
