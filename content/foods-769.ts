import type {ConceptRow} from './concepts';
const lines=`sakura-mochi|さくらもち|桃色の丸い餅を、筋のある茶色い葉が包む。|もち:part:中に桃色の餅があります。;は:part:外側を葉が包んでいます。|single pink sakura mochi rice cake wrapped partly in brown cherry leaf clear leaf veins
daifuku|だいふく|白い丸い餅が半分に切られ、中に濃い小豆色のあんが見える。|もち:part:外側に白い餅があります。;あんこ:part:中にあんこが入っています。|single white daifuku rice cake cut in half dark red bean filling clearly visible one whole and one half together
dorayaki|どらやき|茶色い丸い生地が二枚重なり、間に小豆色のあんが厚く挟まる。|あんこ:part:間にあんこが挟まっています。;きじ:part:上下に丸い生地があります。|single dorayaki two golden round pancake discs thick dark red bean filling visible between
taiyaki|たいやき|魚の形の茶色い菓子に、目とひれ、格子のうろこの模様がある。|ひれ:part:魚の形にひれがあります。;うろこ:part:表面にうろこの模様があります。;しっぽ:part:後ろに魚の尾があります。|single golden fish shaped taiyaki pastry embossed eye fins scale lattice tail no text
manju|まんじゅう|薄茶色の丸い菓子を割ると、中に黒っぽいあんが詰まっている。|あんこ:part:中にあんこがあります。;かわ:part:外側に薄茶色の皮があります。|single golden brown steamed manju bun broken into two halves dark red bean paste inside smooth brown skin
dango|だんご|竹の串に、桃色・白・緑の丸い餅が三つ並ぶ。|くし:part:餅に串が通っています。;もち:part:丸い餅が並んでいます。|single skewer of three round Japanese dango pink white green on bamboo stick
yokan|ようかん|濃い小豆色の四角い菓子が、竹の葉の上で厚く切り分けられる。|きれ:part:切り分けた一切れがあります。;は:part:下に緑の葉があります。|dark red bean yokan jelly rectangular block with two thick slices on simple green bamboo leaf no knife
senbei|せんべい|茶色い丸い菓子の表面に細かなふくらみがあり、真ん中に黒い海苔が貼られる。|のり:part:表面に黒い海苔があります。;ひび:part:表面に小さなひびがあります。|single round golden rice cracker senbei subtle cracked bubbled surface one rectangular black nori seaweed patch
castella|かすてら|上と下が茶色く、中が黄色い四角い菓子が厚く切られる。|きじ:part:黄色い生地が見えます。;やきめ:part:上に茶色い焼き目があります。|single thick rectangular slice of castella sponge cake yellow airy interior flat brown top and thin brown bottom
konpeito|こんぺいとう|桃色・黄・緑の小さな丸い菓子に、とがった突起が付く。|とっき:part:小さな粒に突起があります。;つぶ:part:色の違う粒が集まっています。|small group of pink yellow mint green Japanese konpeito sugar candies each round with pronounced short conical points
candy|あめ|赤と黄色の縞の丸い菓子が、両端をねじった透明な包み紙に入る。|つつみがみ:part:周りに包み紙があります。;しま:part:菓子に縞があります。|single red yellow striped round candy in transparent cellophane wrapper both ends twisted no text
chocolate|ちょこれーと|茶色い厚い板に、小さな四角が格子の形に並ぶ。|いた:part:板の形のチョコレートです。;みぞ:part:表面に区切りの溝があります。|single plain brown chocolate bar divided into raised rectangular squares one corner broken off no foil no brand
gummy|ぐみ|赤い熊の形と黄色い輪の形の、半透明の小さな菓子が並ぶ。|くま:part:熊の形の菓子があります。;わ:part:輪の形の菓子があります。|small group translucent gummy candies one red bear one yellow ring one green soft cube no text
biscuit|びすけっと|薄茶色の平たい丸い菓子に、小さな穴と波形の縁がある。|あな:part:表面に小さな穴があります。;ふち:part:丸い縁が波形です。|single round golden plain biscuit scalloped edge small rows of ventilation holes no lettering
popcorn|ぽっぷこーん|赤と白の縞の箱から、白くふくらんだ小さな粒があふれる。|はこ:part:下に縞模様の箱があります。;つぶ:part:白い粒がたくさんあります。|red white striped open popcorn carton overflowing irregular white popped corn kernels no text
potato-chips|ぽてとちっぷす|青い開いた袋から、薄い黄色の丸く波打つかけらが数枚出る。|ふくろ:part:下に青い袋があります。;ちっぷす:synonym:薄く揚げたチップスです。|single plain blue open potato chip bag several golden thin curved crisps spilling out no logo no text
gyoza|ぎょうざ|半月の形の薄茶色い料理が皿に並び、上の縁に細かなひだがある。|ひだ:part:上の縁にひだがあります。;かわ:part:周りを薄い皮が包んでいます。;さら:part:下に皿があります。|three pan fried gyoza crescent dumplings with pleated top edges golden seared undersides on small white plate
shumai|しゅうまい|白い薄皮の小さな円筒が三つ並び、上に緑の丸い豆が乗る。|かわ:part:周りを薄い皮が包みます。;まめ:part:上に緑の豆があります。;さら:part:下に皿があります。|three open topped white shumai dumplings cylindrical pleated wrappers meat filling and green pea each on small plate
spring-roll|はるまき|きつね色の細長い筒が二本あり、一方の切り口に野菜が見える。|かわ:part:外側に揚げた薄い皮があります。;やさい:part:切り口に野菜があります。;きりくち:part:一本の端を切ってあります。|two golden crispy spring rolls one sliced diagonally clearly exposing shredded carrot cabbage filling on small plate
nikuman|にくまん|白くふくらんだ丸い包みにひだが集まり、割れた部分から茶色い具が見える。|かわ:part:白くふくらんだ皮があります。;ひだ:part:上にひだが集まっています。;ぐ:part:割れたところに具が見えます。|single white steamed meat bun gathered pleats on top broken side showing brown minced filling small square paper under bun
chimaki|ちまき|緑の葉を三角に巻いてひもで結んだ包みが、一部開いて米が見える。|は:part:外側を緑の葉が包みます。;ひも:part:周りをひもで結んでいます。;こめ:part:中に米が見えます。|single triangular bamboo leaf wrapped rice dumpling chimaki tied with straw string one leaf corner peeled open showing sticky rice grains
gratin|ぐらたん|取っ手のある白い皿に、表面をこんがり焼いたクリーム色の料理が入る。|やきめ:part:上に茶色い焼き目があります。;さら:part:下に取っ手のある皿があります。;とって:part:皿の左右に取っ手があります。|single oval white two handled gratin baking dish creamy macaroni visible at edge golden browned melted cheese crust no garnish text
lasagna|らざにあ|四角く切った料理の横に、薄い生地と赤いソースの層が何段も見える。|そう:part:横から何段もの層が見えます。;ちーず:part:上にとけたチーズがあります。;さら:part:下に白い皿があります。|single square lasagna portion on white plate side cut view clearly showing alternating flat pasta sheets red tomato sauce and cream layers melted cheese top
paella|ぱえりあ|両側に取っ手のある浅い鍋に、黄色い米と赤いえび、黒い貝が並ぶ。|えび:part:上に赤いえびがあります。;こめ:part:鍋に米があります。;なべ:part:浅い鍋に入っています。|single round shallow paella pan two handles golden yellow rice red prawns black mussel shells green peas
bibimbap|びびんば|黒い器の中で白いご飯の上に野菜が色ごとに並び、中央に目玉焼きがある。|めだまやき:part:中央に目玉焼きがあります。;やさい:part:周りに野菜が並びます。;うつわ:part:下に黒い器があります。|single black stone bowl bibimbap white rice beneath distinct sections carrot greens mushrooms bean sprouts and central fried egg
ochazuke|おちゃづけ|白い茶碗のご飯に薄い緑の汁がかかり、海苔と小さな粒が散る。|ごはん:part:茶碗にご飯があります。;のり:part:上に細い海苔があります。;ちゃわん:part:下に茶碗があります。|single white rice bowl ochazuke visible white rice in pale green tea broth shredded black nori and golden rice cracker pearls on top
tamagoyaki|たまごやき|黄色い四角い料理が切り分けられ、切り口に巻いた層が見える。|たまご:part:黄色い卵の料理です。;きりくち:part:切り口に巻いた層が見えます。;そう:part:中に巻いた層があります。|three thick rectangular Japanese rolled omelette tamagoyaki slices bright yellow spiral layered cut faces on small plate
chawanmushi|ちゃわんむし|ふたを横に置いた小さな茶碗に、黄色い柔らかい料理とえび、しいたけが見える。|えび:part:上に赤いえびがあります。;しいたけ:part:上に茶色いしいたけがあります。;ふた:part:横にふたがあります。|single small lidded ceramic chawanmushi cup lid beside smooth yellow egg custard topped one red shrimp brown shiitake slice green leaf
bento|べんとう|四角い箱の仕切りに、ご飯、卵焼き、魚、野菜がそれぞれ入る。|ごはん:part:箱に白いご飯があります。;はこ:part:四角い箱に入っています。;しきり:part:箱の中に仕切りがあります。|single open rectangular Japanese bento box clear compartments white rice rolled omelette grilled fish broccoli carrot no lid no text
sandwich|さんどいっち|三角形に切ったパンの間に、緑の葉と赤い輪切り、黄色い具が挟まる。|ぱん:part:上下にパンがあります。;やさい:part:間に野菜があります。;みみ:part:パンの縁に茶色い耳があります。|two triangular sandwich halves white bread brown crust visible lettuce tomato cheese filling
roast-chicken|ろーすとちきん|きつね色の丸い胴と二本の脚のある料理が、白い大皿に乗る。|もも:part:横に二本のももがあります。;はね:part:両側に焼いた羽の部分があります。;さら:part:下に白い大皿があります。|single whole golden brown roast chicken on white platter clear two drumsticks two tucked wings no head
cheese-fondue|ちーずふぉんでゅ|赤い鍋の中で黄色い液がとけ、長い串の先のパンが浸る。|ちーず:part:鍋にとけたチーズがあります。;くし:part:長い串があります。;ぱん:part:串の先にパンがあります。|single small red fondue pot yellow melted cheese two long forks holding bread cubes dipping into cheese small burner base`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const foods769Concepts:ConceptRow[]=rows.map(([k,r,d,e])=>[k,'food',r,d,e?e.split(';'):[]]);
export const foods769Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
