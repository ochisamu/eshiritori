"""Extract already downloaded Ubuntu browser libraries into this workspace only."""
from pathlib import Path
import subprocess, shutil
root=Path(__file__).resolve().parent.parent
packages=root/'.cache/webkit-debs'
destination=root/'.cache/webkit-deps'
destination.mkdir(parents=True,exist_ok=True)
files=sorted(packages.glob('*.deb'))
if not files: raise RuntimeError('No verified distribution packages have been downloaded')
for package in files: subprocess.run(['dpkg-deb','-x',str(package),str(destination)],check=True)
schemas=destination/'usr/share/glib-2.0/schemas'
compiler=shutil.which('glib-compile-schemas')
if schemas.is_dir() and compiler: subprocess.run([compiler,str(schemas)],check=True)
print(f'Extracted {len(files)} distribution packages under {destination}. No system package installation performed.')
