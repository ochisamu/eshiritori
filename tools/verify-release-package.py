"""Verify archive bytes, serve an extracted play archive, and compile the extracted source."""
from pathlib import Path
import argparse,datetime,hashlib,json,os,subprocess,time,urllib.request,zipfile
ROOT=Path(__file__).resolve().parent.parent
def command(args,cwd,log):
    with open(log,'a',encoding='utf8') as output:
        subprocess.run(args,cwd=cwd,stdout=output,stderr=subprocess.STDOUT,check=True,env={**os.environ,'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD':'1'})
def runtime(cwd):
    return subprocess.check_output(['node','--input-type=module','-e',"import {runtimeHash,runtimeFiles} from './tools/runtime-files.mjs'; console.log(JSON.stringify({hash:runtimeHash(),files:runtimeFiles()}))"],cwd=cwd,text=True)
def source_input_hash(archive):
    digest=hashlib.sha256()
    for name in sorted(archive.namelist()):
        if name.startswith(('src/','content/','tools/')) or name in ['index.html','package.json','package-lock.json','vite.config.ts','tsconfig.json']:
            digest.update(name.encode());digest.update(archive.read(name))
    return digest.hexdigest()
def extract(archive,destination):
    destination.mkdir(parents=True)
    for name in archive.namelist():
        if not (destination/name).resolve().is_relative_to(destination.resolve()):raise ValueError('Unsafe archive entry')
    archive.extractall(destination)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--reuse-source-build',action='store_true');args=parser.parse_args()
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();begin=time.monotonic()
    canonical=json.loads(runtime(ROOT));package=json.loads((ROOT/'reports/package-results.json').read_text())
    prior_path=ROOT/'reports/package-verification.json'
    previous=json.loads(prior_path.read_text()) if prior_path.exists() else None
    for kind in ['play','source']:
        item=package[kind]
        if hashlib.sha256((ROOT/item['path']).read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Archive SHA mismatch '+kind)
    with zipfile.ZipFile(ROOT/package['play']['path']) as play,zipfile.ZipFile(ROOT/package['source']['path']) as source:
        if play.testzip() or source.testzip():raise ValueError('CRC mismatch')
        digest=hashlib.sha256()
        for name in canonical['files']:
            data=play.read('dist/'+name)
            if data!=(ROOT/'dist'/name).read_bytes():raise ValueError('Packaged runtime differs '+name)
            digest.update(name.encode());digest.update(data)
        if digest.hexdigest()!=canonical['hash']:raise ValueError('Canonical runtime mismatch')
        source_hash=source_input_hash(source)
        reused=bool(args.reuse_source_build and previous and previous.get('sourceBuildMatch') and previous.get('sourceInputHash')==source_hash and previous.get('buildHash')==canonical['hash'])
        verification_folder=None
        if reused:
            source_build_hash=previous['sourceBuildHash'];source_log=previous['sourceBuildLog']
        else:
            verification_folder=ROOT/'.cache'/('release-verification-'+str(time.time_ns()))
            play_root=verification_folder/'play';source_root=verification_folder/'source'
            extract(play,play_root);extract(source,source_root)
            source_log=str((ROOT/'reports/extracted-source-build.txt').relative_to(ROOT));(ROOT/source_log).write_text('')
            command(['node','tools/restore-source-assets.mjs'],source_root,ROOT/source_log)
            try:command(['npm','ci','--offline'],source_root,ROOT/source_log)
            except subprocess.CalledProcessError:command(['npm','ci'],source_root,ROOT/source_log)
            command(['npm','run','build'],source_root,ROOT/source_log)
            source_build_hash=json.loads(runtime(source_root))['hash']
            if source_build_hash!=canonical['hash']:raise ValueError('Extracted source produces a different runtime')
            server=subprocess.Popen(['node','tools/serve.mjs'],cwd=play_root,env={**os.environ,'PORT':'4175'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            try:
                for attempt in range(30):
                    if server.poll() is not None:raise ValueError('Extracted play server exited')
                    try:
                        with urllib.request.urlopen('http://127.0.0.1:4175',timeout=2) as response:
                            html=response.read()
                        break
                    except OSError:time.sleep(.1)
                else:raise ValueError('Extracted play server unavailable')
                if html!=(play_root/'dist/index.html').read_bytes():raise ValueError('Served HTML mismatch')
                with urllib.request.urlopen('http://127.0.0.1:4175/assets/card-0014-tiny.webp',timeout=2) as response:
                    if response.read()!=(ROOT/'dist/assets/card-0014-tiny.webp').read_bytes():raise ValueError('Served picture mismatch')
            finally:
                server.terminate();server.wait(timeout=10)
    report={'startedAt':started,'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'durationMs':(time.monotonic()-begin)*1000,'buildHash':canonical['hash'],'contentVersion':json.loads((ROOT/'src/generated/version.json').read_text())['version'],'playRuntimeMatch':True,'sourceBuildMatch':source_build_hash==canonical['hash'],'sourceBuildHash':source_build_hash,'sourceInputHash':source_hash,'sourceBuildLog':source_log,'sourceBuildEvidenceReused':reused,'reusedEvidenceReason':'Final source inputs are byte-identical to the extracted source already compiled; only reports/documentation may differ.' if reused else None,'runtimeFiles':len(canonical['files']),'playZipSha256':package['play']['sha256'],'sourceZipSha256':package['source']['sha256'],'extractedServerSmoke':'Local HTTP index and reviewed responsive image matched exact bytes; no external requests','verificationFolder':str(verification_folder) if verification_folder else previous.get('verificationFolder'),'failures':[]}
    prior_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':main()
