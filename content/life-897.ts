import type {ConceptRow} from './concepts';
const lines=`pufferfish|ふぐ|丸い黄茶色の魚の体に短いとげが並び、小さなひれと丸い口がある。|とげ:part:体に短いとげがあります。;ひれ:part:横に小さなひれがあります。;くち:part:前に丸い口があります。|inflated tan pufferfish round body many short spines tiny side fins round puckered mouth
sea-bream|たい|桃色の平たい魚に大きなうろこが並び、背にとがったひれがある。|うろこ:part:体にうろこがあります。;せびれ:part:背中にとがったひれがあります。;おびれ:part:後ろに二つに分かれた尾びれがあります。|Japanese red sea bream pink deep oval laterally flattened body large scales spiny dorsal fin forked tail
tuna|まぐろ|青い背と銀色の腹の細長い魚に、三日月形の大きな尾びれがある。|せびれ:part:背中にひれがあります。;おびれ:part:後ろに三日月形の尾びれがあります。;ひれ:part:体の横にひれがあります。|bluefin tuna streamlined thick spindle body blue back silver belly crescent tail small yellow finlets
eel|うなぎ|茶黒い細長い魚に小さな胸びれと、体の後ろに沿う薄いひれがある。|ひれ:part:体の横に小さなひれがあります。;しっぽ:part:後ろへ細く長くなっています。;め:part:頭に小さな目があります。|single brown freshwater eel elongated smooth serpentine body small pectoral fins continuous thin dorsal tail fin curled gently
loach|どじょう|茶色い細長い小魚の口の周りに、細いひげが何本もある。|ひげ:part:口の周りに細いひげがあります。;ひれ:part:横と背中に小さなひれがあります。;もよう:part:体に茶色い斑点があります。|single mottled brown weather loach slender rounded fish obvious mouth barbels small fins blunt head
carp|こい|茶色い大きなうろこの魚に、口の左右のひげと長い背びれがある。|ひげ:part:口の左右にひげがあります。;うろこ:part:体に大きなうろこがあります。;せびれ:part:背中に長いひれがあります。|single common carp bronze deep body large scales two pairs short mouth barbels long dorsal fin no colored koi pattern
salmon|さけ|銀色の細長い魚に黒い斑点があり、背に離れた小さなひれが二つある。|さーもん:synonym:サーモンとも呼びます。;ひれ:part:体にひれがあります。;はんてん:part:背中に黒い斑点があります。|single silver salmon side profile dark spotted back primary dorsal and small separate adipose fin forked tail
swordfish|かじき|青い魚の口から長い剣のような先が伸び、背に高いひれがある。|くち:part:前に長い口先があります。;せびれ:part:背中に高いひれがあります。;おびれ:part:後ろに尾びれがあります。|blue marlin billfish long spear shaped upper bill tall curved dorsal fin crescent tail whole bill contained
anglerfish|ちょうちんあんこう|黒い丸い魚の大きな口に牙が並び、頭の上の細い棒の先が光る。|きば:part:口に大きな牙があります。;あかり:part:頭の上の先が光っています。;くち:part:前に大きな口があります。|deep sea anglerfish dark round body huge toothy open mouth curved head lure glowing yellow bulb at end
sunfish|まんぼう|丸く平たい灰色の魚に上下の長いひれがあり、後ろが短く切れた形になる。|ひれ:part:体の上下に長いひれがあります。;め:part:前に小さな目があります。;くち:part:前に小さな口があります。|ocean sunfish grey tall rounded disc body very tall dorsal and anal fins short scalloped rear edge tiny mouth eye
firefly|ほたる|黒い小さな虫の腹の先が黄緑に光り、赤い胸と六本の脚がある。|ひかり:part:お腹の先が光っています。;あし:part:体から脚が伸びています。;はね:part:背中に黒い羽があります。|single Japanese firefly beetle black wing covers red thorax six legs abdomen tip glowing yellow green tiny dark blue halo only
spider|くも|黒い丸い腹のある小さな生き物から、長い脚が八本伸びる。|あし:part:体から長い脚が伸びています。;いと:part:上から細い糸で下がっています。|single black spider exactly eight clearly separated legs two body sections hanging from thin silk thread
scorpion|さそり|黄茶色の体に二つのはさみがあり、節のある尾を上へ巻き上げる。|はさみ:part:前にはさみがあります。;しっぽ:part:尾を上に巻いています。;はり:part:尾の先に針があります。|single tan scorpion two large front pincers eight walking legs segmented curved tail raised sting
pillbug|だんごむし|灰色の丸みのある小さな体に、横向きの節と短い脚がたくさん並ぶ。|ふし:part:背中に節が並びます。;あし:part:下に短い脚があります。;しょっかく:part:頭に触角があります。|single grey pillbug woodlouse oval domed body seven clear overlapping segmented plates many small legs antennae
centipede|むかで|茶色い細長い体の左右に細い脚がたくさん並び、頭から触角が伸びる。|あし:part:左右にたくさんの脚があります。;ふし:part:体に節があります。;しょっかく:part:頭に触角があります。|single brown centipede long flattened segmented curved body one pair legs per segment long antennae no extra heads
horseshoe-crab|かぶとがに|茶色い丸い甲の後ろに小さな甲が続き、細長い尾が伸びる。|こうら:part:上に大きな甲羅があります。;しっぽ:part:後ろに細長い尾があります。;とげ:part:後ろの甲にとげがあります。|single brown horseshoe crab top view large horseshoe shield smaller spiny rear shield long straight pointed tail
chili-pepper|とうがらし|赤い細長く曲がった実に、緑の短いへたが付く。|へた:part:上に緑のへたがあります。;み:part:赤い実が伸びています。|single red chili pepper long gently curved tapered fruit green cap and stem
okra|おくら|緑の細長い五角形の実が切られ、星形の切り口に白い種が並ぶ。|たね:part:切り口に白い種があります。;きりくち:part:切り口が星の形です。;へた:part:上に緑のへたがあります。|green okra pod one whole and two cut cross sections with star shaped outline white seeds inside
bitter-melon|ごーや|緑の細長い実の表面に丸い突起が並び、切り口に白いわたと種が見える。|にがうり:synonym:苦瓜とも呼びます。;たね:part:中に種があります。;とっき:part:表面に突起があります。|single green bitter melon goya bumpy elongated body cut end and one slice showing white pith and seeds
bamboo-shoot|たけのこ|茶色の皮が何枚も重なる、とがった円すい形の芽。|かわ:part:外側に皮が重なっています。;さき:part:上の先がとがっています。|single bamboo shoot pointed cone overlapping brown fibrous sheaths green pointed tip
garlic-chives|にら|平たい緑の細長い葉が、白い根元から束になって広がる。|は:part:平たい緑の葉があります。;ねもと:part:下に白い根元があります。|bundle of garlic chives flat narrow green strap leaves white bases tied with plain straw no roots no label
shiso|しそ|縁がぎざぎざの大きな緑の葉に、深い筋が放射状に広がる。|は:part:大きな緑の葉です。;はみゃく:part:表面に葉脈があります。;ふち:part:葉の縁がぎざぎざです。|single green shiso perilla leaf broad pointed serrated heart oval shape deeply textured veins short stem
myoga|みょうが|桃色と薄茶色の細長い芽に、とがった皮が何枚も重なる。|かわ:part:外側に皮が重なります。;め:part:細長い芽です。|single Japanese myoga ginger flower bud pointed elongated pink tan layered bracts cut flat pale base
rakkyo|らっきょう|白い小さな涙形の球が三つ並び、上に細い緑の葉と下に根がある。|ね:part:下に細い根があります。;は:part:上に緑の葉があります。|three rakkyo scallion bulbs white teardrop bulbs slender green shoots fine root tufts no plate
radish-sprouts|かいわれだいこん|細い白い茎の上に二枚ずつ緑の葉が付き、黒い土から密に伸びる。|は:part:先に小さな緑の葉があります。;くき:part:細い白い茎があります。;つち:part:下に黒い土があります。|small tray of radish sprouts long white stems paired heart shaped green cotyledons growing from dark soil
bean-sprouts|もやし|白い細長い芽が何本も並び、先に小さな黄色い豆が残る。|ね:part:先に細い根があります。;まめ:part:先に黄色い豆が残っています。;め:part:白い芽が伸びています。|small pile white mung bean sprouts curled slender stems tiny pale yellow bean heads fine root tails
walnut|くるみ|深いしわのある茶色い硬い殻が割れ、中に複雑に折れた薄茶色の実が見える。|から:part:外側に硬い殻があります。;み:part:中に実があります。;しわ:part:殻に深いしわがあります。|one walnut whole wrinkled brown shell and one open half showing convoluted light tan kernel
peanut|らっかせい|網目のある薄茶色の殻がくびれ、中に赤茶色の粒が二つ入る。|ぴーなっつ:synonym:ピーナッツとも呼びます。;から:part:外側に網目の殻があります。;つぶ:part:中に粒が二つあります。|one peanut in tan net textured constricted shell cracked open exposing two reddish brown kernels loose kernel beside
almond|あーもんど|穴の多い薄茶色の殻が開き、中に先のとがった茶色い粒がある。|から:part:外側に殻があります。;み:part:中に茶色い実があります。;みぞ:part:実の表面に縦の溝があります。|one almond in split porous tan shell exposing long pointed brown ridged kernel two loose almond kernels beside
cashew|かしゅーなっつ|淡い黄色の太い粒が、曲がった三日月のような形で三つ並ぶ。|み:part:曲がった実があります。;くぼみ:part:内側がくぼんでいます。|three pale ivory cashew nuts distinctive kidney curved shapes softly ridged inner curves no shell no leaves
pistachio|ぴすたちお|薄茶色の殻が縦に開き、中に紫色の皮に包まれた緑の実が見える。|から:part:外側に割れた殻があります。;み:part:中に緑の実があります。;われめ:part:殻に割れ目があります。|three pistachios split cream shells green kernels with purple papery skin one fully shelled green kernel
cacao|かかお|黄色い大きな実を縦に割ると、白い房の中に茶色い豆が並ぶ。|まめ:part:中に豆が並びます。;かわ:part:外側に厚い皮があります。;み:part:黄色い実があります。|single yellow ridged cacao pod split lengthwise white pulp packed brown beans inside one whole half and one open half`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const life897Concepts:ConceptRow[]=rows.map(([k,r,d,e],i)=>[k,i<10?'marine':i<15?'insect':i===15?'marine':'plant',r,d,e?e.split(';'):[]]);
export const life897Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
