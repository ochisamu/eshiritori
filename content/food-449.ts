import type {ConceptRow} from './concepts';
const lines=`peach|もも|割れ目のある桃色の丸い実と、半分に切って茶色い種の見えた実。|たね:part:切った実の中央に大きな種があります。;かわ:part:外側を桃色の皮が包んでいます。;くだもの:category:食べられる果物です。|one whole pink peach with cleft and one half peach showing large brown stone pale flesh green leaf
pear|なし|黄褐色の丸い実と、半分に切って黒い小さな種の見えた実。|たね:part:切り口の中央に黒い種があります。;かわ:part:外側に薄い茶色の皮があります。;くだもの:category:食べられる果物です。|one round golden brown Japanese nashi pear and one half showing white flesh small black seeds central core
kiwi-fruit|きうい|茶色い毛のある楕円の実と、緑の切り口に黒い種の並ぶ一切れ。|きういふるーつ:synonym:キウイフルーツです。;たね:part:緑の実に黒い種が輪になって並びます。;かわ:part:外側に茶色い毛のある皮があります。|one whole fuzzy brown kiwi fruit with one large cross section showing green flesh white center and ring of black seeds
mango|まんごー|赤黄色の楕円の実と、黄色い中身を格子状に切って反らした半分。|かにく:part:黄色い果肉が格子状に切られています。;かわ:part:外側に赤黄色の皮があります。;くだもの:category:食べられる果物です。|one whole red yellow mango and one hedgehog cut half with large golden flesh cubes on skin
papaya|ぱぱいや|黄緑の長い実を縦に切ると、橙色の中身と中央に黒い種がある。|たね:part:中央に黒い丸い種が集まっています。;かにく:part:内側に橙色の果肉があります。;くだもの:category:食べられる果物です。|one lengthwise half papaya with green yellow skin bright orange flesh and central cavity full of black round seeds
coconut|やしのみ|茶色い毛のある丸い実が割れ、硬い殻の内側に厚い白い層がある。|ここなっつ:synonym:ココナッツとも呼ぶ実です。;から:part:外側に硬い茶色の殻があります。;かにく:part:殻の内側に白い果肉があります。|one whole brown hairy coconut with three dark eye spots and one cracked half showing thick white flesh
avocado|あぼかど|緑色の梨形の実の半分に、黄緑の中身と大きな丸い茶色の種がある。|たね:part:中央に大きな丸い種があります。;かわ:part:外側に濃い緑色の皮があります。;かにく:part:皮の内側に黄緑の果肉があります。|one halved avocado with dark pebbled green skin pale green flesh and huge round brown pit
persimmon|かき|橙色の平たい丸い実に、上を囲む大きな緑のへたが付いている。|へた:part:上に四つに広がった緑のへたがあります。;かわ:part:外側に橙色の皮があります。;くだもの:category:食べられる果物です。|one bright orange squat persimmon with large four lobed green calyx on top
pomegranate|ざくろ|赤い丸い実が開き、白い仕切りの間に赤い粒がたくさん見える。|たね:part:中に赤く透ける種がたくさんあります。;かわ:part:外側に赤い厚い皮があります。;くだもの:category:食べられる果物です。|one cut open red pomegranate with crown top thick red rind white membranes and many ruby arils
fig|いちじく|紫のしずく形の実と、赤い中身に細かい種のある縦半分の実。|たね:part:切り口に細かい種が並びます。;かにく:part:内側に赤い果肉があります。;くだもの:category:食べられる果物です。|one whole purple teardrop fig and one lengthwise half showing red seeded flesh
melon|めろん|緑の網模様の丸い実と、淡い緑の切り身に薄茶色の種がある。|たね:part:切り身の中央に薄茶色の種があります。;かわ:part:外側に網模様の皮があります。;くだもの:category:食べられる果物です。|one whole netted green muskmelon with T shaped stem and one wedge with pale green flesh tan seeds central cavity
blueberry|ぶるーべりー|青紫の丸い小さな実が三つ、先に星形のくぼみと緑の葉がある。|は:part:横に緑の葉があります。;くだもの:category:食べられる果物です。|three plump blue blueberries with distinct five point crown scars and one green leaf
raspberry|らずべりー|小さな赤い粒が集まった、真ん中の空いた実が二つ。|きいちご:synonym:ラズベリーは木苺の仲間です。;つぶ:part:小さな粒が集まっています。;くだもの:category:食べられる果物です。|two red raspberries composed of distinct round drupelets one tilted showing hollow center with green leaf
lychee|らいち|赤いでこぼこの皮を半分むき、つるりと白い丸い中身がのぞく。|かわ:part:外側に赤いでこぼこの皮があります。;かにく:part:中に白い果肉があります。;くだもの:category:食べられる果物です。|one whole red bumpy lychee and one half peeled lychee showing glossy white flesh
grapefruit|ぐれーぷふるーつ|黄色い丸い実と、桃色の中身が放射状に分かれた丸い切り口。|かんきつ:category:厚い皮と房のある柑橘です。;ふさ:part:中身が放射状の房に分かれています。;かわ:part:外側に厚い黄色の皮があります。|one whole large yellow grapefruit and one pink flesh cross section with thick rind radial segments and few seeds
loquat|びわ|橙色の小さな楕円の実と、半分に切って茶色い大きな種がある実。|たね:part:中央に大きな茶色の種があります。;かわ:part:外側に橙色の皮があります。;くだもの:category:食べられる果物です。|two small orange loquat fruits with dry brown calyx tips one halved exposing two large glossy brown seeds
onion|たまねぎ|茶色い薄皮の丸い根菜と、白い輪が重なる半分の切り口。|かわ:part:外側に茶色い薄皮があります。;ね:part:底から細い根が伸びています。;そう:part:切り口に輪状の層が重なっています。|one whole golden brown onion with papery skin dried roots and one cross section showing concentric white rings
garlic|にんにく|白い丸い塊がいくつかのふくらみに分かれ、横に一片がある。|りんぺん:part:塊が小さな鱗片に分かれています。;かわ:part:表面に白い薄皮があります。;ね:part:底に短い根があります。|one white garlic bulb with dried stem papery skin root tuft and one separate peeled clove
potato|じゃがいも|薄茶色のでこぼこした丸い根菜が二つあり、表面に小さなくぼみがある。|ばれいしょ:synonym:馬鈴薯とも呼びます。;め:part:表面に芽のくぼみがあります。;かわ:part:外側に薄茶色の皮があります。|two irregular tan potatoes with conspicuous small dark eyes on skin no sprouts
sweet-potato|さつまいも|赤紫の細長い根菜と、黄色い中身の見える一切れ。|かんしょ:synonym:甘藷とも呼びます。;かわ:part:外側に赤紫の皮があります。;きりくち:part:切り口に黄色い中身が見えます。|one long red purple sweet potato and one cut piece showing solid golden yellow interior
daikon|だいこん|白く長い根菜が先へ向かって細くなり、上に大きな緑の葉がある。|ね:part:白く太い根が中心です。;は:part:上に大きな緑の葉があります。;ひげね:part:細いひげ根が横から出ています。|single whole long white daikon radish with tapering root green leafy tops and a few obvious thin side root hairs
cucumber|きゅうり|細長く曲がった濃い緑の野菜と、薄緑の輪切りが二枚ある。|かわ:part:外側に濃い緑の皮があります。;たね:part:輪切りの中央に小さな種があります。;きりくち:part:丸い切り口が見えます。|one dark green bumpy cucumber and two round slices showing pale green flesh central seed pattern
green-pepper|ぴーまん|緑の大きくふくらんだ野菜と、中が空で白い種のある半分。|たね:part:内側に白い小さな種が付いています。;へた:part:上に緑のへたがあります。;くうどう:part:中が大きく空いています。|one green bell pepper and one cut half showing hollow cavity white pith and seeds attached near stem
pumpkin|かぼちゃ|濃い緑で筋のある丸い野菜と、橙色の中身と白い種の見える切り身。|たね:part:内側に平たい白い種があります。;かわ:part:外側に濃い緑の皮があります。;へた:part:上に太いへたがあります。|one whole dark green Japanese kabocha pumpkin with ridges and stem plus one wedge showing orange flesh flat cream seeds
cabbage|きゃべつ|緑の葉が何枚も重なって丸くなり、半分の断面にも葉の層がある。|は:part:緑の葉が重なっています。;しん:part:切り口の中央に白い芯があります。;だんめん:part:半分に切った断面が見えます。|one round green cabbage with one half showing tightly layered pale leaves and large white central core
lettuce|れたす|明るい緑の薄い葉が、ひらひらした縁を広げて丸く集まっている。|は:part:薄い緑の葉が集まっています。;ふち:part:葉の縁がひらひらしています。|single loose head of bright light green leaf lettuce with conspicuously frilly thin leaves distinct from tightly packed cabbage
chinese-cabbage|はくさい|縦に長い葉の束を半分に切ると、太い白い筋と黄緑の葉が重なる。|は:part:黄緑の葉が重なっています。;すじ:part:葉の中央に太い白い筋があります。;だんめん:part:縦に切った断面が見えます。|one lengthwise half napa Chinese cabbage with long white ribs and layered pale yellow green crinkled leaves
broccoli|ぶろっこりー|太い緑の茎の上に、小さな緑の粒の房が丸く集まる。|つぼみ:part:上に小さなつぼみが集まっています。;くき:part:下に太い緑の茎があります。|single green broccoli head with thick branching cut stalk and conspicuous dense rounded green florets
cauliflower|かりふらわー|緑の葉に囲まれた、白いでこぼこの丸い塊。|つぼみ:part:白いつぼみが集まっています。;は:part:周りを緑の葉が囲んでいます。|single cauliflower with large bumpy creamy white head surrounded by broad green leaves
spinach|ほうれんそう|濃い緑の細長い葉が、桃色の根元から束になって伸びる。|は:part:濃い緑の葉があります。;ねもと:part:下に桃色の根元があります。|single bunch of dark green pointed spinach leaves on slender stems with pink root crowns
lotus-root|れんこん|薄茶色の太い根菜と、丸い穴の並んだ白い輪切り。|あな:part:輪切りに丸い穴が並びます。;きりくち:part:白い切り口が見えます。;かわ:part:外側に薄茶色の皮があります。|one tan segmented lotus root and two white round slices showing clear circle of large holes
ginger|しょうが|薄茶色のごつごつした塊と、淡い黄色の切り口の見える一片。|ねしょうが:synonym:根生姜とも呼ぶ部分です。;かわ:part:外側に薄茶色の皮があります。;きりくち:part:切り口が淡い黄色です。|one knobbly tan ginger rhizome with one cut nub and separate slice showing pale yellow flesh`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const food449Concepts:ConceptRow[]=rows.map(([k,r,d,e])=>[k,'food',r,d,e?e.split(';'):[]]);
export const food449Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
