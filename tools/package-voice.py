"""Build secret-free, restartable source and playable voice archives (Python 3.9+)."""
from pathlib import Path
import hashlib,json,os,re,subprocess,zipfile
ROOT=Path(__file__).resolve().parent.parent
PRIVATE={".git",".voice",".cache","node_modules","test-results","coverage"}
SUFFIXES={".key",".pem",".crt",".cer",".csr",".srl",".p12",".pfx",".wav",".pcm",".mp3",".ogg",".log"}
def forbidden(name):
    p=Path(name)
    return any(part in PRIVATE for part in p.parts) or (p.name.startswith(".env") and p.name!=".env.example") or p.suffix.lower() in SUFFIXES
def secrets():
    path=ROOT/".env"
    found=[os.environ["OPENAI_API_KEY"].encode()] if os.environ.get("OPENAI_API_KEY") else []
    if not path.exists():return found
    for line in path.read_text().splitlines():
        m=re.match(r"\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*(.*)",line)
        if m:
            value=m.group(1).strip().strip("\"'")
            if value:found.append(value.encode())
    return found
def bundle(destination,names):
    destination.parent.mkdir(exist_ok=True)
    temporary=destination.with_suffix(".zip.part")
    keys=secrets()
    entries=[]
    with zipfile.ZipFile(temporary,"w") as z:
        for name in sorted(set(names)):
            if forbidden(name):raise ValueError("Private path rejected")
            source=(ROOT/name).resolve()
            if not source.is_relative_to(ROOT) or not source.is_file():raise ValueError("Missing or unsafe source")
            data=source.read_bytes()
            if any(key in data for key in keys) or re.search(rb"(?m)^-----BEGIN [^\r\n]*PRIVATE KEY-----",data):
                raise ValueError("Host secret rejected; no archive published")
            method=zipfile.ZIP_STORED if source.suffix.lower() in {".webp",".png",".jpg"} else zipfile.ZIP_DEFLATED
            z.writestr(name.replace("\\","/"),data,compress_type=method,compresslevel=6)
            entries.append({"path":name,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)})
    with zipfile.ZipFile(temporary) as z:
        if z.testzip() is not None:raise ValueError("Archive CRC verification failed")
        for entry in entries:
            data=z.read(entry["path"])
            if hashlib.sha256(data).hexdigest()!=entry["sha256"]:raise ValueError("Archive hash mismatch")
            if any(key in data for key in keys):raise ValueError("Host key found in archive")
    os.replace(temporary,destination)
    return {"path":str(destination.relative_to(ROOT)),"bytes":destination.stat().st_size,"files":len(entries),"sha256":hashlib.sha256(destination.read_bytes()).hexdigest(),"secretScan":True}
def main():
    os.chdir(ROOT)
    runtime=json.loads(subprocess.check_output(["node","--input-type=module","-e","import {runtimeFiles,runtimeHash} from './tools/runtime-files.mjs'; console.log(JSON.stringify({files:runtimeFiles(),hash:runtimeHash()}));"],text=True))
    common=["package.json","package-lock.json",".env.example","README.md","LICENSES.md","PLAY-START.md","tools/serve.mjs","tools/create-voice-certificate.mjs","docs/voice-opponent.md","docs/screenshots/voice-options.png","reports/voice/verification.md"]
    common += [str(p.relative_to(ROOT)) for p in (ROOT/"licenses").iterdir() if p.is_file()]
    common += [str(p.relative_to(ROOT)) for p in (ROOT/"docs/screenshots").iterdir() if p.suffix in {".png",".json",".md"}]
    play=["dist/"+name for name in runtime["files"]]+[str(p.relative_to(ROOT)) for p in (ROOT/"dist-voice").rglob("*.js")]+common
    top=Path(subprocess.check_output(["git","rev-parse","--show-toplevel"],text=True).strip()).resolve()
    if top!=ROOT:raise ValueError("Run source packaging from its Git checkout")
    source=[name for name in subprocess.check_output(["git","ls-files","--cached","--others","--exclude-standard","-z"]).decode().split("\0") if name]
    source=[name for name in source if (ROOT/name).is_file() and not forbidden(name)]
    result={"buildHash":runtime["hash"],"play":bundle(ROOT/"artifacts/eshiritori-voice-play.zip",play),"source":bundle(ROOT/"artifacts/eshiritori-voice-source.zip",source),"note":"No host env, certificates, cookies, audio, conversation captures or dependencies included. API key is checked privately."}
    (ROOT/"reports/voice/package-verification.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    (ROOT/"artifacts/eshiritori-voice-checksums.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(result,ensure_ascii=False))
if __name__=="__main__":main()
