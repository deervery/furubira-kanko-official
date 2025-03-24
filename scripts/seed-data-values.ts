// スクリプト用のデータ（JSX構文を使わないバージョン）

// 観光スポットデータ
export const spotsData = [
    {
      id: "onsen",
      name: "ふるびら温泉しおかぜ",
      description: "海を望むロケーションと濃厚な褐色の湯が特徴の温泉施設。",
      address: "古平町浜町7-1",
      image: "/onsen.jpg",
      icon: "MapPin",
    },
    {
      id: "golf",
      name: "ふるびらあいらんど広場パークゴルフ場",
      description: "海に面した全27ホールのパークゴルフ場。用具のレンタルあり。",
      address: "古平町入船町22",
      image: "/golfpark.jpg",
      icon: "MapPin",
    },
    {
      id: "michinoeki",
      name: "道の駅 ふるびら",
      description:
        "地元の新鮮な海産物や特産品を販売。レストランでは地元の食材を使用した料理を提供。観光情報コーナーも併設。",
      address: "古平町新地町41-1",
      facilities: "駐車場、トイレ、レストラン、物産販売所",
      image: "/setakamuy.png",
      icon: "MapPin",
    },
  ];
  
  // 飲食店データ
  export const restaurantsData = [
    {
      id: "minato",
      name: "港寿し",
      description: "四季折々の地元魚介類の握り寿司やいくら丼を提供。2017年ミシュラン北海道版ビブグルマン選出。",
      image: "/minato.jpg",
      icon: "Utensils",
    },
    {
      id: "ichii",
      name: "いちい鮨",
      description: "地元でとれた新鮮なネタを楽しめるお寿司屋さん。",
      image: "/ichi.jpg",
      icon: "Utensils",
    },
    {
      id: "shinya",
      name: "新家寿司",
      description: "地元の新鮮な魚介を使った寿司を提供。",
      image: "/shinya.jpg",
      icon: "Utensils",
    },
    {
      id: "amayadori",
      name: "あまやどり",
      description: "古平町産たらこパスタが食べられるカフェ",
      image: "/amayadori.jpg",
      icon: "Coffee",
    },
  ];
  
  // 宿泊施設データ
  export const accommodationsData = [
    {
      id: "chuo",
      name: "中央旅館",
      description: "古平町の中心にある、あたたかな雰囲気の旅館。",
      image: "/setakamuy.png",
      icon: "BedDouble",
    },
    {
      id: "hori",
      name: "民宿ほり",
      description: "地元の食材を活かしたアットホームな家庭料理が特徴。",
      image: "/setakamuy.png",
      icon: "BedDouble",
    },
    {
      id: "jimotto",
      name: "民泊 じもっトFURUBIRA",
      description: "自然と楽しみが広がるファミリー向けのフレンドリーな民泊",
      image: "/jimotto.jpg",
      icon: "BedDouble",
    },
    {
      id: "curl",
      name: "カールふるびら",
      description: "古平町民と交流できる民泊",
      image: "/curl.jpg",
      icon: "BedDouble",
    },
  ];
  
  // イベントデータ
  export const eventsData = [
    {
      id: "tengu",
      name: "天狗の火渡り 神社祭り",
      description: "大太鼓と笛の音が響く有名な祭り。",
      date: "7月・9月開催",
      image: "/hiwatari_tengu_sub.jpg",
      icon: "Calendar",
    },
    {
      id: "marche",
      name: "ふるびらブルーマルシェ",
      description: "地元産品が集まる青空市。",
      date: "6月開催",
      image: "/setakamuy.png",
      icon: "Calendar",
    },
    {
      id: "gyokyosai",
      name: "漁協祭",
      description: "新鮮な魚介や加工品を楽しめる祭り。特にウニ（6-7月）やサケ（9月）が人気。",
      date: "6-7月、9月開催",
      image: "/gyokyosai.jpg",
      icon: "Calendar",
    },
  ];
  
  // 買い物スポットデータ
  export const shopsData = [
    {
      id: "nomura",
      name: "野村商店",
      description: "北海道原産の幻の湖魚「チップ（ヒメマス）」を販売。",
      type: "特産品店",
      image: "/nomura.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "tabata",
      name: "田畑菓子店",
      description: "明治27年創業の老舗菓子店。人気商品は「礁」や「タバターサンド」。",
      type: "菓子店",
      image: "/tabata.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "gyokyo",
      name: "東しゃこたん漁協生産部直売所",
      description: "新鮮な地元の海産物を直売。",
      type: "直売所",
      image: "/gyokyo.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "yoshino",
      name: "株式会社 よ 吉野",
      description: "地元の水産加工品を取り扱う老舗店。",
      type: "水産加工品",
      image: "/yojirushi.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "oshima",
      name: "株式会社 大島水産",
      description: "新鮮な海産物と加工品を提供。",
      type: "水産加工品",
      image: "/oshima.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "kaneto",
      name: "株式会社 カネト水産",
      description: "水産加工品の製造販売。",
      type: "水産加工品",
      image: "/kaneto.jpg",
      icon: "ShoppingBag",
    },
    {
      id: "kanekichi",
      name: "株式会社 かねきち吉野",
      description: "伝統的な製法による水産加工品。",
      type: "水産加工品",
      image: "/kanekichi.jpg",
      icon: "ShoppingBag",
    },
  ];