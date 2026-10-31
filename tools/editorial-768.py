import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'content/editorial-difficulty.json';d=json.loads(p.read_text())
for n,reason in {708:'イグアナは背の突起とのどのひだで見分ける。',712:'イモリは赤い腹と体形で見分ける。',713:'ウーパールーパーは頭の外側のえらで見分ける。',728:'ナマコは海の生き物として形を見分ける。',744:'洗濯板は現在の日常で触れる頻度が低い道具。',766:'氷のうは冷やすための専用の袋。'}.items():d['advancedAssets'][f'card-{n:04d}']=reason
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'content/visible-elements.json';e=json.loads(p.read_text());e['card-0758']={'いやーぴーす':{'x':.28,'y':.1,'w':.38,'h':.19}};p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
