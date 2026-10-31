import type { ConceptRow } from "./concepts";
const lines = `cherry-tree|plant|さくら|薄い桃色の花がいっぱいに咲いた木。|はな:category:枝に桃色の花が咲いています。;き:part:太い幹と枝のある木です。
maple|plant|かえで|手のひらのような赤い葉の枝。|もみじ:synonym:赤く色づいたもみじの葉です。;はっぱ:part:赤い葉っぱが広がっています。
pine|plant|まつ|針のような緑の葉と、茶色い松ぼっくりの枝。|まつぼっくり:part:枝に茶色い松ぼっくりが付いています。
bamboo|plant|たけ|節のある緑の長い茎と、細い葉。|ふし:part:茎の途中に節が並んでいます。
cactus|plant|さぼてん|太く緑色の体に、短いとげがたくさんある。|とげ:part:表面から小さなとげが出ています。
rose|plant|ばら|赤い花びらが重なり、茎にとげがある。|はな:category:赤い花が咲いています。;とげ:part:緑の茎にとげがあります。
dandelion|plant|たんぽぽ|黄色い小さな花と、白い綿のような丸い穂。|わたげ:part:白いふわふわの綿毛が見えます。
lotus|plant|はす|丸く大きな葉の上に、桃色の花。|はな:category:桃色の花が開いています。
morning-glory|plant|あさがお|青いラッパ形の花が、つるの先に咲く。|つる:part:細いつるが巻きついています。;はな:category:青い花が咲いています。
hydrangea|plant|あじさい|青と紫の小さな花が、丸いかたまりになっている。|はな:category:小さな花が集まって咲いています。
lavender|plant|らべんだー|細い茎の先に、紫の小さな花が穂になって並ぶ。|はな:category:紫色の小さな花が咲いています。
acorn|plant|どんぐり|茶色い楕円形の木の実に、小さな帽子のような殻。|
chestnut|plant|くり|茶色いつやのある実と、開いたとげだらけの殻。|いが:part:外側のとげだらけの殻は、いがです。
strawberry|food|いちご|表面に小さな粒が並ぶ、赤い実と緑のへた。|へた:part:上に緑のへたが付いています。
eggplant|food|なす|つやのある紫色の長い実と、緑のへた。|へた:part:上に緑のへたが付いています。
carrot|food|にんじん|先が細いオレンジ色の根から、緑の葉が伸びる。|はっぱ:part:上に緑の葉っぱが生えています。
mountain|nature|やま|頂上に白い雪をかぶった、大きな三角の地形。|ゆき:part:頂上に白い雪が残っています。
volcano|nature|かざん|山の頂上から煙が上がり、赤い溶岩が流れる。|ふんか:action:山から煙と溶岩が噴き出す噴火です。;ようがん:part:山肌を赤い溶岩が流れています。
waterfall|nature|たき|崖の上から下へ、白い水が流れ落ちる。|みず:part:高いところから水が落ちています。
river|nature|かわ|二つの緑の岸の間を、青い水が曲がりながら流れる。|ながれ:scene:岸の間に水の流れが見えます。
pond|nature|いけ|草に囲まれた丸い水面に、蓮の葉が浮かぶ。|みなも:part:水の表面が広がっています。
moon|nature|つき|暗い夜空に、黄色い三日月。|みかづき:synonym:細く弧を描いた三日月です。
sun|nature|たいよう|オレンジ色の丸い中心から、黄色い光が広がる。|おひさま:synonym:太陽は、おひさまとも呼びます。
star|nature|ほし|暗い空に明るい黄色の五角の星。|
rainbow|nature|にじ|赤から紫までの色が、空に大きな弧を描く。|
cloud|nature|くも|青空に浮かぶ、白くて丸いかたまり。|しらくも:synonym:白い色の雲です。
rain|nature|あめ|灰色の雲から、青い水のしずくが降る。|しずく:part:雲の下に水のしずくがあります。
snow|nature|ゆき|空から白い結晶が舞い、地面に白く積もる。|ゆきげしき:scene:地面が白い雪でおおわれた雪景色です。
lightning|nature|かみなり|暗い雲から、黄色いぎざぎざの光が伸びる。|いなずま:synonym:雷の光は稲妻です。
quartz|nature|すいしょう|透明な六角のとがった結晶が、いくつも伸びる。|けっしょう:category:規則正しい形の結晶です。
rock|nature|いわ|でこぼこと角のある、大きな灰色のかたまり。|いし:synonym:大きく硬い石です。
seashell|nature|かいがら|扇の形に広がる、桃色の硬い殻。|ほたてがい:synonym:扇形の殻のホタテ貝です。
house|place|いえ|赤い三角の屋根、窓、玄関のある小さな建物。|おうち:synonym:人が暮らすおうちです。;やね:part:赤い三角の屋根が載っています。
castle|place|しろ|石の城壁と、とがった屋根の塔がある城。|おしろ:synonym:塔と城壁のあるお城です。;とう:part:建物の上に高い塔があります。
tower|place|たわー|赤い鉄骨が三角に組まれた、高い塔。|とう:synonym:細く高くそびえる塔です。
bridge|place|はし|川の両岸をつなぐ、赤いアーチ形の構造物。|かわ:part:橋の下に川が流れています。
lighthouse|place|とうだい|海辺の岩の上に、上部が光る白と赤の塔。|ひかり:part:塔の上から光が広がっています。
windmill|place|ふうしゃ|円すい屋根の建物の前に、大きな四枚の羽根。|はね:part:風を受ける四枚の羽根が広がっています。
well|place|いど|石を丸く積んだ穴の上に、屋根とつるした桶。|おけ:part:水をくむ桶がつるされています。
temple|place|てら|瓦屋根が大きく反った、木の仏教建築。|おてら:synonym:瓦屋根のあるお寺です。;やね:part:大きな瓦の屋根が広がっています。
shrine|place|じんじゃ|しめ縄のかかった、朱色と木の小さな神社の社殿。|しめなわ:part:入口の上にしめ縄があります。
torii|place|とりい|二本の朱色の柱を、二本の横木がつなぐ。|はしら:part:左右に二本の柱が立っています。
station|place|えき|小さなホームと屋根のそばに、線路と電車がある。|ほーむ:part:電車の横に乗り降りするホームがあります。;せんろ:part:電車の走る線路があります。
school|place|がっこう|校舎、中央の時計、小さな校庭。|こうしゃ:synonym:学校の教室が入る校舎です。;とけい:part:建物の中央に時計があります。
hospital|place|びょういん|正面に緑の十字の目印がある、白い建物。|
bakery|place|ぱんや|窓の向こうにパンが並び、パン形の無文字の看板。|べーかりー:synonym:パンを売るベーカリーです。;ぱん:part:窓にパンが並んでいます。
postbox|place|ぽすと|投入口と小さな扉のある、赤い郵便用の箱。|ゆうびんぽすと:synonym:手紙を投函する郵便ポストです。
tent|place|てんと|黄色い三角の布の小屋に、開いた入口。|
chef|people|こっく|白い高い帽子と白い制服の人物が、お玉を持つ。|ちょうりし:synonym:料理を作る調理師の姿です。;おたま:part:手にお玉を持っています。;ぼうし:part:頭に高い帽子をかぶっています。
doctor|people|いしゃ|白衣を着た人物の首に、聴診器が下がる。|いし:synonym:白衣と聴診器のある医師です。;はくい:part:白い上着は白衣です。;ちょうしんき:part:首に聴診器が下がっています。
firefighter|people|しょうぼうし|防火服とヘルメットの人物が、放水するホースを持つ。|ほーす:part:手に放水用のホースを持っています。;へるめっと:part:頭を守るヘルメットをかぶっています。
police|people|けいさつかん|青い制服と制帽の人物が、無地の手帳を持つ。|おまわりさん:synonym:制服を着たおまわりさんです。;せいぼう:part:制服に合わせた制帽をかぶっています。
farmer|people|のうか|麦わら帽子と作業着の人物が、にんじんの入ったかごを持つ。|にんじん:part:かごの中ににんじんがあります。;かご:part:収穫した野菜のかごを抱えています。
fisher|people|りょうし|黄色い雨具の人物が、魚の入った網を引き上げる。|あみ:part:魚を捕まえる網を持っています。;さかな:part:網の中に魚が見えます。
carpenter|people|だいく|道具ベルトをした人物が、木の板に金づちを当てる。|かなづち:part:手に金づちを持っています。;いた:part:目の前に木の板があります。
astronaut|people|うちゅうひこうし|丸いヘルメットと、白い宇宙服の人物が浮かぶ。|うちゅうふく:part:白い宇宙服を着ています。;へるめっと:part:丸く大きなヘルメットをかぶっています。
conductor|people|しきしゃ|黒い礼服の人物が、細い白い棒を振っている。|しきぼう:part:振っている細い棒は指揮棒です。
painter|people|えかき|ベレー帽の人物が、筆と色ののったパレットを持つ。|がか:synonym:絵を描く画家です。;ぱれっと:part:絵の具がのったパレットを持っています。;ふで:part:手に筆を持っています。
baker|people|ぱんしょくにん|白い帽子とエプロンの人物が、焼けたパンの天板を持つ。|ぱん:part:天板に焼けたパンが載っています。;えぷろん:part:服の上にエプロンを付けています。
magician|people|まじしゃん|黒いシルクハットの人物が、棒と帽子から出る白い鳩を見せる。|てじなし:synonym:手品を披露する手品師です。;はと:part:帽子から白い鳩が出ています。;しるくはっと:part:黒く背の高いシルクハットを持っています。
knight|people|きし|銀色のよろいを着た人物が、剣と盾を持つ。|よろい:part:金属製のよろいで体を守っています。;たて:part:片手に盾を持っています。;けん:part:もう片方の手に剣を持っています。
diver|people|だいばー|水中眼鏡、背中の空気ボンベ、足ひれの人物。|あしひれ:part:足に長い足ひれを付けています。;すいちゅうめがね:part:顔に水中眼鏡を付けています。
postperson|people|ゆうびんや|青い制帽の人物が、封筒の入ったかばんを持つ。|ふうとう:part:かばんの中に封筒があります。
photographer|people|かめらまん|人物が大きなレンズの付いたカメラを構える。|しゃしんか:synonym:写真を撮る写真家です。;かめら:part:両手でカメラを構えています。;とる:action:カメラを構えて写真を撮っています。
reading|action|どくしょ|座った人物が、開いた本のページを見ている。|よむ:action:本を開いて読んでいます。;ほん:part:手の中に開いた本があります。;しょもつ:part:読んでいる本は書物です。
fishing|action|つり|岸辺の人物が竿を握り、糸の先で魚を釣り上げる。|つる:action:糸の先で魚を釣っています。;つりざお:part:手に長い釣り竿を握っています。;さかな:part:糸の先に魚がかかっています。
cooking|action|りょうり|エプロンの人物が、フライパンの野菜を炒めている。|いためる:action:フライパンで野菜を炒めています。;ふらいぱん:part:火にかけたフライパンが見えます。;えぷろん:part:服の上にエプロンを付けています。
drawing|action|おえかき|子どもが紙に、クレヨンで花を描いている。|かく:action:紙に絵を描いています。;くれよん:part:手にクレヨンを持っています。;かみ:part:机の上に白い紙があります。
sleeping|action|すいみん|人物が布団に入り、まくらに頭を置いて目を閉じる。|ねる:action:布団に入って寝ています。;まくら:part:頭の下にまくらがあります。;ふとん:part:体に布団をかけています。
swimming|action|すいえい|人物が青い水面に腕を伸ばし、泳いでいる。|およぐ:action:腕を伸ばして水の中を泳いでいます。;みず:part:体の周りに青い水があります。
running|action|かけっこ|運動靴の二人が、片足を上げて前へ走っている。|はしる:action:腕を振り、前に走っています。;らんにんぐ:synonym:足を動かして走るランニングです。;うんどうぐつ:part:足に運動靴をはいています。
rope-jump|action|なわとび|人物が輪になる縄を回し、両足を上げて跳ぶ。|とぶ:action:縄をよけて跳んでいます。;なわ:part:体の周りを縄が回っています。
climbing|action|やまのぼり|リュックの人物が、山道の斜面を一歩ずつ登る。|とざん:synonym:山の斜面を登る登山です。;のぼる:action:坂道を上へ登っています。;りゅっく:part:背中にリュックを背負っています。
violin-playing|action|ばいおりん|人物が、あごに木の楽器を当てて弓で弦を弾く。|ひく:action:弓を動かして楽器を弾いています。;えんそう:action:楽器を鳴らして演奏しています。;ゆみ:part:手に弦をこする弓を持っています。
skiing|action|すきー|長い板を足に付けた人物が、雪の坂を滑る。|すべる:action:板を付けて雪の斜面を滑っています。;ゆき:part:足元に白い雪が積もっています。;すとっく:part:両手にストックを持っています。
ballet|action|ばれえ|チュチュとトウシューズの人物が、つま先立ちで踊る。|だんす:action:体を動かしてダンスをしています。;おどる:action:片足を伸ばして踊っています。;とぅしゅーず:part:足先にトウシューズをはいています。
sweeping|action|そうじ|人物がほうきで床のごみを、ちりとりに集める。|はく:action:ほうきで床を掃いています。;ほうき:part:手にほうきを持っています。;ちりとり:part:床にちりとりを置いています。
laundry|action|せんたく|人物が、泡のあるたらいでシャツを手洗いしている。|あらう:action:シャツを水で洗っています。;たらい:part:丸いたらいに水が入っています。;あわ:part:水の上に白い泡が浮かんでいます。
watering|action|みずやり|人物がじょうろを傾けて、鉢の花に水を注ぐ。|そそぐ:action:じょうろから水を注いでいます。;じょうろ:part:手にじょうろを持っています。;はな:category:鉢に花が咲いています。
sowing|action|たねまき|畑にしゃがんだ人物が、開いた手から茶色い種をまく。|まく:action:手から種をまいています。;たね:part:手元に小さな種が見えます。;はたけ:part:足元に畑の畝があります。
kite|play|たこ|赤いひし形の布に、長い尾と糸が付いている。|たこあげ:action:糸の先の凧が空に揚がっています。;いと:part:凧の下に長い糸が続いています。
origami|play|おりがみ|折り目のある青い紙が、長い首の鳥の形になっている。|おりづる:synonym:紙を折って作った折り鶴です。;つる:scene:紙が鶴の形に折られています。
swing|play|ぶらんこ|二本の鎖で、小さな板の座面がつるされている。|くさり:part:座面を二本の鎖でつるしています。
slide|play|すべりだい|階段を上ると、黄色い斜めの滑り面がある遊具。|かいだん:part:上にのぼる階段が付いています。
seesaw|play|しーそー|中央の支点で、両端に座面のある長い板が傾く。|いた:part:両端に長い板がのびています。
carousel|play|めりーごーらんど|丸い屋根の下に、棒で支えた小さな馬が並ぶ遊具。|かいてんもくば:synonym:馬に乗って回る回転木馬です。;うま:part:台の上に馬の形の座席が並んでいます。
ferris|play|かんらんしゃ|大きな輪の周りに、小さなかごがいくつも下がる。|ごんどら:part:人が乗るゴンドラが輪に付いています。
puzzle|play|ぱずる|でこぼこの形の小さな紙片が、絵を作るようにはまる。|じぐそーぱずる:synonym:小さなピースを組むジグソーパズルです。;ぴーす:part:ばらばらの一片はピースです。
dice|play|さいころ|白い立方体の面に、赤と黒の丸い点。|
cards|play|とらんぷ|白いカードに、赤いハートと黒いスペード。文字や数字はない。|かーど:synonym:絵柄のあるカードです。;はーと:part:赤いハートの絵柄が見えます。
kendama|play|けんだま|十字の木の持ち手に、糸で赤い玉がつながる。|たま:part:赤い丸い玉が付いています。;いと:part:玉と持ち手を糸がつないでいます。
daruma|play|だるま|赤く丸い体に、白い顔と黒いひげの縁起物。|ひげ:part:顔に黒いひげが描かれています。
doll|play|にんぎょう|赤い服と黄色い髪の、人の形のおもちゃ。|おにんぎょう:synonym:人の姿のお人形です。
bubbles|play|しゃぼんだま|輪の先から、虹色の透き通った丸い泡が浮かぶ。|あわ:part:空中に丸い泡が浮かんでいます。
fireworks|play|はなび|夜空に、赤や黄色の光が大きく丸く広がる。|うちあげはなび:synonym:夜空に開く打ち上げ花火です。;ひかり:part:空に色とりどりの光が広がります。
snowman|play|ゆきだるま|二つの白い雪玉に、にんじんの鼻と赤いマフラー。|ゆき:part:白い雪を丸めて作っています。;にんじん:part:鼻にはにんじんが付いています。;まふらー:part:首に赤いマフラーを巻いています。
elephant|animal|ぞう|長い鼻、大きな耳、灰色の太い体の動物。|はな:part:顔から長い鼻が伸びています。;みみ:part:顔の両側に大きな耳があります。
lion|animal|らいおん|顔の周りに大きな茶色いたてがみがある動物。|たてがみ:part:顔の周りにたてがみが広がっています。
tiger|animal|とら|オレンジ色の体に黒いしま模様がある動物。|しま:part:体に黒い縞模様があります。
bear|animal|くま|丸い小さな耳と、茶色い大きな体の動物。|
panda|animal|ぱんだ|白い体に黒い耳、黒い目の周りの模様がある動物。|
penguin|animal|ぺんぎん|黒い背中と白いお腹、短い黄色いくちばしの鳥。|とり:category:羽とくちばしのある鳥です。
seal|animal|あざらし|灰色の丸い体に、短いひれと口ひげの海の動物。|ひれ:part:体の横に短いひれがあります。;ひげ:part:鼻の横にひげがあります。
dolphin|animal|いるか|青灰色の滑らかな体と、細長いくちばし状の口。|ひれ:part:背中と体の横にひれがあります。
whale|animal|くじら|大きな青い体と広い尾を持ち、頭の上から潮を吹く。|しおふき:action:頭の上から潮を吹いています。;おびれ:part:尾の先に広い尾びれがあります。
octopus|animal|たこ|丸い赤い頭から、吸盤のある八本の腕が伸びる。|きゅうばん:part:腕に丸い吸盤が並んでいます。
squid|animal|いか|白い細長い体と、三角のひれ、たくさんの腕。|ひれ:part:体の上の左右にひれがあります。
goldfish|animal|きんぎょ|赤い丸い魚に、ひらひらした大きな尾。|さかな:category:ひれのある魚です。;おびれ:part:後ろに大きな尾びれが広がっています。
butterfly|animal|ちょうちょ|左右に鮮やかな模様の羽を広げた、小さな虫。|ちょう:synonym:模様の羽を持つ蝶です。;はね:part:左右に大きな羽が広がっています。
dragonfly|animal|とんぼ|細長い赤い体から、透き通る四枚の羽。|はね:part:左右に四枚の羽があります。
ladybug|animal|てんとうむし|赤い丸い背中に、黒い水玉のある小さな虫。|みずたま:part:背中に丸い水玉模様があります。
honeybee|animal|みつばち|黄色と黒のしま模様に、小さな羽のある虫。|はち:synonym:しま模様のある蜂です。;しま:part:体に黄色と黒の縞があります。
taiko|music|たいこ|木の胴の両面に白い皮を張った、和太鼓とばち。|わだいこ:synonym:木の胴を持つ和太鼓です。;ばち:part:たたくためのばちが置かれています。
piano|music|ぴあの|黒い大きな胴と、白黒の鍵盤が並ぶ楽器。|けんばん:part:白と黒の鍵盤が並んでいます。;がっき:category:鍵盤を押して音を出す楽器です。
xylophone|music|もっきん|長さの違う木の板が、二列に並ぶ楽器。|しろふぉん:synonym:木琴はシロフォンとも呼びます。;ばち:part:音を鳴らすばちがあります。
flute|music|ふるーと|銀色の細長い管に、丸いキーがいくつも並ぶ。|がっき:category:息を吹き込んで音を鳴らす楽器です。
accordion|music|あこーでぃおん|白黒の鍵盤と、ひだひだの胴を持つ楽器。|じゃばら:part:胴の部分は伸び縮みする蛇腹です。;けんばん:part:片側に白黒の鍵盤があります。
harmonica|music|はーもにか|銀色の細長い箱に、小さな穴が横一列に並ぶ。|がっき:category:息を吹き込んで音を鳴らす楽器です。
maracas|music|まらかす|赤い丸い頭と、木の持ち手が付いた道具が二本。|がっき:category:振って音を出す楽器です。
tambourine|music|たんばりん|丸い枠の周りに、金属の小さな二枚組の円盤。|がっき:category:たたいたり振ったりして音を鳴らす楽器です。
soccerball|sport|さっかーぼーる|黒い五角形と白い六角形でできた球。|ぼーる:synonym:サッカーで使うボールです。
baseballbat|sport|ばっと|手元が細く、先が太い木の棒。横に白い縫い目のある球。|やきゅう:scene:バットとボールを使う野球の道具です。;ぼーる:part:バットの横に白いボールがあります。
tennisracket|sport|らけっと|楕円形の枠に糸を張り、細長い持ち手が伸びる。|てにすらけっと:synonym:テニスで使うラケットです。;がっと:part:枠の中にガットが張られています。
bowling|sport|ぼうりんぐ|三つの穴のある黒い球と、赤い線の白いピン。|ぴん:part:白いピンが立っています。;ぼーる:part:指穴のあるボールが置かれています。
dumbbell|sport|だんべる|短い銀色の棒の両端に、黒い重りが付く。|てつあれい:synonym:手で持つ重りの鉄アレイです。
skateboard|sport|すけーとぼーど|両端が反った赤い板の下に、小さな車輪が四つ。|すけぼー:synonym:スケートボードはスケボーとも呼びます。;しゃりん:part:板の下に小さな車輪があります。
ice-skates|sport|すけーとぐつ|白いブーツの底に、銀色の細い刃が付いている。|ぶれーど:part:底の金属の刃はブレードです。;くつひも:part:白い靴ひもが結ばれています。
goggles|sport|ごーぐる|二つの小さな青いレンズを、ゴムのバンドがつなぐ。|すいちゅうめがね:synonym:水の中で使う水中眼鏡です。;れんず:part:左右に二枚のレンズがあります。`;
export const expandedConcepts: ConceptRow[] = lines.split("\n").map((line) => {
  const [k, c, r, d, e] = line.split("|");
  return [k, c, r, d, e ? e.split(";") : []];
});
export const expandedPrompts = [
  "pink cherry blossom tree with brown trunk; red maple leaves on twig; pine branch with needle leaves and one brown pinecone; tall green bamboo stalk with visible joints and leaves; green cactus with small spines; red rose on thorny green stem; yellow dandelion flower beside white round seed puff; pink lotus flower on round green leaf; blue morning glory trumpet flower and curling vine; cluster of blue purple hydrangea flowers; bundle of purple lavender flower spikes; brown acorn with cap; shiny brown chestnut beside open spiky burr; red strawberry with green calyx; glossy purple eggplant with green calyx; orange carrot root with green leaves",
  "triangular mountain with snowy summit; volcano actively erupting with grey smoke and red lava flowing down; waterfall dropping from rocky cliff; winding blue river between two green banks; small round pond with floating lotus leaves and grass rim; yellow crescent moon on small patch of dark night sky; round orange sun with yellow rays; single bright yellow star on small patch of dark sky; multicolor rainbow arc; fluffy white cloud on tiny blue sky patch; grey rain cloud with blue raindrops below; falling white snowflake crystals and small snowy ground; dark thundercloud with yellow lightning bolt; cluster of transparent hexagonal quartz crystals; large irregular grey rock; pink fan shaped scallop seashell",
  "small house with red triangular roof door and windows; medieval stone castle with towers and pointed roofs; tall red lattice radio tower; red arched bridge spanning small blue river; red white lighthouse shining light above rocky sea shore; traditional windmill building with four large sails; round stone well with pitched roof and hanging wooden bucket; traditional Japanese Buddhist wooden temple with curved tiled roof; small Japanese shrine building with visible sacred straw rope NO writing; red torii gate with two posts and two horizontal crossbeams; small railway station platform shelter with green train and railway tracks NO signs; simple school building with central clock dial NO numbers and small schoolyard; white hospital with simple GREEN cross emblem NO text; bakery storefront window displaying bread and plain bread-shaped sign NO letters; red rectangular mailbox with slot and small access door NO text; yellow camping tent pitched on small grass patch",
  "chef in tall white toque and white chef uniform holding metal ladle; doctor in white lab coat with stethoscope hanging from neck; firefighter in helmet and protective gear holding hose spraying water; police officer in blue uniform and peaked cap holding plain notebook NO insignia; farmer in straw hat and overalls carrying basket of carrots; fisherman in yellow raincoat lifting fishing net containing fish; carpenter in tool belt using hammer on wooden plank; astronaut in white spacesuit and round helmet floating with tiny stars; orchestra conductor in black formal coat holding white baton aloft; painter in beret holding paint palette and brush; bread baker in white cap and apron holding tray of baked bread; stage magician in black suit and top hat holding magic wand and white dove emerging from hat; medieval knight in silver armor holding sword and shield; scuba diver wearing diving mask oxygen tank and flippers; postal carrier with plain blue cap holding satchel full of envelopes NO logos; photographer holding camera to face with large visible lens",
  "person seated reading open book with eyes on pages; person fishing from riverbank with clearly visible long rod line and fish caught at end; apron wearing person visibly stir frying vegetables in pan on small stove; child drawing flower on white paper with crayon at small desk; person eyes closed asleep under quilt head on pillow; person swimming front stroke in small patch of blue water; two runners in sports shoes running forward arms swinging and one foot lifted; child jumping over rope with both feet lifted and rope visible all around; hiker with backpack climbing uphill on rocky mountain path; musician playing wooden violin held under chin with bow contacting strings; skier with two ski poles sliding on snow slope; ballet dancer in tutu and pointe shoes dancing en pointe; person sweeping floor dust into blue dustpan with straw broom; person hand washing shirt in round tub with white soap bubbles; person tilting green watering can with visible stream watering flowering plant in pot; person crouching sowing visible seeds by hand into small rowed vegetable bed",
  "red diamond shaped kite with long tail and visible string flying in sky; folded blue origami paper crane with clear paper creases; playground swing suspended by two metal chains; playground slide with staircase and yellow sloping slide; wooden playground seesaw with central fulcrum and two seats; small carousel with round canopy and horse figures mounted on poles; ferris wheel with small hanging gondolas; colorful jigsaw puzzle partly assembled and two loose pieces; white six sided dice with red and black round pips NO numbers; three playing cards with heart and spade suit symbols but NO letters or numbers; wooden kendama with red ball attached by string; red daruma doll with white face black eyebrows and beard NO characters; small doll with yellow hair and red dress; iridescent soap bubbles floating from handheld bubble wand; colorful red yellow fireworks bursting in tiny night sky patch; snowman made of two snowballs with orange carrot nose and red scarf",
  "grey elephant with long trunk and large ears; golden lion with large brown mane; orange tiger with black stripes; large brown bear with small round ears; black white giant panda; black white penguin with yellow beak; rounded grey seal with small flippers and whiskers; blue grey dolphin with long beak and dorsal fin; large blue whale with wide tail and water spout; red octopus with eight arms and visible suction cups; white squid with triangular fins and many tentacles; red fancy goldfish with flowing tail; colorful butterfly with wings spread; red dragonfly with four transparent wings; red ladybug with black spots; yellow black honeybee with small wings",
  "traditional Japanese wooden barrel taiko drum with white skins and pair of wooden drumsticks; black grand piano with white black keyboard; wooden xylophone with different length bars and two mallets; silver transverse flute with circular keys; red accordion with white black keyboard and clearly pleated bellows; silver rectangular harmonica with row of holes; pair of red maracas with wooden handles; round tambourine with pairs of metal jingles; black white soccer ball with pentagon and hexagon panels; wooden baseball bat beside white baseball with red stitching; tennis racket with clear string grid; black bowling ball with three finger holes beside white pins with red stripe; silver handled dumbbell with black weights on both ends; red skateboard with four wheels; pair of white ice skating boots with silver blades and tied laces; blue swimming goggles with two small lenses and rubber strap",
];
