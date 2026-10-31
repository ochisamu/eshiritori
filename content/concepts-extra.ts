import type { ConceptRow } from "./concepts";
const lines = `rocket|vehicle|ろけっと|先端が赤い白い機体の下から、炎が噴き出す。|ほのお:part:機体の下から炎が噴き出しています。
train|vehicle|でんしゃ|パンタグラフのある緑の車両が、線路の上にある。|しゃりん:part:車体の下には車輪があります。
locomotive|vehicle|きかんしゃ|黒い機体の煙突から白い蒸気がのぼる。|じょうききかんしゃ:synonym:蒸気の力で走る機関車です。;えんとつ:part:機体の上に煙突があります。
bicycle|vehicle|じてんしゃ|二つの車輪、ハンドル、サドル、ペダルのある乗り物。|ぺだる:part:足で回すペダルがあります。;さどる:part:中央の小さな座面はサドルです。
motorcycle|vehicle|おーとばい|二つの車輪と大きなエンジンのある乗り物。|ばいく:synonym:エンジンで走るバイクです。;はんどる:part:手でにぎるハンドルがあります。
bus|vehicle|ばす|多くの窓が横に並ぶ、黄色い大きな車。|たいや:part:車体の下にタイヤがあります。
fire-engine|vehicle|しょうぼうしゃ|赤い大型車に、長いはしごとホースが付いている。|はしご:part:高いところへのびるはしごが載っています。;ほーす:part:放水用のホースが付いています。
ambulance|vehicle|きゅうきゅうしゃ|赤い表示灯と赤い帯のある、白い大型ワゴン車。|らんぷ:part:屋根に赤いランプがあります。
airplane|vehicle|ひこうき|左右に長い翼が伸びた、白い空の乗り物。|つばさ:part:機体の左右に翼があります。
helicopter|vehicle|へりこぷたー|丸い機体の上に、大きく広がった回転翼。|へり:synonym:ヘリコプターはヘリとも呼びます。;ぷろぺら:part:機体の上に回転するプロペラがあります。
passenger-ship|vehicle|きゃくせん|いくつもの階と窓がある、大きな白い船。|ふね:synonym:多くの人を乗せる船です。;えんとつ:part:船の上に煙突が立っています。
yacht|vehicle|よっと|小さな船の上に、白い三角の帆が広がる。|ほ:part:風を受ける白い帆が広がっています。
submarine|vehicle|せんすいかん|黄色い丸い機体に、潜望鏡と丸い窓。|せんぼうきょう:part:上にのびた管は潜望鏡です。
tractor|vehicle|とらくたー|後輪がとても大きい、畑をたがやす赤い車。|たいや:part:大きな後ろのタイヤが目立ちます。
snowplow|vehicle|じょせつしゃ|黄色い車の前に、雪を押す大きな板。|ゆき:part:車の前に雪が積もっています。
hotair-balloon|vehicle|ききゅう|赤と黄色の大きな丸い袋の下に、かごが下がる。|かご:part:人が乗るかごが下がっています。
hammer|tool|かなづち|金属の重い頭に、木の持ち手のある工具。|はんまー:synonym:たたくためのハンマーです。
saw|tool|のこぎり|ぎざぎざの金属の刃に、木の持ち手。|は:part:板を切るための刃が並んでいます。
screwdriver|tool|どらいばー|赤い持ち手から金属の細い棒が伸び、先が平たい。|ねじまわし:synonym:ねじを回すための、ねじ回しです。
wrench|tool|すぱな|両端が開いた、銀色の平たい工具。|れんち:synonym:ナットを回すレンチの一種です。
pliers|tool|ぺんち|赤い二本の持ち手と、物をつかむ金属の先。|にぎり:part:赤い二本の握りがあります。
shovel|tool|すこっぷ|幅広い金属の先に、長い木の持ち手。|しゃべる:synonym:土をすくうシャベルです。
rake|tool|くまで|長い柄の先に、櫛のように歯が並ぶ。|れーき:synonym:地面をならすレーキです。
broom|tool|ほうき|長い柄の先に、黄色い草の束が広がる。|
dustpan|tool|ちりとり|短い持ち手と、平らな口のある青い道具。|
bucket|tool|ばけつ|上が開いた青い容器に、弓形の持ち手。|
wateringcan|tool|じょうろ|緑の容器から、穴のある長い注ぎ口が伸びる。|そそぎぐち:part:水を注ぐ細長い口があります。
trowel|tool|こて|平らな三角の金属板に、短い木の持ち手。|
tape-measure|tool|めじゃー|黄色い細長い帯が、丸いケースから伸びる。目盛りだけがある。|まきじゃく:synonym:巻き取ってしまえる巻き尺です。
magnifier|tool|むしめがね|一枚の丸いレンズに、赤い短い持ち手。|るーぺ:synonym:ものを大きく見るルーペです。;れんず:part:丸く透き通る部分はレンズです。
compass|tool|ほういじしん|丸いケースに、赤と青の針がある。文字はない。|こんぱす:synonym:方角を調べるコンパスです。;はり:part:方角を示す二色の針があります。
binoculars|tool|そうがんきょう|二本の短い筒と二枚の丸いレンズがつながる。|れんず:part:正面に二枚のレンズがあります。
key|daily|かぎ|金色の丸い輪から、ぎざぎざの短い棒が伸びる。|きー:synonym:鍵はキーとも呼びます。
padlock|daily|なんきんじょう|金色の四角い本体に、銀色のU字形の金具。|じょうまえ:synonym:扉などを閉じる錠前です。
door|daily|どあ|木の長方形の板に、丸い金色の取っ手。|とびら:synonym:出入りする扉です。;どあのぶ:part:手で回すドアノブが付いています。
window|daily|まど|白い四角い枠の中に、青いガラスが四枚。|がらす:part:枠の中には透き通るガラスがあります。
mirror|daily|かがみ|楕円形の銀色の面に、ピンクの持ち手。|てかがみ:synonym:手で持って使う鏡です。
toothbrush|daily|はぶらし|青い細長い持ち手の先に、白い短い毛が並ぶ。|ぶらし:category:毛の並んだ小さなブラシです。
toothpaste|daily|はみがきこ|無地のチューブの先から、白いペーストが出る。|ちゅーぶ:part:中身を押し出すチューブです。
soap|daily|せっけん|水色の角の丸い固まりの周りに、白い泡。|そーぷ:synonym:せっけんはソープとも呼びます。;あわ:part:白い泡がふわりと付いています。
comb|daily|くし|ピンクの細長い板に、細い歯が一列に並ぶ。|こーむ:synonym:髪をとかすコームです。
towel|daily|たおる|ふんわりした水色の布が、二つ折りになっている。|
slippers|daily|すりっぱ|かかとの開いた黄色い室内履きが一足。|
shoes|daily|くつ|白いひもが結ばれた、赤い運動靴が一足。|すにーかー:synonym:ひもの付いたスニーカーです。;くつひも:part:白い靴ひもが結ばれています。
boots|daily|ながぐつ|ふくらはぎまで長さのある、黄色い雨用の靴。|れいんぶーつ:synonym:雨の日にはくレインブーツです。
socks|daily|くつした|赤と白のしま模様の、柔らかな足用の衣類。|そっくす:synonym:靴下はソックスとも呼びます。
bag|daily|かばん|茶色い四角い革の入れ物に、二本の持ち手。|ばっぐ:synonym:物を入れて持ち運ぶバッグです。
backpack|daily|りゅっく|二本の肩ひもとポケットが付いた、青いかばん。|りゅっくさっく:synonym:背中に背負うリュックサックです。;ぽけっと:part:前側に小さなポケットがあります。
bread-loaf|food|ぱん|焼き色の付いた四角い大きなパンと、切った一枚。|しょくぱん:synonym:四角く焼かれた食パンです。;みみ:part:外側の茶色い部分はパンの耳です。
baguette|food|ふらんすぱん|斜めの切れ目が付いた、細長い茶色のパン。|ばげっと:synonym:細長いフランスパンはバゲットです。
doughnut|food|どーなつ|真ん中に穴のある丸い菓子に、ピンクの砂糖がかかる。|あな:part:真ん中に丸い穴が開いています。
cake|food|けーき|いちごの載った、白いクリームの三角の菓子。|いちご:part:上に赤いいちごが載っています。;くりーむ:part:白いクリームが重なっています。
pudding|food|ぷりん|黄色くぷるんとした台形の菓子に、茶色いソース。|からめる:part:上に茶色いカラメルがかかっています。
icecream|food|あいすくりーむ|格子模様のコーンの上に、ピンクと白の丸い冷菓。|あいす:synonym:冷たいアイスがコーンに載っています。;こーん:part:下の格子模様の器はコーンです。
shaved-ice|food|かきごおり|青い器に山盛りの白い氷と、赤いシロップ。|こおり:part:細かく削った氷が積もっています。;しろっぷ:part:上に赤いシロップがかかっています。
sushi|food|すし|白いごはんの上に、赤い魚の切り身が載る。|にぎりずし:synonym:ごはんを握って魚を載せた握り寿司です。;さかな:part:赤い魚の切り身がごはんに載っています。
ramen|food|らーめん|丼の中に黄色い麺、肉、海苔、半分の卵。|めん:part:汁の中には細長い麺があります。;たまご:part:半分に切った卵が載っています。
soba|food|そば|竹のざるに、細長い茶色の麺が盛られる。|ざるそば:synonym:ざるに盛りつけた、ざるそばです。;ざる:part:麺の下には竹のざるがあります。
udon|food|うどん|丼の中に、太く白い麺と、ねぎ。|めん:part:太く白い麺が入っています。;ねぎ:part:緑の小口切りのねぎが載っています。
curry|food|かれーらいす|白い皿に、ごはんと茶色いルー、にんじん、じゃがいも。|かれー:synonym:ごはんにカレーがかかっています。;にんじん:part:オレンジ色のにんじんが入っています。
pizza|food|ぴざ|三角の切れ目がある丸い生地に、チーズとトマト。|ちーず:part:黄色いチーズが生地をおおっています。
hamburger|food|はんばーがー|丸いパンに、肉、緑の葉、チーズがはさまれる。|ばーがー:synonym:具をパンではさんだバーガーです。;ちーず:part:黄色いチーズがはさまっています。
fried-egg|food|めだまやき|白い輪の真ん中に、丸い黄色の黄身。|たまご:part:卵を焼いて作った料理です。;きみ:part:真ん中の黄色い部分は黄身です。
omelet|food|おむれつ|楕円形の黄色い料理の上に、赤いケチャップ。|けちゃっぷ:part:赤いケチャップがかかっています。`;
export const extraConcepts: ConceptRow[] = lines.split("\n").map((line) => {
  const [key, category, kana, description, extras] = line.split("|");
  return [key, category, kana, description, extras ? extras.split(";") : []];
});
export const extraPrompts = [
  "white rocket with red nose cone and exhaust flames; green electric train with pantograph on a short section of railway; black steam locomotive with chimney and white steam; red bicycle with pedals saddle and handlebar; blue motorcycle with engine and two wheels; yellow city bus with many windows; red fire engine with ladder and coiled fire hose; white ambulance van with red stripe and red roof light but no symbols or text; white passenger airplane with wings; red helicopter with large rotor blades; large white multi deck passenger ship with chimney; small yacht with white triangular sail; yellow submarine with periscope and round portholes; red farm tractor with large rear tires; yellow snowplow pushing small heap of snow with its front blade; red yellow hot air balloon with hanging wicker basket",
  "metal claw hammer with wooden handle; steel hand saw with serrated blade and wooden handle; red handled Phillips screwdriver; silver double open end wrench; red handled combination pliers; long handled metal garden shovel; wooden handled garden rake with metal teeth; straw broom visibly sweeping a small dust pile on floor; blue dustpan with short handle; blue bucket with curved handle; green watering can with long spout and rose head; triangular bricklaying trowel with wooden handle; yellow retractable tape measure extended with simple tick marks NO numbers; round magnifying glass with red handle; round magnetic compass with red blue needle NO letters; blue binoculars with two round lenses",
  "golden metal key with ring and jagged teeth; golden padlock with silver U shaped shackle; wooden door with golden round doorknob; white framed window with four blue glass panes; pink handled oval hand mirror; blue toothbrush with short white bristles; unlabelled toothpaste tube squeezing white paste; blue soap bar with white bubbles; pink hair comb with row of teeth; folded fluffy blue towel; pair of yellow slippers with open heels; pair of red sneakers with white tied shoelaces; pair of yellow tall rain boots; pair of red white striped socks; brown leather handbag with two handles; blue backpack with two shoulder straps and front pocket",
  "square loaf of bread and one cut slice; long French baguette with diagonal scoring; pink glazed ring doughnut with center hole; triangular strawberry shortcake with white cream and one red strawberry; yellow custard pudding with brown caramel top; pink and white icecream scoops in waffle cone; shaved ice mound in blue bowl with red syrup; two pieces of tuna nigiri sushi with red fish on white rice; ramen bowl with yellow noodles sliced pork black seaweed and halved egg; brown soba noodles on round bamboo draining mat; thick white udon noodles in bowl with sliced green scallions; curry rice on white plate with visible orange carrot and potato pieces; round pizza with triangular slice cuts melted yellow cheese and tomato; hamburger with bun meat green lettuce and yellow cheese; fried egg with round yellow yolk and white around it; yellow omelet on plate with red ketchup",
];
