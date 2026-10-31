// Editorial candidates. Runtime approval is assigned only after image review in review.json.
export type ConceptRow = [string, string, string, string, string[]];
import { extraConcepts } from "./concepts-extra";
import { expandedConcepts } from "./concepts-expanded";
import { sceneConcepts } from "./scene-batches";
import {kitchenSportsConcepts} from './kitchen-sports';
import {object321Concepts} from './objects-321';
import {home353Concepts} from './home-353';
import {office385Concepts} from './office-385';
import {animal417Concepts} from './animals-417';
import {food449Concepts} from './food-449';
import {meal481Concepts} from './meals-481';
import {vehicle513Concepts} from './vehicles-513';
import {people545Concepts} from './people-545';
import {electronic577Concepts} from './electronics-577';
import {nature609Concepts} from './nature-609';
import {play641Concepts} from './play-641';
import {tool673Concepts} from './tools-673';
import {creature705Concepts} from './creatures-705';
import {living737Concepts} from './living-737';
import {foods769Concepts} from './foods-769';
import {places801Concepts} from './places-801';
import {music833Concepts} from './music-833';
import {accessory865Concepts} from './accessories-865';
import {life897Concepts} from './life-897';
import {scenes929Concepts} from './scenes-929';
import {gear961Concepts} from './gear-961';
import {finale993Concepts} from './finale-993';
import {reserveConcepts} from './reserve-candidates';
import {playfulReadings} from './playful-readings';
export const concepts: ConceptRow[] = [
  [
    "apple",
    "food",
    "りんご",
    "赤い丸い実に、緑の葉が一枚。",
    ["くだもの:category:食べられる木の実なので、果物とも読めます。"],
  ],
  ["banana", "food", "ばなな", "黄色く曲がった細長い実が、ひと房。", []],
  [
    "squirrel",
    "animal",
    "りす",
    "大きな巻いた尾の小動物が、木の実を抱えている。",
    [
      "しっぽ:part:大きく巻いた尻尾が目立ちます。",
      "どんぐり:part:手に抱えているのは、どんぐりです。",
    ],
  ],
  [
    "sunflower",
    "plant",
    "ひまわり",
    "黄色い花びら、茶色い丸い中心、緑の茎。",
    [
      "はな:category:大きな黄色い花が咲いています。",
      "たね:part:花の中心に種が並んでいます。",
    ],
  ],
  [
    "tulip",
    "plant",
    "ちゅーりっぷ",
    "赤いカップ形の花と、細長い緑の葉。",
    ["はな:category:赤い花が一輪咲いています。"],
  ],
  [
    "watermelon",
    "food",
    "すいか",
    "緑の皮と赤い中身、黒い種の三角の一切れ。",
    ["たね:part:赤い実の中に黒い種が見えます。"],
  ],
  [
    "turtle",
    "animal",
    "かめ",
    "緑の小動物に、丸く模様のある硬い背中。",
    ["こうら:part:背中をおおうのは、硬い甲羅です。"],
  ],
  [
    "cherries",
    "food",
    "さくらんぼ",
    "二つの赤い小さな実が、茎でつながっている。",
    [
      "ちぇりー:synonym:さくらんぼはチェリーとも呼びます。",
      "くだもの:category:木になる果物です。",
    ],
  ],
  [
    "lemon",
    "food",
    "れもん",
    "先のとがった、黄色い楕円形の実。",
    ["かんきつ:category:皮のある柑橘類の果物です。"],
  ],
  [
    "rabbit",
    "animal",
    "うさぎ",
    "白い小動物の頭から、長い耳が二本。",
    ["みみ:part:長い耳がまっすぐ伸びています。"],
  ],
  [
    "scissors-paper",
    "tool",
    "はさみ",
    "二枚の刃が白い紙をはさんで切っている。",
    [
      "かみ:part:刃にはさまれているのは紙です。",
      "きる:action:二枚の刃で紙を切っています。",
    ],
  ],
  [
    "giraffe",
    "animal",
    "きりん",
    "茶色い斑点模様の、首がとても長い動物。",
    ["くび:part:とても長い首が目立ちます。"],
  ],
  [
    "coffee",
    "food",
    "こーひー",
    "白いカップに黒い飲み物。上には湯気。",
    [
      "かっぷ:part:飲み物が入っている器はカップです。",
      "ゆげ:part:温かい飲み物から湯気がのぼっています。",
    ],
  ],
  [
    "taxi",
    "vehicle",
    "たくしー",
    "屋根に無地の表示灯がある、黄色い乗用車。",
    [
      "くるま:synonym:四つの車輪のある車です。",
      "じどうしゃ:synonym:人を乗せて走る自動車です。",
    ],
  ],
  [
    "umbrella",
    "daily",
    "かさ",
    "青い布が放射状に広がり、曲がった持ち手が伸びる。",
    ["あまがさ:synonym:雨をよけるための雨傘です。"],
  ],
  [
    "candle",
    "daily",
    "ろうそく",
    "白い棒状のろうの先に、黄色い炎がともる。",
    [
      "きゃんどる:synonym:ろうそくはキャンドルとも呼びます。",
      "ほのお:part:芯の上で炎が燃えています。",
      "ひ:part:芯に火がともっています。",
    ],
  ],
  ["gorilla", "animal", "ごりら", "胸の広い大きな黒い動物が座っている。", []],
  [
    "trumpet",
    "music",
    "らっぱ",
    "三つの押しボタンと、広がった金色の管楽器。",
    [
      "とらんぺっと:synonym:金管楽器のトランペットです。",
      "がっき:category:音を鳴らす楽器です。",
    ],
  ],
  [
    "pineapple",
    "food",
    "ぱいなっぷる",
    "格子模様の黄色い実と、とがった緑の葉。",
    [
      "ぱいん:synonym:パイナップルはパインとも呼ばれます。",
      "くだもの:category:甘い果物です。",
    ],
  ],
  [
    "ruby",
    "nature",
    "るびー",
    "赤く透き通る、面でカットされた宝石。",
    ["ほうせき:category:赤い色の宝石です。"],
  ],
  [
    "beer",
    "food",
    "びーる",
    "取っ手のある透明なジョッキに、金色の液体と白い泡。",
    [
      "じょっき:part:取っ手のある大きな器はジョッキです。",
      "あわ:part:飲み物の上に白い泡がのっています。",
    ],
  ],
  [
    "car",
    "vehicle",
    "くるま",
    "屋根がなめらかな赤い乗用車。",
    [
      "じどうしゃ:synonym:四輪で走る自動車です。",
      "たいや:part:黒いゴム製のタイヤが見えます。",
    ],
  ],
  ["pillow", "daily", "まくら", "角の丸い、ふんわりした白い寝具。", []],
  [
    "camel",
    "animal",
    "らくだ",
    "背中に大きなこぶがある、茶色い動物。",
    ["こぶ:part:背中の大きなふくらみは、こぶです。"],
  ],
  [
    "ostrich",
    "animal",
    "だちょう",
    "長い脚と長い首を持つ、大きな黒白の鳥。",
    ["とり:category:羽のある大きな鳥です。"],
  ],
  [
    "cow",
    "animal",
    "うし",
    "白黒模様の体に角を持つ、牧場の動物。",
    ["つの:part:頭の上に二本の角が見えます。"],
  ],
  [
    "zebra",
    "animal",
    "しまうま",
    "白黒のしま模様におおわれた、馬に似た動物。",
    ["しま:part:体全体に白黒の縞があります。"],
  ],
  [
    "beans",
    "food",
    "まめ",
    "開いた緑のさやの中に、丸い緑の粒が三つ。",
    [
      "えだまめ:synonym:さやに入った緑の豆は枝豆です。",
      "さや:part:豆を包んでいるのは、さやです。",
    ],
  ],
  [
    "glasses",
    "daily",
    "めがね",
    "二枚の丸いレンズが、細いフレームでつながる。",
    ["れんず:part:目の前にくる二枚はレンズです。"],
  ],
  [
    "sleeping-cat",
    "animal",
    "ねこ",
    "目を閉じた三毛の小動物が、丸まって眠る。",
    [
      "ねる:action:目を閉じて体を丸め、寝ています。",
      "すいみん:scene:眠っている状態を睡眠といいます。",
    ],
  ],
  [
    "spinning-top",
    "play",
    "こま",
    "赤と青の木のおもちゃが、軸で立っている。",
    [],
  ],
  [
    "ball",
    "play",
    "まり",
    "赤、青、黄で塗り分けられた丸い玩具。",
    ["ぼーる:synonym:丸いボールです。"],
  ],
  ["dog", "animal", "いぬ", "茶色い耳の小動物が、座って舌を出している。", []],
  [
    "teddy",
    "play",
    "ぬいぐるみ",
    "縫い目のある、綿入りの茶色いくまのおもちゃ。",
    ["てでぃべあ:synonym:くまのぬいぐるみはテディベアともいいます。"],
  ],
  [
    "mandarin",
    "food",
    "みかん",
    "皮を半分むいた、オレンジ色の丸い実。",
    [
      "かんきつ:category:皮をむいて食べる柑橘類です。",
      "かわ:part:実の外側に、むいた皮が見えます。",
    ],
  ],
  [
    "crab",
    "animal",
    "かに",
    "二本の大きなはさみと、多くの脚を持つ赤い生き物。",
    ["はさみ:part:左右の大きな爪は、はさみと呼びます。"],
  ],
  [
    "rooster",
    "animal",
    "にわとり",
    "赤いとさか、白い羽、黄色いくちばしの鳥。",
    [
      "とさか:part:頭の上に赤いとさかがあります。",
      "とり:category:羽とくちばしのある鳥です。",
    ],
  ],
  [
    "tomato",
    "food",
    "とまと",
    "緑のへたが付いた、赤いつやつやの丸い実。",
    ["へた:part:実の上の緑の部分は、へたです。"],
  ],
  [
    "watch",
    "daily",
    "とけい",
    "ベルトの付いた、針のある丸い文字盤。数字はない。",
    [
      "うでどけい:synonym:腕に巻くベルト付きの腕時計です。",
      "はり:part:文字盤には時を示す針があります。",
    ],
  ],
  [
    "chair",
    "daily",
    "いす",
    "背もたれと四本の脚がある、木の腰掛け。",
    ["こしかけ:synonym:座るための腰掛けです。"],
  ],
  ["bell", "music", "すず", "金色の丸い金属に、切れ目と小さな持ち輪。", []],
  [
    "trousers",
    "daily",
    "ずぼん",
    "二本の脚を通す青い衣類。",
    ["ぱんつ:synonym:脚を通してはくパンツです。"],
  ],
  [
    "hat",
    "daily",
    "ぼうし",
    "つばの広い麦わらのかぶり物。",
    [
      "むぎわらぼうし:synonym:麦わらで編んだ帽子です。",
      "つば:part:帽子の周りに広がる部分は、つばです。",
    ],
  ],
  [
    "newspaper",
    "daily",
    "しんぶん",
    "灰色の無地の段組み模様の、折りたたんだ紙。",
    ["かみ:part:折りたたまれた薄い紙です。"],
  ],
  [
    "grapes",
    "food",
    "ぶどう",
    "紫の丸い実が、ひと房に集まっている。",
    ["くだもの:category:木になる果物です。"],
  ],
  [
    "sea",
    "place",
    "うみ",
    "青い水面に白い波、水平線。",
    ["なみ:part:青い水の上に白い波が立っています。"],
  ],
  [
    "earthworm",
    "animal",
    "みみず",
    "節がある細長い桃色の生き物が、土の上で曲がる。",
    [],
  ],
  [
    "skull",
    "nature",
    "ずがいこつ",
    "白い頭の骨に、大きな二つの目のくぼみ。",
    ["ほね:category:頭を形づくる骨です。"],
  ],
  [
    "blocks",
    "play",
    "つみき",
    "赤い三角、青い立方体、黄色い円柱の木の玩具。",
    ["ぶろっく:synonym:積んで遊ぶブロックです。"],
  ],
  [
    "fox",
    "animal",
    "きつね",
    "三角の耳と白い胸、ふさふさの尾のオレンジ色の動物。",
    ["しっぽ:part:先の白い大きな尻尾が見えます。"],
  ],
  ["leek", "plant", "ねぎ", "白い根元から、細長い緑の葉が伸びる。", []],
  [
    "guitar",
    "music",
    "ぎたー",
    "弦の張られた、くびれた木の胴、長いネック。",
    [
      "げん:part:胴からネックに弦が張られています。",
      "がっき:category:弦を鳴らす楽器です。",
    ],
  ],
  [
    "raccoon-dog",
    "animal",
    "たぬき",
    "目の周りが黒く、お腹が丸い茶色の動物。",
    [],
  ],
  [
    "mushroom",
    "plant",
    "きのこ",
    "赤いかさに白い点、白い太い軸。",
    ["かさ:part:上に広がった部分は、きのこの傘です。"],
  ],
  [
    "koala",
    "animal",
    "こあら",
    "丸い灰色の耳と黒い大きな鼻の動物が枝につかまる。",
    ["はな:part:顔の中央に黒い大きな鼻が見えます。"],
  ],
  [
    "radio",
    "daily",
    "らじお",
    "アンテナ、丸いダイヤル、スピーカーのある箱。",
    ["あんてな:part:電波を受けるアンテナが伸びています。"],
  ],
  [
    "riceball",
    "food",
    "おにぎり",
    "白い三角のごはんに、黒い海苔が巻かれる。",
    [
      "おむすび:synonym:おにぎりは、おむすびともいいます。",
      "のり:part:黒く巻かれているのは海苔です。",
    ],
  ],
  [
    "ribbon",
    "daily",
    "りぼん",
    "左右に輪を作って結ばれた、赤い細い布。",
    ["ちょうむすび:scene:左右に輪のある、蝶結びになっています。"],
  ],
  [
    "rowboat",
    "vehicle",
    "ぼーと",
    "二本のオールのある、小さな木の舟。",
    [
      "ふね:synonym:水に浮かぶ舟です。",
      "おーる:part:舟をこぐためのオールが見えます。",
    ],
  ],
  [
    "corn",
    "food",
    "とうもろこし",
    "緑の皮から、黄色い粒の並ぶ実がのぞく。",
    ["こーん:synonym:とうもろこしは、コーンとも呼びます。"],
  ],
  ["salt", "food", "しお", "青い小皿に、白い細かな結晶の山。", []],
  [
    "ladle",
    "tool",
    "おたま",
    "丸く深い金属の先に、長い赤い持ち手。",
    ["れーどる:synonym:おたまはレードルとも呼びます。"],
  ],
  [
    "match",
    "tool",
    "まっち",
    "赤い頭の細い木の棒の先に、小さな火がともる。",
    [
      "ひ:part:棒の先に火がともっています。",
      "ほのお:part:燃えている先に黄色い炎が見えます。",
    ],
  ],
  [
    "map",
    "play",
    "ちず",
    "折られた紙に道、川、赤い目印。文字はない。",
    [
      "かみ:part:地図が描かれているのは紙です。",
      "みち:part:紙の上に曲がった道が描かれています。",
    ],
  ],
  ...extraConcepts,
  ...expandedConcepts,
  ...sceneConcepts,
  ...kitchenSportsConcepts,
  ...object321Concepts,
  ...home353Concepts,
  ...office385Concepts,
  ...animal417Concepts,
  ...food449Concepts,
  ...meal481Concepts,
  ...vehicle513Concepts,
  ...people545Concepts,
  ...electronic577Concepts,
  ...nature609Concepts,
  ...play641Concepts,
  ...tool673Concepts,
  ...creature705Concepts,
  ...living737Concepts,
  ...foods769Concepts,
  ...places801Concepts,
  ...music833Concepts,
  ...accessory865Concepts,
  ...life897Concepts,
  ...scenes929Concepts,
  ...gear961Concepts,
  ...finale993Concepts,
  ...reserveConcepts,
];
for (const row of concepts) row[4] = [...row[4], ...(playfulReadings[row[0]] ?? [])];
export const picturePrompts = [
  "red apple with one green leaf; bunch of three yellow bananas; orange squirrel holding an acorn with a large curled tail; yellow sunflower with brown visible seed center and two green leaves",
  "red tulip with green stem and long leaves; cut watermelon wedge with black seeds; green turtle with patterned shell; two red cherries with joined stems",
  "yellow lemon with leaf; white rabbit with long pink ears; blue-handled scissors clearly cutting a white sheet of paper; yellow giraffe with brown spots and long neck",
  "steaming dark coffee in white cup and saucer; yellow passenger taxi with a blank roof light; open blue umbrella with curved handle; lit ivory candle with flame on small holder",
  "black friendly gorilla seated; golden brass trumpet with three valves; pineapple with spiky green crown; deep red faceted ruby gemstone",
  "foamy golden beer in clear handled glass mug; red passenger car without roof sign; soft ivory bed pillow; tan camel with two clear humps",
  "black and white ostrich with long neck and legs; black and white cow with two horns; zebra with bold black white stripes; opened green edamame pod with three round beans",
  "round blue eyeglasses with two clear lenses; calico cat curled asleep with eyes closed; red and blue spinning top upright; round red yellow blue toy ball",
  "friendly seated brown dog with tongue out; stitched brown teddy bear toy; half peeled orange mandarin fruit; red crab with two large pincers",
  "white rooster with red comb and yellow beak; round red tomato with green calyx; round analog wristwatch with strap and two clock hands but NO numbers; wooden chair with four legs and backrest",
  "golden round jingle bell with slit and small loop; blue trousers with two legs; wide brim straw hat; folded newspaper with abstract grey column blocks and NO text or letter shapes",
  "bunch of purple grapes with green leaf; blue sea with white breaking waves and simple horizon; curved pink earthworm with segments on brown soil; ivory human skull with eye sockets",
  "stack of red triangle blue cube yellow cylinder wooden building blocks; orange fox with white tipped fluffy tail; long white and green leek; wooden acoustic guitar with six clear strings",
  "round brown raccoon dog with dark eye mask; red cap mushroom with white dots and white stalk; grey koala holding tree branch; blue retro radio with telescopic antenna round dial and speaker",
  "triangle riceball with black seaweed wrap; red ribbon tied in bow; small wooden rowboat with two oars; yellow corn cob with partly peeled green husk",
  "small blue bowl containing a mound of white salt crystals; deep round metal soup ladle with long red handle; thin wooden match with red head burning with small flame; folded map paper with simple roads blue river and red location dot but NO letters",
];
