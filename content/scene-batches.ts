import type { ConceptRow } from "./concepts";
// Explicitly planned scenes. These remain draft until the generated pixels are reviewed.
const lines = `brushing-teeth|はみがき|洗面台の前の人物が、歯にブラシを当てている。|みがく:action:ブラシを動かして歯を磨いています。;はぶらし:part:口元に歯ブラシを当てています。;かがみ:part:洗面台の上に鏡があります。|person brushing teeth with blue toothbrush at small sink with mirror
washing-face|せんがん|洗面台にかがんだ人物が、両手の水を顔にかける。|あらう:action:水をすくって顔を洗っています。;みず:part:顔に水をかけています。;せんめんだい:part:前に洗面台があります。|person cupping water in hands and washing face above small sink
bathing|にゅうよく|浴槽から頭と肩だけを出した人物の周りに、湯気。|おふろ:part:人物がお風呂に入っています。;ゆげ:part:温かい湯から湯気がのぼっています。;たおる:part:浴槽のふちに畳んだタオルがあります。|person bathing in tub visible only head and shoulders above opaque water with clear steam and folded towel on tub edge, no nudity
combing-hair|ぶらっしんぐ|長い髪の人物が、ピンクのくしを髪に通している。|とかす:action:くしで髪をとかしています。;くし:part:手にくしを持っています。;かみのけ:part:長い髪の毛を整えています。|person combing long hair with pink comb, clear hand and comb touching hair
drying-hair|どらいやー|人物が、風の線の出る機械を濡れた髪に向ける。|かわかす:action:温風で髪を乾かしています。;かみのけ:part:風を髪の毛に当てています。|person drying damp hair with handheld blue hairdryer, short visible airflow lines
dressing|きがえ|人物が白い服の上に、青い上着を羽織っている。|きる:action:シャツに腕を通して着ています。;しゃつ:part:上着の内側に白いシャツが見えます。|fully clothed child putting on blue button up shirt over white undershirt, fingers fastening clearly visible buttons
tying-shoelaces|ひもむすび|座った人物が、赤い靴のひもを両手で結んでいる。|むすぶ:action:両手で靴ひもを結んでいます。;くつひも:part:白い靴ひもを結んでいます。;くつ:part:足元に赤い靴があります。|seated person tying a white shoelace bow on red sneaker, clear hands and laces
making-bed|べっどめいきんぐ|人物がベッドに白いシーツを広げ、まくらを整える。|しーつ:part:ベッドに白いシーツを広げています。;まくら:part:ベッドの頭側にまくらがあります。;ととのえる:action:寝具をきれいに整えています。|person making small bed spreading white sheet with pillow clearly on bed
ironing|あいろんがけ|人物が台の上のシャツに、熱い道具を押し当てる。|あいろん:part:手にアイロンを持っています。;のばす:action:アイロンでシャツのしわを伸ばしています。;しゃつ:part:台の上にシャツが広がっています。|person ironing wrinkled shirt on small ironing board with clearly visible iron and tiny steam curl
vacuuming|そうじきがけ|人物がホースのある機械で、床のごみを吸い込む。|そうじき:part:ホースの付いた掃除機を使っています。;すう:action:床のごみを吸っています。;ほこり:part:吸い込み口の前にほこりが見えます。|person vacuuming floor with red canister vacuum cleaner hose and dust visibly near nozzle
mopping|もっぷがけ|人物が長い柄の先の白い房で、濡れた床を拭く。|もっぷ:part:床にモップを当てています。;ふく:action:モップで床を拭いています。;ゆか:part:足元に床が広がっています。|person mopping small patch of wet tiled floor with string mop and blue bucket
window-cleaning|まどふき|人物が四角い窓に、白い布を押し当てている。|まど:part:四角い窓を拭いています。;ぞうきん:part:手に雑巾を持っています。;ふく:action:布でガラスを拭いています。|person cleaning a four pane window with white cleaning cloth, hand visibly touching glass
dishwashing|さらあらい|人物が泡のある流しで、丸い皿をスポンジで洗う。|あらう:action:皿を水で洗っています。;すぽんじ:part:手に黄色いスポンジを持っています。;さら:part:丸い白い皿を洗っています。|person washing round white plate with yellow sponge and visible soap bubbles over small kitchen sink
hanging-laundry|ものほし|人物が白いシャツをロープに掛け、ばさみで留める。|ほす:action:濡れた衣類をロープに干しています。;せんたくばさみ:part:シャツを洗濯ばさみで留めています。;しゃつ:part:白いシャツが掛かっています。|person hanging white shirt on horizontal clothesline with two clearly visible clothespins
folding-towels|たおるたたみ|人物が机の上で、青いタオルを半分に折っている。|たたむ:action:布を両手で畳んでいます。;たおる:part:青いタオルを畳んでいます。|person folding blue towel in half on small table with a neatly folded towel beside it
dusting|はたきがけ|人物が棚の上を、羽のある道具で払い、ほこりが舞う。|はたき:part:手に羽のはたきを持っています。;たな:part:木の棚の上を掃除しています。;ほこり:part:棚の上にほこりが舞っています。|person dusting wooden shelf with feather duster and small visible dust cloud
knitting|あみもの|人物が二本の棒と毛糸で、赤いマフラーを編んでいる。|あむ:action:棒を使って毛糸を編んでいます。;けいと:part:赤い毛糸の玉があります。;あみぼう:part:二本の編み棒を使っています。|person knitting red scarf with two knitting needles and clear red yarn ball
sewing|さいほう|人物が針と糸で、布の縁を縫っている。|ぬう:action:針で布を縫っています。;はり:part:手元に細い針があります。;いと:part:針から糸が続いています。|person hand sewing edge of blue fabric, visible needle and thread spool
embroidery|ししゅう|丸い枠に張った布へ、針で赤い花の模様を作る手元。|さす:action:布に針を刺しています。;ししゅうわく:part:布を丸い刺繍枠で張っています。|close up hands embroidering red flower on cloth held in round wooden embroidery hoop, clear needle and thread
paper-airplane|かみひこうき|白い紙を折った、細い先端と左右の翼のある形。|ひこうき:synonym:紙で作った飛行機です。;おりがみ:scene:紙を折る折り紙でできています。;つばさ:part:左右に三角の翼があります。|folded white paper airplane with sharply visible folds and two wings
paper-boat|かみぶね|青い紙を折り、中央がとがった小さな舟の形。|ふね:synonym:紙で作った舟です。;おりがみ:scene:紙を折る折り紙でできています。;へさき:part:前側にとがった舳先があります。|blue folded origami paper boat with clear paper folds and pointed bow
paper-cutting|きりえ|人物が紙をはさみで切り、花形の切り抜きを作る。|きる:action:はさみで紙を切っています。;かみ:part:花の形になる紙があります。;はさみ:part:手にはさみを持っています。|person making paper cut art using scissors, clearly cutting red paper flower silhouette with finished paper cut flower beside it
collage|はりえ|人物が色紙の小さな三角を、のりで台紙に貼る。|はる:action:色紙を台紙に貼っています。;のり:part:手元に無地ののり容器があります。;かみ:part:三角の色紙が並んでいます。|person making colorful paper collage, hand gluing small colored triangle onto white backing paper with plain glue pot beside
clay-play|ねんどあそび|子どもが柔らかい茶色い固まりを、両手でこねる。|こねる:action:両手で粘土をこねています。;ねんど:part:茶色い柔らかな粘土が机にあります。|child kneading soft brown modeling clay with both hands at small table
pottery|とうげい|人物が回転台の上の、ぬれた茶色い壺を形作る。|ろくろ:part:壺の下に回転するろくろがあります。;つぼ:part:茶色い壺を作っています。;つくる:action:手で壺の形を作っています。|potter shaping wet brown clay pot on clearly visible pottery wheel, both hands touching pot
woodworking|もっこう|人物が作業台の木の板を、のこぎりで切っている。|のこぎり:part:手にのこぎりを持っています。;きる:action:木の板を切っています。;いた:part:作業台に板が載っています。|person sawing wooden plank on workbench with hand saw clearly contacting wood and tiny sawdust pile
tailor-measuring|さいすん|人物が長い黄色い帯で、机の上の布の長さを測る。|はかる:action:布に巻き尺を当てて測っています。;めじゃー:part:黄色いメジャーを使っています。;ぬの:part:机に布が広がっています。|tailor measuring blue fabric on table with extended yellow measuring tape, tick marks only NO numbers
glassblowing|がらすざいく|人物が長い管に口を当て、先の赤いガラスを膨らませる。|ふく:action:管に息を吹いています。;がらす:part:管の先に溶けた赤いガラスがあります。;ふきざお:part:長い吹き竿を持っています。|glass artisan blowing through long metal pipe with small glowing red glass bulb at far end, clear side view
basketweaving|かごあみ|人物が細い茶色い帯を交差させ、かごを編む。|あむ:action:細い帯を交差させて編んでいます。;かご:part:編みかけのかごがあります。|artisan weaving wicker basket with clearly visible interlaced bamboo strips and partially made basket
pruning|せんてい|人物が小さな木の伸びた枝を、はさみで切る。|きる:action:余分な枝を切っています。;はさみ:part:手に剪定ばさみを持っています。;ぼんさい:part:鉢に小さな盆栽があります。|person pruning tiny bonsai tree in pot with pruning shears clearly touching an overgrown twig
shoemaking|くつづくり|職人が茶色い革の靴を、太い針と糸で縫う。|くつ:part:作りかけの革靴があります。;ぬう:action:革の縁を針で縫っています。;かわ:part:靴の材料の茶色い革があります。|shoemaker hand stitching brown leather shoe with needle and thread, a leather piece on table
watchrepair|とけいしゅうり|人物が裏を開いた時計の、小さな歯車をつまむ。|とけい:part:机に裏ぶたを開いた時計があります。;ぴんせっと:part:細いピンセットで部品をつまんでいます。;はぐるま:part:時計の中に歯車があります。|watchmaker repairing opened mechanical watch with tweezers, three clearly visible brass gears inside watch, NO letters NO numerals`;
const rows = lines.split("\n").map((line) => line.split("|"));
export const sceneConcepts: ConceptRow[] = rows.map(
  ([key, kana, description, extras], i) => [
    key,
    i < 16 ? "housework" : "craft",
    kana,
    description,
    extras ? extras.split(";") : [],
  ],
);
export const scenePrompts = Array.from(
  { length: Math.ceil(rows.length / 16) },
  (_, i) =>
    rows
      .slice(i * 16, i * 16 + 16)
      .map((r) => r[4])
      .join("; "),
);
