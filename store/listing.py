# Store listing text for the App Store and Google Play, in every language the app speaks.
# Run `python3 store/listing.py` to (re)write store.config.json (App Store, via `eas metadata:push`)
# and store/google-play/<lang>/*.txt (Google Play Console). Nothing here submits anything.
import json, pathlib

L = {}
L["en"] = dict(
 title="StayOdds: Hotel Score Compare",
 subtitle="Real guests vs the critics",
 promo="Find the hotel that's right for your trip, not the one with the best advert. Real guest scores, critics and our own filmed stays for 1,300+ luxury hotels.",
 short="Compare luxury hotels by real guest scores, critics and our own filmed stays.",
 keywords="luxury hotel,resort,hotel reviews,compare,maldives,bali,honeymoon,villa,travel,guest score",
 notes="First release.",
 description="""StayOdds helps you choose a luxury hotel the honest way: by what real guests say, what the critics think and what we found when we stayed there ourselves.

Every hotel gets a StayOdds score, your odds of a great stay, worked out from verified guest reviews, the leading critics' lists and, for the hotels we've filmed, our own stay.

WHAT YOU CAN DO
• Describe your trip in plain English, like "sunny Caribbean in January", and see hotels that fit
• Compare two or three hotels side by side, with insights on where they differ
• Explore 1,300+ luxury hotels on the map, in street or satellite view
• See where critics and guests disagree, which brands guests rate highest and where the best value is
• Watch our full hotel reviews and shorts from The Uncharted Itinerary
• Check holiday dates and the best months to go
• Save a shortlist and share comparisons as picture cards

MADE FOR BIG SCREENS
Built for foldables and tablets as well as phones: side-by-side comparisons on an open foldable, a side rail on iPhone Duo and Pixel Fold, and a full layout on iPad.

HONEST BY DESIGN
No sign-up and no ads in the app. If you book through one of our links we may earn a small commission at no extra cost to you. It never changes a score.

From The Uncharted Itinerary, a UK luxury travel channel.""")

L["es"] = dict(
 title="StayOdds: Compara hoteles",
 subtitle="Huéspedes reales vs críticos",
 promo="Encuentra el hotel ideal para tu viaje, no el que tiene el mejor anuncio. Puntuaciones reales, críticos y nuestras estancias grabadas en más de 1.300 hoteles de lujo.",
 short="Compara hoteles de lujo por opiniones reales, críticos y nuestras estancias.",
 keywords="hotel de lujo,resort,opiniones,comparar,maldivas,bali,luna de miel,villa,viajes,puntuación",
 notes="Primera versión.",
 description="""StayOdds te ayuda a elegir un hotel de lujo con honestidad: por lo que dicen los huéspedes reales, lo que opinan los críticos y lo que encontramos cuando nos alojamos allí.

Cada hotel tiene una puntuación StayOdds, tus probabilidades de una gran estancia, calculada con opiniones verificadas de huéspedes, las listas de los principales críticos y, en los hoteles que hemos grabado, nuestra propia estancia.

QUÉ PUEDES HACER
• Describe tu viaje con tus palabras, como «Caribe soleado en enero», y mira los hoteles que encajan
• Compara dos o tres hoteles lado a lado, con las diferencias explicadas
• Explora más de 1.300 hoteles de lujo en el mapa, en vista de calle o satélite
• Descubre dónde discrepan críticos y huéspedes, qué marcas valoran más y dónde está la mejor relación calidad-precio
• Mira nuestras reseñas completas de hoteles y shorts de The Uncharted Itinerary
• Consulta festivos y los mejores meses para ir
• Guarda tu lista y comparte comparaciones como tarjetas

HECHA PARA PANTALLAS GRANDES
Pensada para plegables y tabletas además de móviles: comparaciones lado a lado en un plegable abierto, barra lateral en iPhone Duo y Pixel Fold, y diseño completo en iPad.

HONESTA POR DISEÑO
Sin registro y sin anuncios en la app. Si reservas con uno de nuestros enlaces podemos ganar una pequeña comisión sin coste extra para ti. Nunca cambia una puntuación.

De The Uncharted Itinerary, un canal británico de viajes de lujo.""")

L["pt-BR"] = dict(
 title="StayOdds: Compare hotéis",
 subtitle="Hóspedes reais vs críticos",
 promo="Encontre o hotel certo para a sua viagem, não o que tem o melhor anúncio. Notas reais de hóspedes, críticos e nossas estadias filmadas em mais de 1.300 hotéis de luxo.",
 short="Compare hotéis de luxo por notas reais de hóspedes, críticos e nossas estadias.",
 keywords="hotel de luxo,resort,avaliações,comparar,maldivas,bali,lua de mel,villa,viagem,nota",
 notes="Primeira versão.",
 description="""O StayOdds ajuda você a escolher um hotel de luxo com honestidade: pelo que dizem os hóspedes reais, pelo que pensam os críticos e pelo que encontramos quando nos hospedamos lá.

Cada hotel recebe uma nota StayOdds, suas chances de uma ótima estadia, calculada a partir de avaliações verificadas, das listas dos principais críticos e, nos hotéis que filmamos, da nossa própria estadia.

O QUE VOCÊ PODE FAZER
• Descreva sua viagem com suas palavras, como "Caribe ensolarado em janeiro", e veja hotéis que combinam
• Compare dois ou três hotéis lado a lado, com as diferenças explicadas
• Explore mais de 1.300 hotéis de luxo no mapa, em modo rua ou satélite
• Veja onde críticos e hóspedes discordam, quais marcas os hóspedes avaliam melhor e onde está o melhor custo-benefício
• Assista às nossas análises completas de hotéis e shorts do The Uncharted Itinerary
• Confira feriados e os melhores meses para ir
• Salve sua lista e compartilhe comparações como cartões

FEITO PARA TELAS GRANDES
Pensado para dobráveis e tablets, além de celulares: comparações lado a lado num dobrável aberto, barra lateral no iPhone Duo e Pixel Fold e layout completo no iPad.

HONESTO POR PRINCÍPIO
Sem cadastro e sem anúncios no app. Se você reservar por um dos nossos links, podemos receber uma pequena comissão sem custo extra para você. Isso nunca muda uma nota.

Do The Uncharted Itinerary, um canal britânico de viagens de luxo.""")

L["fr"] = dict(
 title="StayOdds : comparer les hôtels",
 subtitle="Vrais clients vs critiques",
 promo="Trouvez l'hôtel fait pour votre voyage, pas celui qui a la meilleure pub. Notes de vrais clients, critiques et nos séjours filmés pour plus de 1 300 hôtels de luxe.",
 short="Comparez les hôtels de luxe : avis de vrais clients, critiques et nos séjours.",
 keywords="hôtel de luxe,resort,avis,comparer,maldives,bali,lune de miel,villa,voyage,note",
 notes="Première version.",
 description="""StayOdds vous aide à choisir un hôtel de luxe en toute honnêteté : d'après ce que disent les vrais clients, ce que pensent les critiques et ce que nous avons vécu en y séjournant nous-mêmes.

Chaque hôtel reçoit une note StayOdds, vos chances de passer un excellent séjour, calculée à partir d'avis clients vérifiés, des classements des grands critiques et, pour les hôtels que nous avons filmés, de notre propre séjour.

CE QUE VOUS POUVEZ FAIRE
• Décrivez votre voyage avec vos mots, comme « Caraïbes au soleil en janvier », et voyez les hôtels qui correspondent
• Comparez deux ou trois hôtels côte à côte, avec leurs différences expliquées
• Explorez plus de 1 300 hôtels de luxe sur la carte, en vue plan ou satellite
• Voyez où critiques et clients ne sont pas d'accord, les marques les mieux notées et les meilleurs rapports qualité-prix
• Regardez nos tests complets d'hôtels et nos shorts de The Uncharted Itinerary
• Consultez les dates de vacances et les meilleurs mois pour partir
• Enregistrez votre sélection et partagez vos comparaisons en images

PENSÉE POUR LES GRANDS ÉCRANS
Conçue pour les pliables et les tablettes comme pour les téléphones : comparaisons côte à côte sur un pliable ouvert, barre latérale sur iPhone Duo et Pixel Fold, et mise en page complète sur iPad.

HONNÊTE PAR PRINCIPE
Sans inscription ni publicité dans l'app. Si vous réservez via l'un de nos liens, nous pouvons toucher une petite commission sans surcoût pour vous. Elle ne change jamais une note.

Par The Uncharted Itinerary, une chaîne britannique de voyages de luxe.""")

L["de"] = dict(
 title="StayOdds: Hotels vergleichen",
 subtitle="Echte Gäste vs. Kritiker",
 promo="Finden Sie das Hotel, das zu Ihrer Reise passt, nicht das mit der besten Werbung. Echte Gästebewertungen, Kritiker und unsere gefilmten Aufenthalte in 1.300+ Luxushotels.",
 short="Luxushotels vergleichen: echte Gäste, Kritiker und unsere eigenen Aufenthalte.",
 keywords="luxushotel,resort,hotelbewertung,vergleichen,malediven,bali,flitterwochen,villa,reise",
 notes="Erste Version.",
 description="""StayOdds hilft Ihnen, ein Luxushotel ehrlich auszuwählen: nach dem, was echte Gäste sagen, was Kritiker denken und was wir bei unserem eigenen Aufenthalt erlebt haben.

Jedes Hotel erhält einen StayOdds-Wert, Ihre Chance auf einen großartigen Aufenthalt, berechnet aus verifizierten Gästebewertungen, den Listen führender Kritiker und, bei den Hotels, die wir gefilmt haben, unserem eigenen Aufenthalt.

WAS SIE TUN KÖNNEN
• Beschreiben Sie Ihre Reise in eigenen Worten, etwa „sonnige Karibik im Januar“, und sehen Sie passende Hotels
• Vergleichen Sie zwei oder drei Hotels nebeneinander, mit erklärten Unterschieden
• Entdecken Sie über 1.300 Luxushotels auf der Karte, als Straßen- oder Satellitenansicht
• Sehen Sie, wo Kritiker und Gäste uneins sind, welche Marken Gäste am besten bewerten und wo das beste Preis-Leistungs-Verhältnis liegt
• Schauen Sie unsere ausführlichen Hoteltests und Shorts von The Uncharted Itinerary
• Prüfen Sie Feiertage und die besten Reisemonate
• Speichern Sie Ihre Auswahl und teilen Sie Vergleiche als Bildkarten

FÜR GROSSE BILDSCHIRME
Gemacht für Foldables und Tablets ebenso wie für Smartphones: Vergleiche nebeneinander auf dem geöffneten Foldable, eine Seitenleiste auf iPhone Duo und Pixel Fold und ein volles Layout auf dem iPad.

EHRLICH AUS PRINZIP
Keine Anmeldung und keine Werbung in der App. Wenn Sie über einen unserer Links buchen, erhalten wir eventuell eine kleine Provision, ohne Mehrkosten für Sie. Sie ändert nie eine Bewertung.

Von The Uncharted Itinerary, einem britischen Kanal für Luxusreisen.""")

L["it"] = dict(
 title="StayOdds: confronta hotel",
 subtitle="Ospiti veri vs critici",
 promo="Trova l'hotel giusto per il tuo viaggio, non quello con la pubblicità migliore. Voti di ospiti reali, critici e i nostri soggiorni filmati per oltre 1.300 hotel di lusso.",
 short="Confronta hotel di lusso: voti di ospiti reali, critici e i nostri soggiorni.",
 keywords="hotel di lusso,resort,recensioni,confronta,maldive,bali,luna di miele,villa,viaggi,voto",
 notes="Prima versione.",
 description="""StayOdds ti aiuta a scegliere un hotel di lusso in modo onesto: in base a ciò che dicono gli ospiti reali, a ciò che pensano i critici e a ciò che abbiamo trovato soggiornandoci noi stessi.

Ogni hotel ha un punteggio StayOdds, le tue probabilità di un ottimo soggiorno, calcolato da recensioni verificate degli ospiti, dalle classifiche dei principali critici e, per gli hotel che abbiamo filmato, dal nostro soggiorno.

COSA PUOI FARE
• Descrivi il tuo viaggio a parole tue, come «Caraibi al sole a gennaio», e vedi gli hotel adatti
• Confronta due o tre hotel fianco a fianco, con le differenze spiegate
• Esplora oltre 1.300 hotel di lusso sulla mappa, in vista stradale o satellitare
• Scopri dove critici e ospiti non sono d'accordo, quali marchi gli ospiti preferiscono e dov'è il miglior rapporto qualità-prezzo
• Guarda le nostre recensioni complete e gli short di The Uncharted Itinerary
• Controlla le date delle vacanze e i mesi migliori per partire
• Salva la tua lista e condividi i confronti come schede immagine

PENSATA PER GLI SCHERMI GRANDI
Creata per pieghevoli e tablet oltre che per smartphone: confronti fianco a fianco su un pieghevole aperto, barra laterale su iPhone Duo e Pixel Fold e layout completo su iPad.

ONESTA PER PRINCIPIO
Nessuna registrazione e nessuna pubblicità nell'app. Se prenoti tramite uno dei nostri link potremmo ricevere una piccola commissione, senza costi aggiuntivi per te. Non cambia mai un punteggio.

Da The Uncharted Itinerary, un canale britannico di viaggi di lusso.""")

L["ar"] = dict(
 title="StayOdds: قارن الفنادق",
 subtitle="آراء النزلاء الحقيقيين والنقاد",
 promo="اعثر على الفندق المناسب لرحلتك، لا على صاحب أفضل إعلان. تقييمات نزلاء حقيقيين وآراء النقاد وإقاماتنا المصوّرة لأكثر من 1300 فندق فاخر.",
 short="قارن الفنادق الفاخرة بتقييمات نزلاء حقيقيين وآراء النقاد وإقاماتنا المصوّرة.",
 keywords="فندق فاخر,منتجع,تقييمات,مقارنة,المالديف,بالي,شهر العسل,فيلا,سفر",
 notes="الإصدار الأول.",
 description="""يساعدك StayOdds على اختيار فندق فاخر بصدق: بحسب ما يقوله النزلاء الحقيقيون، وما يراه النقاد، وما وجدناه عندما أقمنا فيه بأنفسنا.

يحصل كل فندق على تقييم StayOdds، أي فرصك في إقامة رائعة، محسوبًا من تقييمات نزلاء موثّقة وقوائم كبار النقاد، ومن إقامتنا نحن في الفنادق التي صوّرناها.

ما يمكنك فعله
• صف رحلتك بكلماتك، مثل «الكاريبي المشمس في يناير»، وشاهد الفنادق المناسبة
• قارن بين فندقين أو ثلاثة جنبًا إلى جنب مع شرح الفروق
• استكشف أكثر من 1300 فندق فاخر على الخريطة، بعرض الشوارع أو القمر الصناعي
• اعرف أين يختلف النقاد والنزلاء، وأي العلامات يفضّلها النزلاء، وأين أفضل قيمة
• شاهد مراجعاتنا الكاملة للفنادق ومقاطع The Uncharted Itinerary القصيرة
• اطّلع على مواعيد العطلات وأفضل أشهر السفر
• احفظ قائمتك وشارك المقارنات كبطاقات مصوّرة

مصمّم للشاشات الكبيرة
مصمّم للأجهزة القابلة للطي والأجهزة اللوحية وكذلك الهواتف: مقارنات جنبًا إلى جنب على الجهاز المفتوح، وشريط جانبي على iPhone Duo وPixel Fold، وتصميم كامل على iPad.

صادق بطبيعته
لا تسجيل ولا إعلانات داخل التطبيق. إذا حجزت عبر أحد روابطنا فقد نحصل على عمولة صغيرة دون أي تكلفة إضافية عليك، ولا تغيّر أبدًا أي تقييم.

من The Uncharted Itinerary، قناة بريطانية للسفر الفاخر.""")

L["ja"] = dict(
 title="StayOdds：ホテル比較",
 subtitle="本物の宿泊者 vs 評論家",
 promo="広告ではなく、あなたの旅に合うホテルを。1,300以上の高級ホテルを、実際の宿泊者の評価、評論家、私たちが撮影した滞在で比較。",
 short="実際の宿泊者の評価、評論家、私たちの滞在で高級ホテルを比較。",
 keywords="高級ホテル,リゾート,口コミ,比較,モルディブ,バリ,新婚旅行,ヴィラ,旅行",
 notes="最初のリリースです。",
 description="""StayOdds は、高級ホテルを正直に選ぶためのアプリです。実際の宿泊者の声、評論家の評価、そして私たちが実際に泊まって感じたことをもとにしています。

各ホテルには StayOdds スコア（すばらしい滞在になる確率）があり、確認済みの宿泊者レビュー、主要な評論家のリスト、私たちが撮影したホテルでは自分たちの滞在から算出しています。

できること
• 「1月の晴れたカリブ海」のように旅の希望を書くだけで、合うホテルを表示
• 2〜3軒のホテルを並べて比較し、違いを解説
• 1,300以上の高級ホテルを地図（標準・航空写真）で探す
• 評論家と宿泊者の評価が分かれるホテル、宿泊者に人気のブランド、コスパの良いホテルがわかる
• The Uncharted Itinerary のホテルレビュー動画とショートを視聴
• 祝日や旅行に最適な月をチェック
• お気に入りを保存し、比較を画像カードで共有

大画面向けデザイン
スマートフォンはもちろん、折りたたみ端末やタブレットにも最適化。開いた折りたたみ端末での横並び比較、iPhone Duo と Pixel Fold のサイドレール、iPad のフルレイアウトに対応。

正直さを大切に
登録不要、アプリ内広告なし。私たちのリンクから予約すると、追加費用なしで少額の手数料を受け取ることがありますが、スコアが変わることはありません。

英国の高級旅行チャンネル The Uncharted Itinerary より。""")

L["id"] = dict(
 title="StayOdds: Bandingkan Hotel",
 subtitle="Tamu asli vs para kritikus",
 promo="Temukan hotel yang tepat untuk perjalananmu, bukan yang iklannya paling bagus. Skor tamu asli, kritikus, dan inap yang kami rekam untuk 1.300+ hotel mewah.",
 short="Bandingkan hotel mewah lewat skor tamu asli, kritikus, dan pengalaman kami.",
 keywords="hotel mewah,resor,ulasan hotel,bandingkan,maladewa,bali,bulan madu,vila,liburan,skor",
 notes="Rilis pertama.",
 description="""StayOdds membantumu memilih hotel mewah dengan jujur: berdasarkan kata tamu asli, pendapat para kritikus, dan pengalaman kami sendiri saat menginap di sana.

Setiap hotel punya skor StayOdds, peluangmu mendapat pengalaman menginap yang luar biasa, dihitung dari ulasan tamu yang terverifikasi, daftar para kritikus terkemuka, dan, untuk hotel yang kami rekam, pengalaman menginap kami sendiri.

YANG BISA KAMU LAKUKAN
• Ceritakan rencana perjalananmu dengan kata-katamu sendiri, misalnya "Karibia cerah di bulan Januari", lalu lihat hotel yang cocok
• Bandingkan dua atau tiga hotel berdampingan, lengkap dengan penjelasan perbedaannya
• Jelajahi 1.300+ hotel mewah di peta, dengan tampilan jalan atau satelit
• Lihat di mana kritikus dan tamu berbeda pendapat, merek mana yang paling disukai tamu, dan mana yang paling sepadan
• Tonton ulasan hotel lengkap dan shorts dari The Uncharted Itinerary
• Cek tanggal libur dan bulan terbaik untuk berangkat
• Simpan daftar pilihanmu dan bagikan perbandingan sebagai kartu gambar

DIBUAT UNTUK LAYAR BESAR
Dirancang untuk ponsel lipat dan tablet, juga ponsel biasa: perbandingan berdampingan di ponsel lipat yang terbuka, rel samping di iPhone Duo dan Pixel Fold, serta tata letak penuh di iPad.

JUJUR SEJAK AWAL
Tanpa daftar akun dan tanpa iklan di aplikasi. Jika kamu memesan lewat salah satu tautan kami, kami mungkin mendapat komisi kecil tanpa biaya tambahan untukmu. Itu tidak pernah mengubah skor.

Dari The Uncharted Itinerary, kanal perjalanan mewah asal Inggris.""")

L["fa"] = dict(
 title="StayOdds: مقایسه هتل‌ها",
 subtitle="مهمانان واقعی در برابر منتقدان",
 promo="هتلی را پیدا کنید که برای سفرتان مناسب است، نه هتلی که بهترین تبلیغ را دارد. امتیاز مهمانان واقعی، نظر منتقدان و اقامت‌های فیلم‌برداری‌شده ما برای بیش از ۱۳۰۰ هتل لوکس.",
 short="هتل‌های لوکس را با امتیاز مهمانان واقعی، منتقدان و اقامت‌های ما مقایسه کنید.",
 keywords="هتل لوکس,ریزورت,نظرات,مقایسه,مالدیو,بالی,ماه عسل,ویلا,سفر",
 notes="نخستین نسخه.",
 description="""StayOdds به شما کمک می‌کند هتل لوکس را صادقانه انتخاب کنید: بر اساس آنچه مهمانان واقعی می‌گویند، آنچه منتقدان فکر می‌کنند و آنچه خودمان هنگام اقامت در آنجا دیدیم.

هر هتل یک امتیاز StayOdds دارد، یعنی شانس شما برای یک اقامت عالی، که از نظرات تأییدشده مهمانان، فهرست‌های منتقدان برجسته و در هتل‌هایی که فیلم گرفته‌ایم، از اقامت خودمان محاسبه می‌شود.

چه کارهایی می‌توانید بکنید
• سفرتان را با زبان خودتان توصیف کنید، مثلاً «کارائیب آفتابی در ژانویه»، و هتل‌های مناسب را ببینید
• دو یا سه هتل را کنار هم مقایسه کنید و تفاوت‌هایشان را ببینید
• بیش از ۱۳۰۰ هتل لوکس را روی نقشه، با نمای خیابان یا ماهواره، کاوش کنید
• ببینید کجا منتقدان و مهمانان هم‌نظر نیستند، مهمانان کدام برندها را بیشتر دوست دارند و بهترین ارزش کجاست
• نقدهای کامل هتل‌ها و ویدیوهای کوتاه The Uncharted Itinerary را تماشا کنید
• تاریخ تعطیلات و بهترین ماه‌های سفر را ببینید
• فهرست خود را ذخیره کنید و مقایسه‌ها را به‌صورت کارت تصویری به اشتراک بگذارید

ساخته‌شده برای صفحه‌های بزرگ
برای گوشی‌های تاشو و تبلت‌ها و همچنین گوشی‌ها طراحی شده است: مقایسه کنار هم روی گوشی تاشوی باز، نوار کناری در iPhone Duo و Pixel Fold و چیدمان کامل در iPad.

صادق از پایه
بدون ثبت‌نام و بدون تبلیغ در برنامه. اگر از طریق یکی از لینک‌های ما رزرو کنید، ممکن است کمیسیون کوچکی دریافت کنیم که هزینه‌ای برای شما ندارد و هرگز امتیازی را تغییر نمی‌دهد.

از The Uncharted Itinerary، یک کانال بریتانیایی سفرهای لوکس.""")

# App Store locale keys (Apple has no Persian listing; the app itself still speaks Persian)
L["zh-Hans"] = dict(
 title="StayOdds：酒店评分对比",
 subtitle="真实住客与评论家的评价",
 promo="找到适合你行程的酒店，而不是广告做得最好的那家。1,300 多家奢华酒店的真实住客评分、评论家意见和我们亲自拍摄的入住体验。",
 short="按真实住客评分、评论家意见和我们的亲身入住对比奢华酒店。",
 keywords="奢华酒店,度假村,酒店点评,对比,马尔代夫,巴厘岛,蜜月,别墅,旅行,住客评分",
 notes="首个版本。",
 description="""StayOdds 帮你用诚实的方式挑选奢华酒店：看真实住客怎么说、评论家怎么评，以及我们亲自入住时的发现。

每家酒店都有一个 StayOdds 评分，即你获得一次美好入住的几率，综合了经过验证的住客评价、主要评论家榜单，以及我们拍摄过的酒店的亲身入住体验。

你可以
• 用自己的话描述行程，例如"一月阳光明媚的加勒比"，查看合适的酒店
• 并排对比两三家酒店，看清它们的差别
• 在地图上浏览 1,300 多家奢华酒店，支持街道和卫星视图
• 了解评论家与住客意见不同的地方、住客最喜欢的品牌以及最划算的选择
• 观看 The Uncharted Itinerary 的完整酒店评测和短片
• 查看假期日期和最佳出行月份
• 收藏清单，并把对比分享为图片卡片

为大屏幕打造
不仅适配手机，也适配折叠屏和平板：折叠屏展开时并排对比，iPhone Duo 和 Pixel Fold 的侧边栏，以及 iPad 的完整布局。

坦诚是我们的原则
无需注册，应用内没有广告。如果你通过我们的链接预订，我们可能获得少量佣金，你无需多付费用。这绝不会改变任何评分。

来自英国奢华旅行频道 The Uncharted Itinerary。""")

L["ko"] = dict(
 title="StayOdds: 호텔 점수 비교",
 subtitle="실제 투숙객 vs 평론가",
 promo="광고가 가장 좋은 호텔이 아니라 여행에 꼭 맞는 호텔을 찾으세요. 럭셔리 호텔 1,300곳 이상의 실제 투숙객 점수, 평론가 평가, 저희가 직접 촬영한 숙박 후기.",
 short="실제 투숙객 점수, 평론가 평가, 직접 묵은 경험으로 럭셔리 호텔을 비교하세요.",
 keywords="럭셔리 호텔,리조트,호텔 리뷰,비교,몰디브,발리,신혼여행,빌라,여행,투숙객 점수",
 notes="첫 출시입니다.",
 description="""StayOdds는 정직한 방법으로 럭셔리 호텔을 고르도록 도와줍니다. 실제 투숙객의 이야기, 평론가의 평가, 그리고 저희가 직접 묵으며 확인한 내용을 바탕으로요.

모든 호텔에는 멋진 숙박이 될 확률인 StayOdds 점수가 있으며, 검증된 투숙객 리뷰와 주요 평론가 목록, 그리고 저희가 촬영한 호텔의 경우 직접 묵은 경험을 반영해 계산합니다.

이런 걸 할 수 있어요
• "1월의 화창한 카리브해"처럼 원하는 여행을 자연스럽게 입력하고 맞는 호텔 보기
• 호텔 두세 곳을 나란히 비교하고 차이점 확인하기
• 지도에서 1,300곳 이상의 럭셔리 호텔을 거리 또는 위성 보기로 탐색하기
• 평론가와 투숙객의 의견이 다른 곳, 투숙객이 가장 좋아하는 브랜드, 가성비 좋은 곳 알아보기
• The Uncharted Itinerary의 호텔 리뷰 영상과 쇼츠 보기
• 연휴 날짜와 여행하기 좋은 달 확인하기
• 목록을 저장하고 비교 결과를 이미지 카드로 공유하기

큰 화면을 위해 만들었어요
휴대폰은 물론 폴더블과 태블릿에도 맞춰 설계했습니다. 펼친 폴더블에서 나란히 비교하고, iPhone Duo 및 Pixel Fold의 사이드 레일, iPad의 전체 레이아웃을 지원합니다.

정직함이 원칙입니다
가입이 필요 없고 앱 안에 광고가 없습니다. 저희 링크로 예약하시면 추가 비용 없이 소액의 수수료를 받을 수 있지만, 점수에는 절대 영향을 주지 않습니다.

영국의 럭셔리 여행 채널 The Uncharted Itinerary가 만들었습니다.""")

APPLE = {"en-GB": "en", "en-US": "en", "es-ES": "es", "es-MX": "es", "pt-BR": "pt-BR", "fr-FR": "fr",
         "de-DE": "de", "it": "it", "ar-SA": "ar", "ja": "ja", "id": "id", "zh-Hans": "zh-Hans", "ko": "ko"}
# Google Play language codes
GOOGLE = {"en-GB": "en", "en-US": "en", "es-ES": "es", "es-419": "es", "pt-BR": "pt-BR", "fr-FR": "fr",
          "de-DE": "de", "it-IT": "it", "ar": "ar", "ja-JP": "ja", "id": "id", "fa": "fa", "zh-CN": "zh-Hans", "ko-KR": "ko"}

import re

def for_apple(text):
    # Apple doesn't allow other platforms' device names in the listing (guideline 2.3.10)
    return re.sub(r"\s*(?:and|y|e|et|und|و|と|dan|和|및)\s*Pixel Fold", "", text)

def for_google(text):
    return re.sub(r"iPhone Duo\s*(?:\S+\s*)?Pixel Fold", "Pixel Fold", text)

def check():
    for k, v in L.items():
        assert len(v["title"]) <= 30, (k, "title", len(v["title"]))
        assert len(v["subtitle"]) <= 30, (k, "subtitle", len(v["subtitle"]))
        assert len(v["promo"]) <= 170, (k, "promo", len(v["promo"]))
        assert len(v["short"]) <= 80, (k, "short", len(v["short"]))
        assert len(v["keywords"]) <= 100, (k, "keywords", len(v["keywords"]))
        assert len(v["description"]) <= 4000, (k, "description")

if __name__ == "__main__":
    check()
    root = pathlib.Path(__file__).resolve().parent.parent
    info = {}
    for loc, k in APPLE.items():
        v = L[k]
        info[loc] = {
            "title": v["title"], "subtitle": v["subtitle"], "description": for_apple(v["description"]),
            "keywords": [x.strip() for x in v["keywords"].split(",")], "releaseNotes": v["notes"],
            "promoText": v["promo"], "marketingUrl": "https://stayodds.com/",
            "supportUrl": "https://uncharteditinerary.com/contact/",
            "privacyPolicyUrl": "https://uncharteditinerary.com/privacy/",
        }
    cfg = {"configVersion": 0, "apple": {
        "copyright": "2026 The Uncharted Itinerary",
        "categories": ["TRAVEL", "LIFESTYLE"],
        "advisory": {k2: "NONE" for k2 in ["alcoholTobaccoOrDrugUseOrReferences", "contests", "gamblingSimulated",
            "horrorOrFearThemes", "matureOrSuggestiveThemes", "medicalOrTreatmentInformation", "profanityOrCrudeHumor",
            "sexualContentGraphicAndNudity", "sexualContentOrNudity", "violenceCartoonOrFantasy", "violenceRealistic",
            "violenceRealisticProlongedGraphicOrSadistic"]} | {"gambling": False, "kidsAgeBand": None,
            "unrestrictedWebAccess": False, "ageRatingOverride": "NONE", "koreaAgeRatingOverride": "NONE"},
        "info": info,
        "release": {"automaticRelease": False, "phasedRelease": False},
        "review": {"firstName": "Oliver", "lastName": "Khademi", "email": "hello@uncharteditinerary.com",
                   "phone": "+44 0000 000000", "demoRequired": False,
                   "notes": "StayOdds needs no account. Open Home and tap Surprise me to see trip ideas, or use Explore, Map and Compare. "
                            "Hotel scores come from public guest reviews, critics' lists and our own filmed stays. "
                            "Videos play from our YouTube channel. Links to booking sites may be affiliate links."},
    }}
    (root / "store.config.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
    for loc, k in GOOGLE.items():
        d = root / "store" / "google-play" / loc
        d.mkdir(parents=True, exist_ok=True)
        v = L[k]
        (d / "title.txt").write_text(v["title"] + "\n")
        (d / "short_description.txt").write_text(v["short"] + "\n")
        (d / "full_description.txt").write_text(for_google(v["description"]) + "\n")
        (d / "release_notes.txt").write_text(v["notes"] + "\n")
    print("ok", len(info), "App Store locales,", len(GOOGLE), "Google Play locales")
