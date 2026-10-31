"""Package the exact tested runtime, with atomic restart and a separate source archive."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess, zipfile
ROOT=Path(__file__).resolve().parent.parent

def bundle(root, destination, files, interrupt_after=None):
    root=Path(root).resolve(); destination=Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary=destination.with_suffix(destination.suffix+'.part')
    keys=[os.environ["OPENAI_API_KEY"].encode()] if os.environ.get("OPENAI_API_KEY") else []
    env=root/'.env'
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith('OPENAI_API_KEY='):
                value=line.split('=',1)[1].strip().strip(chr(34)+chr(39))
                if value:keys.append(value.encode())
    entries=[]
    with zipfile.ZipFile(temporary,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for count, name in enumerate(sorted(set(files)),1):
            path=(root/name).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                raise ValueError('Missing/unsafe archive source '+str(name))
            if path.name.startswith('.env') and path.name!='.env.example' or '.voice' in path.relative_to(root).parts or path.suffix.lower() in {'.key','.pem','.crt','.cer','.p12','.pfx'}:
                raise ValueError('Private file rejected from archive')
            data=path.read_bytes()
            if any(key in data for key in keys):raise ValueError("Host secret rejected from archive")
            archive.writestr(str(name).replace('\\','/'),data)
            entries.append({'path':str(name).replace('\\','/'),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
            if interrupt_after is not None and count==interrupt_after:
                raise InterruptedError('Intentional packaging interruption')
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None: raise ValueError('Archive CRC mismatch')
        for entry in entries:
            if hashlib.sha256(archive.read(entry['path'])).hexdigest()!=entry['sha256']:
                raise ValueError('Archive SHA mismatch')
    os.replace(temporary,destination)
    return {'path':str(destination.relative_to(root)) if destination.is_relative_to(root) else str(destination),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'bytes':destination.stat().st_size,'fileCount':len(entries),'entries':entries}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--source',action='store_true'); args=parser.parse_args()
    os.chdir(ROOT)
    if (ROOT/'server/voice').exists():
        raise SystemExit('Use python3 tools/package-voice.py for play/source exports with the optional voice server; the legacy source walker is disabled to protect local secrets.')
    runtime=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {runtimeFiles,runtimeHash} from './tools/runtime-files.mjs'; console.log(JSON.stringify({files:runtimeFiles(),hash:runtimeHash()}))"],text=True))
    files=['dist/'+p for p in runtime['files']]+['tools/serve.mjs','README.md','LICENSES.md']
    files += [str(p.relative_to(ROOT)) for p in (ROOT/'licenses').glob('*') if p.is_file()] if (ROOT/'licenses').exists() else []
    result={'buildHash':runtime['hash'],'play':bundle(ROOT,ROOT/'artifacts/eshiritori-play.zip',files)}
    if args.source:
        excluded={'.git','.cache','node_modules','dist','public','derived-assets','artifacts','test-results','coverage','__pycache__'}
        omitted={'content/originals/style-gouache-trial.png','content/originals/style-pop-trial.png','content/originals/sheet-001.png','reports/contact-sheet.png','reports/package-results.json'}
        # A ZIP cannot contain a report of its own final SHA256. Keep those
        # reports and packaging stdout beside the archives, not inside them.
        omitted.update({'reports/package-verification.json','reports/package-candidate-run.txt','reports/package-candidate-verify.txt','reports/package-final-run.txt','reports/package-final-verify.txt'})
        source=[]
        for folder, directories, names in os.walk(ROOT):
            directories[:]=[d for d in directories if d not in excluded]
            for name in names:
                path=Path(folder)/name
                if path.is_file() and not name.endswith(('.part','.tmp','.tsbuildinfo')) and str(path.relative_to(ROOT)).replace('\\','/') not in omitted:source.append(str(path.relative_to(ROOT)))
        # Approved runtime pictures are included once in the source archive.
        source+=['dist/'+p for p in runtime['files']]
        result['source']=bundle(ROOT,ROOT/'artifacts/eshiritori-source.zip',source)
    (ROOT/'reports/package-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:({a:b for a,b in v.items() if a!='entries'} if isinstance(v,dict) else v) for k,v in result.items()},ensure_ascii=False))

if __name__=='__main__': main()
