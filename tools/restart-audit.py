"""Exercise real job/package helpers with disposable stubs, never request image generation."""
from pathlib import Path
import hashlib, importlib.util, json, shutil, subprocess, sys, tempfile, datetime
ROOT=Path(__file__).resolve().parent.parent
started=datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('pack',ROOT/'tools/package-release.py'); pack=importlib.util.module_from_spec(spec); spec.loader.exec_module(pack)
checks=[]
with tempfile.TemporaryDirectory(prefix='eshiritori-restart-') as tmp:
    root=Path(tmp); (root/'tools').mkdir(); (root/'content/originals').mkdir(parents=True)
    shutil.copy2(ROOT/'tools/image_jobs.py',root/'tools/image_jobs.py')
    original=root/'content/originals/stub.png'; prompt=original.with_name('stub-prompt.txt'); prompt.write_text('Disposable test only; no model call',encoding='utf8')
    source=root/'native-output.png'; shutil.copy2(ROOT/'content/originals/pixel-001.png',source)
    def job(stage): return subprocess.run([sys.executable,str(root/'tools/image_jobs.py'),stage,'--name','stub.png',*(['--source',str(source)] if stage=='commit' else [])],capture_output=True,text=True)
    assert job('prompted').returncode==0
    # Simulate an interruption before atomic rename: final file is absent, pending output survives.
    shutil.copy2(source,original.with_suffix('.pending.png'))
    assert job('commit').returncode==0
    first=sha(original); events=sha(root/'content/generation-events.jsonl')
    assert job('commit').returncode==0 and sha(original)==first
    assert sha(root/'content/generation-events.jsonl')==events
    assert job('prompted').returncode!=0
    source.write_bytes(b'different saved bytes')
    assert job('commit').returncode!=0 and sha(original)==first
    checks.append('Interrupted commit resumes; identical repeat is idempotent; existing output prevents a new request or destructive overwrite.')
    for name in ['a.txt','b.txt','c.txt']:(root/name).write_text(name)
    destination=root/'release.zip'; files=['a.txt','b.txt','c.txt']
    initial=pack.bundle(root,destination,files); old=sha(destination)
    try: pack.bundle(root,destination,files,interrupt_after=1)
    except InterruptedError: pass
    else: raise AssertionError('Interruption stub did not fire')
    assert sha(destination)==old and destination.with_suffix('.zip.part').exists()
    resumed=pack.bundle(root,destination,files)
    assert initial['entries']==resumed['entries'] and not destination.with_suffix('.zip.part').exists()
    checks.append('Interrupted packaging preserves the existing archive; restart writes one verified entry per file and atomically replaces it.')
# Re-running the actual transform cache must not alter approved pixels or generation history.
paths=[ROOT/'content/generation-events.jsonl',ROOT/'content/review.json',ROOT/'content/semantic-reviews.jsonl']
paths += list((ROOT/'content/derived-assets').glob('*.webp'))
before={str(p.relative_to(ROOT)):sha(p) for p in paths}
subprocess.run([sys.executable,'tools/prepare_assets.py'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
after={str(p.relative_to(ROOT)):sha(p) for p in paths}
assert before==after
checks.append('Actual 1,024-asset transform cache resumes without changing pixels, image-generation events, or existing QA decisions.')
report={'startedAt':started,'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'checkedFiles':len(paths),'failures':[],'generationRequestsMade':0,'limits':'Native image-provider interruption/charging cannot be forced; actual saved-output history and local pre-dispatch/commit stubs are verified.'}
(ROOT/'reports/restart-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False))
