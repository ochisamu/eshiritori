"""Prepare deterministic QA displays; never marks them reviewed or changes artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,math,statistics,hashlib
root=Path(__file__).resolve().parent.parent
assets=json.loads((root/'src/generated/content.json').read_text())
out=root/'reports/visual-audit';out.mkdir(exist_ok=True)
def stable_order(a):return hashlib.sha256(('detail-review-1024-v1:'+a['id']).encode()).hexdigest()
sample=sorted(assets,key=stable_order)[:200]
for page in range((len(sample)+15)//16):
 canvas=Image.new('RGB',(2048,2160),(255,249,237));d=ImageDraw.Draw(canvas)
 for j,a in enumerate(sample[page*16:page*16+16]):
  p=root/'public'/a['detail'].split('?')[0].removeprefix('./');im=Image.open(p).convert('RGB')
  x,y=(j%4)*512,(j//4)*540;canvas.paste(im,(x,y));d.text((x+12,y+516),a['id']+' '+a['conceptKey'],fill=(25,47,52))
 canvas.save(out/f'detail-{page+1:02d}.png')
cos=[[math.cos((2*x+1)*u*math.pi/64) for x in range(32)] for u in range(8)]
hashes=[]
for a in assets:
 pixels=list(Image.open(root/'public'/a['image'].split('?')[0].removeprefix('./')).convert('L').resize((32,32),Image.Resampling.LANCZOS).getdata())
 temp=[[sum(pixels[y*32+x]*cos[u][x] for x in range(32)) for u in range(8)]for y in range(32)]
 coeff=[sum(temp[y][u]*cos[v][y] for y in range(32)) for v in range(8) for u in range(8)]
 median=statistics.median(coeff[1:]);bits=sum((int(v>median)<<i) for i,v in enumerate(coeff))
 hashes.append((a,bits))
pairs=[]
for i,(a,h) in enumerate(hashes):
 for b,k in hashes[i+1:]:pairs.append(((h^k).bit_count(),a['id'],b['id']))
pairs.sort();near=pairs[:60]
byid={a['id']:a for a in assets}
for page in range((len(near)+7)//8):
 canvas=Image.new('RGB',(1024,1120),(255,249,237));d=ImageDraw.Draw(canvas)
 for j,(distance,aid,bid) in enumerate(near[page*8:page*8+8]):
  x,y=(j%2)*512,(j//2)*280
  for offset,key in enumerate([aid,bid]):
   a=byid[key];im=Image.open(root/'public'/a['image'].split('?')[0].removeprefix('./')).convert('RGB');canvas.paste(im,(x+offset*256,y));d.text((x+offset*256+4,y+258),key+' d='+str(distance),fill=(25,47,52))
 canvas.save(out/f'near-{page+1:02d}.png')
report={'seed':'detail-review-1024-v1','sampleSize':200,'selection':'Lowest SHA256(seed + assetId), without replacement. Additional review after whole-source and contact review, including difficult-part cases already inspected.','sample':[{'assetId':a['id'],'detailSha256':hashlib.sha256((root/'public'/a['detail'].split('?')[0].removeprefix('./')).read_bytes()).hexdigest()}for a in sample],'nearAlgorithm':'32x32 grayscale separable DCT, low 8x8 coefficients, median excluding DC; Hamming distance. Top 60 pairs sorted by distance and IDs. Colour is intentionally ignored; similarity is a screening signal, not semantic identity.','nearPairs':[{'distance':dist,'a':a,'b':b}for dist,a,b in near],'minimumDistance':pairs[0][0],'exactDctMatches':sum(dist==0 for dist,_,_ in pairs),'status':'prepared_not_reviewed'}
(out/'selection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('Prepared 200 enlarged detail reviews and top 60 near-pair comparisons. None marked reviewed.')
