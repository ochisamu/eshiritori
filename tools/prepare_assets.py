"""Deterministic crop/pad/format conversion. Does not generate or draw artwork.
Pixel art details use explicit nearest-neighbour enlargement; native crop size is recorded.
Approval comes from the separately maintained review ledger, never from this script.
"""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import hashlib, json
from collections import deque

def subject_bounds(sprite,main_only=False,clean=False):
    """Find the main connected silhouette, excluding stray neighbouring-cell pixels."""
    w,h=sprite.size
    pixels=sprite.load()
    mask=bytearray(w*h)
    for y in range(h):
        for x in range(w):
            r,g,b=pixels[x,y]
            mask[y*w+x]=max(r,g,b)-min(r,g,b)>65 or max(r,g,b)<190
    components=[]
    for start in range(w*h):
        if not mask[start]: continue
        mask[start]=0; q=deque([start]); points=[]
        while q:
            p=q.popleft();points.append(p);x,y=p%w,p//w
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<w and 0<=yy<h and mask[yy*w+xx]:
                        mask[yy*w+xx]=0;q.append(yy*w+xx)
        if len(points)>10:
            xs=[p%w for p in points];ys=[p//w for p in points]
            box=(min(xs),min(ys),max(xs)+1,max(ys)+1)
            cx,cy=(box[0]+box[2])/2,(box[1]+box[3])/2
            components.append((len(points),box,cx,cy,points))
    eligible=[c for c in components if abs(c[2]-w/2)<w*.4 and abs(c[3]-h/2)<h*.4]
    main=max(eligible,key=lambda c:c[0])
    box=list(main[1])
    selected_points=[main[4]]
    for count,b,cx,cy,points in ([] if main_only else components):
        # Include detached steam/flame only when near the central silhouette.
        if count>max(60,main[0]*.006) and b[1]>4 and b[3]<h-4 and b[0]>4 and b[2]<w-4 and abs(cx-main[2])<w*.4 and b[3]>main[1][1]-h*.5 and b[1]<main[1][3]+h*.15:
            box=[min(box[0],b[0]),min(box[1],b[1]),max(box[2],b[2]),max(box[3],b[3])]
            selected_points.append(points)
    if clean:
        selected=Image.new('L',(w,h),0);selection=selected.load()
        for points in selected_points:
            for p in points: selection[p%w,p//w]=255
        # A silhouette may divide the outer background into several regions.
        # Flood all border regions; a single corner leaves neighbouring fragments behind.
        for x in range(w):
            for y in (0,h-1):
                if selected.getpixel((x,y))==0: ImageDraw.floodfill(selected,(x,y),128)
        for y in range(h):
            for x in (0,w-1):
                if selected.getpixel((x,y))==0: ImageDraw.floodfill(selected,(x,y),128)
        selected=selected.point(lambda v:0 if v==128 else 255).filter(ImageFilter.MaxFilter(5))
        separated=Image.new('RGB',(w,h),(255,249,237));separated.paste(sprite,(0,0),selected);sprite.paste(separated)
    return(max(0,box[0]-4),max(0,box[1]-4),min(w,box[2]+4),min(h,box[3]+4))

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'content/derived-assets'
OUT.mkdir(parents=True,exist_ok=True)
overrides=json.loads((ROOT/'content/art-overrides.json').read_text())
ENCODING_VERSION='pixel-board64-colors-v2'
CROP_VERSION='reviewed-crops-v7'
manifest=[]
previous={m['assetId']:m for m in json.loads((ROOT/'content/image-manifest.json').read_text())} if (ROOT/'content/image-manifest.json').exists() else {}
for sheet in sorted((ROOT/'content/originals').glob('pixel-[0-9][0-9][0-9].png')):
    number=int(sheet.stem.split('-')[-1])
    im=Image.open(sheet).convert('RGB')
    for cell in range(16):
        index=(number-1)*16+cell+1
        aid=f'card-{index:04d}'
        cached=previous.get(aid)
        isolate=index in (218,219,231,232,333,334,443,447,488,562,571,584,605,606,607,608,717,718,731,732,827)
        override_signature=json.dumps(overrides.get(str(index),{}),sort_keys=True)
        if index==15: override_signature+=':reviewed-umbrella-stray-line-v1'
        if index in (14,135,217,271,409,411,523,603,652,660,697,701,702,704,841,842,844,860,875,929,985,986,1020,1022): override_signature+=':reviewed-whole-cell-v9'
        cache_source=ROOT/overrides[str(index)]['source'] if str(index) in overrides else sheet
        if cached and cached.get('isolationPolicy',False)==isolate and cached.get('overrideSignature','{}')==override_signature and cached.get('cropVersion')==CROP_VERSION and cached.get('encodingVersion')==ENCODING_VERSION and cached['sourceSha256']==hashlib.sha256(cache_source.read_bytes()).hexdigest() and all((ROOT/p['stagedPath']).exists() for p in cached['images'].values()):
            manifest.append(cached)
            continue
        x,y=cell%4,cell//4
        bounds=(max(0,round(x*im.width/4)-24),max(0,round(y*im.height/4)-24),min(im.width,round((x+1)*im.width/4)+24),min(im.height,round((y+1)*im.height/4)+24))
        if index==333: bounds=(0,round(y*im.height/4)-24,round((x+1)*im.width/4)+96,im.height)
        if index in (605,606,607,608): bounds=(max(0,round(x*im.width/4)-24),round(y*im.height/4)-96,min(im.width,round((x+1)*im.width/4)+24),im.height)
        region=im.crop(bounds)
        subject=subject_bounds(region,isolate,index in (231,232,272,333,334,443,447,488,562,571,584,605,606,607,608,717,718,731,732,827))
        bounds=(bounds[0]+subject[0],bounds[1]+subject[1],bounds[0]+subject[2],bounds[1]+subject[3])
        # Multi-component scenes use a reviewed explicit crop to preserve all evidence.
        if number==1 and cell==12: bounds=(8,895,295,1220)
        if number==10 and cell==11: bounds=(946,637,1249,934)
        if number in (13,14,16,19,20,23,24,26) and index not in (218,219):
            bounds=(round(x*im.width/4)+7,round(y*im.height/4)+7,round((x+1)*im.width/4)-7,round((y+1)*im.height/4)-7)
        if index in (652,660):
            bounds=(round(x*im.width/4)+5,round(y*im.height/4)+5,round((x+1)*im.width/4)-5,round((y+1)*im.height/4)-5)
        if index==652: bounds=(937,632,1250,934)
        if index==701: bounds=(10,923,411,1190)
        if index==702: bounds=(300,923,635,1249)
        if index==697: bounds=(10,630,327,925)
        if index==704: bounds=(937,880,1250,1249)
        if index==841: bounds=(3,660,371,902)
        if index==842: bounds=(370,620,620,918)
        if index==860: bounds=(944,630,1250,918)
        if index==875: bounds=(634,625,934,934)
        if index==985: bounds=(10,640,390,905)
        if index==986: bounds=(335,605,630,924)
        if index==929: bounds=(8,8,309,306)
        if index==1020: bounds=(943,612,1250,934)
        if index==1022: bounds=(318,918,621,1247)
        if index==603: bounds=(665,575,886,893)
        if index==135: bounds=(622,318,938,621)
        source=sheet; source_image=im
        if str(index) in overrides:
            override=overrides[str(index)];source=ROOT/override['source'];source_image=Image.open(source).convert('RGB');grid=override['grid'];ox,oy=override['cell']%grid,override['cell']//grid
            bounds=(round(ox*source_image.width/grid)+7,round(oy*source_image.height/grid)+7,round((ox+1)*source_image.width/grid)-7,round((oy+1)*source_image.height/grid)-7)
            if source.name=='kitchen-repair.png': bounds=(round(ox*source_image.width/grid)+20,round(oy*source_image.height/grid)+20,round((ox+1)*source_image.width/grid)-20,round((oy+1)*source_image.height/grid)-20)
            if 'bounds' in override: bounds=tuple(override['bounds'])
        sprite=source_image.crop(bounds)
        if index in (231,232,272,333,334,443,447,488,562,571,584,605,606,607,608,717,718,731,732,827) and str(index) not in overrides: sprite=region.crop(subject)
        if index in (14,15,217,271,409,411,523,562,584,701,702,842,844,985,986):
            local=subject_bounds(sprite,True,True)
            sprite=sprite.crop(local)
            bounds=(bounds[0]+local[0],bounds[1]+local[1],bounds[0]+local[2],bounds[1]+local[3])
        source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
        # Add clear margin while retaining all native pixels. All changes are traceable.
        canvas=Image.new('RGB',(round(max(sprite.size)/.78),)*2,(255,249,237))
        canvas.paste(sprite,((canvas.width-sprite.width)//2,(canvas.height-sprite.height)//2))
        paths={}
        for suffix,size in [('',256),('-detail',512)]:
            result=canvas.resize((size,size),Image.Resampling.NEAREST)
            if size==256: result=result.quantize(colors=64,dither=Image.Dither.NONE).convert('RGB')
            dest=OUT/f'{aid}{suffix}.webp'
            # Reaching this branch means the complete transformation cache was invalidated.
            # Never reuse pixels based on source/bounds alone after a mask-policy change.
            result.save(dest,'WEBP',lossless=True,method=6)
            paths[str(size)]={'path':f'public/assets/{dest.name}','stagedPath':str(dest.relative_to(ROOT)),'width':size,'height':size,'byteSize':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
        thumb=canvas.resize((128,128),Image.Resampling.NEAREST)
        manifest.append({'assetId':aid,'source':str(source.relative_to(ROOT)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sheetSize':source_image.size,'cropBounds':bounds,'nativeCropSize':sprite.size,'encodingVersion':ENCODING_VERSION,'cropVersion':CROP_VERSION,'overrideSignature':override_signature,'isolationPolicy':isolate,'boardPaletteColors':64,'pixelArtNearestNeighborDetail':True,'native512':min(sprite.size)>=512,'images':paths,'averageHash':''.join(f'{int(v>127):x}' for v in thumb.convert('L').resize((8,8)).getdata())})
(ROOT/'content/image-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
contact=Image.new('RGB',(8*144,((len(manifest)+7)//8)*160),(249,248,237))
d=ImageDraw.Draw(contact)
for i,a in enumerate(manifest):
    tile=Image.open(ROOT/a['images']['256']['stagedPath']).resize((128,128),Image.Resampling.NEAREST)
    x,y=(i%8)*144,(i//8)*160
    contact.paste(tile,(x+8,y+8));d.text((x+8,y+139),a['assetId'],fill=(35,59,64))
contact.save(ROOT/'reports/contact-sheet.png')
for page in range((len(manifest)+63)//64):
    contact.crop((0,page*8*160,8*144,min(contact.height,(page+1)*8*160))).save(ROOT/f'reports/contact-sheet-{page+1:02d}.png')
print(f'Converted {len(manifest)} distinct cells; 256px board + 512px nearest-neighbour pixel-art detail. Native sizes are recorded without claiming native 512px.')
