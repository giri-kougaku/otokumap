/* OtokuMap — demo dataset (Tokyo, Japan)
   Everything here is sample data. Swap the arrays below for a real API feed. */

window.CATEGORIES = [
  { id: 'meat',      emoji: '🥩', en: 'Meat',       ja: '肉' },
  { id: 'fish',      emoji: '🐟', en: 'Fish',       ja: '魚' },
  { id: 'produce',   emoji: '🥬', en: 'Fruit & veg', ja: '野菜・果物' },
  { id: 'dairy',     emoji: '🧀', en: 'Dairy & eggs', ja: '乳製品・卵' },
  { id: 'bakery',    emoji: '🥖', en: 'Bakery',     ja: 'パン' },
  { id: 'frozen',    emoji: '🧊', en: 'Frozen',     ja: '冷凍食品' },
  { id: 'drinks',    emoji: '🥤', en: 'Drinks',     ja: '飲料' },
  { id: 'snacks',    emoji: '🍫', en: 'Snacks',     ja: 'お菓子' },
  { id: 'household', emoji: '🧴', en: 'Household',  ja: '日用品' },
  { id: 'pantry',    emoji: '🍚', en: 'Pantry',     ja: '米・調味料' }
];

/* Search shortcuts for the "change area" picker (coords are approximate). */
window.AREAS = [
  { id: 'tokyo',     name: { en: 'Tokyo Station',   ja: '東京駅' },     lat: 35.6812, lng: 139.7671 },
  { id: 'shinjuku',  name: { en: 'Shinjuku',        ja: '新宿駅' },     lat: 35.6896, lng: 139.7006 },
  { id: 'shibuya',   name: { en: 'Shibuya',         ja: '渋谷駅' },     lat: 35.6580, lng: 139.7016 },
  { id: 'ikebukuro', name: { en: 'Ikebukuro',       ja: '池袋駅' },     lat: 35.7295, lng: 139.7109 },
  { id: 'ueno',      name: { en: 'Ueno',            ja: '上野駅' },     lat: 35.7138, lng: 139.7773 },
  { id: 'kichijoji', name: { en: 'Kichijoji',       ja: '吉祥寺駅' },   lat: 35.7030, lng: 139.5798 },
  { id: 'yokohama',  name: { en: 'Yokohama',        ja: '横浜駅' },     lat: 35.4657, lng: 139.6221 }
];

window.SHOPS = [
  {
    id: 'seijo',
    brand: { en: 'Seijo Ishii', ja: '成城石井' },
    branch: { en: 'Gransta Tokyo', ja: 'グランスタ東京店' },
    color: '#7a4b2a',
    lat: 35.6814, lng: 139.7650,
    address: { en: '1-9-1 Marunouchi, Chiyoda-ku, Tokyo', ja: '東京都千代田区丸の内1-9-1' },
    hours: '7:00–23:00'
  },
  {
    id: 'summit',
    brand: { en: 'Summit Store', ja: 'サミットストア' },
    branch: { en: 'Mita', ja: '三田店' },
    color: '#0a6b4a',
    lat: 35.6483, lng: 139.7487,
    address: { en: '3-2-1 Mita, Minato-ku, Tokyo', ja: '東京都港区三田3-2-1' },
    hours: '9:00–24:00'
  },
  {
    id: 'kiba',
    brand: { en: 'Ito-Yokado', ja: 'イトーヨーカドー' },
    branch: { en: 'Kiba', ja: '木場店' },
    color: '#e60027',
    lat: 35.6699, lng: 139.8063,
    address: { en: '1-5-30 Kiba, Koto-ku, Tokyo', ja: '東京都江東区木場1-5-30' },
    hours: '9:00–22:00'
  },
  {
    id: 'maxvalu',
    brand: { en: 'MaxValu', ja: 'マックスバリュ' },
    branch: { en: 'Shinonome', ja: '東雲店' },
    color: '#009944',
    lat: 35.6452, lng: 139.7998,
    address: { en: '2-4-11 Shinonome, Koto-ku, Tokyo', ja: '東京都江東区東雲2-4-11' },
    hours: '8:00–23:00'
  },
  {
    id: 'donki',
    brand: { en: 'Don Quijote', ja: 'ドン・キホーテ' },
    branch: { en: 'Shinjuku', ja: '新宿店' },
    color: '#d9a400',
    lat: 35.6933, lng: 139.7032,
    address: { en: '3-36-16 Shinjuku, Shinjuku-ku, Tokyo', ja: '東京都新宿区新宿3-36-16' },
    hours: '24 hours'
  },
  {
    id: 'life',
    brand: { en: 'Life', ja: 'ライフ' },
    branch: { en: 'Shibuya Higashi', ja: '渋谷東店' },
    color: '#0072bc',
    lat: 35.6585, lng: 139.7043,
    address: { en: '2-14-5 Shibuya, Shibuya-ku, Tokyo', ja: '東京都渋谷区渋谷2-14-5' },
    hours: '9:30–23:00'
  },
  {
    id: 'aeon',
    brand: { en: 'AEON Style', ja: 'イオンスタイル' },
    branch: { en: 'Itabashi', ja: '板橋店' },
    color: '#a2122f',
    lat: 35.7455, lng: 139.7092,
    address: { en: '1-55-16 Itabashi, Itabashi-ku, Tokyo', ja: '東京都板橋区板橋1-55-16' },
    hours: '8:00–23:00'
  },
  {
    id: 'gyomu',
    brand: { en: 'Gyomu Super', ja: '業務スーパー' },
    branch: { en: 'Nakano', ja: '中野店' },
    color: '#f36f21',
    lat: 35.7076, lng: 139.6658,
    address: { en: '5-3-1 Nakano, Nakano-ku, Tokyo', ja: '東京都中野区中野5-3-1' },
    hours: '9:00–21:00'
  },
  {
    id: 'seiyu',
    brand: { en: 'Seiyu', ja: '西友' },
    branch: { en: 'Koenji', ja: '高円寺店' },
    color: '#004098',
    lat: 35.7053, lng: 139.6498,
    address: { en: '3-22-3 Koenji-kita, Suginami-ku, Tokyo', ja: '東京都杉並区高円寺北3-22-3' },
    hours: '24 hours'
  },
  {
    id: 'ok',
    brand: { en: 'OK Store', ja: 'OKストア' },
    branch: { en: 'Sangenjaya', ja: '三軒茶屋店' },
    color: '#e30613',
    lat: 35.6435, lng: 139.6698,
    address: { en: '4-1-1 Taishido, Setagaya-ku, Tokyo', ja: '東京都世田谷区太子堂4-1-1' },
    hours: '9:00–22:00'
  },
  {
    id: 'costco',
    brand: { en: 'Costco', ja: 'コストコ' },
    branch: { en: 'Kawasaki', ja: '川崎倉庫店' },
    color: '#005daa',
    lat: 35.6152, lng: 139.6515,
    address: { en: '1-1-1 Ikegamishinden, Kawasaki-ku, Kawasaki', ja: '神奈川県川崎市川崎区池上新田1-1-1' },
    hours: '10:00–20:00'
  }
];

/* endsIn = days from today, so the demo never goes stale. */
window.SEED_DEALS = [
  /* Seijo Ishii — Gransta Tokyo */
  { id: 'seijo-1', shopId: 'seijo', cat: 'meat',    name: { en: 'Sangen pork loin',            ja: '三元豚 ロース' },             was: 1180, now: 880,  note: { en: '2 slices', ja: '2枚' },        endsIn: 2, postedDaysAgo: 0 },
  { id: 'seijo-2', shopId: 'seijo', cat: 'dairy',   name: { en: 'Hokkaido butter',              ja: '北海道バター' },                was: 698,  now: 548,  note: { en: '200 g', ja: '200g' },          endsIn: 4, postedDaysAgo: 1 },
  { id: 'seijo-3', shopId: 'seijo', cat: 'pantry',  name: { en: 'Extra virgin olive oil',       ja: 'エキストラバージンオリーブオイル' }, was: 1280, now: 980, note: { en: '500 ml', ja: '500ml' },        endsIn: 7, postedDaysAgo: 1 },
  { id: 'seijo-4', shopId: 'seijo', cat: 'meat',    name: { en: 'Prosciutto offcuts',           ja: '生ハム 切り落とし' },           was: 880,  now: 680,  note: { en: 'approx. 80 g', ja: '約80g' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'seijo-5', shopId: 'seijo', cat: 'drinks',  name: { en: 'Craft beer assortment',        ja: 'クラフトビール 詰め合わせ' },   was: 498,  now: 398,  note: { en: '2 bottles', ja: '2本' },       endsIn: 5, postedDaysAgo: 2 },

  /* Summit — Mita */
  { id: 'summit-1', shopId: 'summit', cat: 'meat',   name: { en: 'Japanese beef offcuts',        ja: '国産牛 こま切れ' },            was: 1280, now: 880, note: { en: 'approx. 300 g', ja: '約300g' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'summit-2', shopId: 'summit', cat: 'fish',   name: { en: 'Gindara saikyo-yaki',          ja: '銀だら 西京漬' },              was: 980,  now: 680, note: { en: '2 pieces', ja: '2切れ' },      endsIn: 2, postedDaysAgo: 0 },
  { id: 'summit-3', shopId: 'summit', cat: 'produce',name: { en: 'Organic vegetable box',        ja: '有機野菜セット' },             was: 980,  now: 780, note: { en: '5–6 items', ja: '5〜6品' },     endsIn: 3, postedDaysAgo: 1 },
  { id: 'summit-4', shopId: 'summit', cat: 'dairy',  name: { en: 'Yogurt cups',                  ja: 'プレーンヨーグルト 4個パック' }, was: 298, now: 218, note: { en: '4 × 100 g', ja: '4個入' },     endsIn: 6, postedDaysAgo: 1 },
  { id: 'summit-5', shopId: 'summit', cat: 'bakery', name: { en: 'Butter rolls',                 ja: 'ロールパン 6個入' },           was: 238,  now: 168, note: { en: '6 rolls', ja: '6個入' },       endsIn: 1, postedDaysAgo: 0 },

  /* Ito-Yokado — Kiba */
  { id: 'kiba-1', shopId: 'kiba', cat: 'fish',    name: { en: 'Sashimi platter',               ja: '刺身 3点盛り合わせ' },          was: 1480, now: 980, note: { en: 'serves 2–3', ja: '2〜3人前' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'kiba-2', shopId: 'kiba', cat: 'meat',    name: { en: 'Chicken breast',                ja: '国産鶏むね肉' },                was: 498,  now: 378, note: { en: 'approx. 500 g', ja: '約500g' }, endsIn: 2, postedDaysAgo: 0 },
  { id: 'kiba-3', shopId: 'kiba', cat: 'bakery',  name: { en: 'Yamazaki white bread',          ja: '山崎製パン 食パン' },           was: 178,  now: 128, note: { en: '6 slices', ja: '6枚切' },      endsIn: 4, postedDaysAgo: 1 },
  { id: 'kiba-4', shopId: 'kiba', cat: 'frozen',  name: { en: 'Häagen-Dazs mini cups',         ja: 'ハーゲンダッツ ミニカップ' },   was: 348,  now: 248, note: { en: '1 cup', ja: '1個' },           endsIn: 3, postedDaysAgo: 1 },
  { id: 'kiba-5', shopId: 'kiba', cat: 'household', name: { en: 'Kitchen paper 4 rolls',       ja: 'キッチンペーパー 4ロール' },    was: 398,  now: 298, note: { en: '4 rolls', ja: '4ロール' },     endsIn: 9, postedDaysAgo: 2 },

  /* MaxValu — Shinonome */
  { id: 'maxvalu-1', shopId: 'maxvalu', cat: 'fish',    name: { en: 'Yellowfin tuna block',      ja: 'メバチマグロ 柵' },             was: 980, now: 680, note: { en: 'approx. 200 g', ja: '約200g' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'maxvalu-2', shopId: 'maxvalu', cat: 'produce', name: { en: 'Spinach',                   ja: 'ほうれん草' },                  was: 248, now: 158, note: { en: '1 bunch', ja: '1束' },          endsIn: 2, postedDaysAgo: 0 },
  { id: 'maxvalu-3', shopId: 'maxvalu', cat: 'dairy',   name: { en: 'Meiji Oishii milk 1 L',     ja: '明治 おいしい牛乳 1L' },        was: 238, now: 188, note: { en: '1 L', ja: '1L' },              endsIn: 5, postedDaysAgo: 1 },
  { id: 'maxvalu-4', shopId: 'maxvalu', cat: 'frozen',  name: { en: 'Frozen mixed berries',      ja: '冷凍ミックスベリー' },           was: 498, now: 348, note: { en: '300 g', ja: '300g' },            endsIn: 3, postedDaysAgo: 1 },
  { id: 'maxvalu-5', shopId: 'maxvalu', cat: 'household', name: { en: 'Toilet paper 12 rolls',   ja: 'トイレットペーパー 12ロール' }, was: 698, now: 498, note: { en: '12 rolls', ja: '12ロール' },      endsIn: 8, postedDaysAgo: 2 },

  /* Don Quijote — Shinjuku */
  { id: 'donki-1', shopId: 'donki', cat: 'snacks', name: { en: 'Umaibo corn snacks',            ja: 'うまい棒 30本入' },             was: 398,  now: 298, note: { en: '30 sticks', ja: '30本入' },     endsIn: 6, postedDaysAgo: 1 },
  { id: 'donki-2', shopId: 'donki', cat: 'snacks', name: { en: 'Big bag potato chips',          ja: '大容量ポテトチップス' },        was: 298,  now: 198, note: { en: '1 bag', ja: '1袋' },            endsIn: 3, postedDaysAgo: 0 },
  { id: 'donki-3', shopId: 'donki', cat: 'drinks', name: { en: 'Asahi Super Dry 6-pack',        ja: 'アサヒ スーパードライ 6本' },   was: 1280, now: 980, note: { en: '350 ml × 6', ja: '350ml×6' },  endsIn: 2, postedDaysAgo: 0 },
  { id: 'donki-4', shopId: 'donki', cat: 'meat',   name: { en: 'Pork belly slices',             ja: '国産豚バラ肉' },                was: 798,  now: 598, note: { en: 'approx. 400 g', ja: '約400g' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'donki-5', shopId: 'donki', cat: 'household', name: { en: 'Face masks 30-pack',         ja: '不織布マスク 30枚' },           was: 498,  now: 348, note: { en: '30 masks', ja: '30枚入' },      endsIn: 10, postedDaysAgo: 2 },

  /* Life — Shibuya Higashi */
  { id: 'life-1', shopId: 'life', cat: 'fish',    name: { en: 'Salted salmon fillet',          ja: '天然塩鮭 切り身' },             was: 498, now: 348, note: { en: '2 pieces', ja: '2切れ' },       endsIn: 1, postedDaysAgo: 0 },
  { id: 'life-2', shopId: 'life', cat: 'produce', name: { en: 'Ripe tomatoes',                 ja: '完熟トマト' },                  was: 298, now: 198, note: { en: '3 pack', ja: '3個入' },          endsIn: 2, postedDaysAgo: 0 },
  { id: 'life-3', shopId: 'life', cat: 'bakery',  name: { en: 'Life bakery croissants',        ja: 'ライフベーカリー クロワッサン' }, was: 198, now: 138, note: { en: '3 pieces', ja: '3個入' },       endsIn: 1, postedDaysAgo: 0 },
  { id: 'life-4', shopId: 'life', cat: 'snacks',  name: { en: 'Morinaga chocolate',            ja: '森永製菓 チョコレート' },       was: 258, now: 178, note: { en: '1 box', ja: '1箱' },            endsIn: 5, postedDaysAgo: 1 },
  { id: 'life-5', shopId: 'life', cat: 'drinks',  name: { en: 'Sparkling water 6-pack',        ja: '炭酸水 500ml×6' },              was: 398, now: 298, note: { en: '500 ml × 6', ja: '500ml×6' },   endsIn: 7, postedDaysAgo: 2 },

  /* AEON Style — Itabashi */
  { id: 'aeon-1', shopId: 'aeon', cat: 'meat',    name: { en: 'Australian beef sirloin block', ja: '豪州産 牛サーロイン塊' },        was: 1980, now: 1380, note: { en: 'approx. 500 g', ja: '約500g' }, endsIn: 2, postedDaysAgo: 0 },
  { id: 'aeon-2', shopId: 'aeon', cat: 'meat',    name: { en: 'Japanese pork loin',            ja: '国産豚ロース 切身' },            was: 698,  now: 498,  note: { en: '4 slices', ja: '4枚入' },        endsIn: 1, postedDaysAgo: 0 },
  { id: 'aeon-3', shopId: 'aeon', cat: 'produce', name: { en: 'Shine Muscat grapes',           ja: 'シャインマスカット' },           was: 1280, now: 880,  note: { en: '1 bunch', ja: '1房' },           endsIn: 3, postedDaysAgo: 0 },
  { id: 'aeon-4', shopId: 'aeon', cat: 'dairy',   name: { en: 'Meiji Bulgaria yogurt 400 g',   ja: '明治ブルガリアヨーグルト 400g' }, was: 238, now: 178,  note: { en: '400 g', ja: '400g' },             endsIn: 5, postedDaysAgo: 1 },
  { id: 'aeon-5', shopId: 'aeon', cat: 'pantry',  name: { en: 'Koshihikari rice 5 kg',         ja: 'コシヒカリ 5kg' },               was: 2480, now: 1980, note: { en: '5 kg', ja: '5kg' },              endsIn: 8, postedDaysAgo: 2 },

  /* Gyomu Super — Nakano */
  { id: 'gyomu-1', shopId: 'gyomu', cat: 'frozen',    name: { en: 'Frozen gyoza 50 pieces',    ja: '冷凍餃子 50個入' },             was: 698, now: 548, note: { en: '50 pieces', ja: '50個入' },      endsIn: 6, postedDaysAgo: 1 },
  { id: 'gyomu-2', shopId: 'gyomu', cat: 'pantry',    name: { en: 'Spaghetti 1 kg',            ja: 'スパゲッティ 1kg' },            was: 398, now: 298, note: { en: '1 kg', ja: '1kg' },              endsIn: 12, postedDaysAgo: 2 },
  { id: 'gyomu-3', shopId: 'gyomu', cat: 'frozen',    name: { en: 'Frozen broccoli',           ja: '冷凍ブロッコリー' },            was: 498, now: 398, note: { en: '500 g', ja: '500g' },             endsIn: 9, postedDaysAgo: 1 },
  { id: 'gyomu-4', shopId: 'gyomu', cat: 'snacks',    name: { en: 'Chocolate snack big bag',   ja: 'チョコレート菓子 大袋' },       was: 328, now: 248, note: { en: '1 bag', ja: '1袋' },              endsIn: 4, postedDaysAgo: 0 },
  { id: 'gyomu-5', shopId: 'gyomu', cat: 'household', name: { en: 'Laundry detergent 3 kg',    ja: '洗濯洗剤 3kg' },                was: 698, now: 548, note: { en: '3 kg', ja: '3kg' },               endsIn: 14, postedDaysAgo: 3 },

  /* Seiyu — Koenji */
  { id: 'seiyu-1', shopId: 'seiyu', cat: 'pantry', name: { en: 'Fresh ramen noodles 3 servings', ja: '生ラーメン 3食入' },          was: 398, now: 298, note: { en: '3 servings', ja: '3食入' },    endsIn: 5, postedDaysAgo: 1 },
  { id: 'seiyu-2', shopId: 'seiyu', cat: 'meat',   name: { en: 'Chicken thigh',                   ja: '国産若鶏もも肉' },             was: 698, now: 498, note: { en: 'approx. 500 g', ja: '約500g' }, endsIn: 2, postedDaysAgo: 0 },
  { id: 'seiyu-3', shopId: 'seiyu', cat: 'drinks', name: { en: 'Kagome tomato juice',             ja: 'カゴメ トマトジュース' },      was: 258, now: 178, note: { en: '1 L', ja: '1L' },             endsIn: 4, postedDaysAgo: 0 },
  { id: 'seiyu-4', shopId: 'seiyu', cat: 'dairy',  name: { en: 'Megmilk milk 1 L',                ja: '雪印メグミルク 牛乳 1L' },     was: 218, now: 168, note: { en: '1 L', ja: '1L' },             endsIn: 1, postedDaysAgo: 0 },
  { id: 'seiyu-5', shopId: 'seiyu', cat: 'frozen', name: { en: 'Frozen karaage',                  ja: '冷凍からあげ' },               was: 498, now: 348, note: { en: '300 g', ja: '300g' },           endsIn: 3, postedDaysAgo: 1 },

  /* OK Store — Sangenjaya */
  { id: 'ok-1', shopId: 'ok', cat: 'produce', name: { en: 'Bananas',                 ja: 'バナナ' },                 was: 248, now: 158, note: { en: '1 bunch', ja: '1房' },        endsIn: 2, postedDaysAgo: 0 },
  { id: 'ok-2', shopId: 'ok', cat: 'meat',    name: { en: 'Pork mince',              ja: '豚こま切れ肉' },           was: 598, now: 428, note: { en: 'approx. 400 g', ja: '約400g' }, endsIn: 1, postedDaysAgo: 0 },
  { id: 'ok-3', shopId: 'ok', cat: 'fish',    name: { en: 'Canned mackerel',         ja: 'サバ缶' },                 was: 198, now: 148, note: { en: '1 can', ja: '1缶' },           endsIn: 7, postedDaysAgo: 1 },
  { id: 'ok-4', shopId: 'ok', cat: 'bakery',  name: { en: 'White bread 6 slices',    ja: '食パン 6枚切' },           was: 158, now: 108, note: { en: '6 slices', ja: '6枚' },        endsIn: 1, postedDaysAgo: 0 },
  { id: 'ok-5', shopId: 'ok', cat: 'frozen',  name: { en: 'Frozen pizza',            ja: '冷凍ピザ' },               was: 398, now: 298, note: { en: '1 pizza', ja: '1枚' },         endsIn: 6, postedDaysAgo: 2 },

  /* Costco — Kawasaki */
  { id: 'costco-1', shopId: 'costco', cat: 'meat',    name: { en: 'Bulgogi beef 1.2 kg',        ja: 'プルコギ 牛肉 1.2kg' },        was: 2980, now: 2380, note: { en: '1.2 kg', ja: '1.2kg' },          endsIn: 4, postedDaysAgo: 1 },
  { id: 'costco-2', shopId: 'costco', cat: 'bakery',  name: { en: 'Dinner rolls 36-pack',        ja: 'ディナーロール 36個入' },      was: 998,  now: 798,  note: { en: '36 rolls', ja: '36個入' },       endsIn: 2, postedDaysAgo: 0 },
  { id: 'costco-3', shopId: 'costco', cat: 'fish',    name: { en: 'Salmon fillet',              ja: 'サーモンフィレ' },             was: 2480, now: 1980, note: { en: 'approx. 1 kg', ja: '約1kg' },    endsIn: 3, postedDaysAgo: 0 },
  { id: 'costco-4', shopId: 'costco', cat: 'snacks',  name: { en: 'Mixed nuts 1.1 kg',          ja: 'ミックスナッツ 1.1kg' },       was: 1980, now: 1580, note: { en: '1.1 kg', ja: '1.1kg' },          endsIn: 10, postedDaysAgo: 2 },
  { id: 'costco-5', shopId: 'costco', cat: 'household', name: { en: 'Paper towels 12-pack',     ja: 'ペーパータオル 12個' },        was: 2980, now: 2480, note: { en: '12 rolls', ja: '12個' },        endsIn: 15, postedDaysAgo: 3 }
];
