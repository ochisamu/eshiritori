"""Track native-tool image jobs and atomically import their actual saved outputs.
This program does not call an image model, consume credentials or generate images.
"""
import argparse, datetime, hashlib, json, os, re
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
ORIGINALS=ROOT/'content/originals'
EVENTS=ROOT/'content/generation-events.jsonl'
parser=argparse.ArgumentParser()
parser.add_argument('stage',choices=['prompted','commit'])
parser.add_argument('--name',required=True)
parser.add_argument('--source')
args=parser.parse_args()
if not re.fullmatch(r'[a-z0-9-]+\.png',args.name): raise ValueError('Unsafe destination name')
dest=ORIGINALS/args.name
prompt=dest.with_name(dest.stem+'-prompt.txt')
if not prompt.is_file(): raise ValueError('Persist the exact prompt before dispatch')
event={'jobId':dest.stem,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'tool':'built-in image_gen.imagegen','model':'unknown','providerSeed':'unknown','cost':None,'promptSha256':hashlib.sha256(prompt.read_bytes()).hexdigest()}
if args.stage=='prompted':
    if dest.exists(): raise ValueError('Saved output already exists; reconcile it before requesting another generation')
    event.update(stage='prompted',status='ready_for_native_tool')
else:
    source=Path(args.source or '')
    if not source.is_file(): raise ValueError('Native tool output file is missing')
    data=source.read_bytes()
    if dest.exists():
        if dest.read_bytes()!=data:
            raise ValueError('Saved output differs; preserve it and reconcile instead of overwriting')
        print(json.dumps({'jobId':dest.stem,'status':'already_saved','sha256':hashlib.sha256(data).hexdigest()}))
        raise SystemExit(0)
    temporary=dest.with_suffix('.pending.png')
    temporary.write_bytes(data)
    with Image.open(temporary) as im:
        size=im.size
        if im.format!='PNG' or min(size)<512: raise ValueError('Unexpected image format or dimensions')
        im.verify()
    os.replace(temporary,dest)
    event.update(stage='generated',status='awaiting_technicalQA',source=str(dest.relative_to(ROOT)),providerOutputFile=source.name,dimensions=size,byteSize=len(data),sha256=hashlib.sha256(data).hexdigest())
with EVENTS.open('a',encoding='utf8') as stream: stream.write(json.dumps(event,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in event.items() if k not in ['promptSha256']},ensure_ascii=False))
