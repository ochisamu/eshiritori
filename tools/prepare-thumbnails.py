"""Derive small-screen pixel previews from the approved 256px pixels, never regenerate art."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent.parent
path=ROOT/'content/image-manifest.json'; manifest=json.loads(path.read_text())
for entry in manifest:
    source=ROOT/entry['images']['256']['stagedPath']
    destination=source.with_name(source.stem+'-small.webp')
    if not destination.exists() or entry.get('thumbnailSourceSha256')!=entry['images']['256']['sha256']:
        with Image.open(source) as image: image.resize((128,128),Image.Resampling.NEAREST).save(destination,'WEBP',lossless=True,method=6)
    entry['thumbnailSourceSha256']=entry['images']['256']['sha256']
    entry['images']['128']={'path':'public/assets/'+destination.name,'stagedPath':str(destination.relative_to(ROOT)),'width':128,'height':128,'byteSize':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
    destination=source.with_name(source.stem+'-tiny.webp')
    with Image.open(source) as image: image.resize((96,96),Image.Resampling.NEAREST).save(destination,'WEBP',lossless=True,method=6)
    entry['images']['96']={'path':'public/assets/'+destination.name,'stagedPath':str(destination.relative_to(ROOT)),'width':96,'height':96,'byteSize':destination.stat().st_size,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
for page in range((len(manifest)+63)//64):
    sheet=Image.new('RGB',(1152,1280),(249,248,237));draw=ImageDraw.Draw(sheet)
    for i,entry in enumerate(manifest[page*64:(page+1)*64]):
        x,y=(i%8)*144,(i//8)*160
        with Image.open(ROOT/entry['images']['128']['stagedPath']) as image:sheet.paste(image,(x+8,y+8))
        draw.text((x+8,y+139),entry['assetId'],fill=(35,59,64))
    sheet.save(ROOT/f'reports/thumbnail-sheet-{page+1:02d}.png')
    sheet=Image.new('RGB',(896,1024),(249,248,237));draw=ImageDraw.Draw(sheet)
    for i,entry in enumerate(manifest[page*64:(page+1)*64]):
        x,y=(i%8)*112,(i//8)*128
        with Image.open(ROOT/entry['images']['96']['stagedPath']) as image:sheet.paste(image,(x+8,y+8))
        draw.text((x+8,y+109),entry['assetId'],fill=(35,59,64))
    sheet.save(ROOT/f'reports/tiny-sheet-{page+1:02d}.png')
print(json.dumps({'thumbnails':len(manifest),'bytes':sum(e['images']['128']['byteSize'] for e in manifest),'method':'Approved 256px pixels → 128px nearest-neighbour lossless WebP'}))
