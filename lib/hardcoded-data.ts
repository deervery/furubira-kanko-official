/**
 * Static tourism data converted from Supabase CSV exports.
 * Used by cms-service.ts and the CMS API route to avoid Supabase queries.
 */

// ---------- Raw row types (before lang resolution / image resolution) ----------

export interface RawSpot {
  id: string
  name: string
  description: string
  address: string
  facilities: string
  image_path: string
  icon: string
  url: string
  display_order: number
  name_en: string
  description_en: string
  facilities_en: string
}

export interface RawRestaurant {
  id: string
  name: string
  description: string
  image_path: string
  icon: string
  url: string
  display_order: number
  name_en: string
  description_en: string
}

export interface RawAccommodation {
  id: string
  name: string
  description: string
  image_path: string
  icon: string
  url: string
  display_order: number
  name_en: string
  description_en: string
}

export interface RawEvent {
  id: string
  name: string
  description: string
  date: string
  image_path: string
  icon: string
  url: string
  display_order: number
  name_en: string
  description_en: string
  date_en: string
}

export interface RawShop {
  id: string
  name: string
  description: string
  type: string
  image_path: string
  icon: string
  url: string
  display_order: number
  name_en: string
  description_en: string
  type_en: string
}

export interface RawTourCategory {
  id: string
  key: string
  description: string
  name: string
}

// ---------- Static data ----------

export const spotsData: RawSpot[] = [
  {
    id: "11bbc499-3138-44a7-ac91-6cae00886057",
    name: "丸山",
    description: "気軽なハイキングから本格登山まで楽しめる、絶景スポット。",
    address: "",
    facilities: "",
    image_path: "/photos/spots/1743473526133-ChatGPT_Image_2025_4_1__11_11_06.png",
    icon: "MapPin",
    url: "https://yamap.com/mountains/17348",
    display_order: 9,
    name_en: "Mt. Maruyama",
    description_en: "A scenic spot perfect for a casual hike.",
    facilities_en: "",
  },
  {
    id: "17e1e05e-2840-468b-a8a9-a405dd2c1258",
    name: "ふるびらあいらんど広場パークゴルフ場",
    description: "海に面した全27ホールのパークゴルフ場。用具のレンタルあり。",
    address: "古平町入船町22",
    facilities: "",
    image_path: "/photos/spots/golfpark.jpg",
    icon: "MapPin",
    url: "http://kazokuryokoumura.com/airandhiroba",
    display_order: 7,
    name_en: "Furubira Park Golf Course",
    description_en: "A 27-hole park golf course facing the sea. Rental equipment available.",
    facilities_en: "",
  },
  {
    id: "23a23cc9-a0c6-4123-b702-e111e191f174",
    name: "古平町図書館",
    description: "木の温もりが感じられる空間で、読書と憩いのひとときを。",
    address: "古平町大字浜町50番地 古平町複合施設「かなえーる」2階",
    facilities: "",
    image_path: "/photos/spots/1743472612249-library.jpg",
    icon: "MapPin",
    url: "https://www.lib-eye.net/furubira/",
    display_order: 2,
    name_en: "Furubira Town Library",
    description_en: "A warm, wood-accented space where you can relax and enjoy reading.",
    facilities_en: "",
  },
  {
    id: "24f8d0c6-f57d-4e19-8640-05953d2e1629",
    name: "道の駅「たらこミュージアム」",
    description: "地元の新鮮な海産物や特産品を販売。レストランでは地元の食材を使用した料理を提供。観光情報コーナーも併設。",
    address: "古平町浜町40-4",
    facilities: "駐車場、トイレ、レストラン、物産販売所",
    image_path: "/photos/spots/michinoeki.jpg",
    icon: "MapPin",
    url: "https://www.furubira-tarakomuseum.com/",
    display_order: 0,
    name_en: "Michi-no-Eki Furubira Tarako Museum (Roadside Station)",
    description_en: "Local pollack roe (tarako) and other regional specialties are sold here. The on-site restaurant serves a variety of dishes made with pollack roe, and there is also a tourist information corner.",
    facilities_en: "parking lot, restrooms, restaurant, and local products shop.",
  },
  {
    id: "85779abc-a0e1-49bf-8900-a4e3e92426f1",
    name: "チョペタン林道",
    description: "「北海道民有林治山林道100選」金賞を受賞した絶景ルート。普段は施錠されております。御用の際は古平町役場産業課（0135-48-9840）へお問い合わせください。",
    address: "",
    facilities: "",
    image_path: "/photos/spots/1743473054020-setakamuy.png",
    icon: "MapPin",
    url: "",
    display_order: 6,
    name_en: "Chopetan Forest Road",
    description_en: "A scenic route that won the Gold Prize in the \"Top 100 Hokkaido Community Forest Conservation Roads.\" Normally locked; for access inquiries, please contact the Furubira Town Office Industry Division (0135-48-9840).",
    facilities_en: "",
  },
  {
    id: "a2712074-4698-41fb-a317-b9f7899a5d31",
    name: "創作活動室",
    description: "地域交流やイベントに活用できる多機能スペース。",
    address: "古平町浜町50番地 古平町複合施設「かなえーる」3階",
    facilities: "",
    image_path: "/photos/spots/1743472623463-creation.jpg",
    icon: "MapPin",
    url: "https://www.town.furubira.lg.jp/town/detail.php?id=281",
    display_order: 3,
    name_en: "Multipurpose Room",
    description_en: "A multifunctional space used for community activities and events.",
    facilities_en: "",
  },
  {
    id: "a62d26c2-ae12-465e-9e62-58699174d419",
    name: "ふるびら温泉しおかぜ",
    description: "海を望むロケーションと濃厚な褐色の湯が特徴の温泉施設。",
    address: "古平町新地町90",
    facilities: "",
    image_path: "/photos/spots/1743473616419-shiokaze.jpg",
    icon: "MapPin",
    url: "https://onsen.furubira.com/",
    display_order: 0,
    name_en: "Furubira Onsen Shiokaze",
    description_en: "A hot spring facility featuring ocean views and rich, brown mineral waters.",
    facilities_en: "",
  },
  {
    id: "a84d65d2-9de1-46ce-a03f-c78799b7580c",
    name: "れい明の里",
    description: "運が良ければ幻想的な雲海や美しい夜景が広がる場所。",
    address: "古平町歌棄町204番地9",
    facilities: "",
    image_path: "/photos/spots/1743472842173-Snapins.ai_348249135_3090396221262174_485681890775107335_n_1080.jpg",
    icon: "MapPin",
    url: "https://maps.app.goo.gl/5jQd5FuEmCSaS3sC8",
    display_order: 4,
    name_en: "Reimei-no-Sato",
    description_en: "A spot where, with good luck, you can witness mystical sea clouds and beautiful night views.",
    facilities_en: "",
  },
  {
    id: "e8ef1039-8342-49d2-b652-50f9e298a993",
    name: "群来（くき）",
    description: "春先に見られる、ニシンの産卵が生み出す神秘的な自然現象。",
    address: "古平町群来町",
    facilities: "",
    image_path: "/photos/spots/1743473054020-setakamuy.png",
    icon: "MapPin",
    url: "https://maps.app.goo.gl/5iQmarJPPW6U63FM8",
    display_order: 8,
    name_en: "Kuki (Herring Spawning Phenomenon)",
    description_en: "A mystical natural phenomenon caused by herring spawning, seen in early spring.",
    facilities_en: "",
  },
  {
    id: "fb1c04fe-65c5-493e-9250-57e1577233ec",
    name: "セタカムイ岩",
    description: "漁に出た飼い主を待ち続けた犬が岩になったという伝説が残る、「犬の神」の名を持つ奇岩・セタカムイ岩。",
    address: "",
    facilities: "",
    image_path: "",
    icon: "MapPin",
    url: "",
    display_order: 0,
    name_en: "Setakamui Rock",
    description_en: "Setakamui Rock is a uniquely shaped rock whose name means \"Dog God\" in the language of the Ainu, the indigenous people of northern Japan. According to legend, it is a dog that waited so long for its owner who never returned from fishing that it turned into stone.",
    facilities_en: "",
  },
]

export const restaurantsData: RawRestaurant[] = [
  {
    id: "0c9a7e95-9bca-442b-8631-1f932e72f8b3",
    name: "港寿し",
    description: "四季折々の地元魚介類の握り寿司やいくら丼を提供。2017年ミシュラン北海道版ビブグルマン選出。",
    image_path: "/photos/restaurants/minato.jpg",
    icon: "Utensils",
    url: "https://www.instagram.com/furubira__minatozushi/",
    display_order: 2,
    name_en: "Minato Sushi",
    description_en: "Offers seasonal local seafood nigiri sushi and salmon roe bowls. Selected for the 2017 Michelin Hokkaido Bib Gourmand.",
  },
  {
    id: "287b232b-8ba2-48a1-a8c5-2e5f6da4e17c",
    name: "野村商店",
    description: "北海道産の希少な姫鱒（チップ）の囲炉裏焼きを味わえる店。姫鱒の販売も行う。",
    image_path: "/photos/restaurants/1743470575143-npmura.jpg",
    icon: "Utensils",
    url: "https://www.himemasu-hokkaido.com/",
    display_order: 0,
    name_en: "Nomura Store",
    description_en: "A shop where you can enjoy irori-grilled Hokkaido-grown rare himemasu (landlocked salmon). Himemasu is also sold here.",
  },
  {
    id: "dd5793b7-2699-4b90-a4b7-78ada7c507b7",
    name: "新家寿司",
    description: "地元の新鮮な魚介を使った寿司を提供。",
    image_path: "/photos/restaurants/1743470389107-shinyasushi.jpg",
    icon: "Utensils",
    url: "https://furubirashinyasushi.com/",
    display_order: 1,
    name_en: "Shinya Sushi",
    description_en: "Serving sushi made with fresh local seafood.",
  },
  {
    id: "c877c6ec-3d10-42ed-a897-372bdc054bf1",
    name: "田畑菓子店",
    description: "明治27年創業の老舗菓子店。人気商品は「礁」や「タバターサンド」。",
    image_path: "/photos/shops/tabata.jpg",
    icon: "Coffee",
    url: "https://maps.app.goo.gl/sSgAxL6suFRiQKQ79",
    display_order: 3,
    name_en: "Tabata Confectionery",
    description_en: "A long-established confectionery founded in 1894. Popular items include the \"Iso\" sweet and \"Tabata Sando\".",
  },
  {
    id: "834e8869-045c-43b0-a3d5-bf3be468483e",
    name: "おやつ屋 medetai",
    description: "「鯛焼き×愛でたい」がコンセプトの、古平町の小さなおやつ屋。米粉のたい焼きやおはぎ、季節のおやつが並ぶ。月・火曜営業。",
    // TODO: 写真を public/photos/restaurants/medetai.jpg に置いたら差し替える
    image_path: "/no_photo.jpg",
    icon: "Coffee",
    url: "https://www.instagram.com/oyatsuya.medetai/",
    display_order: 4,
    name_en: "Oyatsuya Medetai",
    description_en: "A tiny sweets shop in Furubira built around taiyaki. Rice-flour taiyaki, ohagi rice cakes and seasonal treats. Open Mondays and Tuesdays.",
  },
  {
    id: "5ddbb273-d3b8-4bbf-826d-b461291578a9",
    name: "喫茶それなり",
    description: "食事もできる漫画喫茶。自家焙煎珈琲とスコーン、ホットサンドが楽しめる。テイクアウト可。11:00〜20:00、火・水曜定休。",
    image_path: "/photos/restaurants/sorenari.jpg",
    icon: "Coffee",
    url: "https://www.instagram.com/cafe_moderately/",
    display_order: 5,
    name_en: "Kissa Sorenari",
    description_en: "A manga cafe in Furubira where you can also eat. House-roasted coffee, scones and hot sandwiches, with takeout available. 11:00-20:00, closed Tuesdays and Wednesdays.",
  },
]

export const accommodationsData: RawAccommodation[] = [
  {
    id: "37a7d97e-a7fb-4d65-ae74-16e4b3bdcc10",
    name: "民宿ほり",
    description: "地元の食材を活かしたアットホームな家庭料理が特徴。",
    image_path: "/photos/accommodations/setakamuy.png",
    icon: "BedDouble",
    url: "https://maps.app.goo.gl/NxrQrdBngaSBJoPa6",
    display_order: 0,
    name_en: "Minshuku Hori Guesthouse",
    description_en: "Known for its homestyle dishes made with fresh local ingredients.",
  },
  {
    id: "5482545d-c3f5-473a-97c9-3456d19a3188",
    name: "中央旅館",
    description: "古平町の中心にある、あたたかな雰囲気の旅館。",
    image_path: "/photos/accommodations/setakamuy.png",
    icon: "BedDouble",
    url: "https://maps.app.goo.gl/dcF6eAvgJiGV8RFA8",
    display_order: 0,
    name_en: "Chuo Ryokan",
    description_en: "A warm and welcoming ryokan located in the center of Furubira.",
  },
  {
    id: "bd564797-2d50-46c3-9d79-bf4fe1f35001",
    name: "民泊 じもっトFURUBIRA",
    description: "自然と楽しみが広がるファミリー向けのフレンドリーな民泊",
    image_path: "/photos/accommodations/jimotto.jpg",
    icon: "BedDouble",
    url: "https://jimotto-furubira.com/",
    display_order: 3,
    name_en: "Guesthouse Jimotto FURUBIRA",
    description_en: "A family-friendly guesthouse offering a warm atmosphere and nature-filled enjoyment.",
  },
  {
    id: "e5a82f7a-f7f3-43bd-96b8-cdf612f9dc0d",
    name: "カールふるびら",
    description: "古平町民と交流できる民泊。",
    image_path: "/photos/accommodations/curl_furubira.jpg",
    icon: "BedDouble",
    url: "https://curl-furubira.com/",
    display_order: 4,
    name_en: "Curl Furubira",
    description_en: "A guesthouse where visitors can interact with local residents. Available to book on Airbnb.",
  },
]

export const eventsData: RawEvent[] = [
  {
    id: "0471991d-ce71-4fa9-8c0a-6201fee82bb8",
    name: "花手水",
    description: "夏の火渡り前に、琴平神社の手水舎が彩り豊かな花手水で華やかに。",
    date: "7月",
    image_path: "/photos/events/hanachozu.jpg",
    icon: "Calendar",
    url: "https://www.instagram.com/reel/C8WkO3mJUjc/",
    display_order: 2,
    name_en: "Floral Chozuya (Flower Water Basin)",
    description_en: "Before the summer fire-walking ritual, the water pavilion at Kotohira Shrine is beautifully decorated with flower arrangements.",
    date_en: "July",
  },
  {
    id: "23206613-9a66-4e31-8dc0-3f7fa4f7f764",
    name: "琴平神社例大祭",
    description: "燃え盛る炎を天狗が渡り、漁業の安全と大漁を祈願する勇壮な祭り。",
    date: "7月",
    image_path: "/photos/events/1743054997611-kotohira.jpeg",
    icon: "Calendar",
    url: "https://matsurito.jp/matsuri/kotohirajinjareitaisai-tengunohiwatari/index.html",
    display_order: 3,
    name_en: "Kotohira Shrine Annual Festival",
    description_en: "A dynamic festival where a tengu, a legendary long-nosed spirit from Japanese folklore, walks across blazing flames to pray for fishermen's safety and abundant catches.",
    date_en: "July",
  },
  {
    id: "47550bbf-ed4f-41c2-a652-0fd8934238fb",
    name: "ふるびらブルーマルシェ",
    description: "地元産品が集まる青空市。",
    date: "6月開催",
    image_path: "/photos/events/1743471634756-blue.jpg",
    icon: "Calendar",
    url: "https://www.instagram.com/furubira_blue_marche/",
    display_order: 0,
    name_en: "Furubira Blue Marche",
    description_en: "An open-air market featuring local products.",
    date_en: "June",
  },
  {
    id: "4d24f346-9235-4186-958b-3b8bb0e1ab05",
    name: "ふるびら温泉しおかぜ夏祭り",
    description: "子どもからご年配の方まで集まり、露店やイベントで賑わう夏の恒例行事。",
    date: "8月",
    image_path: "/photos/events/1743471311560-onsenmatsuri.jpg",
    icon: "Calendar",
    url: "https://www.instagram.com/reel/C-MMrKvSkG8/",
    display_order: 6,
    name_en: "Furubira Onsen Shiokaze Summer Festival",
    description_en: "A summer event enjoyed by all ages, featuring food stalls and lively entertainment.",
    date_en: "August",
  },
  {
    id: "7e54811a-448f-4cf9-9af2-69b2fae52bb6",
    name: "納涼ビアガーデン",
    description: "ビールや焼き鳥に加え、○×ゲームやビンゴ大会、生演奏や盆踊りも楽しめるビアガーデン。",
    date: "8月",
    image_path: "",
    icon: "Calendar",
    url: "",
    display_order: 1,
    name_en: "Summer Evening Beer Garden",
    description_en: "A beer garden offering beer, grilled skewers, tic-tac-toe games, bingo, live music, and bon-odori dance.",
    date_en: "August",
  },
  {
    id: "7fcaf8cd-74c9-420f-b5f3-88d93d1d5290",
    name: "漁協祭",
    description: "新鮮な魚介や加工品を楽しめる祭り。特にウニ（6-7月）やサケ（9月）が人気。",
    date: "夏季開催",
    image_path: "/photos/events/gyokyosai.jpg",
    icon: "Calendar",
    url: "https://www.town.furubira.lg.jp/topic/?id=202",
    display_order: 4,
    name_en: "Fishery Cooperative Festival",
    description_en: "A festival featuring fresh seafood and local processed products. Sea urchin (June\u2013July) and salmon (September) are especially popular.",
    date_en: "Summer",
  },
  {
    id: "ac108a67-1525-4959-9b6c-05ee49362885",
    name: "恵比須神社例大祭",
    description: "燃え盛る火柱を猿田彦（天狗）が蹴散らしながら進む、圧巻の神事。",
    date: "9月",
    image_path: "/photos/events/hiwatari_tengu_sub.jpg",
    icon: "Calendar",
    url: "https://www.shiribeshi.pref.hokkaido.lg.jp/ss/srk/kankou/kankou/168478.html",
    display_order: 7,
    name_en: "Ebisu Shrine Festival",
    description_en: "An impressive ritual where Sarutahiko (a tengu figure) advances through towering flames.",
    date_en: "September",
  },
  {
    id: "c03d0911-2a4e-4614-98f8-f2438f0cb7d5",
    name: "盆踊り大会",
    description: "古平の夏夜を彩る伝統行事、ふるびらの盆踊り。地域の人々が輪になり、軽快な音色に合わせて踊る、温かく賑やかなひととき。",
    date: "8月",
    image_path: "/photos/events/bonodori.png",
    icon: "Calendar",
    url: "https://www.instagram.com/reel/C-1c8kzyLM4/",
    display_order: 5,
    name_en: "Bon Odori Dance Festival",
    description_en: "A traditional summer event where locals gather in a circle and dance to cheerful music, creating a warm and lively atmosphere.",
    date_en: "August",
  },
  {
    id: "c50c009b-4926-4643-a933-f33e045e827c",
    name: "古平ゆき灯り",
    description: "雪と灯りが織りなす幻想的な光景が広がる、古平の冬の風物詩。",
    date: "2月",
    image_path: "/photos/events/yukiakari.jpg",
    icon: "Calendar",
    url: "https://www.instagram.com/reel/DFh9Nlgyh4e/",
    display_order: 8,
    name_en: "Furubira Snow Lantern Festival",
    description_en: "A winter tradition in Furubira featuring a magical scene created by snow and lantern light.",
    date_en: "February",
  },
]

export const shopsData: RawShop[] = [
  {
    id: "1a02fc58-f088-4563-a9c8-1cc00090a687",
    name: "株式会社 大島水産",
    description: "新鮮な海産物と加工品を提供。",
    type: "水産加工品",
    image_path: "/photos/shops/oshima.jpg",
    icon: "ShoppingBag",
    url: "https://maps.app.goo.gl/hm89cTqf37R7D9Dt7",
    display_order: 4,
    name_en: "Oshima Fisheries Co., Ltd.",
    description_en: "Offers fresh seafood and processed products.",
    type_en: "Processed Seafood Products",
  },
  {
    id: "1b912983-0353-4275-845d-a83c796b2d99",
    name: "田中商店",
    description: "季節ごとの新鮮な海産物や加工品が揃う、地元の台所。",
    type: "特産品店・直売所",
    image_path: "/photos/shops/1743472433154-tanakashop.jpg",
    icon: "ShoppingBag",
    url: "https://www.tanakasyouten.net/seafood/seafood.html",
    display_order: 7,
    name_en: "Tanaka Store",
    description_en: "A local market offering fresh seasonal seafood and processed products\u2014truly the town's kitchen.",
    type_en: "Local Specialty Shop",
  },
  {
    id: "21c9a951-b053-4f19-b5c4-008eb7dfafc4",
    name: "株式会社 よ 吉野",
    description: "地元の水産加工品を取り扱う老舗店。",
    type: "水産加工品",
    image_path: "/photos/shops/yojirushi.jpg",
    icon: "ShoppingBag",
    url: "https://www.yojirushi-yoshino.com/",
    display_order: 2,
    name_en: "Yoshino Co., Ltd.",
    description_en: "A long-established shop handling local seafood products.",
    type_en: "Processed Seafood Products",
  },
  {
    id: "364e990b-413a-480f-8c92-d54858180edf",
    name: "株式会社 カネト水産",
    description: "水産加工品の製造販売。",
    type: "水産加工品",
    image_path: "/photos/shops/kaneto.jpg",
    icon: "ShoppingBag",
    url: "https://kanetosuisan.net/",
    display_order: 1,
    name_en: "Kaneto Fisheries Co., Ltd.",
    description_en: "Manufactures and sells processed seafood products.",
    type_en: "Processed Seafood Products",
  },
  {
    id: "38531465-6aa0-4423-b035-3bc0b0b9c6b1",
    name: "ヤマダイふじた",
    description: "大正創業以来、古平の伝統製法を守り、人の感覚を頼りに最高のタラコを作り続けている水産加工店。",
    type: "たらこ、水産加工品",
    image_path: "https://scontent-nrt1-2.xx.fbcdn.net/v/t39.30808-6/486746939_1197327419065616_371802364562173026_n.jpg?stp=dst-jpg_p173x172_tt6&_nc_cat=102&ccb=1-7&_nc_sid=4cb600&_nc_ohc=CQ5IKTn8jyYQ7kNvwFX68ry&_nc_oc=AdmPdSZzJDL0evgcFt4CWCNi-hj-XFyiVp8eHvuZYSRyokSW5ZMrdClkSiO-mKUOrHA&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&_nc_gid=ZUijW1MCrgvH-t1N8ZlMoA&oh=00_AfKYQ6zEQXEUHzsMGlUB6BIxDp8xQHR8f3Df5gqWDZGNfA&oe=683B48D2",
    icon: "ShoppingBag",
    url: "https://yamadai-fujita.jp/",
    display_order: 5,
    name_en: "Yamadai Fujita",
    description_en: "A seafood processing shop established in the Taisho era, preserving Furubira's traditional methods to produce top-quality cod roe.",
    type_en: "Cod roe, processed seafood",
  },
  {
    id: "4fe59e91-bbef-4166-826f-37e803b1a370",
    name: "中村乾物店",
    description: "伝統の味を守る乾物店、海産物や特産品が並ぶ。",
    type: "海産珍味専門店",
    image_path: "/photos/shops/1743472498895-nakamura.jpg",
    icon: "ShoppingBag",
    url: "http://www2.snowman.ne.jp/~marunaka/index.htm",
    display_order: 9,
    name_en: "Nakamura Dried Goods Shop",
    description_en: "A dried-goods store preserving traditional flavors, offering seafood and local specialties.",
    type_en: "Specialty Store for Seafood Delicacies",
  },
  {
    id: "699295f6-8c9d-46d5-837b-ea7e9dfeefcd",
    name: "東しゃこたん漁協生産部直売所",
    description: "新鮮な地元の海産物を直売。",
    type: "直売所",
    image_path: "/photos/shops/gyokyo.jpg",
    icon: "ShoppingBag",
    url: "https://www.higashi-syakotangyokyou.com/",
    display_order: 0,
    name_en: "Higashi Shakotan Fishery Cooperative Direct Market",
    description_en: "Sells fresh local seafood.",
    type_en: "Direct Market",
  },
  {
    id: "ca98bc7e-eac9-4d92-a04b-e793040d2003",
    name: "株式会社 かねきち吉野",
    description: "伝統的な製法による水産加工品。",
    type: "水産加工品",
    image_path: "/photos/shops/kanekichi.jpg",
    icon: "ShoppingBag",
    url: "https://www.furubira-tarako.com/",
    display_order: 3,
    name_en: "Kanekichi Yoshino Co., Ltd.",
    description_en: "Processed seafood made using traditional methods.",
    type_en: "Processed Seafood Products",
  },
]

export const tourCategoriesData: RawTourCategory[] = [
  {
    id: "1f4d9a05-f5d0-4bc6-a9cc-c3454f2f028c",
    key: "shopping",
    description: "ここで買うから楽しい",
    name: "買い物・お土産",
  },
  {
    id: "5382e049-8571-4dd8-b396-8700728eef81",
    key: "accommodations",
    description: "心温まる古平の夜",
    name: "旅館・民泊",
  },
  {
    id: "65ef7a73-6234-418c-9e59-3f3b8cc4b515",
    key: "spots",
    description: "たまにはゆったりとした時間を",
    name: "観光スポット",
  },
  {
    id: "b4ba68c8-9771-4e95-9acd-661a41a909b5",
    key: "dining",
    description: "新鮮な海の幸を堪能する",
    name: "飲食店・軽食",
  },
]
