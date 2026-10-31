"""Record the already performed visual/vocabulary review of cards 641–704."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'content/editorial-difficulty.json'; d=json.loads(p.read_text())
for n,reason in {675:'つるはしは土木用の工具名。',676:'のみは木工用の工具名。',677:'かんなは木工用の工具名。',679:'はんだごては電子工作用の道具名。',681:'クランプは工作の固定具名。',682:'万力は工作の固定具名。',692:'指ぬきは裁縫用の専用道具名。',693:'刺繍枠は裁縫用の専用道具名。',700:'水準器は水平を確かめる道具名。',701:'糸のこは工作用の工具名。'}.items():d['advancedAssets'][f'card-{n:04d}']=reason
bounds={655:{'ごけ':(.7,.65,.26,.28)},677:{'けずりば':(.47,.16,.24,.3)},678:{'やすりめ':(.34,.15,.47,.57)},679:{'こてさき':(.17,.48,.28,.34)},687:{'はりあな':(.47,.14,.18,.2)},698:{'かいてんば':(.13,.15,.4,.42)},700:{'きほう':(.43,.39,.2,.19)}}
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
for byword in bounds.values():
 for word in byword:
  if word not in d['advancedReadings']:d['advancedReadings'].append(word)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'content/visible-elements.json';e=json.loads(p.read_text())
for n,byword in bounds.items():
 for word,(x,y,w,h) in byword.items():e.setdefault(f'card-{n:04d}',{})[word]={'x':x,'y':y,'w':w,'h':h}
p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
