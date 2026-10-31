import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'content/editorial-difficulty.json';d=json.loads(p.read_text())
for n,reason in {901:'ドジョウは口ひげと小さなひれで見分ける。',909:'サソリははさみと尾の針で見分ける。',912:'カブトガニは前後の甲と長い尾で見分ける。',919:'ミョウガは葉に包まれた花芽の食材。',920:'ラッキョウは小さな球と根の形を見分ける。',928:'カカオは実の内部と豆を見分ける。',983:'飯盒は豆形のキャンプ用容器。',992:'カラビナはゲートの付いた連結具。',999:'キジは体と尾羽の形を見分ける。',1000:'ハチドリは細いくちばしと空中で羽ばたく姿から読む。',1003:'ジュゴンは海に暮らす哺乳類の形を見分ける。',1004:'アルマジロは帯状の甲を持つ動物。',1006:'カモノハシはくちばし・尾・水かきの組み合わせから読む。'}.items():d['advancedAssets'][f'card-{n:04d}']=reason
# Vocabulary which requires a small part to be singled out gets reviewed bounds.
extra={975:{'やじり':(.63,.12,.25,.25)},979:{'かたあて':(.25,.22,.5,.18)},992:{'げーと':(.22,.4,.24,.34)}}
for byword in extra.values():
 for word in byword:
  if word not in d['advancedReadings']:d['advancedReadings'].append(word)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=root/'content/visible-elements.json';e=json.loads(p.read_text())
for n,byword in extra.items():
 for word,(x,y,w,h) in byword.items():e.setdefault(f'card-{n:04d}',{})[word]={'x':x,'y':y,'w':w,'h':h}
p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
