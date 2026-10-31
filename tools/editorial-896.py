import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'content/editorial-difficulty.json';d=json.loads(p.read_text())
for n,reason in {835:'オーボエはリードと細い管の形から読む。',836:'ファゴットは折り返す管と曲がった吹管から読む。',841:'琴の専用の構造と呼び名を知る必要がある。',843:'琵琶は胴の形と大きな撥から読む。',846:'マンドリンは対になった弦としずく形の胴から読む。',847:'チェロは弦楽器の胴と下の支え棒で見分ける。',855:'カウベルは打楽器の一種の呼び名。',857:'パンフルートは長さの違う管を束ねた楽器。',859:'バグパイプは袋と複数の管を持つ楽器。',860:'ティンパニは半球の胴とペダルを持つ打楽器。',861:'ボンゴは二つの短い太鼓をつないだ打楽器。',862:'スネアドラムは浅い胴を持つ打楽器。',863:'カリンバは金属の舌を弾く専用楽器。',864:'ディジュリドゥは長い木管の楽器の名前。',887:'硯は書道の専用道具。',889:'筆置きは書道用の専用道具。'}.items():d['advancedAssets'][f'card-{n:04d}']=reason
extra={835:{'りーど':(.45,.09,.12,.18)},841:{'ことじ':(.28,.3,.43,.32)},847:{'えんどぴん':(.43,.8,.12,.16)},894:{'かなめ':(.43,.65,.16,.16)},896:{'ししがしら':(.16,.13,.68,.4)}}
for byword in extra.values():
 for word in byword:
  if word not in d['advancedReadings']:d['advancedReadings'].append(word)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'content/visible-elements.json';e=json.loads(p.read_text())
for n,byword in extra.items():
 for word,(x,y,w,h) in byword.items():e.setdefault(f'card-{n:04d}',{})[word]={'x':x,'y':y,'w':w,'h':h}
p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
