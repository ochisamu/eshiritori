"""Allow the downloaded browser wrapper to inherit workspace-only shared libraries.
No system files or package installations are changed.
"""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
for wrapper in (root/'.cache/playwright/webkit-2370').glob('minibrowser-*/MiniBrowser'):
    original=wrapper.with_name('MiniBrowser.original')
    if not original.exists(): original.write_bytes(wrapper.read_bytes())
    text=original.read_text()
    old='export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"'
    if old not in text: raise RuntimeError(f'Unexpected browser wrapper: {wrapper}')
    wrapper.write_text(text.replace(old,'export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib:${LD_LIBRARY_PATH}"'))
    print(f'Workspace browser wrapper now retains explicitly supplied library path: {wrapper}')
