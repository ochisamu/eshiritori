import type {ConceptRow} from './concepts';
const lines=`axe|おの|幅の広い金属の刃に、長い茶色の柄が付く。|まさかり:synonym:幅の広い刃のまさかりです。;え:part:長い柄があります。;は:part:先に金属の刃があります。|single broad blade wood chopping axe with long brown handle silver blade and red socket
sickle|かま|内側に刃のある三日月形の金属が、短い木の柄に付く。|え:part:木の柄があります。;は:part:曲がった刃があります。|single Japanese hand sickle curved crescent steel blade short wooden handle
pickaxe|つるはし|横に長い両端のとがった金属の頭に、木の柄が付く。|え:part:長い木の柄があります。;さき:part:金属の先がとがっています。|single pickaxe with long wooden handle and two pointed curved steel ends
chisel|のみ|平たい金属の刃と短い木の柄を持つ、小さな工具。|は:part:先に平たい刃があります。;え:part:木の柄があります。|single woodworking chisel broad flat sharpened steel blade wooden grip
wood-plane|かんな|四角い木の台から金属の刃が出て、横に薄く巻いた木くずがある。|けずりば:part:木の台から削り刃が出ています。;けずりくず:part:横に薄い削りくずがあります。|Japanese wooden hand plane steel blade protruding from rectangular wooden block with large curly wood shavings beside
file-tool|やすり|細かな筋の並ぶ灰色の細長い板に、青い柄が付く。|え:part:青い柄があります。;やすりめ:part:金属の面に細かなやすり目があります。|single metal hand file crosshatched rasp teeth clearly visible on flat steel shaft blue handle
soldering-iron|はんだごて|細い金属の先と赤い持ち手があり、後ろから電気のコードが伸びる。|こてさき:part:先に細いこて先があります。;こーど:part:持ち手からコードが伸びています。|single electric soldering iron pointed steel tip red insulated handle long cord coiled fully inside cell
glue-gun|ぐるーがん|青い銃の形の道具に赤い引き金が付き、後ろから透明な棒が差し込まれる。|のずる:part:先にノズルがあります。;ひきがね:part:持ち手に引き金があります。;すてぃっく:part:後ろに透明なスティックが入っています。|single blue hot glue gun orange trigger silver nozzle clear glue stick inserted at back short cord fully inside cell
c-clamp|くらんぷ|赤いC字の金属枠に長いねじが通り、下に横向きの取っ手がある。|ねじ:part:枠に長いねじが通っています。;とって:part:下に横向きの取っ手があります。|single red C clamp large visible threaded screw and sliding T handle
bench-vise|まんりき|青い金属の台の上に二つの口が向かい合い、前に横棒のハンドルがある。|ばいす:synonym:バイスとも呼びます。;はんどる:part:前に横棒のハンドルがあります。|single blue bench vise opposing rectangular jaws and clearly visible threaded screw with T handle
bolt|ぼると|六角形の頭の付いた銀色の棒に、らせんの溝が並ぶ。|ねじ:part:ねじの部分があります。;ねじやま:part:棒にねじ山があります。;あたま:part:上に六角形の頭があります。|single large silver hex head bolt at angle coarse thread clearly visible
nut|なっと|六角形の厚い金属の輪の中央に穴が開き、内側にらせんの溝がある。|あな:part:中央に穴があります。;ねじやま:part:穴の内側にねじ山があります。|single large silver hex nut angled top view large threaded central hole obvious inner spiral grooves
screw|ねじ|丸い頭に十字の溝があり、とがった棒にらせんが巻く。|すくりゅー:synonym:スクリューとも呼びます。;ねじやま:part:棒にねじ山があります。;みぞ:part:頭に十字の溝があります。|single silver Phillips screw large cross shaped head recess coarse threaded pointed shaft
nail|くぎ|平らな丸い頭と、細長くとがった金属の棒。|あたま:part:上に平らな頭があります。;さき:part:下の先がとがっています。|single large steel construction nail flat round head long smooth pointed shaft
sewing-needle|ぬいばり|細い銀色の針の大きな穴に、赤い糸が通っている。|はり:synonym:布を縫う針です。;はりあな:part:針の上に穴があります。;いと:part:穴に赤い糸が通っています。|single large silver sewing needle with conspicuously enlarged eye red thread through eye forming loose loop
dress-pin|まちばり|細い銀色の針の頭に、赤い丸い玉が付く。|はり:synonym:布を留める針です。;あたま:part:頭に赤い丸い玉があります。|single dressmaker straight pin silver pointed shaft conspicuous red round ball head
safety-pin|あんぜんぴん|銀色の細い金属が輪になり、一方に巻いたばね、他方に針を覆う留め具がある。|ぴん:synonym:針先を覆えるピンです。;ばね:part:端に巻いたばねがあります。;とめぐ:part:針先を覆う留め具があります。|single large closed silver safety pin obvious coiled spring at one end and protective clasp at other
thread-spool|いとまき|芯の周りに赤い細い糸が何重にも巻かれ、先が少し垂れている。|いと:part:赤い糸が巻かれています。;しん:part:糸の真ん中に芯があります。|single sewing thread spool red fine thread around beige central core loose thread tail
sewing-box|さいほうばこ|ふたを開いた箱に、はさみと糸巻き、針山が入る。|はさみ:part:箱にはさみが入っています。;いと:part:赤い糸が巻かれています。;はこ:part:下に道具を入れる箱があります。|single open sewing box containing conspicuous scissors red thread spool and small pincushion all fully visible
thimble|ゆびぬき|小さな金属の指帽子に、細かな丸いくぼみが並ぶ。|くぼみ:part:金属の面に丸いくぼみがあります。|single silver closed cap sewing thimble large clearly visible round surface dimples angled to show open underside
embroidery-hoop|ししゅうわく|二重の木の輪に白い布を張り、上の金具をねじで留める。|わく:part:丸い木の枠があります。;ぬの:part:白い布を張っています。;ねじ:part:上に締めるねじがあります。|single wooden embroidery hoop taut white fabric tiny simple red flower stitching large top metal screw clamp
yarn-ball|けいとだま|赤い太い糸が丸く巻かれ、端が一本長く伸びる。|けいと:part:太い毛糸が巻かれています。;いと:part:端に糸が伸びています。|single red ball of knitting yarn clear thick twisted strands loose long yarn tail no needles
box-cutter|かったー|黄色い細長い持ち手から、区切り線のある金属の刃が出ている。|は:part:先に金属の刃があります。;すらいだー:part:持ち手に刃を動かすつまみがあります。|single yellow utility box cutter segmented steel blade extended conspicuous black thumb slider
cutting-mat|かったーまっと|緑の長方形の厚いシートに、白い格子と端の短い目盛りがある。|ますめ:part:表面に白いマス目があります。;めもり:part:端に短い目盛りがあります。|single green rectangular craft cutting mat white square grid and short tick marks along edges NO numbers NO letters
hole-punch|あなあけぱんち|青い押し手の付いた道具の下に、二つの穴を開けた白い紙がある。|ぱんち:synonym:紙に穴を開けるパンチです。;あな:part:紙に丸い穴があります。;もちて:part:上に押す持ち手があります。|single blue two hole paper punch with white paper protruding two conspicuous circular punched holes visible and two round paper scraps beside
rotary-cutter|ろーらーかったー|黄色い持ち手の先に、丸い金属の刃が付く。|かいてんば:part:先に丸い回転刃があります。;とって:part:黄色い取っ手があります。|single craft rotary cutter yellow ergonomic handle large round exposed silver circular blade
packing-tape|がむてーぷ|茶色い幅広のテープが輪に巻かれ、端が短くはがれている。|てーぷ:synonym:幅の広いテープです。;しん:part:中央に紙の芯があります。;あな:part:真ん中に大きな穴があります。|single roll of brown packing tape wide strip peeled back clearly visible hollow cardboard core
spirit-level|すいじゅんき|黄色い細長い道具の中央に、透明な窓と液の中の丸い泡がある。|すいへいき:synonym:水平器とも呼びます。;きほう:part:透明な窓に気泡があります。;めもり:part:窓に短い線の目盛りがあります。|single yellow spirit level large central transparent green vial one conspicuous air bubble and two black measurement tick lines no digits no lettering
fretsaw|いとのこ|細い刃を張ったU字の金属枠に、青い持ち手が付く。|のこぎり:synonym:細い刃ののこぎりです。;は:part:枠に細い刃を張っています。;わく:part:U字の金属の枠があります。|single hand coping fretsaw U shaped metal frame thin toothed tensioned blade blue handle
electric-drill|どりる|青い銃の形の道具の先にらせんの刃が付き、持ち手に引き金がある。|でんどうどりる:synonym:電動ドリルです。;どりるびっと:part:先にらせん形の刃があります。;ひきがね:part:持ち手に引き金があります。|single blue cordless electric drill clearly visible spiral steel drill bit orange trigger black battery base no logos
oil-can|あぶらさし|赤い丸い容器から細長い注ぎ口が伸び、上に押す取っ手がある。|おいるさし:synonym:オイル差しとも呼びます。;そそぎぐち:part:先に細長い注ぎ口があります。;とって:part:上に押す取っ手があります。|single red pump oil can round body long thin spout and clear lever handle no writing
whetstone|といし|水の付いた長方形の石に、人物の両手が持つ包丁の刃を当てている。|はもの:part:石に刃物を当てています。;みず:part:石の上に水滴があります。;とぐ:action:石で包丁を研いでいます。|close view two human hands sharpening silver kitchen knife on rectangular grey whetstone on wooden base obvious water drops and gentle sliding motion arc`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const tool673Concepts:ConceptRow[]=rows.map(([k,r,d,e],i)=>[k,i<14?'tool':i<22?'craft':'tool',r,d,e?e.split(';'):[]]);
export const tool673Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
