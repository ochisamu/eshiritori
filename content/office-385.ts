import type {ConceptRow} from './concepts';
const lines=`pencil|えんぴつ|黄色い六角の細長い棒の先が削られ、黒い芯と後ろの赤い消しゴムがある。|しん:part:先端に黒い芯が見えます。;けしごむ:part:後端に赤い消しゴムが付いています。|single yellow hexagonal wooden pencil sharpened graphite tip and red eraser at end
ballpoint-pen|ぼーるぺん|透明な筒の中に青い細い管があり、先端と横のクリップが見える。|ぺん:synonym:文字を書くペンです。;くりっぷ:part:横に細いクリップが付いています。;しん:part:透明な軸の中に青い芯が見えます。|single transparent blue ballpoint pen with visible inner ink refill silver tip and large blue pocket clip
fountain-pen|まんねんひつ|黒い軸の先に、割れ目と小穴のある金色の平たい先端が付く。|ぺんさき:part:金色のペン先が付いています。;きゃっぷ:part:横に外したキャップがあります。;くりっぷ:part:キャップにクリップが付いています。|single black fountain pen with large clear gold split nib and separate black cap with gold clip beside it
eraser|けしごむ|角の丸い白い四角が、青い紙のおおいから半分出ている。|かみ:part:青い紙のおおいが巻いてあります。|single large white rectangular eraser half inside plain blue paper sleeve no text
pencil-sharpener|えんぴつけずり|赤い小さな器具の穴に黄色い棒が入り、横に木の削りかすがある。|けずりき:synonym:鉛筆を削る削り器です。;あな:part:鉛筆を差す丸い穴があります。;けずりかす:part:横に巻いた削りかすがあります。|single red manual pencil sharpener with yellow pencil inserted visible round hole and curled wood shavings beside it
ruler|じょうぎ|青く透ける細長い板に、端に沿って短い線が並ぶ。|ものさし:synonym:長さを測る物差しです。;めもり:part:端に目盛りの線が並んでいます。|single transparent blue straight ruler with plain tick marks ONLY no numbers no letters
protractor|ぶんどき|黄色く透ける半円の板に、丸い辺に沿って線が並ぶ。|はんえん:part:全体が半円の形です。;めもり:part:丸い辺に目盛り線があります。|single transparent yellow semicircular protractor with radial tick marks ONLY no numbers no text
drawing-compass|こんぱす|上でつながった銀色の二本脚の一方に、青い鉛筆が付いている。|はり:part:片方の脚の先が針になっています。;えんぴつ:part:もう一方の脚に鉛筆があります。;つまみ:part:上につかむためのつまみがあります。|single silver geometry drawing compass with pointed needle leg blue pencil leg and top adjustment knob
stapler|ほちきす|青い上部と銀色の台が、後ろでつながって少し開いている。|すてーぷらー:synonym:紙を留めるステープラーです。;はり:part:開いた内側に銀色の針の列があります。|single open blue stapler with visible silver strip of staples inside and metal base
paper-clip|くりっぷ|一本の銀色の線が、細長い丸い二重の輪になっている。|ぜむくりっぷ:synonym:紙を留めるゼムクリップです。;わ:part:金属の線が二重の輪になっています。|single large classic silver oval wire paperclip with two clearly nested loops
binder-clip|だぶるくりっぷ|黒い三角の器具の上に、二本の銀色の輪状の持ち手がある。|くりっぷ:synonym:紙を挟むクリップです。;とって:part:上に二つの銀色の取っ手があります。|single black triangular binder clip with two clear silver wire handles raised upward
glue-stick|すてぃっくのり|青い筒から白い中身が出て、横に青いふたが置かれている。|のり:synonym:紙を貼る糊です。;きゃっぷ:part:横に外したキャップがあります。;つつ:part:本体が丸い筒の形です。|single plain blue glue stick uncapped white glue exposed with separate blue cap beside no text
adhesive-tape|せろはんてーぷ|青い台の上に透明な巻物が載り、先がギザギザの刃に渡る。|てーぷ:synonym:貼り付けるテープです。;てーぷかったー:part:青いテープカッターに載っています。;は:part:先にギザギザの切り刃があります。|single clear adhesive tape roll in blue desktop tape dispenser with clear tape strip stretched to silver serrated cutting edge
notebook|のーと|開いた白い紙の束に横線が並び、青い表紙が下に見える。|のーとぶっく:synonym:書き込むノートブックです。;ひょうし:part:下に青い表紙があります。;けいせん:part:紙に横の罫線が並んでいます。|single open blue bound notebook with blank white ruled pages horizontal lines ONLY no writing
ring-binder|ばいんだー|開いた赤い表紙の内側で、銀色の輪が白い紙を留めている。|りんぐばいんだー:synonym:金属の輪のあるリングバインダーです。;りんぐ:part:中央に銀色のリングがあります。;かみ:part:白い紙が綴じてあります。|single open red three ring binder with large visible silver rings holding blank white paper no text
envelope|ふうとう|白い長方形の袋の三角のふたが開き、紙が少し出ている。|てがみ:part:中に手紙の白い紙が入っています。;ふた:part:三角の蓋が開いています。|single open cream envelope with triangular flap and blank white letter partly protruding no stamp no writing
shirt|わいしゃつ|白い長袖の服に、とがった襟と前の青いボタン、胸ポケットがある。|しゃつ:synonym:襟の付いたシャツです。;えり:part:首元にとがった襟があります。;ぼたん:part:前に青いボタンが並びます。;ぽけっと:part:胸にポケットがあります。|single white long sleeved dress shirt with pointed collar clear blue front buttons and chest pocket no person
t-shirt|てぃーしゃつ|青い半袖の服に、丸い首の穴と左右に短い袖がある。|しゃつ:synonym:半袖のシャツです。;そで:part:左右に短い袖があります。;えりぐり:part:首を通す丸い襟ぐりがあります。|single plain blue short sleeve T shirt with round crew neckline no print no person
sweater|せーたー|赤い長袖の服の表面に編み目があり、首と袖口に太い縁がある。|にっと:synonym:毛糸を編んだニットです。;あみめ:part:表面に編み目が並びます。;そで:part:左右に長い袖があります。|single red knitted sweater with conspicuous cable knit stitches ribbed neck and cuffs no person
cardigan|かーでぃがん|黄色い長袖の服の前が開き、茶色いボタンと二つのポケットがある。|ぼたん:part:前に茶色いボタンがあります。;ぽけっと:part:左右にポケットがあります。;そで:part:長い袖があります。|single yellow open front knitted cardigan with large brown buttons two patch pockets long sleeves no person
hoodie|ぱーかー|緑の長袖の服に、頭をおおう部分と前の大きなポケット、首のひもがある。|ふーど:part:首の後ろにフードがあります。;ひも:part:首元から二本のひもが下がっています。;ぽけっと:part:前に大きなポケットがあります。|single green pullover hoodie with clear hood two white drawstrings and large kangaroo front pocket no person
zip-jacket|じゃんぱー|青い短い上着の前に銀色の線とつまみ、左右にポケットがある。|ぶるぞん:synonym:短い丈のブルゾンです。;ふぁすなー:part:正面にファスナーがあります。;ぽけっと:part:左右にポケットがあります。|single blue zip front bomber jacket with clear silver zipper pull two side pockets and ribbed cuffs no person
overcoat|こーと|赤いひざ丈の上着に、大きな襟と二列のボタン、腰のベルトがある。|おーばーこーと:synonym:服の上に着るオーバーコートです。;えり:part:首元に大きな襟があります。;べると:part:腰にベルトがあります。;ぼたん:part:前にボタンが並びます。|single red knee length double breasted overcoat with wide lapels large buttons waist belt no person
raincoat|れいんこーと|黄色く光る長い上着に、フードと留め具があり、周りに水滴がある。|あまがっぱ:synonym:雨を防ぐ雨合羽です。;ふーど:part:上にフードがあります。;しずく:part:周りに青い水滴が描かれています。|single yellow waterproof hooded raincoat with three toggle closures and conspicuous blue water droplets around it no person
skirt|すかーと|紫の服が腰から下へ広がり、縦の折り目と上のベルト部分が見える。|ぷりーつすかーと:synonym:折り目の付いたプリーツスカートです。;ひだ:part:縦にひだが並んでいます。;うえすと:part:上に腰を囲むウエスト部分があります。|single purple pleated skirt with clear vertical pleats and thick waistband no person
dress|わんぴーす|桃色の服が肩から裾まで一続きで、腰にリボンと下に広がる部分がある。|どれす:synonym:裾の広がったドレスです。;りぼん:part:腰にリボンがあります。;すそ:part:下側に広い裾があります。|single pink sleeveless one piece dress with flared skirt and conspicuous waist bow no person
overalls|おーばーおーる|青いズボンの上に胸当てと肩の帯がつながり、胸にポケットがある。|さろぺっと:synonym:胸当てのあるサロペットです。;ぽけっと:part:胸に大きなポケットがあります。;かたひも:part:左右に肩ひもがあります。|single blue denim overalls with bib large chest pocket and two straps with brass buckles no person
belt|べると|茶色い細長い帯に、銀色の四角い金具と穴の列が付いている。|ばっくる:part:先に四角いバックルがあります。;あな:part:帯に丸い穴が並びます。|single brown leather waist belt curled with large silver rectangular buckle and conspicuous row of holes
necktie|ねくたい|赤い細長い布が首元で結ばれ、下の先がとがっている。|たい:synonym:首に結ぶタイです。;むすびめ:part:上に結び目があります。|single red necktie tied in classic triangular knot with neck loop and pointed long blade no person no pattern
bow-tie|ちょうねくたい|青い短い布の左右が広がり、真ん中に小さな結び目がある。|ぼうたい:synonym:蝶形のボウタイです。;むすびめ:part:中央に結び目があります。|single blue formal bow tie with symmetric wide loops and central knot no person
scarf|まふらー|赤い長い編み物が輪を作り、両端に房が付いている。|ふさ:part:両端に房が並んでいます。;あみめ:part:布に編み目が見えます。|single red knitted winter scarf draped in loose loop with long fringed ends and conspicuous knit pattern no person
gloves|てぶくろ|青い五本指の左右の手袋が、手のひらを見せて並んでいる。|ゆび:part:それぞれに五本の指の部分があります。;てくび:part:下に手首を包む部分があります。|pair of blue five finger winter gloves with ribbed cuffs side by side palm view no hands inside`;
const rows=lines.split('\n').map(l=>l.split('|'));
export const office385Concepts:ConceptRow[]=rows.map(([k,r,d,e],i)=>[k,i<16?'stationery':'clothing',r,d,e?e.split(';'):[]]);
export const office385Prompts=Array.from({length:2},(_,i)=>rows.slice(i*16,i*16+16).map(r=>r[4]).join('; '));
