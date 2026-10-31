import type {ConceptRow} from './concepts';
const lines=`crocodile|わに|長い口とごつごつした背中、短い四本の脚のある緑色の動物。|きば:part:口にとがった牙があります。;しっぽ:part:後ろに長いしっぽがあります。;うろこ:part:背中にうろこがあります。|green crocodile side view long toothy snout four short legs thick scaled tail
snake|へび|長い緑色の体がとぐろを巻き、口から二つに分かれた赤い舌が出る。|した:part:口から舌を出しています。;とぐろ:part:体が輪を重ねています。;うろこ:part:体にうろこがあります。|green snake coiled into clear spiral raised head forked red tongue scale pattern
chameleon|かめれおん|枝をつかむ緑の動物に、丸い目とくるりと巻いたしっぽがある。|しっぽ:part:しっぽがくるりと巻いています。;め:part:大きな丸い目があります。;えだ:part:足で枝をつかんでいます。|green chameleon perched on brown branch bulging turret eye tightly curled tail grasping toes
iguana|いぐあな|首から背中にとがった突起が並び、のどの下に大きなひだがある緑の動物。|とさか:part:背中にとさか状の突起があります。;しっぽ:part:長いしっぽがあります。;つめ:part:足に爪があります。|green iguana side view prominent dorsal spines dewlap and long striped tail four clawed feet
gecko|やもり|薄茶色の小さな動物が、丸く広がった指先で壁に張り付く。|ゆび:part:指先が丸く広がっています。;しっぽ:part:後ろにしっぽがあります。;かべ:part:壁に張り付いています。|tan house gecko on small ivory wall patch spread toe pads big eyes long tail
frog|かえる|緑の丸い体に大きな目が二つあり、長い後ろ脚を曲げて座る。|め:part:頭に大きな目があります。;あし:part:長い後ろ脚があります。|green frog sitting front three quarter view large eyes long folded hind legs obvious webbed toes
tadpole|おたまじゃくし|黒い丸い頭の後ろに、薄く長いしっぽが伸びる。|しっぽ:part:後ろに長いしっぽがあります。;め:part:丸い頭に小さな目があります。|single black tadpole round body two small eyes long translucent swimming tail
newt|いもり|黒い体に短い四本の脚があり、体を曲げて赤いお腹が見える。|おなか:part:赤いお腹が見えています。;しっぽ:part:長いしっぽがあります。;あし:part:短い脚が四本あります。|Japanese fire belly newt curved black body with clearly exposed bright red belly four short toes legs long tail
axolotl|うーぱーるーぱー|淡い桃色の水の動物に、頭の横からふさふさした赤いえらが三本ずつ伸びる。|えら:part:頭の横に赤いえらがあります。;しっぽ:part:後ろに薄いしっぽがあります。;あし:part:短い脚があります。|pale pink axolotl six conspicuous feathery red external gills four small legs long finned tail
sea-lion|あしか|茶色の海の動物が、前びれで胸を高く支え、小さな耳がある。|ひれ:part:前に長いひれがあります。;みみ:part:頭の横に小さな耳があります。;ひげ:part:口の周りにひげがあります。|brown sea lion upright supported on long front flippers conspicuous external ear flaps whiskers
walrus|せいうち|大きな茶色の海の動物の口から、白い牙が二本長く下がる。|きば:part:口から長い牙が二本出ています。;ひげ:part:口の周りにひげがあります。;ひれ:part:体の横にひれがあります。|large brown walrus two very long white downward tusks bushy whiskers flippers
sea-otter|らっこ|茶色い動物が水にあおむけに浮き、お腹の上で貝を持つ。|かい:part:お腹の上に貝を持っています。;おなか:part:上を向いたお腹が見えます。;うく:action:水に浮かんでいます。|brown sea otter floating on back in small blue water patch holding large clam on belly
orca|しゃち|黒と白の大きな海の動物に、高い三角形の背びれと目の後ろの白い模様がある。|せびれ:part:背中に高いひれがあります。;おびれ:part:後ろに横へ広がる尾びれがあります。;もよう:part:目の後ろに白い模様があります。|black white orca killer whale tall triangular dorsal fin white eye patch horizontal tail flukes
shark|さめ|灰色の魚の口にとがった歯が並び、背中に大きな三角形のひれがある。|は:part:口にとがった歯があります。;せびれ:part:背中に大きなひれがあります。;えら:part:頭の後ろにえらの切れ目があります。|grey shark side view triangular dorsal fin open toothy mouth five gill slits long tail
stingray|えい|平たいひし形の体の後ろに、細長いしっぽが伸びる。|ひれ:part:体の両側に大きなひれがあります。;しっぽ:part:後ろに細長いしっぽがあります。|single blue spotted stingray top view flat diamond body broad winglike fins long thin tail
seahorse|たつのおとしご|馬の頭のような細い口と、巻いたしっぽを持つ黄色い海の生き物。|くち:part:前に細長い口があります。;しっぽ:part:しっぽが巻いています。;ひれ:part:背中に小さなひれがあります。|single golden yellow seahorse upright profile horse shaped head long snout curled tail small dorsal fin
jellyfish|くらげ|半透明の青い丸い傘の下から、細長い触手が下がる。|かさ:part:上が丸い傘の形です。;しょくしゅ:part:下に触手が下がっています。|single blue translucent jellyfish dome bell and long clearly separate wavy tentacles
starfish|ひとで|五本の太い腕が星の形に広がり、表面に小さな突起が並ぶ。|うで:part:中心から腕が五本広がります。;とっき:part:表面に小さな突起があります。|single orange five armed starfish dotted raised surface knobs
sea-urchin|うに|黒紫の丸い体から、細い針のようなとげが四方へ伸びる。|とげ:part:体から長いとげが伸びています。;はり:part:針のようなとげがあります。|single dark purple sea urchin round body long radiating pointed spines
shrimp|えび|赤い節のある体が曲がり、長いひげと扇の形の尾がある。|ひげ:part:頭から長いひげが伸びています。;しっぽ:part:後ろに扇の形のしっぽがあります。;から:part:体を殻が覆っています。|single red shrimp curved segmented shell very long antennae fan tail several small legs
hermit-crab|やどかり|茶色い巻き貝から、赤い小さなはさみと脚、目が出ている。|かいがら:part:背中に巻き貝の殻があります。;はさみ:part:前にはさみがあります。;あし:part:殻から脚が出ています。|single red hermit crab inside tan spiral seashell two claws stalked eyes small legs
clam|あさり|茶色の細かな筋のある二枚の殻が少し開き、中に淡い身が見える。|かいがら:part:外側に二枚の殻があります。;み:part:殻の間に身が見えます。|single partially open small Japanese littleneck clam two striped tan shells pale body inside no pearl
scallop|ほたて|扇の形で放射状の筋がある殻が開き、白い丸い貝柱が見える。|かいばしら:part:真ん中に白い貝柱があります。;かいがら:part:外側に扇の形の殻があります。|single open scallop fan shaped ridged shells white round adductor meat visible
sea-cucumber|なまこ|茶色い細長い丸みのある体に、小さな突起がたくさん並ぶ。|とっき:part:体の表面に突起があります。|single brown sea cucumber elongated soft rounded body covered with short conspicuous bumps
snail|かたつむり|茶色の渦巻きの殻を背負った小さな生き物に、長い目の柄が二本ある。|から:part:背中に渦巻きの殻があります。;つの:part:頭から角のような触角が伸びています。;うずまき:part:殻に渦巻きがあります。|single snail tan spiral shell soft grey foot two long upper eye stalks and two short lower feelers
slug|なめくじ|殻のない茶色い細長い体の前に、二本の長い角がある。|つの:part:頭から角のような触角が伸びています。;め:part:触角の先に目があります。|single brown slug smooth shell less long soft body two long eye stalks and short feelers
ant|あり|黒い体が三つの部分に分かれ、六本の脚と曲がった触角がある。|しょっかく:part:頭から触角が伸びています。;あし:part:体に六本の脚があります。;あご:part:頭の先にあごがあります。|single black ant side three quarter view three body segments six legs two elbowed antennae visible mandibles
grasshopper|ばった|緑の細長い体に、折り畳んだ長い後ろ脚と細い触角がある。|あし:part:後ろ脚が長く曲がっています。;しょっかく:part:頭に触角があります。;はね:part:背中に羽があります。|single green grasshopper profile very large angular folded jumping hind legs short antennae folded wings six legs
mantis|かまきり|緑の細長い体で、前脚を鎌の形に曲げ、三角形の頭を持つ。|かま:part:前脚が鎌のような形です。;あし:part:体に脚があります。;しょっかく:part:頭から細い触角が伸びています。|single green praying mantis triangular head two prominent folded spiked raptorial front legs four walking legs long antennae
cicada|せみ|茶色い太い体に、筋の見える透明な羽が重なっている。|はね:part:背中に透明な羽があります。;め:part:頭の横に大きな目があります。;あし:part:体から脚が伸びています。|single brown cicada three quarter view large transparent veined wings large side eyes six legs
stag-beetle|くわがた|黒い硬い体の頭から、内側にとげのある大きなあごが二本伸びる。|あご:part:頭に大きなあごがあります。;あし:part:体から六本の脚が伸びます。;しょっかく:part:頭に短い触角があります。|single black stag beetle top view huge paired antler like jaws six legs short antennae
rhinoceros-beetle|かぶとむし|茶色い硬い体の頭に、先が分かれた大きな角が立つ。|つの:part:頭に大きな角があります。;あし:part:体から六本の脚が伸びます。;はね:part:背中に硬い羽があります。|single brown Japanese rhinoceros beetle large forked head horn smaller thoracic horn six legs hard wing covers`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const creature705Concepts:ConceptRow[]=rows.map(([k,r,d,e],i)=>[k,i<16?'animal':i<24?'marine':'insect',r,d,e?e.split(';'):[]]);
export const creature705Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
