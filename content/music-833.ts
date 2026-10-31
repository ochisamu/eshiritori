import type {ConceptRow} from './concepts';
const lines=`saxophone|さっくす|金色の曲がった管に丸いキーが並び、先が大きく広がる。|さくそふぉん:synonym:サクソフォンとも呼びます。;きー:part:管にキーが並びます。;べる:part:先が広がったベルになっています。|golden alto saxophone curved body flared bell many round keys black mouthpiece
clarinet|くらりねっと|黒いまっすぐな管に銀色のキーが並び、下の先が少し広がる。|きー:part:銀色のキーが並びます。;かん:part:黒い長い管があります。|black clarinet straight segmented body many silver keys gently flared bottom bell single reed mouthpiece
oboe|おーぼえ|黒い細い管に銀色のキーが並び、上の先に短い二枚の薄片が付く。|りーど:part:上の先にリードがあります。;きー:part:銀色のキーが並びます。|black orchestral oboe slender body silver keys narrow double reed clearly visible at top small bottom bell
bassoon|ふぁごっと|茶色い長い管が折り返す形で組まれ、上に細く曲がった金属管が付く。|ばすーん:synonym:バスーンとも呼びます。;かん:part:茶色い長い管があります。;きー:part:銀色のキーがあります。|reddish brown bassoon long doubled wooden tubes silver keys curved silver bocal at top
tuba|ちゅーば|太い金色の管が何重にも曲がり、上に大きく広がる口がある。|べる:part:上に大きなベルがあります。;かん:part:太い管が曲がっています。;ばるぶ:part:中央にバルブがあります。|large golden brass tuba looped broad tubing huge upward bell three piston valves
trombone|とろんぼーん|金色の長い管がU字に曲がり、片側に大きく広がる口が付く。|すらいど:part:前に長いスライドがあります。;べる:part:先に広がるベルがあります。;かん:part:長い金色の管があります。|golden trombone long clear U shaped slide and flared bell fully contained diagonally
french-horn|ほるん|金色の管が丸く何重にも巻かれ、横に大きな広がる口がある。|べる:part:横に大きなベルがあります。;かん:part:管が丸く巻いています。;ればー:part:上に押すレバーがあります。|golden French horn circular coiled tubing large flared side bell rotary valve levers
harp|はーぷ|三角形の大きな木の枠に、長さの違う細い弦が何本も張られる。|げん:part:枠に弦が張られています。;わく:part:周りに三角形の枠があります。;はしら:part:片側に太い柱があります。|golden concert harp tall triangular curved wooden frame many vertical strings broad base
koto|こと|横に長い木の台に弦が並び、途中で白い小さな柱が支える。|げん:part:台に長い弦があります。;ことじ:part:弦の下に白い琴柱があります。;だい:part:下に長い木の台があります。|Japanese koto long horizontal wood zither numerous parallel strings each supported by obvious white movable bridges
shamisen|しゃみせん|白い四角い胴に長い黒い棹が付き、三本の弦が張られる。|げん:part:棹から胴に弦があります。;どう:part:下に白い四角い胴があります。;いとまき:part:上に弦を巻く糸巻きがあります。|Japanese shamisen white square skin body long black fretless neck THREE strings THREE large lateral tuning pegs
biwa|びわ|茶色いしずく形の胴に短い棹が付き、横に大きな三角形のばちがある。|ばち:part:横に大きなばちがあります。;げん:part:胴に弦があります。;どう:part:下にしずく形の胴があります。|Japanese biwa lute pear shaped wooden body short neck frets strings large triangular wooden plectrum beside
ukulele|うくれれ|小さな茶色の胴と短い棹に、四本の弦と四つの糸巻きがある。|げん:part:胴に弦が張られています。;あな:part:胴に丸い穴があります。;いとまき:part:上に糸巻きがあります。|small soprano ukulele short neck FOUR clearly separated strings FOUR tuning pegs wooden figure eight body round soundhole
banjo|ばんじょー|白い丸い胴の周りに金属の留め具が並び、長い棹と弦が伸びる。|げん:part:棹に弦が張られています。;どう:part:下に丸い胴があります。;ねじ:part:胴の周りにねじがあります。|five string banjo round white drum head body metal rim tension screws long fretted neck strings
mandolin|まんどりん|茶色のしずく形の胴に、二本一組の細い弦が張られ、短い棹が付く。|げん:part:胴に弦が張られています。;どう:part:しずく形の胴があります。;いとまき:part:上に糸巻きがあります。|wooden teardrop bowlback mandolin short neck eight strings in four pairs oval sound hole tuning pegs
cello|ちぇろ|大きな茶色の弦楽器の下から細い棒が伸び、横に長い弓が置かれる。|げん:part:胴に弦が張られています。;ゆみ:part:横に弓があります。;えんどぴん:part:下に支える棒があります。|large wooden cello upright four strings obvious long endpin below body long bow beside no player
double-bass|こんとらばす|立った人物が、背の高い茶色の弦楽器を支え、弓で弦を弾く。|げん:part:大きな胴に弦があります。;ゆみ:part:手に長い弓があります。;ひく:action:弓で弦を弾いています。|standing musician playing double bass upright instrument nearly adult height sloping shoulders long neck clear bow in hand no text
pipe-organ|ぱいぷおるがん|白黒の鍵盤の上に、長さの違う銀色の管が何本も並ぶ。|けんばん:part:下に白黒の鍵盤があります。;ぱいぷ:part:上に長い管が並びます。;かん:part:銀色の管があります。|small church pipe organ wooden console two keyboard manuals tall array of silver organ pipes different heights
glockenspiel|てっきん|長さの違う銀色の板が二列に並び、横に丸い頭のばちが二本ある。|ばち:part:横にばちがあります。;いた:part:銀色の板が並びます。|silver metal glockenspiel two staggered rows of shiny rectangular bars wooden base two black round mallets beside
cymbals|しんばる|丸い金色の板が二枚あり、中央に黒いひもの取っ手が付く。|いた:part:丸い金属の板があります。;とって:part:中央に持つところがあります。;ひも:part:真ん中に黒いひもがあります。|pair golden crash cymbals overlapping at angle central black leather hand straps concentric grooves
triangle-instrument|とらいあんぐる|銀色の細い棒が三角に曲がり、一か所が開き、横にたたく棒がある。|ぼう:part:横にたたく棒があります。;ひも:part:上に吊るすひもがあります。|silver musical triangle open lower corner suspended from small string loop slim metal striker beside
castanets|かすたねっと|赤と青の丸い木の板が重なり、白いひもでつながる。|いた:part:丸い木の板があります。;ひも:part:白いひもでつながっています。|single red blue Japanese classroom castanet clappers two round wooden shells white elastic loop
gong|どら|大きな金色の丸い板が赤い枠から吊られ、横に丸い頭のばちがある。|ばち:part:横にばちがあります。;わく:part:周りに赤い枠があります。;ひも:part:上に吊るすひもがあります。|large golden gong suspended by black cords in red wooden stand round padded mallet beside
cowbell|かうべる|黒い台形の金属の筒の下が大きく開き、横にたたく棒がある。|べる:synonym:たたいて鳴らすベルです。;ぼう:part:横にたたく棒があります。;くち:part:下に広い口があります。|black percussion cowbell trapezoid metal hollow bell open rectangular bottom wooden drumstick beside
ocarina|おかりな|茶色い丸みのある楽器に、丸い指穴と短い吹き口がある。|あな:part:表面に丸い指穴があります。;ふきぐち:part:先に短い吹き口があります。|single terracotta transverse ocarina rounded body short mouthpiece several clearly separated round finger holes
pan-flute|ぱんふるーと|長さの違う茶色い筒が、短い順にひもで横につながれる。|かん:part:長さの違う管が並びます。;ひも:part:管をひもでつないでいます。;くち:part:上に管の口が並びます。|single pan flute row of seven bamboo tubes descending lengths tied with brown cord open tube mouths
recorder|りこーだー|淡い色の長い管に丸い指穴が並び、上に平たい吹き口がある。|あな:part:管に指穴が並びます。;ふきぐち:part:上に吹き口があります。;かん:part:本体が長い管です。|single ivory school soprano recorder seven front finger holes clear beak mouthpiece three sections
bagpipes|ばぐぱいぷ|赤い格子模様の袋から、長さの違う黒い管が何本も伸びる。|ふくろ:part:赤い格子模様の袋があります。;かん:part:袋から管が伸びています。;ふさ:part:管に房の飾りがあります。|single red tartan bagpipes bag with blowpipe chanter three drone pipes black ivory trim red tassels all pipes inside cell
timpani|てぃんぱに|大きな銅色の半球の器に白い皮が張られ、脚元にペダルがある。|かわ:part:上に白い皮が張られています。;ぺだる:part:脚元にペダルがあります。;ばち:part:横にばちがあります。|single copper orchestral timpani kettle drum white drumhead three legs obvious foot pedal two felt mallets beside
bongos|ぼんご|大きさの違う茶色の短い太鼓が二つ、横につながれる。|たいこ:part:二つの太鼓があります。;かわ:part:上に白い皮が張られています。;どう:part:下に木の胴があります。|pair linked wooden bongo drums different diameters white skin heads metal rims short wooden shells
snare-drum|すねあどらむ|銀色の浅い丸い太鼓を台が支え、横に細いばちが二本ある。|たいこ:part:浅い太鼓があります。;ばち:part:横にばちがあります。;だい:part:下に支える台があります。|single silver snare drum shallow cylindrical shell white head on tripod stand two wooden drumsticks beside
kalimba|かりんば|四角い木の箱の上に長さの違う金属の細い板が並び、下に丸い穴がある。|いた:part:上に細い金属板が並びます。;あな:part:下に丸い穴があります。;はこ:part:本体が木の箱です。|single wooden kalimba thumb piano rectangular resonator box round soundhole row of metal tines varying lengths
didgeridoo|でぃじゅりどぅ|長い茶色い木の筒に小さな点の模様が並び、片側の口が太く広がる。|かん:part:本体が長い管です。;くち:part:端に開いた口があります。;もよう:part:表面に点の模様があります。|single long wooden didgeridoo hollow tapered tube simple original geometric dot pattern broad flared end narrow top diagonal fully inside cell`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const music833Concepts:ConceptRow[]=rows.map(([k,r,d,e])=>[k,'music',r,d,e?e.split(';'):[]]);
export const music833Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
