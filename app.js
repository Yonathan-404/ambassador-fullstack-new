/* ════════════════════════════════════════════════════════════════
   AMBASSADOR MALL STOREFRONT — Application JS
   Bisinka-built template · per-tenant cart & checkout
   ─────────────────────────────────────────────────────────────────
   ► TO REUSE FOR ANOTHER BUILDING: edit BUILDING below. Nothing else.
═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── guarded storage (degrades gracefully in privacy mode/iframes) ── */
var _mem = {};
var store = (function () {
  try { var t='__amb_t'; window.localStorage.setItem(t,'1'); window.localStorage.removeItem(t); return window.localStorage; }
  catch (e) { return { getItem:function(k){return k in _mem?_mem[k]:null;}, setItem:function(k,v){_mem[k]=String(v);}, removeItem:function(k){delete _mem[k];} }; }
})();

/* ════════════════════════════════════════════════════════════════
   ███  BUILDING CONFIG  ███   ← the entire template lives here
═══════════════════════════════════════════════════════════════════ */
var BUILDING = {
  id: 'ambassador',
  name: 'Ambassador Shopping Center',
  nameAm: 'አምባሳደር የገበያ ማዕከል',
  tagline: "Addis Ababa's Trust-First Marketplace",
  logo: 'https://scontent.fadd3-1.fna.fbcdn.net/v/t39.30808-6/310884191_101444736089223_649161035358662679_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=eY8H6owdheYQ7kNvwGPFy8t&oh=00_AfofKHyjgmvO6DQE_XlFUrHezJjAKX_cNGk2N21pHqwjIQ&oe=69673528',
  phone: '+251 912 345 678',
  copyright: '© 2025 Ambassador Shopping Center. All rights reserved.',
  /* building identity / about */
  about: 'High-end architecture featuring 80+ gold & jewelry shops, design studios and tailoring services in front of the National Palace.',
  aboutAm: 'ከብሔራዊ ቤተ መንግሥት ፊት ለፊት 80+ የወርቅና ጌጣጌጥ ሱቆች፣ ዲዛይን ስቱዲዮዎችና ስፌት አገልግሎቶችን የያዘ ዘመናዊ ህንፃ።',
  location: 'In front of the National Palace, Addis Ababa',
  /* headline building stats (shown on hero + about) */
  stats: { tenants:'85+', online:'18+', floors:'6', daily:'1,300' },
  /* mall coordinates (used to compute distance-based delivery from GPS) */
  geo: { lat:9.0227, lng:38.7469 },
  /* tax — Ethiopian VAT. Set rate:0 to hide VAT entirely. inclusive:false = added on top. */
  tax: { label:'VAT', labelAm:'ተ.እ.ታ', rate:0.15, inclusive:false },
  /* delivery zones (subcities) — fee (ETB), ETA, and approx coordinates so GPS
     can pick the nearest zone automatically. Edit fees/areas for any building. */
  areas: [
    { name:'Arada / Piazza',      fee:120, eta:'1–2 days', lat:9.0367, lng:38.7468 },
    { name:'Kirkos / Kazanchis',  fee:120, eta:'1–2 days', lat:9.0103, lng:38.7600 },
    { name:'Bole',                fee:160, eta:'1–2 days', lat:8.9930, lng:38.7990 },
    { name:'Yeka / Megenagna',    fee:160, eta:'1–2 days', lat:9.0300, lng:38.8000 },
    { name:'Lideta / Mexico',     fee:130, eta:'1–2 days', lat:9.0120, lng:38.7350 },
    { name:'Kolfe / Keranio',     fee:190, eta:'2–3 days', lat:9.0300, lng:38.6900 },
    { name:'Nifas Silk / CMC',    fee:190, eta:'2–3 days', lat:8.9800, lng:38.8200 },
    { name:'Gulele',              fee:150, eta:'1–2 days', lat:9.0600, lng:38.7300 },
    { name:'Akaki / Summit',      fee:220, eta:'2–4 days', lat:8.9300, lng:38.8000 },
    { name:'Other / outside Addis', fee:0, eta:'agreed with seller', lat:null, lng:null }
  ],
  /* delivery fee model: base zone fee + perKm beyond a free radius (GPS only).
     With GPS we refine the zone fee using straight-line distance from the mall. */
  delivery: { perKm:12, freeKm:2, gpsSurchargeCap:150 },
  /* site administrator / marketplace operator contact (Bisinka Marketplace) */
  admin: {
    name:'Bisinka Marketplace',
    nameAm:'ቢሲንካ ገበያ',
    role:'Site operator & support',
    phone:'0913291265',
    whatsapp:'251913291265',
    telegram:'bisinka',
    email:'semayatk@gmail.com'
  },
  /* buyer protection / returns (shown in checkout + a help section) */
  policy: {
    returnsTitle:'Returns & Buyer Safety',
    returns:'Inspect items on delivery or at pickup. Report any problem to the seller on WhatsApp within 24 hours for a replacement or refund per the seller\u2019s policy. Keep your PDF invoice and transfer receipt as proof.',
    returnsAm:'እቃዎችን በሚረከቡበት ጊዜ ይፈትሹ። ማንኛውም ችግር ካለ በ24 ሰዓት ውስጥ ለሻጩ በዋትስአፕ ያሳውቁ። ደረሰኝዎንና የክፍያ ማረጋገጫዎን ይያዙ።',
    safety:'You pay each verified seller directly into their own bank account — Bisinka never holds your money. Always confirm the account name matches the seller before you transfer, and send your payment proof on WhatsApp.',
    safetyAm:'ለእያንዳንዱ የተረጋገጠ ሻጭ በቀጥታ ወደ ራሱ የባንክ ሂሳብ ይከፍላሉ — ቢሲንካ ገንዘብዎን አይዝም። ከመክፈልዎ በፊት የሂሳብ ስሙ ከሻጩ ጋር መመሳሰሉን ያረጋግጡ።'
  },
  /* legal — Terms of Service & Privacy Policy (shown in modals; edit freely) */
  legal: {
    tosTitle:'Terms of Service',
    tos:[
      'Ambassador Shopping Center online store is operated by Bisinka Marketplace as a directory and ordering platform. Each product is sold by an independent, verified tenant — not by Bisinka.',
      'Orders, payments and delivery are agreements between you and the seller. You pay the seller directly into their bank account; Bisinka never receives or holds your money.',
      'Prices, stock and delivery fees are shown in good faith but may change. The seller confirms availability and final cost before fulfilment.',
      'You are responsible for confirming the bank account name matches the seller before transferring, and for keeping your invoice and payment proof.',
      'Bisinka is not liable for losses arising from transactions between buyers and sellers, but will assist in good faith with disputes via Marketplace Support.',
      'Misuse of the platform — fraud, fake orders, or abuse of sellers — may result in restricted access.'
    ],
    privacyTitle:'Privacy Policy',
    privacy:[
      'We collect only what an order needs: your name, phone number, delivery area/address, and (if you choose) your GPS location to estimate delivery.',
      'This information is shared with the seller you order from, so they can fulfil and deliver your order. It is not sold to third parties.',
      'Your cart, wishlist, saved location and order history are stored on your own device (in your browser) unless you contact a seller, who then receives your order details.',
      'You can clear your saved data any time by clearing your browser storage. Contact Marketplace Support to request removal of data a seller holds.',
      'When the platform adds online accounts or payments in future, this policy will be updated and shown to you before you opt in.'
    ],
    updated:'Last updated: 2025'
  },
  /* footer quick links to the wider Bisinka ecosystem (edit hrefs) */
  quickLinks: [
    { label:'All Buildings', labelAm:'ሁሉም ህንፃዎች', href:'#', icon:'fa-building' },
    { label:'Government Directory', labelAm:'የመንግሥት ማውጫ', href:'#', icon:'fa-landmark' },
    { label:'Bisinka Directory', labelAm:'ቢሲንካ ማውጫ', href:'#', icon:'fa-cube' },
    { label:'Bisinka Marketplace', labelAm:'ቢሲንካ ገበያ', href:'#', icon:'fa-store' }
  ],

  /* ── ONE TENANT PER FLOOR, distinct category ──
     Each tenant carries: identity, WhatsApp, own bank accounts, products. */
  tenants: [
    {
      id: 'sahis', floor: 'Ground Floor', name: 'Sahis Cafe', nameAm: 'ሳሒስ ካፌ',
      cat: 'Food & Beverage', catKey: 'food', icon: 'fa-mug-hot', color: '#B5651D',
      manager: 'Yohannes A.', rating: 4.8, reviews: 214,
      whatsapp: '251911223344',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Yohannes Abebe', mobile:'+251 911 223 344', tin:'0001234567',
      photo:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
      socials:{ tiktok:'@sahiscafe', telegram:'sahiscafe', facebook:'sahiscafe', instagram:'sahiscafe' },
      reviewLink:'https://g.page/sahis-cafe', responseTime:'usually replies within 1 hour',
      blurb: 'Premium Ethiopian coffee, fresh pastries & roasted beans — served and packed daily on the Ground Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000234567890', holder:'Sahis Cafe', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'awash', name:'Awash Bank', acct:'013201458896700', holder:'Sahis Cafe', icon:'fa-building-columns', color:'#003893' },
        { key:'telebirr', name:'Telebirr', acct:'0911 223 344', holder:'Sahis Cafe', icon:'fa-mobile-screen', color:'#1a9c4a' }
      ],
      products: [
        { id:'sahis-1', name:'Yirgacheffe Coffee 500g', cat:'Coffee Beans', price:950, old:null, badge:'☕ Best Seller', rating:4.9, reviews:134, img:'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80', desc:'Single-origin Yirgacheffe — bright, floral, medium roast. Whole bean or ground to order. Beautifully gift-boxed.', specs:{Weight:'500g',Origin:'Yirgacheffe',Roast:'Medium',Packaging:'Gift box'}, gallery:['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80','https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80','https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'sahis-2', name:'Macchiato & Pastry Combo', cat:'Café', price:280, old:350, badge:null, rating:4.7, reviews:88, img:'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80', desc:'A classic Ethiopian macchiato paired with a fresh-baked butter croissant. Dine-in on the Ground Floor.', specs:{Includes:'1 drink + 1 pastry',Serving:'Dine-in',Hours:'8AM–8PM',Type:'Macchiato'}, gallery:['https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80','https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80'], stock:{state:'low', label:'3'} },
        { id:'sahis-3', name:'Sidama Roasted Beans 1kg', cat:'Coffee Beans', price:1750, old:null, badge:null, rating:4.8, reviews:51, img:'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80', desc:'Full-bodied Sidama beans, freshly roasted in-house. Rich chocolate notes, low acidity. 1kg resealable bag.', specs:{Weight:'1kg',Origin:'Sidama',Roast:'Dark',Bag:'Resealable'}, gallery:['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80','https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'sahis-4', name:'Traditional Coffee Ceremony Set', cat:'Gift Set', price:3200, old:3800, badge:'💎 Premium', rating:4.9, reviews:27, img:'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80', desc:'Complete jebena coffee ceremony set: clay jebena, 6 cups, tray and a 250g bag of Harrar beans.', specs:{Includes:'Jebena + 6 cups',Beans:'250g Harrar',Tray:'Included',Use:'Gift / home'}, gallery:['https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80','https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80','https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'sahis-5', name:'Spiced Tea Blend 250g', cat:'Tea', price:420, old:null, badge:null, rating:4.6, reviews:40, img:'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&q=80', desc:'Aromatic Ethiopian spiced tea (shai) with cinnamon, clove and cardamom. Loose-leaf, 250g pouch.', specs:{Weight:'250g',Type:'Loose-leaf',Spices:'Cinnamon, clove',Caffeine:'Medium'}, gallery:['https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&q=80','https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=600&q=80','https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80'], stock:{state:'made', label:''} }
      ]
    },
    {
      id: 'usbrand', floor: '1st Floor', name: 'US Brand Collection', nameAm: 'ዩኤስ ብራንድ ኮሌክሽን',
      cat: 'Fashion & Apparel', catKey: 'fashion', icon: 'fa-shirt', color: '#2563EB',
      manager: 'Michael J.', rating: 4.7, reviews: 176,
      whatsapp: '251922334455',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Michael Johnson', mobile:'+251 922 334 455', tin:'0002345678',
      photo:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
      socials:{ tiktok:'@usbrandcollection', telegram:'usbrand', facebook:'usbrandcollection', instagram:'usbrand.et' },
      reviewLink:'https://g.page/us-brand-collection', responseTime:'usually replies within 2 hours',
      blurb: 'Authentic imported US-brand apparel, denim and sneakers for men and women — 1st Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000345671234', holder:'US Brand Collection', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'boa', name:'Bank of Abyssinia', acct:'88012345671', holder:'US Brand Collection', icon:'fa-building-columns', color:'#d4a017' },
        { key:'awash', name:'Awash Bank', acct:'013209988776600', holder:'US Brand Collection', icon:'fa-building-columns', color:'#003893' }
      ],
      products: [
        { id:'us-1', name:'Slim-Fit Stretch Jeans', cat:'Denim', price:2400, old:3000, badge:'🔥 Hot', rating:4.7, reviews:62, img:'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80', desc:'Premium stretch-denim slim-fit jeans. Imported, true-to-size. Dark indigo wash. Sizes 28–38.', specs:{Fit:'Slim',Material:'98% cotton',Wash:'Dark indigo',Sizes:'28–38'}, gallery:['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80','https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80','https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Size', options:['S','M','L','XL','XXL']} },
        { id:'us-2', name:'Classic Canvas Sneakers', cat:'Footwear', price:3200, old:null, badge:'⭐ Top Rated', rating:4.8, reviews:91, img:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80', desc:'Low-top canvas sneakers with cushioned sole. Unisex. White & black available. EU 39–45.', specs:{Type:'Low-top',Upper:'Canvas',Sole:'Rubber',Sizes:'EU 39–45'}, gallery:['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80','https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Size', options:['EU 40','EU 41','EU 42','EU 43','EU 44']} },
        { id:'us-3', name:'Bomber Jacket', cat:'Outerwear', price:4800, old:5600, badge:null, rating:4.6, reviews:38, img:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', desc:'Lightweight padded bomber jacket with ribbed cuffs. Water-resistant shell. Olive & navy.', specs:{Style:'Bomber',Shell:'Water-resistant',Lining:'Padded',Sizes:'S–XXL'}, gallery:['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80','https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80'], stock:{state:'out', label:''}, variant:{label:'Size', options:['S','M','L','XL','XXL']} },
        { id:'us-4', name:'Graphic Cotton Tee', cat:'T-Shirts', price:1100, old:1400, badge:null, rating:4.5, reviews:73, img:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', desc:'Soft 100% cotton crew-neck tee with US-brand print. Pre-shrunk. Multiple colors.', specs:{Material:'100% cotton',Neck:'Crew',Fit:'Regular',Sizes:'S–XXL'}, gallery:['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80','https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80','https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80'], stock:{state:'low', label:'4'}, variant:{label:'Size', options:['S','M','L','XL','XXL']} },
        { id:'us-5', name:'Leather Belt', cat:'Accessories', price:1300, old:null, badge:null, rating:4.7, reviews:29, img:'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80', desc:'Genuine leather belt with brushed-steel buckle. Adjustable. Black & brown.', specs:{Material:'Genuine leather',Buckle:'Steel',Width:'3.5cm',Color:'Black/Brown'}, gallery:['https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80','https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80','https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Size', options:['M','L','XL']} }
      ]
    },
    {
      id: 'embut', floor: '2nd Floor', name: 'Embut Cultural Clothes', nameAm: 'እምቡት ባህላዊ ልብሶች',
      cat: 'Cultural Clothing', catKey: 'cultural', icon: 'fa-vest-patches', color: '#7C3AED',
      manager: 'Embut A.', rating: 4.9, reviews: 142,
      whatsapp: '251933445566',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Embut Alemu', mobile:'+251 933 445 566', tin:'0003456789',
      photo:'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80',
      socials:{ tiktok:'@embutcultural', telegram:'embut', facebook:'embutcultural', instagram:'embut.cultural' },
      reviewLink:'https://t.me/embut', responseTime:'usually replies within 1 hour',
      blurb: 'Hand-woven habesha kemis, netela and traditional menswear with authentic tibeb embroidery — 2nd Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000456789012', holder:'Embut Cultural Clothes', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'awash', name:'Awash Bank', acct:'013204567891200', holder:'Embut Cultural Clothes', icon:'fa-building-columns', color:'#003893' },
        { key:'telebirr', name:'Telebirr', acct:'0933 445 566', holder:'Embut Cultural Clothes', icon:'fa-mobile-screen', color:'#1a9c4a' }
      ],
      products: [
        { id:'embut-1', name:'Habesha Kemis with Tibeb', cat:"Women's", price:6500, old:7800, badge:'🏆 Best Seller', rating:4.9, reviews:58, img:'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80', desc:'Hand-woven white cotton habesha kemis with rich coloured tibeb border. Made by Shiro Meda artisans.', specs:{Fabric:'Hand-woven cotton',Border:'Coloured tibeb',Length:'Full',Care:'Hand wash'}, gallery:['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80','https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80'], stock:{state:'low', label:'2'}, variant:{label:'Size', options:['S','M','L','XL']} },
        { id:'embut-2', name:'Netela Shawl', cat:'Shawls', price:1800, old:null, badge:null, rating:4.8, reviews:44, img:'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80', desc:'Lightweight cotton netela with delicate tibeb edge. Perfect for ceremonies and church. Cream.', specs:{Fabric:'Cotton gauze',Edge:'Tibeb',Size:'2m × 1m',Color:'Cream'}, gallery:['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80','https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'embut-3', name:"Men's Cultural Set", cat:"Men's", price:5200, old:6000, badge:null, rating:4.7, reviews:31, img:'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80', desc:"Men's traditional 2-piece set: embroidered tunic and trousers in handspun cotton. Wedding-ready.", specs:{Pieces:'2-piece',Fabric:'Handspun cotton',Embroidery:'Hand-stitched',Sizes:'M–XXL'}, gallery:['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Size', options:['M','L','XL','XXL']} },
        { id:'embut-4', name:'Kids Habesha Dress', cat:"Children's", price:2200, old:2600, badge:'✨ New', rating:4.9, reviews:22, img:'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80', desc:'Adorable hand-woven habesha dress for girls (ages 2–10) with matching tibeb trim and sash.', specs:{Ages:'2–10 yrs',Fabric:'Cotton',Trim:'Tibeb',Includes:'Dress + sash'}, gallery:['https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80','https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80','https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80'], stock:{state:'made', label:''}, variant:{label:'Age', options:['2-4y','4-6y','6-8y','8-10y']} },
        { id:'embut-5', name:'Tibeb Table Runner', cat:'Home', price:1400, old:null, badge:null, rating:4.6, reviews:18, img:'https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80', desc:'Decorative hand-woven table runner with traditional tibeb pattern. Adds an Ethiopian touch to any home.', specs:{Length:'1.8m',Fabric:'Cotton',Pattern:'Tibeb',Care:'Hand wash'}, gallery:['https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80','https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80'], stock:{state:'low', label:'4'} }
      ]
    },
    {
      id: 'bahran', floor: '3rd Floor', name: 'Bahran Sport', nameAm: 'ባህራን ስፖርት',
      cat: 'Sports & Fitness', catKey: 'sports', icon: 'fa-futbol', color: '#0E7C7B',
      manager: 'Bahran A.', rating: 4.6, reviews: 98,
      whatsapp: '251944556677',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Bahran Assefa', mobile:'+251 944 556 677', tin:'0004567890',
      photo:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
      socials:{ tiktok:'@bahransport', telegram:'bahransport', facebook:'bahransport', instagram:'bahran.sport' },
      reviewLink:'https://g.page/bahran-sport', responseTime:'usually replies within 3 hours',
      blurb: 'Footballs, gym gear, jerseys and fitness equipment for athletes and clubs — 3rd Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000567890123', holder:'Bahran Sport', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'boa', name:'Bank of Abyssinia', acct:'88056789012', holder:'Bahran Sport', icon:'fa-building-columns', color:'#d4a017' },
        { key:'telebirr', name:'Telebirr', acct:'0944 556 677', holder:'Bahran Sport', icon:'fa-mobile-screen', color:'#1a9c4a' }
      ],
      products: [
        { id:'bahran-1', name:'Match Football (Size 5)', cat:'Football', price:1600, old:2000, badge:'🔥 Hot', rating:4.7, reviews:54, img:'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&q=80', desc:'FIFA-quality size 5 match football, hand-stitched, durable PU cover. Suitable for grass & turf.', specs:{Size:'5',Cover:'PU',Use:'Match',Bladder:'Butyl'}, gallery:['https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&q=80','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'bahran-2', name:'Adjustable Dumbbell Set 20kg', cat:'Gym', price:5400, old:null, badge:'⭐ Top Rated', rating:4.8, reviews:33, img:'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=600&q=80', desc:'Pair of adjustable dumbbells, 2–20kg total, with secure spin-lock collars. Cast-iron plates.', specs:{Weight:'20kg total',Type:'Adjustable',Collars:'Spin-lock',Plates:'Cast iron'}, gallery:['https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=600&q=80','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80','https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'bahran-3', name:'Team Jersey Kit', cat:'Apparel', price:1900, old:2400, badge:null, rating:4.6, reviews:41, img:'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80', desc:'Breathable polyester jersey + shorts kit. Custom name & number available. Club orders welcome.', specs:{Material:'Polyester',Includes:'Jersey + shorts',Custom:'Name/number',Sizes:'S–XXL'}, gallery:['https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80','https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'], stock:{state:'made', label:''}, variant:{label:'Size', options:['S','M','L','XL','XXL']} },
        { id:'bahran-4', name:'Yoga Mat (6mm)', cat:'Fitness', price:850, old:1100, badge:null, rating:4.5, reviews:60, img:'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600&q=80', desc:'Non-slip 6mm TPE yoga mat with carry strap. Lightweight and eco-friendly. Multiple colors.', specs:{Thickness:'6mm',Material:'TPE',Length:'1.8m',Extras:'Carry strap'}, gallery:['https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600&q=80','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80','https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'bahran-5', name:'Skipping Rope (Speed)', cat:'Fitness', price:380, old:null, badge:null, rating:4.7, reviews:28, img:'https://images.unsplash.com/photo-1434596922112-19c563067271?w=600&q=80', desc:'Adjustable speed skipping rope with ball-bearing handles. Ideal for cardio and boxing training.', specs:{Type:'Speed',Handles:'Ball-bearing',Length:'Adjustable',Cable:'Steel/PVC'}, gallery:['https://images.unsplash.com/photo-1434596922112-19c563067271?w=600&q=80','https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80','https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80'], stock:{state:'in', label:''} }
      ]
    },
    {
      id: 'rosewood', floor: '4th Floor', name: 'Rosewood Furniture', nameAm: 'ሮዝዉድ ፈርኒቸር',
      cat: 'Furniture', catKey: 'furniture', icon: 'fa-couch', color: '#92400E',
      manager: 'Rosewood A.', rating: 4.7, reviews: 86,
      whatsapp: '251955667788',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Robel Asfaw', mobile:'+251 955 667 788', tin:'0005678901',
      photo:'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
      socials:{ tiktok:'@rosewoodfurniture', telegram:'rosewood', facebook:'rosewoodfurniture', instagram:'rosewood.furniture' },
      reviewLink:'https://g.page/rosewood-furniture', responseTime:'usually replies within a few hours',
      blurb: 'Quality sofas, dining sets and bedroom furniture — delivery & assembly across Addis. 4th Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000678901234', holder:'Rosewood Furniture', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'awash', name:'Awash Bank', acct:'013206789012300', holder:'Rosewood Furniture', icon:'fa-building-columns', color:'#003893' },
        { key:'boa', name:'Bank of Abyssinia', acct:'88067890123', holder:'Rosewood Furniture', icon:'fa-building-columns', color:'#d4a017' }
      ],
      products: [
        { id:'rose-1', name:'3-Seater Fabric Sofa', cat:'Living Room', price:28500, old:34000, badge:'💎 Premium', rating:4.8, reviews:24, img:'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80', desc:'Modern 3-seater sofa with solid hardwood frame and high-density foam. Stain-resistant fabric. Free Addis delivery.', specs:{Seats:'3',Frame:'Hardwood',Foam:'High-density',Delivery:'Free in Addis'}, gallery:['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80','https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&q=80','https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80'], stock:{state:'out', label:''}, variant:{label:'Color', options:['Grey','Beige','Navy']} },
        { id:'rose-2', name:'6-Seater Dining Set', cat:'Dining', price:42000, old:null, badge:'⭐ Top Rated', rating:4.7, reviews:18, img:'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80', desc:'Solid wood dining table with 6 upholstered chairs. Seats 6 comfortably. Assembly included.', specs:{Seats:'6',Material:'Solid wood',Chairs:'Upholstered',Assembly:'Included'}, gallery:['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80','https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80','https://images.unsplash.com/photo-1493663284031-b0acb080a6e6?w=600&q=80'], stock:{state:'low', label:'2'} },
        { id:'rose-3', name:'Queen Bed Frame', cat:'Bedroom', price:24000, old:28000, badge:null, rating:4.6, reviews:21, img:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80', desc:'Upholstered queen bed frame with padded headboard. Slatted base, no box-spring needed.', specs:{Size:'Queen',Headboard:'Padded',Base:'Slatted',Delivery:'Free in Addis'}, gallery:['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80','https://images.unsplash.com/photo-1493663284031-b0acb080a6e6?w=600&q=80','https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'rose-4', name:'Coffee Table', cat:'Living Room', price:6800, old:8200, badge:null, rating:4.5, reviews:33, img:'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600&q=80', desc:'Minimalist wooden coffee table with lower shelf. Walnut finish. Pre-assembled.', specs:{Material:'Engineered wood',Finish:'Walnut',Shelf:'Yes',Assembly:'Pre-built'}, gallery:['https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600&q=80','https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=80','https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'rose-5', name:'4-Door Wardrobe', cat:'Bedroom', price:32000, old:null, badge:null, rating:4.7, reviews:15, img:'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&q=80', desc:'Spacious 4-door wardrobe with mirror, hanging rail and shelves. Delivery & assembly included.', specs:{Doors:'4',Mirror:'Yes',Shelves:'6',Assembly:'Included'}, gallery:['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=600&q=80','https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80','https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&q=80'], stock:{state:'low', label:'2'} }
      ]
    },
    {
      id: 'meron', floor: '5th Floor', name: 'Meron Home Decor', nameAm: 'መሮን ሆም ዲኮር',
      cat: 'Home Decor', catKey: 'decor', icon: 'fa-palette', color: '#DB2777',
      manager: 'Meron T.', rating: 4.8, reviews: 119,
      whatsapp: '251966778899',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Meron Tadesse', mobile:'+251 966 778 899', tin:'0006789012',
      photo:'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&q=80',
      socials:{ tiktok:'@meronhomedecor', telegram:'merondecor', facebook:'meronhomedecor', instagram:'meron.decor' },
      reviewLink:'https://g.page/meron-decor', responseTime:'usually replies within 2 hours',
      blurb: 'Rugs, lamps, wall art and accent pieces to bring any room to life — 5th Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000789012345', holder:'Meron Home Decor', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'awash', name:'Awash Bank', acct:'013207890123400', holder:'Meron Home Decor', icon:'fa-building-columns', color:'#003893' },
        { key:'telebirr', name:'Telebirr', acct:'0966 778 899', holder:'Meron Home Decor', icon:'fa-mobile-screen', color:'#1a9c4a' }
      ],
      products: [
        { id:'meron-1', name:'Handwoven Area Rug 2×3m', cat:'Rugs', price:7800, old:9500, badge:'🏆 Best Seller', rating:4.8, reviews:46, img:'https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80', desc:'Plush handwoven area rug with geometric pattern. Soft underfoot, non-shedding. 2×3 metres.', specs:{Size:'2×3m',Pile:'Medium',Material:'Wool blend',Care:'Spot clean'}, gallery:['https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&q=80','https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&q=80','https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Color', options:['Grey','Beige','Navy']} },
        { id:'meron-2', name:'Arc Floor Lamp', cat:'Lighting', price:4200, old:null, badge:'✨ New', rating:4.7, reviews:28, img:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', desc:'Modern arc floor lamp with marble base and warm LED. Perfect reading-corner statement piece.', specs:{Height:'1.8m',Base:'Marble',Bulb:'LED warm',Switch:'Foot'}, gallery:['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80','https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80','https://images.unsplash.com/photo-1522444690501-83de8a4f3a8b?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'meron-3', name:'Canvas Wall Art (Set of 3)', cat:'Wall Art', price:2900, old:3600, badge:null, rating:4.6, reviews:37, img:'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&q=80', desc:'Set of three framed canvas prints — abstract Ethiopian landscapes. Ready to hang.', specs:{Pieces:'3',Frame:'Included',Size:'40×60cm each',Theme:'Abstract'}, gallery:['https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&q=80','https://images.unsplash.com/photo-1522444690501-83de8a4f3a8b?w=600&q=80','https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80'], stock:{state:'made', label:''} },
        { id:'meron-4', name:'Scented Candle Trio', cat:'Accents', price:1200, old:1500, badge:null, rating:4.7, reviews:52, img:'https://images.unsplash.com/photo-1602874801006-e26c4c5b5b6a?w=600&q=80', desc:'Three hand-poured soy candles — frankincense, vanilla and coffee. 30-hour burn each.', specs:{Count:'3',Wax:'Soy',Burn:'30 hrs each',Scents:'Frankincense/vanilla/coffee'}, gallery:['https://images.unsplash.com/photo-1602874801006-e26c4c5b5b6a?w=600&q=80','https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80','https://images.unsplash.com/photo-1531889647372-1c4f24f17fbb?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'meron-5', name:'Decorative Throw Pillows (Pair)', cat:'Accents', price:1600, old:null, badge:null, rating:4.5, reviews:41, img:'https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=600&q=80', desc:'Pair of embroidered throw pillows with insert. Tibeb-inspired patterns. 45×45cm.', specs:{Count:'2',Size:'45×45cm',Insert:'Included',Cover:'Removable'}, gallery:['https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=600&q=80','https://images.unsplash.com/photo-1531889647372-1c4f24f17fbb?w=600&q=80','https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Color', options:['Grey','Beige','Navy']} }
      ]
    },
    {
      id: 'patch', floor: '6th Floor', name: 'Patch Africa Electronics', nameAm: 'ፓች አፍሪካ ኤሌክትሮኒክስ',
      cat: 'Electronics', catKey: 'electronics', icon: 'fa-laptop', color: '#15924B',
      manager: 'Patch A.', rating: 4.7, reviews: 203,
      whatsapp: '251977889900',
      /* SAMPLE profile — replace owner/mobile/TIN/socials with real values */
      owner:'Patrick Haile', mobile:'+251 977 889 900', tin:'0007890123',
      photo:'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80',
      socials:{ tiktok:'@patchafrica', telegram:'patchafrica', facebook:'patchafrica', instagram:'patch.africa' },
      reviewLink:'https://g.page/patch-africa', responseTime:'usually replies within 1 hour',
      blurb: 'Smartphones, audio, smart TVs and accessories — genuine stock with warranty. 6th Floor.',
      banks: [
        { key:'cbe', name:'Commercial Bank of Ethiopia', acct:'1000890123456', holder:'Patch Africa Electronics', icon:'fa-building-columns', color:'#7e1b8f' },
        { key:'awash', name:'Awash Bank', acct:'013208901234500', holder:'Patch Africa Electronics', icon:'fa-building-columns', color:'#003893' },
        { key:'boa', name:'Bank of Abyssinia', acct:'88089012345', holder:'Patch Africa Electronics', icon:'fa-building-columns', color:'#d4a017' }
      ],
      products: [
        { id:'patch-1', name:'Samsung Galaxy A55 5G', cat:'Smartphones', price:44000, old:48000, badge:'🔥 Hot', rating:4.8, reviews:67, img:'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80', desc:'Galaxy A55 5G — 8GB RAM, 256GB, 50MP camera, 5000mAh. 1-year local warranty.', specs:{RAM:'8GB',Storage:'256GB',Camera:'50MP',Warranty:'1 Year'}, gallery:['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80','https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'], stock:{state:'out', label:''}, variant:{label:'Storage', options:['128GB','256GB']} },
        { id:'patch-2', name:'Wireless Earbuds Pro', cat:'Audio', price:3800, old:4600, badge:'⭐ Top Rated', rating:4.7, reviews:88, img:'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80', desc:'True-wireless earbuds with active noise cancellation, 30-hr case, USB-C fast charge.', specs:{ANC:'Yes',Battery:'30 hrs',Charge:'USB-C',Bluetooth:'5.3'}, gallery:['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80'], stock:{state:'low', label:'3'} },
        { id:'patch-3', name:'43" 4K Smart TV', cat:'TVs', price:32000, old:38000, badge:'💎 Premium', rating:4.8, reviews:42, img:'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80', desc:'43-inch 4K UHD Android Smart TV with HDR, built-in apps and 2-year warranty.', specs:{Size:'43"',Resolution:'4K UHD',OS:'Android',Warranty:'2 Years'}, gallery:['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80'], stock:{state:'in', label:''}, variant:{label:'Size', options:['43"','50"','55"']} },
        { id:'patch-4', name:'Power Bank 20000mAh', cat:'Accessories', price:1900, old:2300, badge:null, rating:4.6, reviews:71, img:'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80', desc:'High-capacity 20000mAh power bank, dual USB + USB-C PD, fast charge with LED indicator.', specs:{Capacity:'20000mAh',Ports:'2×USB + USB-C',Fast:'PD 22.5W',Display:'LED'}, gallery:['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80','https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80'], stock:{state:'in', label:''} },
        { id:'patch-5', name:'Bluetooth Speaker', cat:'Audio', price:2600, old:null, badge:null, rating:4.7, reviews:55, img:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80', desc:'Portable waterproof Bluetooth speaker with deep bass and 12-hour playtime. IPX7.', specs:{Power:'20W',Battery:'12 hrs',Water:'IPX7',Bluetooth:'5.0'}, gallery:['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80','https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&q=80','https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80'], stock:{state:'low', label:'3'} }
      ]
    }
  ]
};

/* ════════════════════════════════════════════════════════════════
   ███  SERVICE PROVIDERS  ███  (non-retail — info + contact only)
   SAMPLE placeholders — replace with the building's real services.
═══════════════════════════════════════════════════════════════════ */
var SERVICES = [
  { id:'svc-atm', name:'CBE ATM & Banking', nameAm:'ሲቢኢ ኤቲኤም', floor:'Ground Floor',
    type:'Banking', icon:'fa-money-bill-transfer', color:'#7e1b8f',
    owner:'CBE Branch Desk', mobile:'+251 911 000 111', tin:'0010000001',
    photo:'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&q=80',
    blurb:'24/7 ATM plus an in-mall CBE service desk for deposits, withdrawals and account help.',
    hours:'ATM 24/7 · Desk 9:00–17:00',
    socials:{ telegram:'cbe', facebook:'combankethiopia', instagram:'', tiktok:'' },
    photo2:'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80', gallery:['https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80','https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80'],
    email:'atm.ambassador@cbe.com.et', established:'Branch since 2019', address:'Ground Floor, near main entrance',
    offerings:['Cash withdrawal & deposit','Account opening & support','Card issues & PIN reset','Balance & mini-statement'] },
  { id:'svc-clinic', name:'City Care Pharmacy & Clinic', nameAm:'ሲቲ ኬር ፋርማሲ', floor:'2nd Floor',
    type:'Health', icon:'fa-staff-snake', color:'#15924B',
    owner:'Dr. Selam Girma', mobile:'+251 911 000 222', tin:'0010000002',
    photo:'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80',
    blurb:'Walk-in pharmacy and minor-care clinic — prescriptions, first aid and basic checkups.',
    hours:'8:30–20:00 daily',
    socials:{ telegram:'citycare', facebook:'citycareclinic', instagram:'citycare.et', tiktok:'' },
    photo2:'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80', gallery:['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80','https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80'],
    email:'hello@citycareclinic.et', established:'Serving since 2018', address:'2nd Floor, Suite 204',
    offerings:['Prescription pharmacy','Minor injury & first aid','Blood pressure & sugar checks','Vaccinations & consults'] },
  { id:'svc-salon', name:'Glow Beauty Salon & Spa', nameAm:'ግሎው ቢውቲ ሳሎን', floor:'4th Floor',
    type:'Beauty', icon:'fa-scissors', color:'#DB2777',
    owner:'Hanna Bekele', mobile:'+251 911 000 333', tin:'0010000003',
    photo:'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
    blurb:'Full-service salon & spa — hair, nails, facials and bridal packages by appointment.',
    hours:'9:00–19:30 · closed Mon',
    socials:{ telegram:'glowsalon', facebook:'glowbeautyaddis', instagram:'glow.addis', tiktok:'@glowaddis' },
    photo2:'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=600&q=80', gallery:['https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=600&q=80','https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=600&q=80'],
    email:'book@glowaddis.et', established:'Open since 2020', address:'4th Floor, Suite 410',
    offerings:['Hair styling & coloring','Manicure & pedicure','Facials & skincare','Bridal & event packages'] },
  { id:'svc-forex', name:'Express Forex & Money Transfer', nameAm:'ኤክስፕረስ ፎሬክስ', floor:'1st Floor',
    type:'Finance', icon:'fa-right-left', color:'#003893',
    owner:'Dawit Mengistu', mobile:'+251 911 000 444', tin:'0010000004',
    photo:'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400&q=80',
    blurb:'Authorized money transfer pickup (Western Union, MoneyGram) and forex services.',
    hours:'8:30–18:00 · Mon–Sat',
    socials:{ telegram:'expressforex', facebook:'expressforex', instagram:'', tiktok:'' },
    photo2:'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&q=80', gallery:['https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&q=80','https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&q=80'],
    email:'info@expressforex.et', established:'Licensed agent', address:'1st Floor, Suite 112',
    offerings:['Western Union pickup','MoneyGram pickup','Currency exchange','Remittance support'] },
  { id:'svc-print', name:'PrintHub Stationery & Copy', nameAm:'ፕሪንትሐብ', floor:'Ground Floor',
    type:'Office', icon:'fa-print', color:'#B5651D',
    owner:'Samuel Tesfaye', mobile:'+251 911 000 555', tin:'0010000005',
    photo:'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80',
    blurb:'Printing, photocopying, binding, lamination and stationery for shoppers and tenants.',
    hours:'9:00–19:00 daily',
    socials:{ telegram:'printhub', facebook:'printhubaddis', instagram:'printhub.et', tiktok:'' },
    photo2:'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=80', gallery:['https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=80','https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&q=80'],
    email:'orders@printhub.et', established:'Since 2017', address:'Ground Floor, Shop G-12',
    offerings:['Printing & photocopying','Binding & lamination','Document scanning','Stationery supplies'] },
  { id:'svc-mobile', name:'TechFix Phone Repair', nameAm:'ቴክፊክስ', floor:'6th Floor',
    type:'Repair', icon:'fa-mobile-screen-button', color:'#0E7C7B',
    owner:'Nahom Girma', mobile:'+251 911 000 666', tin:'0010000006',
    photo:'https://images.unsplash.com/photo-1581993192008-63e896f4f744?w=400&q=80',
    blurb:'Screen, battery and board-level phone & laptop repair with genuine parts and warranty.',
    hours:'9:00–19:00 · Mon–Sat',
    socials:{ telegram:'techfix', facebook:'techfixaddis', instagram:'techfix.addis', tiktok:'@techfixaddis' },
    photo2:'https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=600&q=80', gallery:['https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=600&q=80','https://images.unsplash.com/photo-1591815302525-756a9bcc3425?w=600&q=80'],
    email:'fix@techfixaddis.et', established:'Since 2019', address:'6th Floor, Shop 6-08',
    offerings:['Screen replacement','Battery replacement','Board-level repair','Data recovery & setup'] }
];

/* ════════════════════════════════════════════════════════════════
   ███  I18N (English / Amharic) — key UI labels only ███
═══════════════════════════════════════════════════════════════════ */
var I18N = {
  en: {
    navTenants:'Tenants', navShop:'Shop', navServices:'Services', navHow:'How It Works',
    navDirectory:'Directory',
    searchPh:'Search products, shops, units, floors…',
    dirEyebrow:'Building Directory', dirTitle:'Every Office, Floor by Floor',
    dirSub:'The complete Ambassador Mall directory — find any shop, office or service by unit number, floor or name.',
    dirSearchPh:'Search unit, shop, category…', allFloors:'All Floors',
    dirNoMatch:'No offices match your search.', unitsLbl:'units', shopsLbl:'shops', svcLbl:'Service',
    fpShops:'shops', fpServices:'services', fpProducts:'products',
    shopThisFloor:'Shop This Floor', fullDirectory:'Full Directory', tapUnit:'Tap any unit for details',
    filters:'Filters', sortBy:'Sort', priceRange:'Price (ETB)', availability:'Availability',
    floorLblF:'Floor', ratingF:'Rating', anyRating:'Any rating', top4:'4★ & up',
    availAll:'All', availIn:'In stock', availSale:'On sale', availMade:'Made to order',
    resetFilters:'Reset', minPh:'Min', maxPh:'Max', close:'Close',
    floorsGroup:'Floors', unitsFound:'{n} units',
    startShopping:'Start Shopping', meetTenants:'Meet the Sellers',
    heroTitle:"Shop from sellers with a <em>real address</em>.",
    heroSub:'Every product here is sold by a verified tenant inside Ambassador Shopping Center. Visit them in person or buy online — your choice.',
    statTenants:'Verified Tenants', statOnline:'Online Stores', statFloors:'Floors', statDaily:'Daily Visitors',
    statProducts:'Products', statVerified:'Verified',
    aboutEyebrow:'The Building', aboutVisit:'Visit in person', aboutTrust:'Trust-first shopping',
    onSale:'On Sale Now', onSaleSub:'Limited-time deals from verified sellers across the building.',
    tenantsTitle:'Verified Sellers You Can Visit', tenantsSub:'Browse trusted tenants inside Ambassador Shopping Center — tap any seller to shop their products or visit them in person.', tenantsEyebrow:'Our Sellers',
    shopTitle:'Shop All Products', shopSub:'Filter by floor, tenant, or category. Items from different tenants check out separately — straight to each shop.', shopEyebrow:'The Marketplace',
    servicesTitle:'Services in the Building', servicesSub:'Banking, health, beauty and more — handy services inside Ambassador Mall.', servicesEyebrow:'Building Services',
    howTitle:'How Ordering Works', howSub:'No middleman holding your money — you pay each tenant directly.', howEyebrow:'Simple & Direct',
    addToCart:'Add', viewQuick:'Quick view', cart:'My Cart', wishlist:'Wishlist',
    checkout:'Checkout', continue:'Continue', back:'Back', cancel:'Cancel', placeOrder:'Place Order',
    review:'Review', details:'Details', payment:'Payment', done:'Done',
    contact:'Contact', visit:'Visit Shop', viewProfile:'View Profile',
    owner:'Owner', mobile:'Mobile', tin:'TIN', floorLbl:'Floor', hours:'Hours',
    fullName:'Full Name', phone:'Phone', delivery:'Delivery', pickup:'Pickup',
    deliveryArea:'Delivery Area', address:'Address / Landmark', detectLoc:'Use my current location',
    payVia:'Choose how to pay', confirmWa:'Confirm on WhatsApp', downloadInvoice:'Download Invoice (PDF)',
    continueShopping:'Continue Shopping', orderPlaced:'Order Placed!',
    products:'products', viewAll:'View all',
    inStock:'In stock', lowStock:'Only {n} left', madeToOrder:'Made to order', soldOut:'Sold out',
    qty:'Quantity', share:'Share', shareVia:'Share via', linkCopied:'Link copied',
    sortBy:'Sort', sortFeatured:'Featured', sortPriceLow:'Price: Low to High', sortPriceHigh:'Price: High to Low', sortRating:'Top rated',
    priceRange:'Price', allPrices:'All prices', under:'Under', over:'Over',
    myOrders:'My Orders', noOrders:'No orders yet', orderOn:'Ordered', reorder:'View / Reorder',
    reviews:'Reviews', seeReviews:'See reviews', responds:'Responds', deliveryEst:'Estimated delivery', deliveryFee:'Delivery fee', free:'Free',
    needHelp:'Need help?', adminContact:'Marketplace Support', callUs:'Call', emailUs:'Email',
    vat:'VAT', subtotal:'Subtotal', grandTotal:'Total', inclVat:'incl. VAT',
    notifyMe:'Notify me', notifyTitle:'Get notified', notifyDesc:'Leave your phone and we\u2019ll let you know when this is back in stock.', notifyDone:'We\u2019ll notify you', yourPhone:'Your phone number',
    tos:'Terms of Service', privacy:'Privacy Policy', legalUpdated:'Last updated',
    setLocation:'Set delivery location', useGps:'Use my GPS location', orPickArea:'or choose your subcity', deliveryAddisOnly:'Delivery within Addis Ababa only',
    deliveryCalcNext:'Delivery calculated at the next step', locatingYou:'Finding your location\u2026', nearestZone:'Nearest zone',
    orderConfirmed:'Order confirmed', orderConfirmedSub:'Save your reference and send your payment proof to the seller on WhatsApp.', whatNext:'What happens next', nextStep1:'Transfer the exact total to the seller\u2019s account', nextStep2:'Send your payment screenshot to the seller on WhatsApp', nextStep3:'The seller confirms and arranges your delivery',
    noResults:'No matches found', noResultsTip:'Try a different word, or browse popular categories below.', popular:'Popular', clearSearch:'Clear search',
    resumeCart:'You left items in your cart', resumeCartBtn:'Resume', dismiss:'Dismiss',
    account:'Account', signIn:'Sign in', signOut:'Sign out', signInGoogle:'Continue with Google', signInTitle:'Sign in to Ambassador', signInSub:'Save your details for faster checkout. We never post anything.', signedInAs:'Signed in as', orContinueGuest:'Continue as guest', myAccount:'My Account'
  },
  am: {
    navTenants:'ተከራዮች', navShop:'ሱቅ', navServices:'አገልግሎቶች', navHow:'እንዴት እንደሚሰራ',
    navDirectory:'ማውጫ',
    searchPh:'ምርቶችን፣ ሱቆችን፣ ክፍሎችን ይፈልጉ…',
    dirEyebrow:'የህንፃው ማውጫ', dirTitle:'እያንዳንዱ ቢሮ፣ በየፎቁ',
    dirSub:'ሙሉው የአምባሳደር ሞል ማውጫ — ማንኛውንም ሱቅ፣ ቢሮ ወይም አገልግሎት በክፍል ቁጥር፣ በፎቅ ወይም በስም ያግኙ።',
    dirSearchPh:'ክፍል፣ ሱቅ፣ ምድብ ይፈልጉ…', allFloors:'ሁሉም ፎቆች',
    dirNoMatch:'ከፍለጋዎ ጋር የሚዛመድ ቢሮ አልተገኘም።', unitsLbl:'ክፍሎች', shopsLbl:'ሱቆች', svcLbl:'አገልግሎት',
    fpShops:'ሱቆች', fpServices:'አገልግሎቶች', fpProducts:'ምርቶች',
    shopThisFloor:'በዚህ ፎቅ ይግዙ', fullDirectory:'ሙሉ ማውጫ', tapUnit:'ዝርዝር ለማየት ማንኛውንም ክፍል ይንኩ',
    filters:'ማጣሪያዎች', sortBy:'ደርድር', priceRange:'ዋጋ (ብር)', availability:'መገኘት',
    floorLblF:'ፎቅ', ratingF:'ደረጃ', anyRating:'ማንኛውም ደረጃ', top4:'4★ እና በላይ',
    availAll:'ሁሉም', availIn:'በመጋዘን ያለ', availSale:'በቅናሽ', availMade:'በትዕዛዝ የሚሰራ',
    resetFilters:'አጽዳ', minPh:'ዝቅ', maxPh:'ከፍ', close:'ዝጋ',
    floorsGroup:'ፎቆች', unitsFound:'{n} ክፍሎች',
    startShopping:'ግዢ ይጀምሩ', meetTenants:'ሻጮችን ይዩ',
    heroTitle:'<em>እውነተኛ አድራሻ</em> ካላቸው ሻጮች ይግዙ።',
    heroSub:'እዚህ ያለ እያንዳንዱ ምርት በአምባሳደር የገበያ ማዕከል ውስጥ ባለ የተረጋገጠ ተከራይ ይሸጣል። በአካል ይጎብኙ ወይም በመስመር ላይ ይግዙ — ምርጫው የእርስዎ ነው።',
    statTenants:'የተረጋገጡ ተከራዮች', statOnline:'የመስመር ላይ ሱቆች', statFloors:'ፎቆች', statDaily:'ዕለታዊ ጎብኚዎች',
    statProducts:'ምርቶች', statVerified:'የተረጋገጠ',
    aboutEyebrow:'ህንፃው', aboutVisit:'በአካል ይጎብኙ', aboutTrust:'በመተማመን ላይ የተመሰረተ ግዢ',
    onSale:'አሁን በቅናሽ', onSaleSub:'ከህንፃው ውስጥ ካሉ የተረጋገጡ ሻጮች የተወሰነ ጊዜ ቅናሽ።',
    tenantsTitle:'መጎብኘት የሚችሏቸው የተረጋገጡ ሻጮች', tenantsSub:'በአምባሳደር የገበያ ማዕከል ውስጥ ያሉ የታመኑ ተከራዮችን ይመልከቱ — ለመግዛት ወይም በአካል ለመጎብኘት ሻጭ ይንኩ።', tenantsEyebrow:'ሻጮቻችን',
    shopTitle:'ሁሉንም ምርቶች ይግዙ', shopSub:'በፎቅ፣ በተከራይ ወይም በምድብ ያጣሩ። ከተለያዩ ተከራዮች ያሉ ምርቶች ለየብቻ ይከፈላሉ።', shopEyebrow:'ገበያ',
    servicesTitle:'በህንፃው ውስጥ ያሉ አገልግሎቶች', servicesSub:'ባንክ፣ ጤና፣ ውበት እና ሌሎች — በአምባሳደር ሞል ውስጥ ጠቃሚ አገልግሎቶች።', servicesEyebrow:'የህንፃ አገልግሎቶች',
    howTitle:'ትዕዛዝ እንዴት እንደሚሰራ', howSub:'ገንዘብዎን የሚይዝ አማላጅ የለም — በቀጥታ ለእያንዳንዱ ተከራይ ይከፍላሉ።', howEyebrow:'ቀላል እና ቀጥተኛ',
    addToCart:'ጨምር', viewQuick:'በፍጥነት ይዩ', cart:'የእኔ ጋሪ', wishlist:'ተወዳጆች',
    checkout:'ክፍያ', continue:'ቀጥል', back:'ተመለስ', cancel:'ሰርዝ', placeOrder:'ትዕዛዝ ስጥ',
    review:'ግምገማ', details:'ዝርዝሮች', payment:'ክፍያ', done:'ተጠናቀቀ',
    contact:'አግኙን', visit:'ሱቁን ይጎብኙ', viewProfile:'መገለጫ ይዩ',
    owner:'ባለቤት', mobile:'ስልክ', tin:'ቲን ቁጥር', floorLbl:'ፎቅ', hours:'ሰዓታት',
    fullName:'ሙሉ ስም', phone:'ስልክ', delivery:'ማድረስ', pickup:'መውሰድ',
    deliveryArea:'የማድረሻ አካባቢ', address:'አድራሻ / ምልክት', detectLoc:'የአሁኑን ቦታዬን ተጠቀም',
    payVia:'የመክፈያ መንገድ ይምረጡ', confirmWa:'በዋትስአፕ ያረጋግጡ', downloadInvoice:'ደረሰኝ ያውርዱ (PDF)',
    continueShopping:'ግዢ ይቀጥሉ', orderPlaced:'ትዕዛዝ ተሰጥቷል!',
    products:'ምርቶች', viewAll:'ሁሉንም ይዩ',
    inStock:'በመጋዘን አለ', lowStock:'{n} ብቻ ቀርቷል', madeToOrder:'በትዕዛዝ ይዘጋጃል', soldOut:'አልቋል',
    qty:'ብዛት', share:'አጋራ', shareVia:'አጋራ በ', linkCopied:'ሊንክ ተቀድቷል',
    sortBy:'ደርድር', sortFeatured:'ተመራጭ', sortPriceLow:'ዋጋ፡ ከዝቅተኛ', sortPriceHigh:'ዋጋ፡ ከከፍተኛ', sortRating:'ከፍተኛ ደረጃ',
    priceRange:'ዋጋ', allPrices:'ሁሉም ዋጋ', under:'ከዚህ በታች', over:'ከዚህ በላይ',
    myOrders:'የእኔ ትዕዛዞች', noOrders:'እስካሁን ትዕዛዝ የለም', orderOn:'የታዘዘበት', reorder:'ይመልከቱ / እንደገና ይዘዙ',
    reviews:'ግምገማዎች', seeReviews:'ግምገማዎችን ይዩ', responds:'ምላሽ ይሰጣል', deliveryEst:'የመድረሻ ግምት', deliveryFee:'የማድረስ ክፍያ', free:'ነጻ',
    needHelp:'እገዛ ይፈልጋሉ?', adminContact:'የገበያ ድጋፍ', callUs:'ይደውሉ', emailUs:'ኢሜይል',
    vat:'ተ.እ.ታ', subtotal:'ድምር', grandTotal:'ጠቅላላ', inclVat:'ከተ.እ.ታ ጋር',
    notifyMe:'አሳውቀኝ', notifyTitle:'ማሳወቂያ ያግኙ', notifyDesc:'ስልክዎን ይተዉ፤ ሲገኝ እናሳውቅዎታለን።', notifyDone:'እናሳውቅዎታለን', yourPhone:'የስልክ ቁጥርዎ',
    tos:'የአገልግሎት ውሎች', privacy:'የግላዊነት መመሪያ', legalUpdated:'መጨረሻ የተሻሻለው',
    setLocation:'የመድረሻ ቦታ ያስገቡ', useGps:'የGPS ቦታዬን ተጠቀም', orPickArea:'ወይም ክፍለ ከተማ ይምረጡ', deliveryAddisOnly:'ማድረስ በአዲስ አበባ ብቻ',
    deliveryCalcNext:'የማድረስ ክፍያ በሚቀጥለው ደረጃ ይሰላል', locatingYou:'ቦታዎን በማግኘት ላይ\u2026', nearestZone:'ቅርብ ዞን',
    orderConfirmed:'ትዕዛዝ ተረጋግጧል', orderConfirmedSub:'ማመሳከሪያዎን ያስቀምጡ እና የክፍያ ማረጋገጫዎን ለሻጩ በዋትስአፕ ይላኩ።', whatNext:'ቀጥሎ ምን ይሆናል', nextStep1:'ትክክለኛውን ጠቅላላ ወደ ሻጩ ሂሳብ ያስተላልፉ', nextStep2:'የክፍያ ማረጋገጫዎን ለሻጩ በዋትስአፕ ይላኩ', nextStep3:'ሻጩ አረጋግጦ ማድረሻ ያዘጋጃል',
    noResults:'ምንም አልተገኘም', noResultsTip:'ሌላ ቃል ይሞክሩ ወይም ከታች ያሉ ምድቦችን ይመልከቱ።', popular:'ተወዳጅ', clearSearch:'ፍለጋ አጽዳ',
    resumeCart:'በጋሪዎ ውስጥ ያልጨረሷቸው ዕቃዎች አሉ', resumeCartBtn:'ቀጥል', dismiss:'ዝጋ',
    account:'መለያ', signIn:'ግባ', signOut:'ውጣ', signInGoogle:'በGoogle ይቀጥሉ', signInTitle:'ወደ Ambassador ይግቡ', signInSub:'ለፈጣን ክፍያ ዝርዝሮችዎን ያስቀምጡ።', signedInAs:'የገባው', orContinueGuest:'እንደ እንግዳ ቀጥል', myAccount:'የእኔ መለያ'
  }
};

/* ════════════════════════════════════════════════════════════════
   ███  ORDER DELIVERY HOOK  ███
   Called automatically when an order is placed. By default it opens
   a WhatsApp message to the tenant AND logs the payload.
   ► To make "background send" truly server-side, drop your endpoint
     in sendOrderToTenant() where marked.
═══════════════════════════════════════════════════════════════════ */
function sendOrderToTenant(order) {
  // order = { ref, tenant, buyer, items, totals, bank, ... }
  console.log('[Ambassador ▸ order to tenant]', order);

  /* ─── PLUG IN YOUR BACKEND HERE (optional) ───────────────────────
     Example A — Formspree:
       fetch('https://formspree.io/f/XXXXXXX', {
         method:'POST', headers:{'Content-Type':'application/json'},
         body: JSON.stringify(order)
       });
     Example B — Google Apps Script web app:
       fetch('https://script.google.com/macros/s/XXXX/exec', {
         method:'POST', body: JSON.stringify(order)
       });
     Example C — EmailJS, your own API, Telegram bot, etc.
     Until then, the WhatsApp hand-off below is the live channel.
  ──────────────────────────────────────────────────────────────── */

  return true;
}

/* ════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════ */
var state = {
  filter: 'all',          // 'all' | catKey | tenantId
  search: '',
  sort: 'featured',       // featured | priceLow | priceHigh | rating
  priceMax: 0,            // 0 = no cap
  priceMin: 0,            // 0 = no floor
  stockF: 'all',          // all | in | sale | made
  ratingMin: 0,           // 0 | 4
  floorF: 'all',          // 'all' | floor name
  dirFloor: 'all',        // directory floor tab
  dirQ: '',               // directory search query
  lang: load('amb-lang', 'en'),   // 'en' | 'am'
  cart: load('amb-cart', []),     // [{pid, qty, variant}]
  wish: load('amb-wish', []),     // [pid]
  orders: load('amb-orders', []), // [order]  (local history; backend will sync later)
  user: load('amb-user', null),   // {name,email,picture,sub} — set on (simulated) Google sign-in
  notify: load('amb-notify', []), // [{pid,phone,ts}] back-in-stock requests (backend-ready)
  cartTs: load('amb-cart-ts', 0), // last time cart changed (abandoned-cart recovery)
  // checkout
  coTenant: null,
  coStep: 1,
  coData: {},
  coBank: null,
  coPayMethod: 'bank_transfer',
  lastOrder: null
};

/* i18n helper — current-language label, supports {n} interpolation */
function t(key, vars){
  var d=I18N[state.lang]||I18N.en;
  var s = (key in d)?d[key]:(I18N.en[key]||key);
  if(vars){ for(var k in vars){ s = s.replace('{'+k+'}', vars[k]); } }
  return s;
}

/* orders history (local now; backend hook later via sendOrderToTenant) */
function saveOrder(o){
  state.orders.unshift(o);
  if(state.orders.length>50) state.orders = state.orders.slice(0,50);
  save('amb-orders', state.orders);
}

/* ── VAT / tax helpers (BUILDING.tax) ──
   inclusive:false → tax added on top of subtotal+delivery.
   Returns {net, tax, gross} so every total is computed one way. */
function taxRate(){ return (BUILDING.tax && BUILDING.tax.rate) || 0; }
function computeTotals(subtotal, fee){
  fee = fee||0; var r=taxRate(); var base=subtotal+fee, tax=0, gross=base;
  if(r>0){
    if(BUILDING.tax.inclusive){ tax = base - base/(1+r); gross = base; }
    else { tax = base*r; gross = base+tax; }
  }
  return { subtotal:subtotal, fee:fee, net:base-(BUILDING.tax&&BUILDING.tax.inclusive?tax:0), tax:Math.round(tax), gross:Math.round(gross) };
}

/* ── distance (haversine, km) for GPS → nearest subcity ── */
function kmBetween(a,b,c,d){
  var R=6371, p=Math.PI/180;
  var dLat=(c-a)*p, dLng=(d-b)*p;
  var x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function nearestArea(lat,lng){
  var best=null, bestD=1e9;
  BUILDING.areas.forEach(function(a){
    if(a.lat==null) return;
    var dkm=kmBetween(lat,lng,a.lat,a.lng);
    if(dkm<bestD){ bestD=dkm; best=a; }
  });
  return best ? { area:best, km:bestD } : null;
}

/* ── notify-me (back in stock) — local capture, backend-ready ── */
function saveNotify(pid, phone){
  state.notify.push({ pid:pid, phone:phone, ts:Date.now() });
  save('amb-notify', state.notify);
  /* BACKEND SEAM: POST {pid, phone} to your endpoint here later. */
}

/* save cart + stamp last-activity time (for abandoned-cart recovery) */
function saveCart(){
  save('amb-cart', state.cart);
  state.cartTs = Date.now();
  save('amb-cart-ts', state.cartTs);
}

/* flatten all products with tenant ref for quick lookup */
var ALL_PRODUCTS = [];
function rebuildProducts(){
  ALL_PRODUCTS.length = 0;   // mutate in place — other modules hold this array reference
  BUILDING.tenants.forEach(function (t) {
    t.products.forEach(function (p) {
      ALL_PRODUCTS.push(Object.assign({}, p, { tenantId: t.id }));
    });
  });
}
rebuildProducts();

/* ── BACKEND API (same-origin Express server). Falls back gracefully
      when offline / opened as a plain file — the embedded data below
      then acts as the demo catalog. ── */
function api(path, opts){
  if (typeof fetch === 'undefined') return Promise.reject(new Error('no-fetch'));
  var o = opts || {};
  return fetch(path, {
    method: o.method || 'GET',
    headers: o.body ? { 'Content-Type': 'application/json' } : undefined,
    body: o.body ? JSON.stringify(o.body) : undefined,
    credentials: 'same-origin'
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(d){
      if (!r.ok) { var e = new Error(d.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
      return d;
    });
  });
}

/* merge the server catalog over the embedded demo data, then re-render */
function applyCatalog(cat){
  if (!cat || !cat.building) return;
  var b = cat.building;
  ['name','nameAm','tagline','taglineAm','location','phone','logo','stats','geo','tax','areas','delivery','admin','policy','legal','quickLinks','tenants','floorStats'].forEach(function(k){
    if (b[k] !== undefined) BUILDING[k] = b[k];
  });
  if (cat.services) { SERVICES.length = 0; cat.services.forEach(function(s){ SERVICES.push(s); }); }
  rebuildProducts();
}

/* ════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function load(k, d) { try { var v = store.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function save(k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) {} }
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(n) { return 'ETB ' + Number(n).toLocaleString(); }
function fmtN(n) { return Number(n).toLocaleString(); }
function P(pid) { for (var i=0;i<ALL_PRODUCTS.length;i++) if (ALL_PRODUCTS[i].id===pid) return ALL_PRODUCTS[i]; return null; }
function tenant(tid) { for (var i=0;i<BUILDING.tenants.length;i++) if (BUILDING.tenants[i].id===tid) return BUILDING.tenants[i]; return null; }
function stars(r){ var n=Math.round(r), s=''; for(var i=0;i<5;i++) s += i<n?'★':'☆'; return s; }

/* products that are on sale (have an old price) */
function onSaleProducts(){ return ALL_PRODUCTS.filter(function(p){ return p.old && p.old>p.price; }); }

/* expose for inline handlers + later parts */
window.__AMB = {
  BUILDING:BUILDING, SERVICES:SERVICES, I18N:I18N, state:state, ALL_PRODUCTS:ALL_PRODUCTS,
  load:load, save:save, $:$, esc:esc, fmt:fmt, fmtN:fmtN, P:P, tenant:tenant, stars:stars, t:t,
  onSaleProducts:onSaleProducts, sendOrderToTenant:sendOrderToTenant, saveOrder:saveOrder,
  saveCart:saveCart, saveNotify:saveNotify, computeTotals:computeTotals, nearestArea:nearestArea, kmBetween:kmBetween,
  api:api, cfg:{ googleClientId:null, demoAuth:true, online:false }, applyCatalog:applyCatalog, rebuildProducts:rebuildProducts
};

})();

/* ════════════════════════════════════════════════════════════════
   PART 2 — Rendering, i18n, search dropdown, carousels, tenant
            profiles, services, product gallery modal, wishlist
═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
var A = window.__AMB;
var BUILDING=A.BUILDING, SERVICES=A.SERVICES, state=A.state, ALL_PRODUCTS=A.ALL_PRODUCTS;
var save=A.save, $=A.$, esc=A.esc, fmt=A.fmt, fmtN=A.fmtN, P=A.P, tenant=A.tenant, stars=A.stars, t=A.t;
var onSaleProducts=A.onSaleProducts;

function initials(name){ return name.split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join(''); }
function nameFor(obj){ return state.lang==='am' && obj.nameAm ? obj.nameAm : obj.name; }
function floorUnit(obj){ return obj && obj.unit ? obj.floor + ' - ' + obj.unit : (obj ? obj.floor : ''); }
A.floorUnit = floorUnit;
var FLOOR_AM = { 'Ground Floor':'መሬት ወለል', '1st Floor':'1ኛ ፎቅ', '2nd Floor':'2ኛ ፎቅ', '3rd Floor':'3ኛ ፎቅ', '4th Floor':'4ኛ ፎቅ', '5th Floor':'5ኛ ፎቅ', '6th Floor':'6ኛ ፎቅ' };
function floorColor(floorName){ var t=BUILDING.tenants.filter(function(x){ return x.floor===floorName; })[0]; return (t&&t.color)||'var(--wine)'; }

/* ── TOAST ── */
window.ambToast = function (msg, kind) {
  var wrap = $('ambToastWrap'); if (!wrap) return;
  var ic = kind==='err'?'fa-circle-exclamation':kind==='suc'?'fa-circle-check':'fa-circle-info';
  var el = document.createElement('div');
  el.className = 'amb-toast ' + (kind||'');
  el.innerHTML = '<i class="fas '+ic+'"></i><span>'+esc(msg)+'</span>';
  wrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 400); }, 3200);
};

window.ambCopy = function (text) {
  try {
    navigator.clipboard.writeText(text).then(function(){ window.ambToast('Copied: '+text, 'suc'); },
      function(){ fallbackCopy(text); });
  } catch (e) { fallbackCopy(text); }
};
function fallbackCopy(text){
  var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); window.ambToast('Copied: '+text,'suc'); }catch(e){ window.ambToast('Copy failed','err'); }
  ta.remove();
}

window.ambScrollTo = function (id) { var el=$(id); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); ambCloseSearch(); };

/* ════ LANGUAGE TOGGLE ════ */
window.ambSetLang = function (lang) {
  state.lang = lang; save('amb-lang', lang);
  applyI18n();
  renderRibbon(); renderTenants(); renderServices(); renderOnSale(); renderFilterChips(); renderFilterBar(); renderProducts(); renderDirectory(); renderHeroVisual();
  var btn=$('ambLangBtn'); if(btn) btn.innerHTML = lang==='en' ? '<i class="fas fa-language"></i> አማ' : '<i class="fas fa-language"></i> EN';
};
window.ambToggleLang = function(){ ambSetLang(state.lang==='en'?'am':'en'); };

function applyI18n(){
  // any element with data-i18n gets its text replaced; data-i18n-html allows <em>
  document.querySelectorAll('#amb-store [data-i18n]').forEach(function(el){
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('#amb-store [data-i18n-html]').forEach(function(el){
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  var s=$('ambSearch'); if(s) s.placeholder = t('searchPh');
  document.documentElement.lang = state.lang;
}

/* ── RIBBON ── */
function renderRibbon() {
  var items = [
    ['fa-shield-halved', state.lang==='am'?'እውነተኛ አድራሻ ካላቸው የተረጋገጡ ሻጮች ይግዙ':'Buy from verified sellers with a real address'],
    ['fa-building-columns', state.lang==='am'?'በቀጥታ ለእያንዳንዱ ሱቅ ይክፈሉ · CBE · Awash · BOA · Telebirr':'Pay each shop directly · CBE · Awash · BOA · Telebirr'],
    ['fab fa-whatsapp', state.lang==='am'?'ትዕዛዝዎን በዋትስአፕ ያረጋግጡ':'Confirm your order on WhatsApp'],
    ['fa-file-invoice', state.lang==='am'?'ወዲያውኑ የPDF ደረሰኝ ያውርዱ':'Download a PDF invoice instantly'],
    ['fa-location-dot', BUILDING.name+' · '+(state.lang==='am'?'ከብሔራዊ ቤተ መንግሥት ፊት ለፊት':'in front of the National Palace')],
    ['fa-cube', state.lang==='am'?'የቢሲንካ ማውጫ መደብር':'A Bisinka Directory storefront']
  ];
  var one = items.map(function(i){ var fa = i[0].indexOf('fab')===0?i[0]:'fas '+i[0]; return '<span><i class="'+fa+'"></i>'+esc(i[1])+'</span>'; }).join('');
  var el=$('ambRibbon'); if(el) el.innerHTML = one + one;
}

/* ── BRAND / HERO / FOOTER chrome ── */
function renderChrome() {
  if ($('ambLogo')) $('ambLogo').src = BUILDING.logo;
  if ($('ambFooterLogo')) $('ambFooterLogo').src = BUILDING.logo;
  if ($('ambBrandName')) $('ambBrandName').textContent = BUILDING.name;
  if ($('ambFooterName')) $('ambFooterName').textContent = BUILDING.name;
  if ($('ambCopyright')) $('ambCopyright').textContent = BUILDING.copyright;
  var ph=$('ambFooterPhone'); if(ph){ ph.textContent = BUILDING.phone; ph.href='tel:'+BUILDING.phone.replace(/\s/g,''); }
  // hero stats — trust framing (no "sample tenant" language)
  renderHeroStats();
  renderAbout();
  renderQuickLinks();
  renderPolicy();
}

function renderHeroStats(){
  var el=$('ambHeroStats'); if(!el) return;
  var s=BUILDING.stats;
  var hs = [
    [ALL_PRODUCTS.length+'+', t('statProducts')],
    ['100%', t('statVerified')],
    [s.tenants, t('statTenants')],
    [s.floors, t('statFloors')]
  ];
  el.innerHTML = hs.map(function(x){ return '<div class="amb-hstat"><span class="amb-hstat-n">'+esc(x[0])+'</span><span class="amb-hstat-l">'+esc(x[1])+'</span></div>'; }).join('');
}

/* ── ABOUT / BUILDING BLOCK ── */
function renderAbout(){
  var el=$('ambAbout'); if(!el) return;
  var s=BUILDING.stats;
  var about = state.lang==='am' ? BUILDING.aboutAm : BUILDING.about;
  var stat = function(n,l){ return '<div class="amb-about-stat"><div class="amb-about-stat-n">'+esc(n)+'</div><div class="amb-about-stat-l">'+esc(l)+'</div></div>'; };
  el.innerHTML =
    '<div class="amb-about-media">'+
      '<img src="https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80" alt="'+esc(BUILDING.name)+'" onerror="this.style.display=\'none\'">'+
      '<div class="amb-about-badge"><i class="fas fa-shield-halved"></i> '+esc(t('aboutTrust'))+'</div>'+
    '</div>'+
    '<div class="amb-about-body">'+
      '<div class="amb-eyebrow2" style="justify-content:flex-start">'+esc(t('aboutEyebrow'))+'</div>'+
      '<h3 class="amb-title" style="text-align:left">'+esc(BUILDING.name)+'</h3>'+
      '<p class="amb-about-desc">'+esc(about)+'</p>'+
      '<div class="amb-about-stats">'+
        stat(s.tenants, t('statTenants'))+
        stat(s.online, t('statOnline'))+
        stat(s.floors, t('statFloors'))+
        stat(s.daily, t('statDaily'))+
      '</div>'+
      '<div class="amb-about-loc"><i class="fas fa-location-dot"></i> '+esc(BUILDING.location)+'</div>'+
    '</div>';
}

/* ── FOOTER QUICK LINKS (ecosystem) ── */
function renderQuickLinks(){
  var el=$('ambQuickLinks'); if(!el) return;
  el.innerHTML = BUILDING.quickLinks.map(function(q){
    var label = state.lang==='am' && q.labelAm ? q.labelAm : q.label;
    return '<a href="'+esc(q.href)+'"><i class="fas '+q.icon+'"></i> '+esc(label)+'</a>';
  }).join('');
}

/* ── BUYER SAFETY / RETURNS + SUPPORT cards ── */
function renderPolicy(){
  var el=$('ambPolicy'); if(!el) return;
  var pol=BUILDING.policy, a=BUILDING.admin, am=state.lang==='am';
  var title=$('ambPolicyTitle'); if(title) title.textContent = pol.returnsTitle;
  el.innerHTML =
    '<div class="amb-help-card">'+
      '<div class="amb-help-ic" style="background:linear-gradient(135deg,var(--teal),var(--teal-d))"><i class="fas fa-shield-halved"></i></div>'+
      '<div class="amb-help-t">'+(am?'ክፍያ ደህንነት':'Payment safety')+'</div>'+
      '<p class="amb-help-d">'+esc(am?pol.safetyAm:pol.safety)+'</p>'+
    '</div>'+
    '<div class="amb-help-card">'+
      '<div class="amb-help-ic" style="background:linear-gradient(135deg,var(--wine),var(--wine-l))"><i class="fas fa-rotate-left"></i></div>'+
      '<div class="amb-help-t">'+(am?'ተመላሽና ቅሬታ':'Returns & issues')+'</div>'+
      '<p class="amb-help-d">'+esc(am?pol.returnsAm:pol.returns)+'</p>'+
    '</div>'+
    '<div class="amb-help-card support">'+
      '<div class="amb-help-ic" style="background:linear-gradient(135deg,var(--gold-d),#a0791a)"><i class="fas fa-headset"></i></div>'+
      '<div class="amb-help-t">'+esc(t('adminContact'))+'</div>'+
      '<p class="amb-help-d">'+(am?'ስለ መድረኩ እገዛ ለማግኘት ቢሲንካ ገበያን ያግኙ።':'Reach Bisinka Marketplace for help with the platform.')+'</p>'+
      '<button class="amb-help-btn" onclick="ambOpenAdmin()"><i class="fas fa-headset"></i> '+esc(t('adminContact'))+'</button>'+
    '</div>';
}

/* ════ SEARCH DROPDOWN (grouped typeahead) ════ */
window.ambSearchInput = function(){
  var inp=$('ambSearch'); state.search = inp?inp.value.trim():'';
  renderProducts();
  renderSearchDropdown();
};
window.ambSearchFocus = function(){ renderSearchDropdown(); };
window.ambCloseSearch = function(){ var d=$('ambSearchDrop'); if(d) d.classList.remove('on'); };

function buildSearchHTML(q){
  var tenants = BUILDING.tenants.filter(function(x){
    return ((x.unit||'')+' '+x.name+' '+x.cat+' '+(x.nameAm||'')+' '+(x.owner||'')+' '+x.floor).toLowerCase().indexOf(q)>=0;
  }).slice(0,5);
  var floors = floorsList().filter(function(fl){
    return (fl+' '+(FLOOR_AM[fl]||'')).toLowerCase().indexOf(q)>=0;
  }).slice(0,3);
  var floorsHTML='';
  if(floors.length){
    floorsHTML = '<div class="amb-sd-group"><div class="amb-sd-head"><i class="fas fa-layer-group"></i> '+esc(t('floorsGroup'))+'</div>'+
      floors.map(function(fl){
        var ct = BUILDING.tenants.filter(function(x){return x.floor===fl;}).length;
        var flEsc = esc(fl).replace(/'/g,"\\'");
        return '<button class="amb-sd-item" onclick="ambSearchPickFloor(\''+flEsc+'\')">'+
          '<span class="amb-sd-ic" style="background:'+floorColor(fl)+'"><i class="fas fa-layer-group"></i></span>'+
          '<span class="amb-sd-txt"><b>'+esc(fl)+' '+esc(FLOOR_AM[fl]||'')+'</b><span>'+t('unitsFound',{n:ct})+'</span></span></button>';
      }).join('')+'</div>';
  }
  var cats = {};
  ALL_PRODUCTS.forEach(function(p){ if(p.cat.toLowerCase().indexOf(q)>=0) cats[p.cat]=(cats[p.cat]||0)+1; });
  var catList = Object.keys(cats).slice(0,4);
  var prods = ALL_PRODUCTS.filter(function(p){ return (p.name+' '+p.cat+' '+(p.desc||'')).toLowerCase().indexOf(q)>=0; }).slice(0,6);
  var svcs = (SERVICES||[]).filter(function(s){ return (s.name+' '+(s.nameAm||'')+' '+s.type+' '+(s.blurb||'')).toLowerCase().indexOf(q)>=0; }).slice(0,4);

  var html = floorsHTML;
  if(tenants.length){
    html += '<div class="amb-sd-group"><div class="amb-sd-head"><i class="fas fa-store"></i> '+(state.lang==='am'?'ሻጮች':'Sellers')+'</div>';
    html += tenants.map(function(x){
      return '<button class="amb-sd-item" onclick="ambSearchPick(\'tenant\',\''+x.id+'\')">'+
        '<span class="amb-sd-ic" style="background:'+x.color+'"><i class="fas '+x.icon+'"></i></span>'+
        '<span class="amb-sd-txt"><b>'+esc(nameFor(x))+'</b><span>'+esc(x.cat)+' · '+esc(floorUnit(x))+'</span></span></button>';
    }).join('')+'</div>';
  }
  if(catList.length){
    html += '<div class="amb-sd-group"><div class="amb-sd-head"><i class="fas fa-tags"></i> '+(state.lang==='am'?'ምድቦች':'Categories')+'</div>';
    html += catList.map(function(c){
      return '<button class="amb-sd-item" onclick="ambSearchPickCat(\''+esc(c).replace(/'/g,"\\'")+'\')">'+
        '<span class="amb-sd-ic" style="background:var(--wine)"><i class="fas fa-tag"></i></span>'+
        '<span class="amb-sd-txt"><b>'+esc(c)+'</b><span>'+cats[c]+' '+t('products')+'</span></span></button>';
    }).join('')+'</div>';
  }
  if(prods.length){
    html += '<div class="amb-sd-group"><div class="amb-sd-head"><i class="fas fa-box"></i> '+(state.lang==='am'?'ምርቶች':'Products')+'</div>';
    html += prods.map(function(p){
      return '<button class="amb-sd-item" onclick="ambSearchPick(\'product\',\''+p.id+'\')">'+
        '<img class="amb-sd-img" src="'+esc(p.img)+'" onerror="this.style.visibility=\'hidden\'">'+
        '<span class="amb-sd-txt"><b>'+esc(p.name)+'</b><span>'+fmt(p.price)+' · '+esc(tenant(p.tenantId).name)+'</span></span></button>';
    }).join('')+'</div>';
  }
  if(svcs.length){
    html += '<div class="amb-sd-group"><div class="amb-sd-head"><i class="fas fa-concierge-bell"></i> '+(state.lang==='am'?'አገልግሎቶች':'Services')+'</div>';
    html += svcs.map(function(s){
      return '<button class="amb-sd-item" onclick="ambSearchPick(\'service\',\''+s.id+'\')">'+
        '<span class="amb-sd-ic" style="background:'+s.color+'"><i class="fas '+s.icon+'"></i></span>'+
        '<span class="amb-sd-txt"><b>'+esc(s.name)+'</b><span>'+esc(s.type)+' · '+esc(s.floor)+'</span></span></button>';
    }).join('')+'</div>';
  }
  if(!html){
    // graceful empty state: friendly message + popular categories + clear action
    var popCats = {};
    ALL_PRODUCTS.forEach(function(p){ popCats[p.cat]=(popCats[p.cat]||0)+1; });
    var top = Object.keys(popCats).sort(function(a,b){return popCats[b]-popCats[a];}).slice(0,6);
    html = '<div class="amb-sd-empty">'+
        '<div class="amb-sd-empty-ic"><i class="fas fa-magnifying-glass"></i></div>'+
        '<div class="amb-sd-empty-t">'+t('noResults')+' "<b>'+esc(q)+'</b>"</div>'+
        '<div class="amb-sd-empty-s">'+t('noResultsTip')+'</div>'+
        '<div class="amb-sd-pop-h">'+t('popular')+'</div>'+
        '<div class="amb-sd-pop">'+ top.map(function(c){
          return '<button class="amb-sd-chip" onclick="ambSearchPickCat(\''+esc(c).replace(/'/g,"\\'")+'\')">'+esc(c)+'</button>';
        }).join('') +'</div>'+
        '<button class="amb-sd-clear" onclick="ambClearSearch()"><i class="fas fa-xmark"></i> '+t('clearSearch')+'</button>'+
      '</div>';
  }
  return html;
}
function renderSearchDropdown(){
  var d=$('ambSearchDrop'); if(!d) return;
  var q=state.search.toLowerCase();
  if(!q){ d.classList.remove('on'); d.innerHTML=''; return; }
  d.innerHTML = buildSearchHTML(q); d.classList.add('on');
}
window.ambSearchPickFloor = function(fl){
  ambCloseSearch(); ambCloseMSearch();
  var inp=$('ambSearch'); if(inp) inp.value='';
  state.search=''; renderProducts();
  ambOpenFloorPanel(fl);
};

/* ── MOBILE SEARCH OVERLAY ── */
function mSearchHint(){
  return '<div class="amb-msearch-hint"><i class="fas fa-magnifying-glass"></i>'+esc(t('searchPh'))+'</div>';
}
window.ambOpenMSearch = function(){
  var o=$('ambMSearch'); if(!o) return;
  o.classList.add('on');
  document.body.style.overflow='hidden';
  var inp=$('ambMSearchIn');
  if(inp){ inp.placeholder=t('searchPh'); inp.value=state.search||''; setTimeout(function(){ inp.focus(); },80); }
  ambMSearchInput();
};
window.ambCloseMSearch = function(){
  var o=$('ambMSearch'); if(!o) return;
  o.classList.remove('on');
  var modalOpen = document.querySelector('#amb-store .amb-modal.on, #amb-store .amb-cart.open, #amb-store .amb-floor-panel.open');
  if(!modalOpen) document.body.style.overflow='';
};
window.ambMSearchInput = function(){
  var inp=$('ambMSearchIn'), body=$('ambMSearchBody'); if(!body) return;
  var q = inp ? inp.value.trim() : '';
  state.search = q; renderProducts();
  body.innerHTML = q ? buildSearchHTML(q.toLowerCase()) : mSearchHint();
};
window.ambClearSearch = function(){
  var inp=$('ambSearch'); if(inp) inp.value='';
  var mi=$('ambMSearchIn'); if(mi) mi.value='';
  state.search=''; renderProducts(); ambCloseSearch();
  var mb=$('ambMSearchBody'); if(mb && $('ambMSearch') && $('ambMSearch').classList.contains('on')) mb.innerHTML=mSearchHint();
};
window.ambSearchPick = function(kind, id){
  ambCloseSearch(); ambCloseMSearch();
  var inp=$('ambSearch'); if(inp) inp.value='';
  state.search='';
  if(kind==='tenant'){ ambFilter(id); renderProducts(); ambScrollTo('ambShop'); }
  else if(kind==='product'){ ambOpenProduct(id); }
  else if(kind==='service'){ ambOpenService(id); }
};
window.ambSearchPickCat = function(cat){
  ambCloseSearch(); ambCloseMSearch();
  var inp=$('ambSearch'); if(inp) inp.value='';
  state.search=''; renderProducts();
  // jump to first tenant offering this category, else just scroll shop
  ambScrollTo('ambShop');
  window.ambToast((state.lang==='am'?'ምድብ፡ ':'Category: ')+cat);
};

/* ── TENANT CAROUSEL (enhanced cards w/ profile) ── */
function renderTenants() {
  var cards = BUILDING.tenants.map(function(tn){ return tenantCardHTML(tn); }).join('');
  var strip=$('ambTenantStrip'); if(strip) strip.innerHTML = cards;
  var gal=$('ambTenantGallery'); if(gal) gal.innerHTML = cards;
  var cnt=$('ambHeroSellerCount'); if(cnt) cnt.textContent = BUILDING.tenants.length;
}
function socialIcons(s, color){
  if(!s) return '';
  var out=[];
  if(s.telegram) out.push('<a class="amb-soc-mini" title="Telegram" href="https://t.me/'+esc(s.telegram)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fab fa-telegram-plane"></i></a>');
  if(s.facebook) out.push('<a class="amb-soc-mini" title="Facebook" href="https://facebook.com/'+esc(s.facebook)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fab fa-facebook-f"></i></a>');
  if(s.instagram) out.push('<a class="amb-soc-mini" title="Instagram" href="https://instagram.com/'+esc(s.instagram)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fab fa-instagram"></i></a>');
  if(s.tiktok) out.push('<a class="amb-soc-mini" title="TikTok" href="https://tiktok.com/'+esc(s.tiktok)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fab fa-tiktok"></i></a>');
  return out.join('');
}
function tenantCardHTML(tn){
  var active = state.filter===tn.id;
  var dark = shade(tn.color,-50);
  // 6 awning stripes alternating tenant color / dark shade
  var stripes='';
  for(var i=0;i<6;i++){ stripes += '<span class="amb-kstripe" style="background:'+(i%2?dark:tn.color)+'"></span>'; }
  return '<div class="amb-kiosk'+(active?' active':'')+'" style="--kc:'+tn.color+';--kcd:'+dark+'" onclick="ambOpenTenant(\''+tn.id+'\')">'+
    /* awning */
    '<div class="amb-kiosk-awning">'+
      '<div class="amb-kawn-bar"></div>'+
      '<div class="amb-kawn-canvas">'+stripes+'</div>'+
      '<div class="amb-kawn-valance"><svg viewBox="0 0 100 12" preserveAspectRatio="none">'+
        '<path d="M0,0 L100,0 L100,4 C95,4 95,12 90,12 C85,12 85,4 80,4 C75,4 75,12 70,12 C65,12 65,4 60,4 C55,4 55,12 50,12 C45,12 45,4 40,4 C35,4 35,12 30,12 C25,12 25,4 20,4 C15,4 15,12 10,12 C5,12 5,4 0,4 Z" fill="'+dark+'"/>'+
      '</svg></div>'+
    '</div>'+
    /* building */
    '<div class="amb-kiosk-bldg">'+
      '<div class="amb-kiosk-window">'+
        '<img src="'+esc(tn.photo)+'" alt="'+esc(tn.name)+'" loading="lazy" onerror="this.style.display=\'none\'">'+
        '<div class="amb-kiosk-glare"></div>'+
        '<span class="amb-kiosk-verified" onclick="event.stopPropagation();ambShowVerifiedInfo()" style="cursor:pointer"><i class="fas fa-circle-check"></i> '+esc(t('statVerified'))+'</span>'+
        '<span class="amb-kiosk-floor">'+esc(floorUnit(tn))+'</span>'+
      '</div>'+
      '<div class="amb-kiosk-sign" style="background:linear-gradient(150deg,'+tn.color+','+dark+')">'+esc(initials(tn.name))+'</div>'+
      '<div class="amb-kiosk-interior">'+
        '<div class="amb-kiosk-cat"><i class="fas '+tn.icon+'"></i> '+esc(tn.cat)+'</div>'+
        '<h3 class="amb-kiosk-title display">'+esc(nameFor(tn))+'</h3>'+
        '<div class="amb-kiosk-rating"><span class="amb-kiosk-stars">'+stars(tn.rating)+'</span> <b>'+tn.rating+'</b> <span class="amb-rev">('+tn.reviews+')</span></div>'+
        '<div class="amb-kiosk-owner"><i class="fas fa-user-tie"></i> '+esc(tn.owner)+'</div>'+
        '<div class="amb-kiosk-connect">'+socialIcons(tn.socials,tn.color)+'</div>'+
        '<div class="amb-kiosk-actions">'+
          '<button class="amb-kiosk-buy" onclick="event.stopPropagation();ambFilter(\''+tn.id+'\');ambScrollTo(\'ambShop\')"><i class="fas fa-basket-shopping"></i> '+(state.lang==='am'?'ሱቅ ይግቡ':'Enter Shop')+'</button>'+
          '<button class="amb-kiosk-prof" onclick="event.stopPropagation();ambOpenTenant(\''+tn.id+'\')"><i class="fas fa-store"></i> '+(state.lang==='am'?'መገለጫ':'Profile')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function shade(hex, pct){
  var n=parseInt(hex.replace('#',''),16), r=(n>>16)+pct, g=((n>>8)&0xff)+pct, b=(n&0xff)+pct;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return '#'+(0x1000000+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/* ── TENANT PROFILE MODAL ── */
window.ambOpenTenant = function(tid){
  var tn=tenant(tid); if(!tn) return;
  var rows = [
    ['fa-user', t('owner'), tn.owner],
    ['fa-phone', t('mobile'), tn.mobile],
    ['fa-id-card', t('tin'), tn.tin],
    ['fa-building', t('floorLbl'), floorUnit(tn)],
    ['fab fa-whatsapp', 'WhatsApp', '+'+tn.whatsapp]
  ].map(function(r){
    var fa=r[0].indexOf('fab')===0?r[0]:'fas '+r[0];
    return '<div class="amb-tp-row"><span class="amb-tp-row-l"><i class="'+fa+'"></i> '+esc(r[1])+'</span><span class="amb-tp-row-v">'+esc(r[2])+'</span></div>';
  }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-tp">'+
      '<div class="amb-tp-cover" style="background:linear-gradient(135deg,'+tn.color+','+shade(tn.color,-30)+')">'+
        '<img src="'+esc(tn.photo)+'" alt="" onerror="this.style.display=\'none\'">'+
      '</div>'+
      '<div class="amb-tp-head">'+
        '<div class="amb-tp-av" style="background:linear-gradient(135deg,'+tn.color+','+shade(tn.color,-25)+')">'+esc(initials(tn.name))+'</div>'+
        '<div><div class="amb-tp-name">'+esc(nameFor(tn))+' <i class="fas fa-circle-check" style="color:var(--success);font-size:.7rem;cursor:pointer" onclick="ambShowVerifiedInfo()" title="What does Verified mean?"></i></div>'+
        '<div class="amb-tp-cat"><i class="fas '+tn.icon+'"></i> '+esc(tn.cat)+' · '+esc(floorUnit(tn))+'</div></div>'+
      '</div>'+
      '<div class="amb-tp-body">'+
        '<p class="amb-tp-blurb">'+esc(tn.blurb)+'</p>'+
        (tn.responseTime?'<div class="amb-tp-responds"><i class="fas fa-bolt"></i> '+t('responds')+': '+esc(tn.responseTime)+'</div>':'')+
        '<div class="amb-tp-rows">'+rows+'</div>'+
        (tn.reviewLink?'<a class="amb-tp-reviews" href="'+esc(tn.reviewLink)+'" target="_blank" rel="noopener"><i class="fas fa-star"></i> '+t('seeReviews')+' ('+tn.reviews+') <i class="fas fa-arrow-up-right-from-square" style="font-size:.6rem"></i></a>':'')+
        '<div class="amb-tp-socials">'+socialIcons(tn.socials,tn.color)+'</div>'+
        '<div class="amb-tp-acts">'+
          '<button class="amb-tp-shop" onclick="ambCloseAll();ambFilter(\''+tn.id+'\');ambScrollTo(\'ambShop\')"><i class="fas fa-bag-shopping"></i> '+(state.lang==='am'?'ምርቶችን ይግዙ':'Shop Products')+'</button>'+
          '<a class="amb-tp-wa" href="https://wa.me/'+tn.whatsapp+'" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a>'+
          '<button class="amb-tp-wa" style="background:var(--teal)" onclick="ambShareTenant(\''+tn.id+'\')" title="'+esc(t('share'))+'"><i class="fas fa-share-nodes"></i></button>'+
        '</div>'+
      '</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
  ambSetDeepLink('tenant', tn.id);
};

/* ── SERVICES (non-retail info cards — dual photo + details + view) ── */
function renderServices(){
  var el=$('ambServicesGrid'); if(!el) return;
  el.innerHTML = SERVICES.map(function(sv){
    var g='linear-gradient(135deg,'+sv.color+','+shade(sv.color,-25)+')';
    return '<div class="amb-svc" onclick="ambOpenService(\''+sv.id+'\')">'+
      '<div class="amb-svc-photos">'+
        '<div class="amb-svc-photo main"><img src="'+esc(sv.photo)+'" alt="'+esc(sv.name)+'" loading="lazy" onerror="this.parentNode.style.background=\''+sv.color+'\'"></div>'+
        '<div class="amb-svc-photo sub"><img src="'+esc(sv.photo2||sv.photo)+'" alt="" loading="lazy" onerror="this.parentNode.style.background=\''+shade(sv.color,-25)+'\'"></div>'+
        '<span class="amb-svc-typebadge" style="background:'+g+'"><i class="fas '+sv.icon+'"></i> '+esc(sv.type)+'</span>'+
      '</div>'+
      '<div class="amb-svc-body">'+
        '<div class="amb-svc-namerow">'+
          '<div class="amb-svc-ic" style="background:'+g+'"><i class="fas '+sv.icon+'"></i></div>'+
          '<div class="amb-svc-titles"><div class="amb-svc-name">'+esc(nameFor(sv))+'</div>'+
          '<div class="amb-svc-type">'+esc(sv.floor)+' · '+esc(sv.established||'')+'</div></div>'+
        '</div>'+
        '<p class="amb-svc-blurb">'+esc(sv.blurb)+'</p>'+
        '<div class="amb-svc-metarows">'+
          '<div class="amb-svc-metarow"><i class="fas fa-clock"></i> '+esc(sv.hours)+'</div>'+
          '<div class="amb-svc-metarow"><i class="fas fa-location-dot"></i> '+esc(sv.address||sv.floor)+'</div>'+
          '<div class="amb-svc-metarow"><i class="fas fa-user-tie"></i> '+esc(sv.owner)+'</div>'+
        '</div>'+
        '<div class="amb-svc-foot">'+
          '<a class="amb-svc-call" href="tel:'+esc(sv.mobile.replace(/\s/g,''))+'" onclick="event.stopPropagation()"><i class="fas fa-phone"></i> '+(state.lang==='am'?'ይደውሉ':'Call')+'</a>'+
          '<button class="amb-svc-view" onclick="event.stopPropagation();ambOpenService(\''+sv.id+'\')"><i class="fas fa-eye"></i> '+(state.lang==='am'?'ይመልከቱ':'View')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

/* ── SERVICE DETAIL MODAL ── */
window.ambOpenService = function(sid){
  var sv=null; for(var i=0;i<SERVICES.length;i++){ if(SERVICES[i].id===sid){ sv=SERVICES[i]; break; } }
  if(!sv) return;
  var g='linear-gradient(135deg,'+sv.color+','+shade(sv.color,-25)+')';
  var gallery=[sv.photo, sv.photo2||sv.photo];
  var thumbs=gallery.map(function(src,i){
    return '<div class="amb-sv-shot"><img src="'+esc(src)+'" alt="" onerror="this.parentNode.style.background=\''+sv.color+'\'"></div>';
  }).join('');
  var offerings=(sv.offerings||[]).map(function(o){
    return '<div class="amb-sv-offer"><i class="fas fa-check"></i> '+esc(o)+'</div>';
  }).join('');
  var rows=[
    ['fa-user-tie', t('owner'), sv.owner],
    ['fa-phone', t('mobile'), sv.mobile],
    ['fa-envelope', 'Email', sv.email||'—'],
    ['fa-id-card', t('tin'), sv.tin],
    ['fa-clock', t('hours'), sv.hours],
    ['fa-location-dot', 'Location', sv.address||sv.floor]
  ].map(function(r){
    return '<div class="amb-tp-row"><span class="amb-tp-row-l"><i class="fas '+r[0]+'"></i> '+esc(r[1])+'</span><span class="amb-tp-row-v">'+esc(r[2])+'</span></div>';
  }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-sv-modal">'+
      '<div class="amb-sv-gallery">'+thumbs+'</div>'+
      '<div class="amb-sv-head">'+
        '<div class="amb-sv-ic" style="background:'+g+'"><i class="fas '+sv.icon+'"></i></div>'+
        '<div><div class="amb-sv-name">'+esc(nameFor(sv))+' <i class="fas fa-circle-check" style="color:var(--success);font-size:.7rem"></i></div>'+
        '<div class="amb-sv-type">'+esc(sv.type)+' · '+esc(sv.floor)+'</div></div>'+
      '</div>'+
      '<div class="amb-sv-body">'+
        '<p class="amb-sv-blurb">'+esc(sv.blurb)+'</p>'+
        (offerings?'<div class="amb-sv-offers-h">'+(state.lang==='am'?'አገልግሎቶች':'What they offer')+'</div><div class="amb-sv-offers">'+offerings+'</div>':'')+
        '<div class="amb-tp-rows">'+rows+'</div>'+
        '<div class="amb-tp-socials">'+socialIcons(sv.socials,sv.color)+'</div>'+
        '<div class="amb-sv-acts">'+
          '<a class="amb-sv-call-btn" href="tel:'+esc(sv.mobile.replace(/\s/g,''))+'"><i class="fas fa-phone"></i> '+(state.lang==='am'?'አሁን ይደውሉ':'Call Now')+'</a>'+
          (sv.email?'<a class="amb-sv-mail-btn" href="mailto:'+esc(sv.email)+'" title="Email"><i class="fas fa-envelope"></i></a>':'')+
        '</div>'+
      '</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};

/* ── HERO VISUAL: Jump to Floor list + phone mockup + image carousel ── */
var exploreIdx = 0, exploreTotal = 0, exploreInterval;
function renderHeroVisual(){
  var el = $('ambHeroVisual'); if(!el) return;
  var floorList = [];
  BUILDING.tenants.forEach(function(t){ if(floorList.indexOf(t.floor)<0) floorList.push(t.floor); });
  var order = {'Ground Floor':0,'1st Floor':1,'2nd Floor':2,'3rd Floor':3,'4th Floor':4,'5th Floor':5,'6th Floor':6};
  floorList.sort(function(a,b){ return (order[a]!=null?order[a]:99)-(order[b]!=null?order[b]:99); });

  var floorsHTML = floorList.map(function(fl){
    var c = floorColor(fl);
    var am = FLOOR_AM[fl] || '';
    var onFloor = BUILDING.tenants.filter(function(t){ return t.floor===fl; });
    var stat = (BUILDING.floorStats && BUILDING.floorStats[fl]) || null;
    var count = stat ? stat.total : onFloor.length;
    var occ = stat ? stat.active : onFloor.filter(function(t){ return t.active!==false; }).length;
    return '<div class="floor-vertical-item" style="--fc:'+c+'" onclick="ambOpenFloorPanel(\''+esc(fl).replace(/'/g,"\\'")+'\')">'+
      '<span>'+esc(fl)+' <span class="amh-inline">'+esc(am)+'</span></span>'+
      '<span class="floor-occ">'+occ+'/'+count+' <i class="fas fa-circle-check"></i></span>'+
      '<i class="fas fa-chevron-right floor-arrow"></i>'+
      '</div>';
  }).join('');

  var carouselImages = [
    { src:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=500&fit=crop', label:(state.lang==='am'?'ይግዙና ይመገቡ':'Shop & Dine'), sub:(state.lang==='am'?'ከ200 በላይ ሱቆችና ምግብ ቤቶች':'Verified sellers across every floor') },
    { src:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=500&fit=crop', label:(state.lang==='am'?'ፋሽንና ስታይል':'Fashion & Style'), sub:(state.lang==='am'?'የቅርብ ጊዜ ስታይሎች':'The latest from local and imported brands') },
    { src:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=500&fit=crop', label:(state.lang==='am'?'ምግብና መጠጥ':'Food & Dining'), sub:(state.lang==='am'?'ጣፋጭ ምግብና ልዩ ዕይታ':'Exquisite views and cuisine') },
    { src:'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=1200&h=500&fit=crop', label:(state.lang==='am'?'የቤት ማስዋቢያ':'Home Decor'), sub:(state.lang==='am'?'ለቤትዎ ውበት':'Furnish and decorate your space') },
    { src:'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=500&fit=crop', label:(state.lang==='am'?'ጤናና እንክብካቤ':'Wellness & Spa'), sub:(state.lang==='am'?'የመዝናኛ ጊዜ':'Rejuvenate at Zen Spa') }
  ];
  var carouselHTML = carouselImages.map(function(img,idx){
    return '<div class="explore-slide" data-index="'+idx+'"><img src="'+img.src+'" alt="'+esc(img.label)+'" loading="lazy">'+
      '<div class="slide-overlay"><div class="slide-label">'+esc(img.label)+'</div><div class="slide-sub">'+esc(img.sub)+'</div></div></div>';
  }).join('');

  var qrUrl = (typeof location!=='undefined') ? (location.origin+location.pathname) : '';
  el.innerHTML =
    '<div class="welcome-left">'+
      '<div class="mobile-frame-container"><div class="mobile-screen">'+
        '<div class="mobile-header"><h3>Ambassador Mall</h3><p>Digital Directory</p></div>'+
        '<div class="mobile-body">'+
          '<div class="qr-code-container"><a href="'+esc(qrUrl)+'" target="_blank"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='+encodeURIComponent(qrUrl)+'&color=7a1a44&bgcolor=ffffff" alt="QR Code"></a></div>'+
          '<div class="nfc-tag"><i class="fas fa-wifi"></i><span>NFC Tag</span><i class="fas fa-chevron-right" style="font-size:.55rem;opacity:.5"></i><span class="nfc-highlight">'+(state.lang==='am'?'በአጭሩ ይንኩ':'short scan & tap it')+'</span></div>'+
          '<p class="qr-instruction">'+(state.lang==='am'?'ሙሉውን ማውጫ ለማየት QR ኮዱን ይቃኙ ወይም ስልክዎን ይንኩ።':'Scan the QR code or tap your phone to access the full mall directory.')+'</p>'+
        '</div>'+
      '</div></div>'+
    '</div>'+
    '<div class="welcome-right">'+
      '<div><div class="floor-list-title">'+(state.lang==='am'?'ወደ ፎቅ ዝለል':'Jump to Floor')+'</div><div class="floor-vertical-list">'+floorsHTML+'</div></div>'+
      '<div class="explore-carousel-wrap">'+
        '<div class="explore-track" id="exploreTrack">'+carouselHTML+'</div>'+
        '<button class="explore-arrow prev" onclick="ambExploreSlide(-1)"><i class="fas fa-chevron-left"></i></button>'+
        '<button class="explore-arrow next" onclick="ambExploreSlide(1)"><i class="fas fa-chevron-right"></i></button>'+
      '</div>'+
      '<div class="explore-dots" id="exploreDots"></div>'+
    '</div>';
  initExploreCarousel();
}
function initExploreCarousel(){
  var track=$('exploreTrack'), dots=$('exploreDots'); if(!track) return;
  var slides = track.querySelectorAll('.explore-slide');
  exploreTotal = slides.length; if(!exploreTotal) return;
  dots.innerHTML='';
  for(var i=0;i<exploreTotal;i++){
    var dot=document.createElement('span');
    dot.className='explore-dot'+(i===0?' active':'');
    dot.dataset.index=i;
    dot.addEventListener('click', (function(idx){ return function(){ ambGoToExploreSlide(idx); }; })(i));
    dots.appendChild(dot);
  }
  clearInterval(exploreInterval);
  exploreInterval = setInterval(function(){ ambExploreSlide(1); }, 5500);
  ambGoToExploreSlide(0);
}
window.ambGoToExploreSlide = function(idx){
  var track=$('exploreTrack'), dots=$('exploreDots'); if(!track) return;
  var slides=track.querySelectorAll('.explore-slide'); if(!slides.length) return;
  idx = Math.max(0, Math.min(exploreTotal-1, idx));
  exploreIdx = idx;
  track.style.transform = 'translateX(-'+(idx*100)+'%)';
  if(dots) dots.querySelectorAll('.explore-dot').forEach(function(d,i){ d.classList.toggle('active', i===idx); });
};
window.ambExploreSlide = function(dir){
  var n = exploreIdx+dir;
  if(n<0) n=exploreTotal-1; if(n>=exploreTotal) n=0;
  ambGoToExploreSlide(n);
};
window.ambFilterByFloor = function(floorName){
  state.filter = 'floor:'+floorName;
  renderFilterChips(); renderTenants(); renderProducts();
  ambScrollTo('ambShop');
};

/* ── FLOOR PANEL — every office on a floor, tap for details ── */
var FLOOR_ORDER = {'Ground Floor':0,'1st Floor':1,'2nd Floor':2,'3rd Floor':3,'4th Floor':4,'5th Floor':5,'6th Floor':6};
function floorsList(){
  var fl=[];
  BUILDING.tenants.forEach(function(t){ if(fl.indexOf(t.floor)<0) fl.push(t.floor); });
  (SERVICES||[]).forEach(function(s){ if(s.floor && fl.indexOf(s.floor)<0) fl.push(s.floor); });
  fl.sort(function(a,b){ return (FLOOR_ORDER[a]!=null?FLOOR_ORDER[a]:99)-(FLOOR_ORDER[b]!=null?FLOOR_ORDER[b]:99); });
  return fl;
}
function unitSort(a,b){
  var ua=(a.unit||''), ub=(b.unit||'');
  var na=parseInt(ua.replace(/\D/g,''),10)||0, nb=parseInt(ub.replace(/\D/g,''),10)||0;
  return na-nb || ua.localeCompare(ub);
}
function fpCardHTML(tn){
  return '<button class="amb-fp-card" style="--uc:'+tn.color+'" onclick="ambOpenTenant(\''+tn.id+'\')">'+
    (tn.unit?'<span class="fp-unit">'+esc(tn.unit)+'</span>':'')+
    '<span class="fp-ic" style="background:linear-gradient(135deg,'+tn.color+','+shade(tn.color,-28)+')"><i class="fas '+tn.icon+'"></i></span>'+
    '<span class="fp-name">'+esc(tn.name)+(state.lang==='am'&&tn.nameAm&&tn.nameAm!==tn.name?'<span class="amh-inline">'+esc(tn.nameAm)+'</span>':'')+'</span>'+
    '<span class="fp-cat">'+esc(tn.cat)+'</span>'+
    '<span class="fp-meta"><span>★ '+tn.rating+'</span><span>'+(tn.products?tn.products.length:0)+' '+t('fpProducts')+'</span></span>'+
  '</button>';
}
function fpSvcCardHTML(sv){
  return '<button class="amb-fp-card svc" style="--uc:'+sv.color+'" onclick="ambCloseFloorPanel();ambOpenService(\''+sv.id+'\')">'+
    '<span class="fp-ic" style="background:linear-gradient(135deg,'+sv.color+','+shade(sv.color,-28)+')"><i class="fas '+sv.icon+'"></i></span>'+
    '<span class="fp-name">'+esc(nameFor(sv))+'</span>'+
    '<span class="fp-cat">'+esc(sv.type)+'</span>'+
    '<span class="fp-badge-svc">'+esc(t('svcLbl'))+'</span>'+
  '</button>';
}
window.ambOpenFloorPanel = function(floorName){
  var shops = BUILDING.tenants.filter(function(x){ return x.floor===floorName; }).sort(unitSort);
  var svcs = (SERVICES||[]).filter(function(s){ return s.floor===floorName; });
  if(!shops.length && !svcs.length) return;
  var am = FLOOR_AM[floorName]||'';
  var title=$('ambFpTitle'); if(title) title.innerHTML = esc(floorName)+(am?'<span class="amh-inline">'+esc(am)+'</span>':'');
  var sub=$('ambFpSub'); if(sub) sub.textContent = t('tapUnit');
  var prodCt = shops.reduce(function(s,x){ return s+(x.products?x.products.length:0); },0);
  var stats=$('ambFpStats');
  if(stats) stats.innerHTML =
    '<span class="amb-fp-stat"><i class="fas fa-store"></i> '+shops.length+' '+t('fpShops')+'</span>'+
    (svcs.length?'<span class="amb-fp-stat"><i class="fas fa-concierge-bell"></i> '+svcs.length+' '+t('fpServices')+'</span>':'')+
    '<span class="amb-fp-stat"><i class="fas fa-box"></i> '+prodCt+' '+t('fpProducts')+'</span>';
  var body=$('ambFpBody');
  if(body) body.innerHTML = '<div class="amb-fp-grid">'+
    shops.map(fpCardHTML).join('') + svcs.map(fpSvcCardHTML).join('') +
    '</div>';
  var foot=$('ambFpFoot');
  var flEsc = esc(floorName).replace(/'/g,"\\'");
  if(foot) foot.innerHTML =
    '<button class="amb-fp-shopbtn" onclick="ambCloseFloorPanel();ambFilterByFloor(\''+flEsc+'\')"><i class="fas fa-bag-shopping"></i> '+esc(t('shopThisFloor'))+'</button>'+
    '<button class="amb-fp-dirbtn" onclick="ambCloseFloorPanel();ambScrollTo(\'ambDirectory\')"><i class="fas fa-list"></i> '+esc(t('fullDirectory'))+'</button>';
  var p=$('ambFloorPanel'), sc=$('ambFloorScrim');
  if(p) p.classList.add('open'); if(sc) sc.classList.add('on');
  document.body.style.overflow='hidden';
  if(history.replaceState) history.replaceState(null,'','#floor='+encodeURIComponent(floorName));
};
window.ambCloseFloorPanel = function(){
  var p=$('ambFloorPanel'), sc=$('ambFloorScrim');
  if(p) p.classList.remove('open'); if(sc) sc.classList.remove('on');
  // keep page scroll locked if a modal is still open on top
  var modalOpen = document.querySelector('#amb-store .amb-modal.on, #amb-store .amb-cart.open');
  if(!modalOpen) document.body.style.overflow='';
  if(location.hash.indexOf('#floor=')===0 && history.replaceState) history.replaceState(null,'',location.pathname+location.search);
};

/* ── BUILDING DIRECTORY — all offices listed, searchable ── */
function dirMatches(x, q){
  if(!q) return true;
  var hay = ((x.unit||'')+' '+x.name+' '+(x.nameAm||'')+' '+(x.cat||x.type||'')+' '+(x.owner||'')+' '+x.floor).toLowerCase();
  return hay.indexOf(q)>=0;
}
function dirCardHTML(x, isSvc){
  var open = isSvc ? 'ambOpenService(\''+x.id+'\')' : 'ambOpenTenant(\''+x.id+'\')';
  return '<button class="amb-dir-card'+(isSvc?' svc':'')+'" style="--uc:'+x.color+'" onclick="'+open+'">'+
    '<span class="dir-ic" style="background:linear-gradient(135deg,'+x.color+','+shade(x.color,-28)+')"><i class="fas '+x.icon+'"></i></span>'+
    '<span class="dir-txt"><span class="dir-name">'+esc(nameFor(x))+'</span>'+
    '<span class="dir-sub">'+esc(x.cat||x.type||'')+(x.owner?' · '+esc(x.owner):'')+'</span></span>'+
    '<span class="dir-unit">'+esc(x.unit||t('svcLbl'))+'</span>'+
    '<i class="fas fa-chevron-right dir-arrow"></i>'+
  '</button>';
}
function renderDirectory(){
  var tabs=$('ambDirTabs'), list=$('ambDirList');
  if(!tabs || !list) return;
  var fls = floorsList();
  tabs.innerHTML = '<button class="amb-dir-tab'+(state.dirFloor==='all'?' active':'')+'" onclick="ambDirSetFloor(\'all\')">'+esc(t('allFloors'))+'</button>'+
    fls.map(function(fl){
      var flEsc = esc(fl).replace(/'/g,"\\'");
      return '<button class="amb-dir-tab'+(state.dirFloor===fl?' active':'')+'" onclick="ambDirSetFloor(\''+flEsc+'\')">'+esc(fl)+'</button>';
    }).join('');
  var inp=$('ambDirSearch'); if(inp) inp.placeholder = t('dirSearchPh');
  var q = state.dirQ.toLowerCase();
  var html='', total=0;
  fls.forEach(function(fl){
    if(state.dirFloor!=='all' && state.dirFloor!==fl) return;
    var shops = BUILDING.tenants.filter(function(x){ return x.floor===fl && dirMatches(x,q); }).sort(unitSort);
    var svcs = (SERVICES||[]).filter(function(s){ return s.floor===fl && dirMatches(s,q); });
    if(!shops.length && !svcs.length) return;
    total += shops.length + svcs.length;
    var am = FLOOR_AM[fl]||'';
    html += '<div class="amb-dir-floor">'+
      '<div class="amb-dir-floorhead"><span class="amb-dir-floorbar" style="--fc:'+floorColor(fl)+'"></span>'+
      '<h4>'+esc(fl)+' <span class="amh-inline">'+esc(am)+'</span></h4>'+
      '<span class="dir-ct">'+(shops.length+svcs.length)+' '+t('unitsLbl')+'</span></div>'+
      '<div class="amb-dir-grid">'+shops.map(function(x){return dirCardHTML(x,false);}).join('')+svcs.map(function(s){return dirCardHTML(s,true);}).join('')+'</div>'+
    '</div>';
  });
  if(!total){
    html = '<div class="amb-dir-empty"><i class="fas fa-building-circle-xmark"></i>'+esc(t('dirNoMatch'))+'</div>';
  }
  list.innerHTML = html;
}
window.ambDirSetFloor = function(fl){ state.dirFloor=fl; renderDirectory(); };
window.ambDirSearchInput = function(){ var i=$('ambDirSearch'); state.dirQ = i?i.value.trim():''; renderDirectory(); };

/* ── ON-SALE CAROUSEL ── */
function renderOnSale(){
  var el=$('ambOnSaleStrip'); if(!el) return;
  var sale=onSaleProducts();
  el.innerHTML = sale.map(function(p){ return productCard(p, true); }).join('');
  var sec=$('ambOnSaleSection'); if(sec) sec.style.display = sale.length? '' : 'none';
}

/* ── FILTER CHIPS ── */
function renderFilterChips() {
  var el=$('ambFilterChips'); if(!el) return;
  var chips = '<button class="amb-chip'+(state.filter==='all'?' active':'')+'" onclick="ambFilter(\'all\')"><i class="fas fa-grip"></i> '+(state.lang==='am'?'ሁሉም':'All')+' <span class="amb-chip-ct">('+ALL_PRODUCTS.length+')</span></button>';
  BUILDING.tenants.forEach(function(tn){
    chips += '<button class="amb-chip'+(state.filter===tn.id?' active':'')+'" onclick="ambFilter(\''+tn.id+'\')">'+
      '<i class="fas '+tn.icon+'"></i> '+esc(tn.cat)+' <span class="amb-chip-ct">('+tn.products.length+')</span></button>';
  });
  el.innerHTML = chips;
}
window.ambFilter = function (key) {
  state.filter = key;
  renderFilterChips(); renderTenants(); renderProducts();
};

/* ── PRODUCT GRID ── */
function visibleProducts() {
  var list = ALL_PRODUCTS.filter(function(p){
    if (state.filter!=='all') {
      if (('' + state.filter).indexOf('floor:') === 0) {
        var fl = state.filter.slice(6);
        var tn0 = tenant(p.tenantId);
        if (!tn0 || tn0.floor !== fl) return false;
      } else if (p.tenantId !== state.filter) return false;
    }
    if (state.priceMax && p.price>state.priceMax) return false;
    if (state.priceMin && p.price<state.priceMin) return false;
    if (state.ratingMin && p.rating<state.ratingMin) return false;
    if (state.stockF==='in'   && (!p.stock || (p.stock.state!=='in' && p.stock.state!=='low'))) return false;
    if (state.stockF==='sale' && !(p.old && p.old>p.price)) return false;
    if (state.stockF==='made' && (!p.stock || p.stock.state!=='made')) return false;
    if (state.floorF!=='all') {
      var tnF = tenant(p.tenantId);
      if (!tnF || tnF.floor!==state.floorF) return false;
    }
    if (state.search) {
      var tn = tenant(p.tenantId);
      var hay = (p.name+' '+p.cat+' '+(p.desc||'')+' '+(tn?tn.name+' '+tn.cat+' '+(tn.unit||'')+' '+tn.floor:'')).toLowerCase();
      if (hay.indexOf(state.search.toLowerCase())<0) return false;
    }
    return true;
  });
  if(state.sort==='priceLow') list.sort(function(a,b){return a.price-b.price;});
  else if(state.sort==='priceHigh') list.sort(function(a,b){return b.price-a.price;});
  else if(state.sort==='rating') list.sort(function(a,b){return b.rating-a.rating;});
  return list;
}
/* stock pill — returns {cls,label,sold} */
function stockInfo(p){
  var s=p.stock||{state:'in'};
  if(s.state==='out') return {cls:'out', label:t('soldOut'), sold:true};
  if(s.state==='low') return {cls:'low', label:t('lowStock',{n:s.label||'1'}), sold:false};
  if(s.state==='made') return {cls:'made', label:t('madeToOrder'), sold:false};
  return {cls:'in', label:t('inStock'), sold:false};
}
function productCard(p, saleMode) {
  var tn = tenant(p.tenantId);
  var wished = state.wish.indexOf(p.id)>=0;
  var off = p.old ? Math.round((1 - p.price/p.old)*100) : 0;
  var st = stockInfo(p);
  var atc = st.sold
    ? '<button class="amb-atc notify" onclick="ambNotifyMe(\''+p.id+'\')"><i class="fas fa-bell"></i> '+esc(t('notifyMe'))+'</button>'
    : '<button class="amb-atc" id="amb-atc-'+p.id+'" onclick="ambQuickAdd(\''+p.id+'\')"><i class="fas fa-cart-plus"></i> '+esc(t('addToCart'))+'</button>';
  return '<article class="amb-pcard'+(saleMode?' sale':'')+(st.sold?' is-out':'')+'">'+
    '<div class="amb-pcard-img">'+
      '<img src="'+esc(p.img)+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'+
      '<div class="amb-pcard-fallback" style="background:linear-gradient(135deg,'+tn.color+','+shade(tn.color,-30)+')"><i class="fas '+tn.icon+'"></i></div>'+
      (p.badge?'<span class="amb-pcard-badge">'+esc(p.badge)+'</span>':'')+
      (off?'<span class="amb-pcard-off">-'+off+'%</span>':'')+
      '<div class="amb-pcard-tools">'+
        '<button class="amb-pcard-tool" onclick="event.stopPropagation();ambToggleWish(\''+p.id+'\')" title="'+esc(t('wishlist'))+'"><i class="'+(wished?'fas':'far')+' fa-heart"></i></button>'+
        '<button class="amb-pcard-tool" onclick="event.stopPropagation();ambOpenProduct(\''+p.id+'\')" title="'+esc(t('viewQuick'))+'"><i class="far fa-eye"></i></button>'+
        '<button class="amb-pcard-tool" onclick="event.stopPropagation();ambShareProduct(\''+p.id+'\')" title="'+esc(t('share'))+'"><i class="fas fa-share-nodes"></i></button>'+
      '</div>'+
      '<span class="amb-pcard-tenant" onclick="event.stopPropagation();ambOpenTenant(\''+tn.id+'\')"><i class="fas fa-building"></i> '+esc(floorUnit(tn))+' · '+esc(nameFor(tn))+'</span>'+
    '</div>'+
    '<div class="amb-pcard-body">'+
      '<div class="amb-pcard-cat">'+esc(p.cat)+'</div>'+
      '<div class="amb-pcard-name" onclick="ambOpenProduct(\''+p.id+'\')">'+esc(p.name)+'</div>'+
      '<div class="amb-pcard-stars"><span class="s">'+stars(p.rating)+'</span> '+p.rating+' <span style="opacity:.6">('+p.reviews+')</span></div>'+
      '<div class="amb-pcard-stock '+st.cls+'"><i class="fas '+(st.sold?'fa-circle-xmark':st.cls==='made'?'fa-screwdriver-wrench':'fa-circle-check')+'"></i> '+esc(st.label)+'</div>'+
      '<div class="amb-pcard-foot">'+
        '<div class="amb-pcard-price">'+fmt(p.price)+(p.old?' <span class="old">'+fmtN(p.old)+'</span>':'')+'<span class="cur">'+(state.lang==='am'?'ብር':'Ethiopian Birr')+'</span></div>'+
        atc+
      '</div>'+
    '</div>'+
  '</article>';
}
/* ── FILTER BAR — sort · floor · price range · availability · rating ── */
function maxProductPrice(){
  var m=0; ALL_PRODUCTS.forEach(function(p){ if(p.price>m) m=p.price; });
  return Math.ceil(m/1000)*1000 || 100000;
}
function activeFilterCount(){
  var n=0;
  if(state.sort!=='featured') n++;
  if(state.priceMin) n++;
  if(state.priceMax) n++;
  if(state.stockF!=='all') n++;
  if(state.ratingMin) n++;
  if(state.floorF!=='all') n++;
  return n;
}
function renderFilterBar(){
  var bar=$('ambFilterBar'); if(!bar) return;
  var expanded = bar.classList.contains('expanded');
  var sortOpts=[['featured',t('sortFeatured')],['priceLow',t('sortPriceLow')],['priceHigh',t('sortPriceHigh')],['rating',t('sortRating')]];
  var fls = floorsList();
  var maxP = maxProductPrice();
  var sliderVal = state.priceMax || maxP;
  var n = activeFilterCount();
  var stockChips = [['all',t('availAll'),'fa-grip'],['in',t('availIn'),'fa-circle-check'],['sale',t('availSale'),'fa-tag'],['made',t('availMade'),'fa-screwdriver-wrench']];
  bar.innerHTML =
    '<div class="amb-fbar-top">'+
      '<span class="amb-fbar-title"><i class="fas fa-sliders"></i> '+esc(t('filters'))+(n?' <span class="amb-fbar-ct">'+n+'</span>':'')+'</span>'+
      '<button class="amb-fbar-toggle" onclick="ambToggleFBar()"><i class="fas fa-chevron-'+(expanded?'up':'down')+'"></i> '+esc(t(expanded?'close':'filters'))+'</button>'+
      '<button class="amb-fbar-reset" onclick="ambResetShop()"><i class="fas fa-rotate-left"></i> '+esc(t('resetFilters'))+'</button>'+
    '</div>'+
    '<div class="amb-fbar-body">'+
      '<div class="amb-fgroup"><span class="amb-fgroup-l"><i class="fas fa-arrow-down-wide-short"></i> '+esc(t('sortBy'))+'</span>'+
        '<select class="amb-fsel" onchange="ambSetSort(this.value)">'+
          sortOpts.map(function(o){return '<option value="'+o[0]+'"'+(state.sort===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+
        '</select></div>'+
      '<div class="amb-fgroup"><span class="amb-fgroup-l"><i class="fas fa-layer-group"></i> '+esc(t('floorLblF'))+'</span>'+
        '<select class="amb-fsel" onchange="ambSetFloorF(this.value)">'+
          '<option value="all"'+(state.floorF==='all'?' selected':'')+'>'+esc(t('allFloors'))+'</option>'+
          fls.map(function(fl){return '<option value="'+esc(fl)+'"'+(state.floorF===fl?' selected':'')+'>'+esc(fl)+'</option>';}).join('')+
        '</select></div>'+
      '<div class="amb-fgroup"><span class="amb-fgroup-l"><i class="fas fa-coins"></i> '+esc(t('priceRange'))+' · '+t('under')+' '+fmtN(sliderVal)+'</span>'+
        '<div class="amb-fprice">'+
          '<input type="number" min="0" placeholder="'+esc(t('minPh'))+'" value="'+(state.priceMin||'')+'" onchange="ambSetPriceMin(this.value)">'+
          '<span class="dash">—</span>'+
          '<input type="number" min="0" placeholder="'+esc(t('maxPh'))+'" value="'+(state.priceMax||'')+'" onchange="ambSetPriceMax(this.value)">'+
          '<input type="range" class="amb-frange" min="500" max="'+maxP+'" step="500" value="'+sliderVal+'" oninput="ambSetPriceMax(this.value)">'+
        '</div></div>'+
      '<div class="amb-fgroup"><span class="amb-fgroup-l"><i class="fas fa-box"></i> '+esc(t('availability'))+'</span>'+
        '<div class="amb-fchips">'+
          stockChips.map(function(c){return '<button class="amb-fchip'+(state.stockF===c[0]?' active':'')+'" onclick="ambSetStockF(\''+c[0]+'\')"><i class="fas '+c[2]+'"></i> '+esc(c[1])+'</button>';}).join('')+
        '</div></div>'+
      '<div class="amb-fgroup"><span class="amb-fgroup-l"><i class="fas fa-star"></i> '+esc(t('ratingF'))+'</span>'+
        '<div class="amb-fchips">'+
          '<button class="amb-fchip'+(!state.ratingMin?' active':'')+'" onclick="ambSetRatingMin(0)">'+esc(t('anyRating'))+'</button>'+
          '<button class="amb-fchip'+(state.ratingMin===4?' active':'')+'" onclick="ambSetRatingMin(4)"><i class="fas fa-star"></i> '+esc(t('top4'))+'</button>'+
        '</div></div>'+
    '</div>';
}
window.ambToggleFBar = function(){
  var bar=$('ambFilterBar'); if(!bar) return;
  bar.classList.toggle('expanded');
  renderFilterBar();
};
window.ambSetFloorF = function(v){ state.floorF=v; renderFilterBar(); renderProducts(); };
window.ambSetStockF = function(v){ state.stockF=v; renderFilterBar(); renderProducts(); };
window.ambSetRatingMin = function(v){ state.ratingMin=Number(v)||0; renderFilterBar(); renderProducts(); };
window.ambSetPriceMin = function(v){ state.priceMin=parseInt(v,10)||0; renderFilterBar(); renderProducts(); };

function renderProducts() {
  var grid=$('ambProdGrid'); if(!grid) return;
  var list = visibleProducts();
  var cnt=$('ambProdCount');
  if (cnt) {
    var label = state.filter==='all' ? (state.lang==='am'?'ሁሉም ሻጮች':'all sellers') : (tenant(state.filter)?nameFor(tenant(state.filter)):'');
    cnt.innerHTML = '<b>'+list.length+'</b> '+t('products')+' · '+esc(label);
  }
  if (!list.length) {
    grid.innerHTML = '<div class="amb-empty"><i class="fas fa-box-open"></i>'+
      '<div>'+(state.lang==='am'?'ምንም ምርት አልተገኘም።':'No products match your filters.')+'</div>'+
      '<button class="amb-empty-btn" onclick="ambResetShop()"><i class="fas fa-rotate-left"></i> '+(state.lang==='am'?'አጽዳ':'Reset filters')+'</button>'+
      '</div>';
    return;
  }
  grid.innerHTML = list.map(function(p){return productCard(p,false);}).join('');
}
window.ambSetSort = function(v){ state.sort=v; renderFilterBar(); renderProducts(); };
window.ambSetPriceMax = function(v){ state.priceMax=parseInt(v,10)||0; renderFilterBar(); renderProducts(); };
window.ambResetShop = function(){ state.filter='all'; state.priceMax=0; state.priceMin=0; state.stockF='all'; state.ratingMin=0; state.floorF='all'; state.sort='featured'; state.search=''; var i=$('ambSearch'); if(i) i.value=''; var mi=$('ambMSearchIn'); if(mi) mi.value=''; renderFilterChips(); renderFilterBar(); renderProducts(); };

/* ── SEARCH (legacy entry, now feeds dropdown) ── */
window.ambSearch = function () { window.ambSearchInput(); };

/* ── PRODUCT QUICK-VIEW MODAL (gallery + variant + qty + share + stock) ── */
var galleryState = { pid:null, idx:0 };
var pmState = { pid:null, qty:1, variant:null };
window.ambOpenProduct = function (pid) {
  var p = P(pid); if(!p) return;
  var tn = tenant(p.tenantId);
  var wished = state.wish.indexOf(pid)>=0;
  var gallery = p.gallery && p.gallery.length ? p.gallery : [p.img];
  galleryState = { pid:pid, idx:0 };
  // reset / keep modal state for this product
  if(pmState.pid!==pid){ pmState = { pid:pid, qty:1, variant:(p.variant&&p.variant.options[0])||null }; }
  var st = stockInfo(p);
  var specRows = Object.keys(p.specs).map(function(k){
    return '<div class="amb-pm-spec"><div class="amb-pm-spec-l">'+esc(k)+'</div><div class="amb-pm-spec-v">'+esc(p.specs[k])+'</div></div>';
  }).join('');
  var off = p.old ? Math.round((1 - p.price/p.old)*100) : 0;
  var thumbs = gallery.map(function(src,i){
    return '<button class="amb-pm-thumb'+(i===0?' on':'')+'" onclick="ambGalleryGo('+i+')"><img src="'+esc(src)+'" onerror="this.style.opacity=0"></button>';
  }).join('');
  // variant picker
  var variantHtml='';
  if(p.variant && p.variant.options && p.variant.options.length){
    variantHtml = '<div class="amb-pm-variant"><div class="amb-pm-variant-l">'+esc(p.variant.label)+'</div><div class="amb-pm-variant-opts">'+
      p.variant.options.map(function(o){
        return '<button class="amb-pm-vopt'+(pmState.variant===o?' on':'')+'" onclick="ambSelVariant(\''+esc(o).replace(/'/g,"\\'")+'\')">'+esc(o)+'</button>';
      }).join('')+'</div></div>';
  }
  // qty + add row (disabled when sold out)
  var actionRow;
  if(st.sold){
    actionRow = '<div class="amb-pm-acts"><button class="amb-pm-add notify" onclick="ambNotifyMe(\''+p.id+'\')"><i class="fas fa-bell"></i> '+esc(t('notifyMe'))+'</button>'+
      '<button class="amb-pm-wa" onclick="ambProductWA(\''+p.id+'\')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>'+
      '<button class="amb-pm-share" onclick="ambShareProduct(\''+p.id+'\')" title="'+esc(t('share'))+'"><i class="fas fa-share-nodes"></i></button></div>';
  } else {
    actionRow =
      '<div class="amb-pm-qtyrow">'+
        '<span class="amb-pm-qty-l">'+esc(t('qty'))+'</span>'+
        '<div class="amb-pm-qty"><button onclick="ambPmQty(-1)"><i class="fas fa-minus"></i></button>'+
          '<span id="ambPmQtyVal">'+pmState.qty+'</span>'+
          '<button onclick="ambPmQty(1)"><i class="fas fa-plus"></i></button></div>'+
      '</div>'+
      '<div class="amb-pm-acts">'+
        '<button class="amb-pm-add" onclick="ambAddFromModal(\''+p.id+'\')"><i class="fas fa-cart-plus"></i> '+esc(t('addToCart'))+'</button>'+
        '<button class="amb-pm-wa" onclick="ambProductWA(\''+p.id+'\')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>'+
        '<button class="amb-pm-wish'+(wished?' on':'')+'" onclick="ambToggleWish(\''+p.id+'\');ambOpenProduct(\''+p.id+'\')" title="'+esc(t('wishlist'))+'"><i class="'+(wished?'fas':'far')+' fa-heart"></i></button>'+
        '<button class="amb-pm-share" onclick="ambShareProduct(\''+p.id+'\')" title="'+esc(t('share'))+'"><i class="fas fa-share-nodes"></i></button>'+
      '</div>';
  }
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-pm">'+
      '<div class="amb-pm-gallery">'+
        '<div class="amb-pm-img">'+
          '<img id="ambGalleryMain" src="'+esc(gallery[0])+'" alt="'+esc(p.name)+'" onerror="this.style.background=\'linear-gradient(135deg,'+tn.color+','+shade(tn.color,-30)+')\'">'+
          (gallery.length>1?'<button class="amb-pm-nav prev" onclick="ambGalleryStep(-1)"><i class="fas fa-chevron-left"></i></button><button class="amb-pm-nav next" onclick="ambGalleryStep(1)"><i class="fas fa-chevron-right"></i></button>':'')+
        '</div>'+
        (gallery.length>1?'<div class="amb-pm-thumbs" id="ambGalleryThumbs">'+thumbs+'</div>':'')+
      '</div>'+
      '<div class="amb-pm-body">'+
        '<div class="amb-pm-cat">'+esc(p.cat)+'</div>'+
        '<div class="amb-pm-name">'+esc(p.name)+'</div>'+
        '<div class="amb-pm-seller" onclick="ambOpenTenant(\''+tn.id+'\')" style="cursor:pointer">'+
          '<div class="amb-pm-seller-av" style="background:linear-gradient(135deg,'+tn.color+','+shade(tn.color,-25)+')">'+esc(initials(tn.name))+'</div>'+
          '<div><div class="amb-pm-seller-nm">'+esc(nameFor(tn))+' <i class="fas fa-circle-check" style="color:var(--success);font-size:.66rem"></i></div>'+
          '<div class="amb-pm-seller-mt"><i class="fas fa-building"></i> '+esc(floorUnit(tn))+' · '+esc(BUILDING.name)+'</div></div>'+
          '<i class="fas fa-chevron-right" style="margin-left:auto;color:var(--muted);font-size:.7rem"></i>'+
        '</div>'+
        '<div class="amb-pm-price">'+fmt(p.price)+(p.old?' <span class="old">'+fmtN(p.old)+'</span>':'')+'</div>'+
        '<div class="amb-pm-sub">'+(state.lang==='am'?'የኢትዮጵያ ብር':'Ethiopian Birr')+(off?' · '+off+'% off':'')+'</div>'+
        '<div class="amb-pm-stock '+st.cls+'"><i class="fas '+(st.sold?'fa-circle-xmark':st.cls==='made'?'fa-screwdriver-wrench':'fa-circle-check')+'"></i> '+esc(st.label)+'</div>'+
        '<p class="amb-pm-desc">'+esc(p.desc)+'</p>'+
        variantHtml+
        '<div class="amb-pm-specs">'+specRows+'</div>'+
        actionRow+
      '</div>'+
    '</div>';
  $('ambProdModal').classList.add('on');
  $('ambOverlay').classList.add('on');
  document.body.style.overflow='hidden';
  ambSetDeepLink('product', p.id);
};
window.ambSelVariant = function(v){ pmState.variant=v; document.querySelectorAll('#amb-store .amb-pm-vopt').forEach(function(b){ b.classList.toggle('on', b.textContent===v); }); };
window.ambPmQty = function(d){ pmState.qty=Math.max(1, pmState.qty+d); var el=$('ambPmQtyVal'); if(el) el.textContent=pmState.qty; };
window.ambAddFromModal = function(pid){ ambAddToCart(pid, pmState.qty, pmState.variant); ambCloseAll(); ambOpenCart(); };
window.ambGalleryGo = function(i){
  var p=P(galleryState.pid); if(!p) return;
  var g=p.gallery&&p.gallery.length?p.gallery:[p.img];
  galleryState.idx=(i+g.length)%g.length;
  var main=$('ambGalleryMain'); if(main) main.src=g[galleryState.idx];
  var thumbs=document.querySelectorAll('#ambGalleryThumbs .amb-pm-thumb');
  thumbs.forEach(function(tb,ti){ tb.classList.toggle('on', ti===galleryState.idx); });
};
window.ambGalleryStep = function(d){ ambGalleryGo(galleryState.idx+d); };

window.ambProductWA = function (pid) {
  var p=P(pid); if(!p) return; var tn=tenant(p.tenantId);
  var msg = 'Hello '+tn.name+'! (via '+BUILDING.name+' online store)\n\nI\'m interested in:\n*'+p.name+'*\nPrice: '+fmt(p.price)+'\n\nIs it available?';
  window.open('https://wa.me/'+tn.whatsapp+'?text='+encodeURIComponent(msg), '_blank');
};

/* ── SHARE (product / seller) ── */
/* ── deep links: #product=ID / #tenant=ID reopen that exact item, and are
   what gets shared — not just the current page URL ── */
function ambDeepLinkUrl(kind, id){
  var base = (typeof location!=='undefined') ? (location.origin + location.pathname + location.search) : '';
  return base + '#' + kind + '=' + encodeURIComponent(id);
}
function ambSetDeepLink(kind, id){
  if (typeof history === 'undefined' || !history.replaceState) return;
  history.replaceState(null, '', ambDeepLinkUrl(kind, id));
}
function ambOpenFromHash(){
  var h = (location.hash || '').replace(/^#/, '');
  var eq = h.indexOf('=');
  if (eq < 0) return;
  var kind = h.slice(0, eq), id = decodeURIComponent(h.slice(eq + 1));
  if (kind === 'product' && P(id)) window.ambOpenProduct(id);
  else if (kind === 'tenant' && tenant(id)) window.ambOpenTenant(id);
  else if (kind === 'floor' && window.ambOpenFloorPanel) window.ambOpenFloorPanel(id);
}
window.ambOpenFromHash = ambOpenFromHash;

/* ── what "Verified" means — shown on demand, not just asserted ── */
window.ambShowVerifiedInfo = function(){
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-vinfo">'+
      '<div class="amb-vinfo-badge"><i class="fas fa-shield-halved"></i></div>'+
      '<h3>'+(state.lang==='am'?'"የተረጋገጠ" ማለት ምን ማለት ነው':'What "Verified" means')+'</h3>'+
      '<p>'+(state.lang==='am'?'አንድ ሻጭ የወርቅ ባጅ የሚያገኘው አምባሳደር ማዕከል በአካል ካረጋገጠ በኋላ ብቻ ነው፦':'A seller earns the Verified badge only after Ambassador Shopping Center confirms it in person:')+'</p>'+
      '<ul>'+
        '<li><i class="fas fa-check"></i> '+(state.lang==='am'?'<b>አካላዊ ሱቅ</b> — ወለልና ቁጥር በቦታው ተረጋግጧል':'<b>Physical unit</b> — floor and shop number matched on-site')+'</li>'+
        '<li><i class="fas fa-check"></i> '+(state.lang==='am'?'<b>የንግድ ፈቃድ</b> — ትክክለኛ ቲን እና ምዝገባ ተረጋግጧል':'<b>Trade license</b> — valid TIN and business registration checked')+'</li>'+
        '<li><i class="fas fa-check"></i> '+(state.lang==='am'?'<b>ቀጥታ ክፍያ</b> — ለሻጩ የራሱ ባንክ ሂሳብ ብቻ ይከፍላሉ':'<b>Direct payment</b> — you pay the seller\u2019s own bank account, never a third party')+'</li>'+
      '</ul>'+
      '<p class="amb-vinfo-foot">'+(state.lang==='am'?'ቢሲንካ ገንዘብዎን በፍጹም አይይዝም — ሁሉም ክፍያ በቀጥታ ወደ ሻጩ ይሄዳል።':'Bisinka never holds your money — every transfer goes straight to the seller.')+'</p>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};

function buildShareText(title, sub, kind, id){
  var url = (kind && id) ? ambDeepLinkUrl(kind, id) : ((typeof location!=='undefined' && location.href) ? location.href : '');
  return { text: title+(sub?' — '+sub:'')+'  ·  '+BUILDING.name, url:url };
}
window.ambShareProduct = function(pid){
  var p=P(pid); if(!p) return; var tn=tenant(p.tenantId);
  ambShareSheet(p.name, fmt(p.price)+' · '+nameFor(tn), 'product', pid);
};
window.ambShareTenant = function(tid){
  var tn=tenant(tid); if(!tn) return;
  ambShareSheet(nameFor(tn), tn.cat+' · '+floorUnit(tn)+' · '+BUILDING.name, 'tenant', tid);
};
function ambShareSheet(title, sub, kind, id){
  var s=buildShareText(title, sub, kind, id);
  var full = s.text + (s.url?('  '+s.url):'');
  // native share if available
  if(navigator.share){
    navigator.share({title:title, text:s.text, url:s.url}).catch(function(){});
    return;
  }
  // fallback: small popover with WhatsApp / Telegram / Copy
  var wa='https://wa.me/?text='+encodeURIComponent(full);
  var tg='https://t.me/share/url?url='+encodeURIComponent(s.url||'')+'&text='+encodeURIComponent(s.text);
  var box=document.createElement('div');
  box.className='amb-share-pop';
  box.innerHTML=
    '<div class="amb-share-card">'+
      '<div class="amb-share-h">'+esc(t('shareVia'))+'</div>'+
      '<a class="amb-share-opt wa" href="'+wa+'" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>'+
      '<a class="amb-share-opt tg" href="'+tg+'" target="_blank" rel="noopener"><i class="fab fa-telegram"></i> Telegram</a>'+
      '<button class="amb-share-opt cp"><i class="fas fa-link"></i> '+esc(t('linkCopied').replace(' copied',''))+'</button>'+
      '<button class="amb-share-x">'+esc(t('cancel'))+'</button>'+
    '</div>';
  document.getElementById('amb-store').appendChild(box);
  requestAnimationFrame(function(){ box.classList.add('on'); });
  function close(){ box.classList.remove('on'); setTimeout(function(){ box.remove(); }, 250); }
  box.addEventListener('click', function(e){ if(e.target===box) close(); });
  box.querySelector('.amb-share-x').addEventListener('click', close);
  box.querySelector('.amb-share-opt.cp').addEventListener('click', function(){ window.ambCopy(full); close(); });
}
window.ambQuickAdd = function(pid){
  var p=P(pid); if(!p) return;
  // if product has variants, open modal so buyer picks; else add 1
  if(p.variant && p.variant.options && p.variant.options.length){ ambOpenProduct(pid); return; }
  ambAddToCart(pid, 1, null);
};

/* ── NOTIFY ME (back in stock) — captures phone locally, backend-ready ── */
window.ambNotifyMe = function(pid){
  var p=P(pid); if(!p) return;
  var tn=tenant(p.tenantId);
  var prefill = (state.user&&state.user.phone) || (state.coData&&state.coData.phone) || '';
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-notify-modal">'+
      '<div class="amb-notify-ic"><i class="fas fa-bell"></i></div>'+
      '<div class="amb-notify-t">'+t('notifyTitle')+'</div>'+
      '<div class="amb-notify-p">'+esc(p.name)+' · '+esc(nameFor(tn))+'</div>'+
      '<div class="amb-notify-d">'+t('notifyDesc')+'</div>'+
      '<input class="amb-inp" id="ambNotifyPhone" type="tel" placeholder="'+t('yourPhone')+'" value="'+esc(prefill)+'" style="margin-bottom:12px">'+
      '<button class="amb-notify-btn" onclick="ambNotifySubmit(\''+p.id+'\')"><i class="fas fa-bell"></i> '+t('notifyMe')+'</button>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};
window.ambNotifySubmit = function(pid){
  var inp=$('ambNotifyPhone'); var ph=inp?inp.value.trim():'';
  if(!ph){ window.ambToast(state.lang==='am'?'እባክዎ ስልክ ያስገቡ':'Please enter your phone','err'); return; }
  A.saveNotify(pid, ph);                                  // local record
  A.api('/api/notify', { method:'POST', body:{ productId: pid, phone: ph } }).catch(function(){});  // server record
  ambCloseAll();
  window.ambToast(t('notifyDone'),'suc');
};

/* ── WISHLIST ── */
window.ambToggleWish = function (pid) {
  var i = state.wish.indexOf(pid);
  if (i>=0) state.wish.splice(i,1); else state.wish.push(pid);
  save('amb-wish', state.wish);
  updateWishBadge(); renderProducts(); renderOnSale();
  var p=P(pid);
  window.ambToast(i>=0 ? (state.lang==='am'?'ከተወዳጆች ተወግዷል':'Removed from wishlist') : (p?p.name:'Item')+(state.lang==='am'?' ተቀምጧል ♥':' saved ♥'), i>=0?'':'suc');
};
function updateWishBadge() {
  var b=$('ambWishBadge'); if(!b) return;
  b.textContent = state.wish.length;
  b.classList.toggle('vis', state.wish.length>0);
}

/* expose render fns for init + cart module */
A.render = {
  ribbon:renderRibbon, chrome:renderChrome, tenants:renderTenants, services:renderServices,
  onSale:renderOnSale, filterChips:renderFilterChips, products:renderProducts, heroVisual:renderHeroVisual,
  directory:renderDirectory, filterBar:renderFilterBar,
  wishBadge:updateWishBadge, i18n:applyI18n, langBtn:function(){ ambSetLang(state.lang); }
};
A.shade = shade;
A.nameFor = nameFor;
A.socialIcons = socialIcons;

})();

/* ════════════════════════════════════════════════════════════════
   PART 3 — Cart (grouped by tenant) + per-tenant checkout
═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
var A = window.__AMB;
var BUILDING=A.BUILDING, state=A.state;
var save=A.save, $=A.$, esc=A.esc, fmt=A.fmt, fmtN=A.fmtN, P=A.P, tenant=A.tenant, shade=A.shade, floorUnit=A.floorUnit;
var sendOrderToTenant=A.sendOrderToTenant;
var saveCart=A.saveCart, computeTotals=A.computeTotals, nearestArea=A.nearestArea;
var L=A.t;                 // i18n label fn (note: local `t` = tenant in this module)
var nameFor=A.nameFor, socialIcons=A.socialIcons;

function initials(name){ return name.split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join(''); }

/* ── CART CORE ── */
function cartQty(){ return state.cart.reduce(function(s,i){return s+i.qty;},0); }
function cartGrand(){ return state.cart.reduce(function(s,i){ var p=P(i.pid); return s+(p?p.price*i.qty:0); },0); }
function updateBadges(){
  var q=cartQty();
  var b=$('ambCartBadge'); if(b){ b.textContent=q; b.classList.toggle('vis',q>0); }
  var c=$('ambCartCount'); if(c) c.textContent=q;
}
/* group cart items by tenant → [{tenant, items:[{pid,qty,product}], total}] */
function cartGroups(){
  var map={};
  state.cart.forEach(function(i){
    var p=P(i.pid); if(!p) return;
    if(!map[p.tenantId]) map[p.tenantId]={ tenant:tenant(p.tenantId), items:[], total:0 };
    map[p.tenantId].items.push({ pid:i.pid, qty:i.qty, product:p, variant:i.variant||null });
    map[p.tenantId].total += p.price*i.qty;
  });
  // preserve building tenant order
  return BUILDING.tenants.map(function(t){return map[t.id];}).filter(Boolean);
}

window.ambAddToCart = function (pid, qty, variant) {
  var p=P(pid); if(!p) return;
  qty = qty||1;
  var found=false;
  state.cart.forEach(function(i){ if(i.pid===pid && (i.variant||null)===(variant||null)){ i.qty+=qty; found=true; } });
  if(!found) state.cart.push({pid:pid, qty:qty, variant:variant||null});
  saveCart();
  updateBadges(); renderCart();
  window.ambToast(p.name+(variant?' ('+variant+')':'')+' '+(state.lang==='am'?'ወደ ጋሪ ታክሏል':'added to cart'), 'suc');
  var btn=$('amb-atc-'+pid);
  if(btn){ var orig=btn.innerHTML; btn.classList.add('added'); btn.innerHTML='<i class="fas fa-check"></i> '+(state.lang==='am'?'ታክሏል':'Added');
    setTimeout(function(){ btn.classList.remove('added'); btn.innerHTML=orig; }, 1500); }
};
window.ambChangeQty = function (pid,d) {
  state.cart.forEach(function(i){ if(i.pid===pid) i.qty=Math.max(1,i.qty+d); });
  saveCart(); updateBadges(); renderCart();
};
window.ambRemove = function (pid) {
  state.cart = state.cart.filter(function(i){return i.pid!==pid;});
  saveCart(); updateBadges(); renderCart();
};

function renderCart(){
  var body=$('ambCartBody'), foot=$('ambCartFoot'); if(!body) return;
  var groups = cartGroups();
  if(!groups.length){
    body.innerHTML='<div class="amb-cart-empty"><i class="fas fa-shopping-bag"></i><div style="font-weight:700">Your cart is empty</div><div style="font-size:.74rem">Browse tenants and add products</div></div>';
    if(foot) foot.style.display='none';
    return;
  }
  body.innerHTML = groups.map(function(g){
    var t=g.tenant;
    var items = g.items.map(function(it){
      var p=it.product;
      return '<div class="amb-citem">'+
        '<img class="amb-ci-img" src="'+esc(p.img)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">'+
        '<div class="amb-ci-info">'+
          '<div class="amb-ci-name">'+esc(p.name)+(it.variant?' <span class="amb-ci-var">'+esc(it.variant)+'</span>':'')+'</div>'+
          '<div class="amb-ci-price">'+fmt(p.price)+'</div>'+
          '<div class="amb-ci-qty"><button class="amb-qbtn" onclick="ambChangeQty(\''+p.id+'\',-1)"><i class="fas fa-minus"></i></button>'+
          '<span class="amb-qval">'+it.qty+'</span>'+
          '<button class="amb-qbtn" onclick="ambChangeQty(\''+p.id+'\',1)"><i class="fas fa-plus"></i></button></div>'+
        '</div>'+
        '<button class="amb-ci-rm" onclick="ambRemove(\''+p.id+'\')" aria-label="Remove"><i class="fas fa-trash-can"></i></button>'+
      '</div>';
    }).join('');
    return '<div class="amb-cgroup">'+
      '<div class="amb-cgroup-head">'+
        '<div class="amb-cgroup-av" style="background:linear-gradient(135deg,'+t.color+','+shade(t.color,-25)+')">'+esc(initials(t.name))+'</div>'+
        '<div class="amb-cgroup-info"><div class="amb-cgroup-name">'+esc(nameFor(t))+'</div><div class="amb-cgroup-floor">'+esc(floorUnit(t))+'</div></div>'+
      '</div>'+
      '<div class="amb-cgroup-items">'+items+'</div>'+
      '<div class="amb-cgroup-foot">'+
        '<div class="amb-cgroup-tot">'+g.items.length+' '+L('products')+' · <b>'+fmt(g.total)+'</b></div>'+
        '<button class="amb-cgroup-co" onclick="ambStartCheckout(\''+t.id+'\')">'+L('checkout')+' <i class="fas fa-arrow-right"></i></button>'+
      '</div>'+
    '</div>';
  }).join('');
  if(foot){ foot.style.display='block'; $('ambCartGrand').textContent = fmt(cartGrand()); }
}
window.ambOpenCart = function(){ renderCart(); $('ambCart').classList.add('open'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden'; };
window.ambCloseCart = function(){ $('ambCart').classList.remove('open'); $('ambOverlay').classList.remove('on'); document.body.style.overflow=''; };

/* ════════════════════════════════════════════════════════════════
   PER-TENANT CHECKOUT
═══════════════════════════════════════════════════════════════════ */
window.ambStartCheckout = function (tid) {
  state.coTenant = tid;
  state.coStep = 1;
  state.coBank = null;
  state.coPayMethod = 'bank_transfer';
  ambCloseCart();
  renderCheckout();
  $('ambCoModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};
window.ambCloseCheckout = function(){ $('ambCoModal').classList.remove('on'); $('ambOverlay').classList.remove('on'); document.body.style.overflow=''; };

function tenantCartItems(tid){
  return state.cart.map(function(i){ var p=P(i.pid); return p&&p.tenantId===tid?{pid:i.pid,qty:i.qty,product:p,variant:i.variant||null}:null; }).filter(Boolean);
}
function tenantTotal(tid){ return tenantCartItems(tid).reduce(function(s,it){return s+it.product.price*it.qty;},0); }
function areaByName(name){ for(var i=0;i<BUILDING.areas.length;i++){ if(BUILDING.areas[i].name===name) return BUILDING.areas[i]; } return null; }
function deliveryFee(){
  if(state.coData.dlv==='pickup') return 0;
  var a=areaByName(state.coData.area); if(!a) return 0;
  var fee=a.fee||0;
  // GPS refinement: add per-km beyond the free radius, capped, when we have a pinned distance
  if(state.coData.gpsKm!=null && a.lat!=null && BUILDING.delivery){
    var extra=Math.max(0, state.coData.gpsKm-(BUILDING.delivery.freeKm||0))*(BUILDING.delivery.perKm||0);
    extra=Math.min(extra, BUILDING.delivery.gpsSurchargeCap||extra);
    fee += Math.round(extra);
  }
  return fee;
}

function setSteps(){
  for(var i=1;i<=4;i++){
    var el=$('ambCs'+i); if(!el) continue;
    el.className='amb-co-step'+(i===state.coStep?' active':i<state.coStep?' done':'');
  }
  for(var j=1;j<=3;j++){ var l=$('ambCl'+j); if(l) l.className='amb-co-line'+(j<state.coStep?' done':''); }
}

function renderCheckout(){
  var t=tenant(state.coTenant); if(!t) return;
  // tenant banner — now with owner, phone, socials, WhatsApp
  $('ambCoTenant').innerHTML =
    '<div class="amb-co-tenant-main">'+
      '<div class="amb-co-tenant-av" style="background:linear-gradient(135deg,'+t.color+','+shade(t.color,-25)+')">'+esc(initials(t.name))+'</div>'+
      '<div class="amb-co-tenant-info"><div class="amb-co-tenant-nm">'+esc(nameFor(t))+' <i class="fas fa-circle-check" style="color:var(--success);font-size:.66rem"></i></div>'+
      '<div class="amb-co-tenant-mt">'+esc(floorUnit(t))+' · '+esc(BUILDING.name)+'</div>'+
      '<div class="amb-co-tenant-contact"><i class="fas fa-user"></i> '+esc(t.owner)+' · <a href="tel:'+esc((t.mobile||'').replace(/\s/g,''))+'"><i class="fas fa-phone"></i> '+esc(t.mobile||'')+'</a></div></div>'+
      '<a class="amb-co-tenant-wa" href="https://wa.me/'+t.whatsapp+'" target="_blank" rel="noopener" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>'+
    '</div>'+
    '<div class="amb-co-tenant-socials">'+socialIcons(t.socials,t.color)+'</div>';
  var titles=[L('review'),L('details'),L('payment')+' · '+nameFor(t),L('orderPlaced')];
  $('ambCoTitle').textContent = titles[state.coStep-1];
  setSteps();
  if(state.coStep===1) renderCoStep1(t);
  else if(state.coStep===2) renderCoStep2(t);
  else if(state.coStep===3) renderCoStep3(t);
  else renderCoStep4(t);
}

/* STEP 1 — review this tenant's items */
function renderCoStep1(t){
  var items=tenantCartItems(t.id);
  var total=tenantTotal(t.id);
  var rows=items.map(function(it){
    var p=it.product;
    return '<div class="amb-citem"><img class="amb-ci-img" src="'+esc(p.img)+'" onerror="this.style.display=\'none\'">'+
      '<div class="amb-ci-info"><div class="amb-ci-name">'+esc(p.name)+(it.variant?' <span class="amb-ci-var">'+esc(it.variant)+'</span>':'')+'</div><div class="amb-ci-price">'+fmt(p.price)+' × '+it.qty+'</div></div>'+
      '<div style="font-weight:700;color:var(--wine);font-size:.82rem;align-self:center">'+fmt(p.price*it.qty)+'</div></div>';
  }).join('');
  $('ambCoBody').innerHTML =
    '<div class="amb-co-items">'+rows+'</div>'+
    '<div class="amb-co-sum">'+
      '<div class="amb-co-row"><span>'+L('subtotal')+' ('+items.length+')</span><span>'+fmt(total)+'</span></div>'+
      '<div class="amb-co-row"><span><i class="fas fa-truck-fast" style="opacity:.6;margin-right:5px"></i>'+L('delivery')+'</span><span style="color:var(--mid);font-size:.78rem">'+L('deliveryCalcNext')+'</span></div>'+
      (taxRate()>0 && !BUILDING.tax.inclusive ? '<div class="amb-co-row"><span>'+L('vat')+' ('+Math.round(taxRate()*100)+'%)</span><span style="color:var(--mid);font-size:.78rem">'+L('deliveryCalcNext')+'</span></div>':'')+
      '<div class="amb-co-row tot"><span>'+L('subtotal')+'</span><b>'+fmt(total)+'</b></div>'+
    '</div>'+
    '<div class="amb-note"><i class="fas fa-circle-info"></i><span>'+(state.lang==='am'?'ከ<b>'+esc(nameFor(t))+'</b> ብቻ እያዘዙ ነው። በጋሪዎ ውስጥ ያሉ ሌሎች ሻጮች ለየብቻ ይከፈላሉ።':'You\'re ordering only from <b>'+esc(nameFor(t))+'</b>. Other sellers in your cart check out separately.')+'</span></div>'+
    '<div class="amb-co-nav"><button class="amb-co-back" onclick="ambCloseCheckout()">'+L('cancel')+'</button>'+
    '<button class="amb-co-next" onclick="ambCoNext()">'+L('continue')+' <i class="fas fa-arrow-right"></i></button></div>';
}
function taxRate(){ return (BUILDING.tax && BUILDING.tax.rate) || 0; }

/* STEP 2 — buyer details + delivery location (GPS or subcity) with live total */
function renderCoStep2(t){
  var d=state.coData;
  var isPickup = d.dlv==='pickup';
  var areaOpts = '<option value="">'+(state.lang==='am'?'— ክፍለ ከተማ ይምረጡ —':'— choose your subcity —')+'</option>'+
    BUILDING.areas.map(function(a){ return '<option value="'+esc(a.name)+'"'+(d.area===a.name?' selected':'')+'>'+esc(a.name)+(a.fee?' · '+fmt(a.fee):'')+'</option>'; }).join('');
  var subtotal = tenantTotal(t.id);
  var fee = deliveryFee();
  var tt = computeTotals(subtotal, fee);
  var hasLoc = isPickup || !!d.area;
  // live order summary (updates as location changes)
  var sumRows =
    '<div class="amb-co-row"><span>'+L('subtotal')+'</span><span>'+fmt(subtotal)+'</span></div>'+
    '<div class="amb-co-row"><span><i class="fas fa-truck-fast" style="opacity:.6;margin-right:5px"></i>'+L('deliveryFee')+'</span><span>'+
      (isPickup?'<span style="color:var(--success)">'+L('pickup')+'</span>':(hasLoc?(fee?fmt(fee):'<span style="color:var(--success)">'+L('free')+'</span>'):'<span style="color:var(--mid);font-size:.78rem">'+L('setLocation')+'</span>'))+'</span></div>'+
    (taxRate()>0 ? '<div class="amb-co-row"><span>'+L('vat')+' ('+Math.round(taxRate()*100)+'%)</span><span>'+(hasLoc?fmt(tt.tax):'—')+'</span></div>':'')+
    '<div class="amb-co-row tot"><span>'+L('grandTotal')+'</span><b>'+(hasLoc?fmt(tt.gross):fmt(subtotal)+(taxRate()>0?'+':''))+'</b></div>';
  // ETA line
  var selArea = areaByName(d.area);
  var etaTxt = isPickup ? (state.lang==='am'?'ዝግጁ ሲሆን':'when ready') : (selArea ? selArea.eta : '');

  $('ambCoBody').innerHTML =
    '<div class="amb-dlv-opts">'+
      '<div class="amb-dlv'+(!isPickup?' sel':'')+'" onclick="ambSelDlv(\'delivery\')"><i class="fas fa-truck-fast"></i><div class="amb-dlv-t">'+L('delivery')+'</div><div class="amb-dlv-s">'+L('deliveryAddisOnly')+'</div></div>'+
      '<div class="amb-dlv'+(isPickup?' sel':'')+'" onclick="ambSelDlv(\'pickup\')"><i class="fas fa-store"></i><div class="amb-dlv-t">'+L('pickup')+'</div><div class="amb-dlv-s">'+(state.lang==='am'?'በ':'Collect at ')+esc(floorUnit(t))+'</div></div>'+
    '</div>'+
    '<div class="amb-frow">'+
      '<div class="amb-fld"><label class="amb-fld-l">'+L('fullName')+' *</label><input class="amb-inp" id="ambFn" placeholder="'+(state.lang==='am'?'ስምዎ':'Your name')+'" value="'+esc(d.name||'')+'"></div>'+
      '<div class="amb-fld"><label class="amb-fld-l">'+L('phone')+' *</label><input class="amb-inp" id="ambPh" type="tel" placeholder="09xx xxx xxx" value="'+esc(d.phone||'')+'"></div>'+
    '</div>'+
    '<div id="ambAddrFld" style="'+(isPickup?'display:none':'')+'">'+
      '<div class="amb-loc-head"><i class="fas fa-location-dot"></i> '+L('setLocation')+' <span class="amb-loc-addis">'+L('deliveryAddisOnly')+'</span></div>'+
      '<button class="amb-geo-btn" id="ambGeoBtn" onclick="ambDetectLocation()"><i class="fas fa-location-crosshairs"></i> '+L('useGps')+'</button>'+
      (d.geo?'<div class="amb-geo-pin"><i class="fas fa-map-pin"></i> '+(d.area?esc(d.area)+(d.gpsKm!=null?' · '+d.gpsKm.toFixed(1)+' km':''):(state.lang==='am'?'ቦታ ተያይዟል':'Location pinned'))+' · <a href="'+esc(d.geo)+'" target="_blank" rel="noopener">'+(state.lang==='am'?'በካርታ ይዩ':'map')+'</a></div>':'')+
      '<div class="amb-loc-or">'+L('orPickArea')+'</div>'+
      '<div class="amb-fld"><select class="amb-sel" id="ambArea" onchange="ambSelArea(this.value)">'+areaOpts+'</select></div>'+
      '<div class="amb-fld"><label class="amb-fld-l">'+L('address')+' *</label>'+
        '<input class="amb-inp" id="ambAddr" placeholder="'+(state.lang==='am'?'ህንፃ፣ ምልክት፣ ለሹፌር ስልክ…':'Building, landmark, phone for driver…')+'" value="'+esc(d.addr||'')+'"></div>'+
    '</div>'+
    '<div class="amb-co-est'+(isPickup?' pickup':'')+'">'+
      '<div class="amb-co-est-row"><span><i class="fas fa-clock"></i> '+L('deliveryEst')+'</span><b>'+esc(etaTxt||'—')+'</b></div>'+
    '</div>'+
    '<div class="amb-co-sum">'+sumRows+'</div>'+
    '<div class="amb-co-nav"><button class="amb-co-back" onclick="ambCoBack()"><i class="fas fa-arrow-left"></i> '+L('back')+'</button>'+
    '<button class="amb-co-next" onclick="ambSaveDetails()">'+L('continue')+' <i class="fas fa-arrow-right"></i></button></div>';
}
function persistStep2Fields(){
  var fn=$('ambFn'), ph=$('ambPh'), ar=$('ambArea'), ad=$('ambAddr');
  if(fn) state.coData.name=fn.value;
  if(ph) state.coData.phone=ph.value;
  if(ar) state.coData.area=ar.value;
  if(ad) state.coData.addr=ad.value;
}
window.ambSelArea = function(v){
  persistStep2Fields();
  state.coData.area=v;
  // manual subcity choice clears any GPS distance surcharge
  state.coData.gpsKm=null;
  renderCoStep2(tenant(state.coTenant));
};
window.ambSelDlv = function(type){
  persistStep2Fields();
  state.coData.dlv=type;
  renderCoStep2(tenant(state.coTenant));
};
window.ambDetectLocation = function(){
  var btn=$('ambGeoBtn');
  if(!navigator.geolocation){ window.ambToast('Geolocation not supported','err'); return; }
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> '+L('locatingYou'); }
  persistStep2Fields();
  navigator.geolocation.getCurrentPosition(function(pos){
    var lat=pos.coords.latitude, lng=pos.coords.longitude;
    state.coData.geo='https://maps.google.com/?q='+lat.toFixed(6)+','+lng.toFixed(6);
    state.coData.geoLat=lat; state.coData.geoLng=lng;
    // pick nearest Addis subcity and remember distance from mall for fee refinement
    var near=nearestArea(lat,lng);
    if(near){ state.coData.area=near.area.name; state.coData.gpsKm=near.km; }
    state.coData.dlv='delivery';
    window.ambToast((state.lang==='am'?'ቅርብ ዞን፡ ':'Nearest zone: ')+(near?near.area.name:''),'suc');
    renderCoStep2(tenant(state.coTenant));
  }, function(){
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-location-crosshairs"></i> '+L('useGps'); }
    window.ambToast(state.lang==='am'?'ቦታ ማግኘት አልተቻለም':'Could not get location','err');
  }, {enableHighAccuracy:true, timeout:8000});
};
window.ambSaveDetails = function(){
  persistStep2Fields();
  var d=state.coData;
  if(!d.name || !d.name.trim() || !d.phone || !d.phone.trim()){ window.ambToast(state.lang==='am'?'እባክዎ ስምና ስልክ ያስገቡ':'Please enter your name and phone','err'); return; }
  d.name=d.name.trim(); d.phone=d.phone.trim();
  d.dlv = d.dlv || 'delivery';
  if(d.dlv==='delivery'){
    if(!d.area){ window.ambToast(state.lang==='am'?'እባክዎ የመድረሻ ቦታ ያስገቡ':'Please set your delivery location','err'); return; }
    if(!d.addr || !d.addr.trim()){ window.ambToast(state.lang==='am'?'እባክዎ አድራሻ ያስገቡ':'Please enter your address','err'); return; }
  }
  state.coStep=3; renderCheckout();
};

/* STEP 3 — pick a bank (per tenant) */
function renderCoStep3(t){
  var total=tenantTotal(t.id);
  var fee=deliveryFee();
  var tt=computeTotals(total, fee);
  var grand=tt.gross;
  var method = state.coPayMethod || 'bank_transfer';
  var banks = t.banks.map(function(b){
    var sel = state.coBank===b.key;
    var acctType = b.key==='telebirr' ? 'Telebirr number' : 'Account number';
    return '<div class="amb-bank'+(sel?' sel':'')+'" onclick="ambSelBank(\''+b.key+'\')">'+
      '<div class="amb-bank-hd">'+
        '<div class="amb-bank-ic" style="background:'+b.color+'"><i class="fas '+b.icon+'"></i></div>'+
        '<div><div class="amb-bank-nm">'+esc(b.name)+'</div><div class="amb-bank-acc">'+esc(b.holder)+'</div></div>'+
        '<div class="amb-bank-radio"></div>'+
      '</div>'+
      '<div class="amb-bank-detail">'+
        '<div class="amb-bank-row"><div><div class="amb-bank-row-l">'+esc(acctType)+'</div><div class="amb-bank-row-v">'+esc(b.acct)+'</div></div><button class="amb-copy" onclick="event.stopPropagation();ambCopy(\''+b.acct+'\')"><i class="fas fa-copy"></i> Copy</button></div>'+
        '<div class="amb-bank-row"><div><div class="amb-bank-row-l">Account name</div><div class="amb-bank-row-v" style="font-family:Outfit">'+esc(b.holder)+'</div></div></div>'+
        '<div class="amb-bank-row" style="background:var(--gold-tint);border-color:rgba(212,175,55,.3)"><div><div class="amb-bank-row-l">Amount to transfer</div><div class="amb-bank-row-v" style="color:var(--wine)">'+fmt(grand)+'</div></div><button class="amb-copy" onclick="event.stopPropagation();ambCopy(\''+grand+'\')"><i class="fas fa-copy"></i></button></div>'+
      '</div>'+
    '</div>';
  }).join('');
  var feeRow = fee ? '<div class="amb-co-row"><span>'+L('deliveryFee')+'</span><span>'+fmt(fee)+'</span></div>' :
    '<div class="amb-co-row"><span>'+L('deliveryFee')+'</span><span style="color:var(--success)">'+(state.coData.dlv==='pickup'?L('pickup'):L('free'))+'</span></div>';

  var methodTabs =
    '<div class="amb-pay-tabs">'+
      '<button class="amb-pay-tab'+(method==='bank_transfer'?' on':'')+'" onclick="ambSelPayMethod(\'bank_transfer\')"><i class="fas fa-building-columns"></i> '+(state.lang==='am'?'ባንክ':'Bank Transfer')+'</button>'+
      '<button class="amb-pay-tab'+(method==='chapa'?' on':'')+'" onclick="ambSelPayMethod(\'chapa\')"><img class="amb-pay-tab-logo" src="https://ethiopianlogos.com/logos/chapa/chapa.svg" alt="Chapa" onerror="this.replaceWith(Object.assign(document.createElement(\'i\'),{className:\'fas fa-credit-card\'}))"> Chapa</button>'+
      '<button class="amb-pay-tab'+(method==='ussd'?' on':'')+'" onclick="ambSelPayMethod(\'ussd\')"><i class="fas fa-mobile-screen-button"></i> USSD</button>'+
    '</div>';

  var payBody;
  if (method === 'chapa') {
    payBody =
      '<div class="amb-pay-panel">'+
        '<div class="amb-pay-panel-ic amb-pay-panel-ic-logo"><img src="https://ethiopianlogos.com/logos/chapa/chapa.svg" alt="Chapa" onerror="this.parentNode.style.background=\'#0EA5A5\';this.replaceWith(Object.assign(document.createElement(\'i\'),{className:\'fas fa-credit-card\',style:\'color:#fff\'}))"></div>'+
        '<h4>'+(state.lang==='am'?'በ Chapa ይክፈሉ':'Pay with Chapa')+'</h4>'+
        '<p>'+(state.lang==='am'?'ካርድ፣ ሞባይል ገንዘብ ወይም ባንክ በመጠቀም ደህንነቱ በተጠበቀ በChapa ገፅ ላይ ይክፈሉ። ትዕዛዝዎን ካስገቡ በኋላ ወደ ቼክ አውት ገፅ ይዛወራሉ።':'Pay securely on Chapa\'s checkout page using a card, mobile money, or bank. You\'ll be redirected there right after placing your order.')+'</p>'+
      '</div>';
  } else if (method === 'ussd') {
    payBody =
      '<div class="amb-pay-panel">'+
        '<div class="amb-pay-panel-ic" style="background:#7C3AED"><i class="fas fa-mobile-screen-button"></i></div>'+
        '<h4>'+(state.lang==='am'?'በ USSD ይክፈሉ':'Pay via USSD push')+'</h4>'+
        '<p>'+(state.lang==='am'?'ትዕዛዝ ካስገቡ በኋላ ክፍያውን ለማጽደቅ የ USSD መልእክት ወደ ስልክዎ ይላካል። ስልክዎ ዝግጁ መሆኑን ያረጋግጡ።':'After placing your order, a USSD prompt is sent to your phone to approve the payment. Make sure your phone is reachable.')+'</p>'+
        '<div class="amb-pay-note"><i class="fas fa-circle-info"></i> '+(state.lang==='am'?'ይህ ባህሪ በዚህ ማከማቻ ላይ ገና ካልተዋቀረ፣ ካስገቡ በኋላ አማራጭ የክፍያ መንገድ ይነገርዎታል።':'If this isn\'t configured on this store yet, you\'ll be told right after ordering and can pay by bank transfer or WhatsApp instead.')+'</div>'+
      '</div>';
  } else {
    payBody = '<label class="amb-fld-l" style="margin-bottom:8px;display:block">'+L('payVia')+' — '+esc(nameFor(t))+'</label>'+
      '<div class="amb-banks">'+banks+'</div>';
  }

  $('ambCoBody').innerHTML =
    '<div class="amb-co-sum" style="margin-bottom:14px">'+
      '<div class="amb-co-row"><span>'+L('subtotal')+'</span><span>'+fmt(total)+'</span></div>'+
      feeRow+
      (tt.tax?'<div class="amb-co-row"><span>'+L('vat')+' ('+Math.round(taxRate()*100)+'%)</span><span>'+fmt(tt.tax)+'</span></div>':'')+
      '<div class="amb-co-row tot"><span>'+(state.lang==='am'?'ጠቅላላ ክፍያ':'Total to pay')+' '+esc(nameFor(t))+'</span><b>'+fmt(grand)+'</b></div>'+
    '</div>'+
    methodTabs+
    payBody+
    '<div class="amb-note"><i class="fas fa-shield-halved"></i><span>'+(state.lang==='am'
        ? 'ትክክለኛውን መጠን ወደ የተመረጠው ሂሳብ ያስተላልፉ፣ ከዚያ ትዕዛዝ ይስጡ። ቢሲንካ ገንዘብዎን አይዝም — በቀጥታ ለሻጩ ይከፍላሉ።'
        : 'Bisinka never holds your money — bank transfer and USSD both pay '+esc(nameFor(t))+' directly; Chapa settles to the marketplace operator on the seller\'s behalf.')+'</span></div>'+
    '<div class="amb-co-nav"><button class="amb-co-back" onclick="ambCoBack()"><i class="fas fa-arrow-left"></i> '+L('back')+'</button>'+
    '<button class="amb-co-next" onclick="ambPlaceOrder()"><i class="fas fa-circle-check"></i> '+L('placeOrder')+'</button></div>';
}
window.ambSelBank = function(key){ state.coBank=key; renderCoStep3(tenant(state.coTenant)); };
window.ambSelPayMethod = function(method){ state.coPayMethod=method; state.coBank=null; renderCoStep3(tenant(state.coTenant)); };

window.ambCoNext = function(){
  if(state.coStep===1){ state.coStep=2; renderCheckout(); }
};
window.ambCoBack = function(){ if(state.coStep>1){ state.coStep--; renderCheckout(); } };

/* PLACE ORDER → server computes authoritative totals; offline falls back to local math */
var placingOrder = false;
window.ambPlaceOrder = function(){
  var t=tenant(state.coTenant);
  var method = state.coPayMethod || 'bank_transfer';
  if(method==='bank_transfer' && !state.coBank){ window.ambToast(state.lang==='am'?'እባክዎ የመክፈያ ባንክ ይምረጡ':'Please select a bank to pay with','err'); return; }
  if(placingOrder) return;
  placingOrder = true;
  var items=tenantCartItems(t.id);
  var total=tenantTotal(t.id);

  function afterPayment(order){
    if (method === 'chapa' && typeof fetch !== 'undefined') {
      A.api('/api/orders/'+order.ref+'/pay/chapa', { method:'POST', body:{} }).then(function(d){
        if (d && d.checkoutUrl) { location.href = d.checkoutUrl; return; }
        window.ambToast(state.lang==='am'?'Chapa አሁን አይገኝም — በWhatsApp ላይ ከሻጩ ጋር ይክፈሉ':'Chapa isn\'t available right now — arrange payment with the seller on WhatsApp.', 'err');
      }).catch(function(err){
        window.ambToast((err && err.message) || 'Chapa isn\'t set up on this store yet — pay via WhatsApp with the seller.', 'err');
      });
    } else if (method === 'ussd' && typeof fetch !== 'undefined') {
      A.api('/api/orders/'+order.ref+'/pay/ussd', { method:'POST', body:{} }).then(function(d){
        window.ambToast((d && d.message) || 'USSD prompt sent — check your phone.', 'suc');
      }).catch(function(err){
        window.ambToast((err && err.message) || 'USSD push isn\'t set up on this store yet — pay via WhatsApp with the seller.', 'err');
      });
    }
  }

  function finalize(order){
    placingOrder = false;
    state.lastOrder = order;
    if(state.coData.phone) save('amb-phone', state.coData.phone);   // for status lookups in My Orders
    sendOrderToTenant(order);          // local log + any client-side hooks
    A.saveOrder(order);                // local "My Orders" history
    state.cart = state.cart.filter(function(i){ var p=P(i.pid); return !(p && p.tenantId===t.id); });
    saveCart();
    updateBadges();
    state.coStep=4; renderCheckout();
    afterPayment(order);
  }
  function localOrder(){
    var bank = method==='bank_transfer' ? t.banks.filter(function(b){return b.key===state.coBank;})[0] : null;
    var ref = 'AMB-'+t.id.toUpperCase().slice(0,3)+'-'+(''+Date.now()).slice(-6);
    var fee = deliveryFee();
    var tt = computeTotals(total, fee);
    return {
      ref: ref, date: new Date().toISOString(), building: BUILDING.name,
      tenant: { id:t.id, name:t.name, floor:t.floor, unit:t.unit, whatsapp:t.whatsapp, owner:t.owner, mobile:t.mobile },
      buyer: { name:state.coData.name, phone:state.coData.phone, method:state.coData.dlv, area:state.coData.area, addr:state.coData.addr, geo:state.coData.geo||'' },
      items: items.map(function(it){ return { name:it.product.name, variant:it.variant||'', qty:it.qty, price:it.product.price, line:it.product.price*it.qty }; }),
      bank: bank ? { name:bank.name, acct:bank.acct, holder:bank.holder } : null,
      subtotal: total, deliveryFee: fee, tax: tt.tax, taxLabel:(BUILDING.tax&&BUILDING.tax.label)||'VAT', taxRate:taxRate(), total: tt.gross,
      paymentMethod: method, status: 'placed', offline: true
    };
  }

  // try the backend first (authoritative pricing + persistence + seller notification)
  if (typeof fetch === 'undefined') { finalize(localOrder()); return; }   // opened as a file / very old browser
  A.api('/api/orders', { method:'POST', body:{
    tenantId: t.id,
    items: items.map(function(it){ return { pid:it.pid, qty:it.qty, variant:it.variant||'' }; }),
    buyer: { name:state.coData.name, phone:state.coData.phone, method:state.coData.dlv, area:state.coData.area, addr:state.coData.addr, geo:state.coData.geo||'' },
    paymentMethod: method,
    bankKey: method==='bank_transfer' ? state.coBank : undefined,
    gpsKm: state.coData.gpsKm != null ? state.coData.gpsKm : undefined
  }}).then(function(d){
    finalize(d.order);
  }).catch(function(err){
    if (err && err.status === 400) {           // server rejected the order (validation) — show why
      placingOrder = false;
      window.ambToast(err.message, 'err');
      return;
    }
    finalize(localOrder());                    // offline / no backend → local order
  });
};

/* STEP 4 — invoice / confirmation */
function buildWaMessage(o){
  var lines = o.items.map(function(it){ return '• '+it.name+(it.variant?' ['+it.variant+']':'')+' x'+it.qty+' - '+fmt(it.line); }).join('\n');
  var feeLine = (o.buyer.method==='pickup') ? '\nDelivery: pickup' : '\nDelivery ('+(o.buyer.area||'')+'): '+(o.deliveryFee?fmt(o.deliveryFee):'free');
  var vatLine = o.tax ? '\n'+(o.taxLabel||'VAT')+': '+fmt(o.tax) : '';
  return 'Hello '+o.tenant.name+'! (via '+o.building+' online store)\n\n'+
    '*NEW ORDER - '+o.ref+'*\n\n'+lines+
    '\nSubtotal: '+fmt(o.subtotal)+feeLine+vatLine+
    '\n\n*Total: '+fmt(o.total)+'*'+
    '\n\nBuyer: '+o.buyer.name+'\nPhone: '+o.buyer.phone+
    '\n'+(o.buyer.method==='pickup'?'Pickup at '+floorUnit(o.tenant):'Deliver to: '+o.buyer.area+(o.buyer.addr?' - '+o.buyer.addr:''))+
    (o.buyer.geo?'\nMap: '+o.buyer.geo:'')+
    '\nPaid to: '+o.bank.name+' ('+o.bank.acct+')'+
    '\n\nI have made the transfer - sending proof now.';
}
function renderCoStep4(t){
  var o=state.lastOrder;
  var waMsg = buildWaMessage(o);
  var waUrl = 'https://wa.me/'+t.whatsapp+'?text='+encodeURIComponent(waMsg);
  var itemRows = o.items.map(function(it){
    return '<div class="amb-rcp-row"><span>'+esc(it.name)+(it.variant?' ['+esc(it.variant)+']':'')+' × '+it.qty+'</span><span>'+fmt(it.line)+'</span></div>';
  }).join('');
  var dlvLabel = o.buyer.method==='pickup' ? L('pickup') : (o.buyer.area||L('delivery'));
  $('ambCoBody').innerHTML =
    '<div class="amb-confirm">'+
      '<div class="amb-confirm-ic"><i class="fas fa-check"></i></div>'+
      '<div class="amb-confirm-t">'+L('orderConfirmed')+'</div>'+
      '<div class="amb-confirm-s">'+L('orderConfirmedSub')+'</div>'+
      '<div class="amb-order-chip">'+esc(o.ref)+'</div>'+
      (o.offline ? '' :
        '<div class="amb-sms-note"><i class="fas fa-comment-sms"></i> '+
        (state.lang==='am'
          ? 'የማረጋገጫ ኤስኤምኤስ ወደ '+esc(o.buyer.phone)+' ተልኳል። ትዕዛዝዎ ሲጓዝ በኤስኤምኤስ እናሳውቅዎታለን።'
          : 'A confirmation SMS was sent to '+esc(o.buyer.phone)+'. You\'ll get SMS updates as the seller confirms, ships and delivers.')+
        '</div>')+
      // on-screen receipt
      '<div class="amb-receipt">'+
        '<div class="amb-rcp-seller"><i class="fas fa-store"></i> '+esc(nameFor(t))+' · '+esc(floorUnit(t))+'</div>'+
        '<div class="amb-rcp-items">'+itemRows+'</div>'+
        '<div class="amb-rcp-tot">'+
          '<div class="amb-rcp-row"><span>'+L('subtotal')+'</span><span>'+fmt(o.subtotal)+'</span></div>'+
          '<div class="amb-rcp-row"><span>'+L('deliveryFee')+' ('+esc(dlvLabel)+')</span><span>'+(o.deliveryFee?fmt(o.deliveryFee):(o.buyer.method==='pickup'?L('pickup'):L('free')))+'</span></div>'+
          (o.tax?'<div class="amb-rcp-row"><span>'+esc(o.taxLabel)+' ('+Math.round(o.taxRate*100)+'%)</span><span>'+fmt(o.tax)+'</span></div>':'')+
          '<div class="amb-rcp-row grand"><span>'+L('grandTotal')+'</span><b>'+fmt(o.total)+'</b></div>'+
        '</div>'+
        '<div class="amb-rcp-pay"><i class="fas fa-building-columns"></i> '+(state.lang==='am'?'ይክፈሉ ለ፡ ':'Pay to: ')+esc(o.bank.name)+' · '+esc(o.bank.acct)+'</div>'+
      '</div>'+
      // what happens next
      '<div class="amb-next">'+
        '<div class="amb-next-h">'+L('whatNext')+'</div>'+
        '<div class="amb-next-step"><span class="amb-next-n">1</span> '+L('nextStep1')+'</div>'+
        '<div class="amb-next-step"><span class="amb-next-n">2</span> '+L('nextStep2')+'</div>'+
        '<div class="amb-next-step"><span class="amb-next-n">3</span> '+L('nextStep3')+'</div>'+
      '</div>'+
      '<div class="amb-confirm-acts">'+
        '<a class="amb-btn-wa" href="'+waUrl+'" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> '+L('confirmWa')+'</a>'+
        '<button class="amb-btn-pdf" onclick="ambDownloadInvoice()"><i class="fas fa-file-arrow-down"></i> '+L('downloadInvoice')+'</button>'+
        '<button class="amb-btn-ghost2" onclick="ambCloseCheckout()">'+L('continueShopping')+'</button>'+
      '</div>'+
      '<div class="amb-bg-status"><i class="fas fa-circle-check"></i> '+(state.lang==='am'?'ትዕዛዙ ለ'+esc(nameFor(t))+' በጀርባ ተመዝግቧል':'Order logged to '+esc(nameFor(t))+' in the background')+'</div>'+
    '</div>';
}

/* ── INVOICE PDF (lazy-load jsPDF) ── */
window.ambDownloadInvoice = function(){
  var o=state.lastOrder; if(!o) return;
  loadJsPDF(function(jsPDF){
    var doc=new jsPDF({unit:'pt', format:'a4'});
    var W=595, m=40, y=54;
    var wine=[123,0,63], gold=[212,175,55], ink=[26,16,20], mid=[100,80,90];
    // header band
    doc.setFillColor(wine[0],wine[1],wine[2]); doc.rect(0,0,W,90,'F');
    doc.setFillColor(gold[0],gold[1],gold[2]); doc.rect(0,90,W,4,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(22);
    doc.text(BUILDING.name, m, 44);
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(235,210,225);
    doc.text('Online Store · powered by Bisinka Directory', m, 62);
    doc.text(BUILDING.location+' · '+BUILDING.phone, m, 77);
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(255,255,255);
    doc.text('INVOICE', W-m, 50, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(235,210,225);
    doc.text(o.ref, W-m, 66, {align:'right'});

    y=124;
    // tenant + buyer columns
    doc.setTextColor(wine[0],wine[1],wine[2]); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('SOLD BY', m, y); doc.text('BILLED TO', W/2, y);
    doc.setTextColor(ink[0],ink[1],ink[2]); doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(o.tenant.name, m, y+16);
    doc.text(floorUnit(o.tenant)+', '+BUILDING.name, m, y+30);
    doc.text('WhatsApp: +'+o.tenant.whatsapp, m, y+44);
    doc.text(o.buyer.name, W/2, y+16);
    doc.text(o.buyer.phone, W/2, y+30);
    var dlvTxt = o.buyer.method==='pickup' ? 'Pickup at '+floorUnit(o.tenant) : 'Delivery: '+(o.buyer.area||'')+(o.buyer.addr?' — '+o.buyer.addr:'')+(o.buyer.geo?' (map: '+o.buyer.geo+')':'');
    doc.text(doc.splitTextToSize(dlvTxt, W/2-m-10), W/2, y+44);
    doc.setFontSize(8); doc.setTextColor(mid[0],mid[1],mid[2]);
    doc.text('Date: '+new Date(o.date).toLocaleString(), m, y+62);

    // table header
    y += 92;
    doc.setFillColor(247,230,238); doc.rect(m, y-16, W-2*m, 24, 'F');
    doc.setTextColor(wine[0],wine[1],wine[2]); doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text('ITEM', m+10, y);
    doc.text('QTY', W-220, y, {align:'right'});
    doc.text('PRICE', W-130, y, {align:'right'});
    doc.text('TOTAL', W-m-6, y, {align:'right'});
    y += 22;
    doc.setFont('helvetica','normal'); doc.setTextColor(ink[0],ink[1],ink[2]); doc.setFontSize(9.5);
    o.items.forEach(function(it){
      var nameLines = doc.splitTextToSize(it.name, W-300);
      doc.text(nameLines, m+10, y);
      doc.text(''+it.qty, W-220, y, {align:'right'});
      doc.text(fmtN(it.price), W-130, y, {align:'right'});
      doc.text(fmtN(it.line), W-m-6, y, {align:'right'});
      doc.setDrawColor(236,221,228); doc.line(m, y+8, W-m, y+8);
      y += Math.max(20, nameLines.length*13+8);
    });
    // subtotal / delivery / VAT breakdown
    y += 10;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(ink[0],ink[1],ink[2]);
    doc.text('Subtotal', W-220, y, {align:'right'}); doc.text(fmtN(o.subtotal), W-m-6, y, {align:'right'}); y+=16;
    var dlvTxt2 = o.buyer.method==='pickup' ? 'Pickup' : (o.deliveryFee?fmtN(o.deliveryFee):'Free');
    doc.text('Delivery'+(o.buyer.area?' ('+o.buyer.area+')':''), W-220, y, {align:'right'}); doc.text(dlvTxt2, W-m-6, y, {align:'right'}); y+=16;
    if(o.tax){ doc.text((o.taxLabel||'VAT')+' ('+Math.round((o.taxRate||0)*100)+'%)', W-220, y, {align:'right'}); doc.text(fmtN(o.tax), W-m-6, y, {align:'right'}); y+=16; }
    // total
    y += 6;
    doc.setFillColor(wine[0],wine[1],wine[2]); doc.roundedRect(W-260, y-4, 220, 34, 5, 5, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('TOTAL DUE', W-250, y+17);
    doc.text(fmt(o.total), W-m-12, y+17, {align:'right'});

    // payment box
    y += 58;
    doc.setDrawColor(212,175,55); doc.setFillColor(253,248,236); doc.roundedRect(m, y, W-2*m, 70, 6, 6, 'FD');
    doc.setTextColor(wine[0],wine[1],wine[2]); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('PAYMENT — BANK TRANSFER', m+14, y+20);
    doc.setTextColor(ink[0],ink[1],ink[2]); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    doc.text('Bank: '+o.bank.name, m+14, y+38);
    doc.text('Account: '+o.bank.acct+'   ('+o.bank.holder+')', m+14, y+54);
    doc.setFontSize(8); doc.setTextColor(mid[0],mid[1],mid[2]);
    doc.text('Send transfer proof to '+o.tenant.name+' on WhatsApp (+'+o.tenant.whatsapp+') to confirm.', W-m-14, y+54, {align:'right'});

    // footer
    doc.setFontSize(8); doc.setTextColor(mid[0],mid[1],mid[2]);
    doc.text('Thank you for shopping at '+BUILDING.name+'. This invoice was generated by the Bisinka storefront.', W/2, 800, {align:'center'});

    doc.save('Invoice-'+o.ref+'.pdf');
    window.ambToast('Invoice downloaded','suc');
  });
};
function loadJsPDF(cb){
  if(window.jspdf && window.jspdf.jsPDF){ cb(window.jspdf.jsPDF); return; }
  window.ambToast('Preparing invoice…');
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=function(){ cb(window.jspdf.jsPDF); };
  s.onerror=function(){ window.ambToast('Could not load PDF tool — check your connection','err'); };
  document.head.appendChild(s);
}

/* ── CLOSE ALL ── */
window.ambCloseAll = function(){
  $('ambCart').classList.remove('open');
  $('ambProdModal').classList.remove('on');
  $('ambCoModal').classList.remove('on');
  $('ambOverlay').classList.remove('on');
  var fp=$('ambFloorPanel');
  document.body.style.overflow = (fp && fp.classList.contains('open')) ? 'hidden' : '';
  if (location.hash && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
};

/* ── MY ORDERS — local history merged with live server statuses ── */
var STATUS_I18N = {
  placed:           {en:'Placed',            am:'ታዟል'},
  confirmed:        {en:'Payment confirmed', am:'ክፍያ ተረጋግጧል'},
  preparing:        {en:'Preparing',         am:'በመዘጋጀት ላይ'},
  out_for_delivery: {en:'Out for delivery',  am:'በመንገድ ላይ'},
  delivered:        {en:'Delivered',         am:'ደርሷል'},
  cancelled:        {en:'Cancelled',         am:'ተሰርዟል'}
};
function statusLabel(s){ var m=STATUS_I18N[s]; return m ? (state.lang==='am'?m.am:m.en) : (s||'placed'); }
function ordersListHtml(list){
  if(!list.length) return '<div class="amb-orders-empty"><i class="fas fa-receipt"></i><div>'+L('noOrders')+'</div></div>';
  return '<div class="amb-orders-list">'+ list.map(function(o){
    var d=new Date(o.date);
    var items=o.items.map(function(it){return esc(it.name)+(it.variant?' ['+esc(it.variant)+']':'')+' ×'+it.qty;}).join(', ');
    return '<div class="amb-order-card">'+
      '<div class="amb-order-top"><span class="amb-order-ref">'+esc(o.ref)+'</span>'+
        '<span class="amb-order-status '+esc(o.status||'placed')+'">'+esc(statusLabel(o.status))+'</span></div>'+
      '<div class="amb-order-seller"><i class="fas fa-store"></i> '+esc(o.tenant.name)+(o.tenant.floor?' · '+esc(floorUnit(o.tenant)):'')+'</div>'+
      '<div class="amb-order-items">'+items+'</div>'+
      '<div class="amb-order-foot"><span class="amb-order-date">'+L('orderOn')+' '+d.toLocaleDateString()+'</span>'+
        '<span class="amb-order-total">'+fmt(o.total)+'</span></div>'+
      '<div class="amb-order-acts">'+
        '<button class="amb-order-reorder" onclick="ambReorder(\''+esc(o.tenant.id)+'\')"><i class="fas fa-rotate-right"></i> '+L('reorder')+'</button>'+
      '</div>'+
    '</div>';
  }).join('') +'</div>';
}
function renderOrdersModal(list, refreshing){
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-orders-modal">'+
      '<div class="amb-orders-h"><i class="fas fa-receipt"></i> '+L('myOrders')+
        (refreshing?' <span class="amb-orders-sync"><i class="fas fa-rotate fa-spin"></i></span>':'')+'</div>'+
      ordersListHtml(list)+
    '</div>';
}
window.ambOpenOrders = function(){
  renderOrdersModal(state.orders||[], typeof fetch!=='undefined');
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
  if (typeof fetch === 'undefined') return;
  // pull live statuses: by session when signed in, else by the phone used at checkout
  var phone = A.load('amb-phone','');
  var q = state.user ? '/api/my/orders' : (phone ? '/api/my/orders?phone='+encodeURIComponent(phone) : null);
  if(!q){ renderOrdersModal(state.orders||[], false); return; }
  A.api(q).then(function(d){
    var server = d.orders||[];
    var byRef = {};
    server.forEach(function(r){ byRef[r.ref]=r; });
    // update local copies with authoritative status
    (state.orders||[]).forEach(function(o){ if(byRef[o.ref]){ o.status=byRef[o.ref].status; delete byRef[o.ref]; } });
    // append server orders this device hasn't seen (e.g. ordered on another phone with same account)
    Object.keys(byRef).forEach(function(ref){
      var r=byRef[ref]; var tn=tenant(r.tenant_id);
      state.orders.push({ ref:r.ref, date:r.created_at, tenant:{ id:r.tenant_id, name:(tn?nameFor(tn):r.tenant_id), floor:(tn?tn.floor:''), unit:(tn?tn.unit:'') },
        items:r.items||[], total:r.total, status:r.status, buyer:r.buyer||{} });
    });
    save('amb-orders', state.orders);
    // re-render only if the orders modal is still the open view
    if (document.querySelector('#amb-store .amb-orders-h')) renderOrdersModal(state.orders||[], false);
  }).catch(function(){
    if (document.querySelector('#amb-store .amb-orders-h')) renderOrdersModal(state.orders||[], false);
  });
};
window.ambReorder = function(tid){ ambCloseAll(); ambFilterToShop(tid); };
function ambFilterToShop(tid){ if(window.ambFilter){ window.ambFilter(tid); } window.ambScrollTo('ambShop'); }

/* ── ADMIN / MARKETPLACE SUPPORT CONTACT ── */
window.ambOpenAdmin = function(){
  var a=BUILDING.admin; if(!a) return;
  var waMsg = encodeURIComponent('Hello '+a.name+' — I have a question about '+BUILDING.name+' online store.');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-admin-modal">'+
      '<div class="amb-admin-ic"><i class="fas fa-headset"></i></div>'+
      '<div class="amb-admin-name">'+esc(state.lang==='am'&&a.nameAm?a.nameAm:a.name)+'</div>'+
      '<div class="amb-admin-role">'+esc(a.role)+'</div>'+
      '<div class="amb-admin-rows">'+
        '<a class="amb-admin-row" href="tel:'+esc(a.phone)+'"><span><i class="fas fa-phone"></i> '+L('callUs')+'</span><b>'+esc(a.phone)+'</b></a>'+
        '<a class="amb-admin-row" href="https://wa.me/'+esc(a.whatsapp)+'?text='+waMsg+'" target="_blank" rel="noopener"><span><i class="fab fa-whatsapp"></i> WhatsApp</span><b>'+esc(a.phone)+'</b></a>'+
        '<a class="amb-admin-row" href="https://t.me/'+esc(a.telegram)+'" target="_blank" rel="noopener"><span><i class="fab fa-telegram"></i> Telegram</span><b>@'+esc(a.telegram)+'</b></a>'+
        '<a class="amb-admin-row" href="mailto:'+esc(a.email)+'"><span><i class="fas fa-envelope"></i> '+L('emailUs')+'</span><b>'+esc(a.email)+'</b></a>'+
      '</div>'+
      '<div class="amb-admin-note"><i class="fas fa-circle-info"></i> '+(state.lang==='am'
        ? 'ስለ ሻጭ ወይም ምርት ጥያቄ ካለዎት መጀመሪያ በቀጥታ ሻጩን ያግኙ። ቢሲንካ የገበያ ቦታውን ያስተዳድራል።'
        : 'For questions about a specific product, contact the seller directly first. Bisinka operates the marketplace platform.')+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};

/* ── LEGAL: Terms of Service / Privacy Policy ── */
function legalModal(title, items, updated){
  var rows = items.map(function(s,i){ return '<div class="amb-legal-item"><span class="amb-legal-n">'+(i+1)+'</span><span>'+esc(s)+'</span></div>'; }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-legal-modal">'+
      '<div class="amb-legal-h"><i class="fas fa-file-contract"></i> '+esc(title)+'</div>'+
      '<div class="amb-legal-body">'+rows+'</div>'+
      '<div class="amb-legal-foot">'+esc(updated||'')+' · '+esc(BUILDING.admin.name)+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
}
window.ambOpenTos = function(){ var lg=BUILDING.legal; legalModal(lg.tosTitle, lg.tos, lg.updated); };
window.ambOpenPrivacy = function(){ var lg=BUILDING.legal; legalModal(lg.privacyTitle, lg.privacy, lg.updated); };

/* ── ACCOUNT: Google sign-in ──
   REAL when the server has GOOGLE_CLIENT_ID: loads Google Identity Services,
   renders the official button, and the server verifies the ID token + sets a
   session cookie. Without a client ID, a clearly-labeled demo session is used. */
var gsiLoaded = false;
function loadGsi(cb){
  if (window.google && window.google.accounts) { cb(); return; }
  if (gsiLoaded) { setTimeout(function(){ loadGsi(cb); }, 200); return; }
  gsiLoaded = true;
  var s=document.createElement('script');
  s.src='https://accounts.google.com/gsi/client'; s.async=true; s.defer=true;
  s.onload=cb; s.onerror=function(){ gsiLoaded=false; };
  document.head.appendChild(s);
}
window.ambOpenSignIn = function(){
  if(state.user){ return window.ambOpenAccount(); }
  var hasGoogle = !!(A.cfg && A.cfg.googleClientId);
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-auth-modal">'+
      '<div class="amb-auth-logo"><span>A</span></div>'+
      '<div class="amb-auth-t">'+L('signInTitle')+'</div>'+
      '<div class="amb-auth-s">'+L('signInSub')+'</div>'+
      (hasGoogle
        ? '<div id="ambGsiHost" style="display:flex;justify-content:center;min-height:44px"></div>'
        : '<button class="amb-google-btn" onclick="ambDoGoogleSignIn()">'+
          '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'+
          ' '+L('signInGoogle')+' <span style="font-size:.66rem;opacity:.6">(demo)</span></button>')+
      '<button class="amb-auth-guest" onclick="ambCloseAll()">'+L('orContinueGuest')+'</button>'+
      '<div class="amb-auth-legal">'+ (state.lang==='am'?'በመቀጠል የእኛን ':'By continuing you agree to our ')+
        '<a onclick="ambOpenTos()">'+L('tos')+'</a> '+(state.lang==='am'?'እና ':'and ')+'<a onclick="ambOpenPrivacy()">'+L('privacy')+'</a>'+
        (state.lang==='am'?' ይስማማሉ።':'.')+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
  if(hasGoogle){
    loadGsi(function(){
      try{
        google.accounts.id.initialize({
          client_id: A.cfg.googleClientId,
          callback: function(resp){
            A.api('/api/auth/google', { method:'POST', body:{ credential: resp.credential } })
              .then(function(d){ ambSetUser(d.user); })
              .catch(function(){ window.ambToast(state.lang==='am'?'መግባት አልተሳካም':'Sign-in failed','err'); });
          }
        });
        var host=$('ambGsiHost');
        if(host) google.accounts.id.renderButton(host, { theme:'outline', size:'large', shape:'pill', width:280 });
      }catch(e){}
    });
  }
};
function ambSetUser(u){
  state.user = u;
  save('amb-user', u);
  ambCloseAll();
  renderAccountUI();
  window.ambToast((state.lang==='am'?'እንኳን ደህና መጡ፣ ':'Welcome, ')+((u.name||'').split(' ')[0]||''),'suc');
}
window.ambDoGoogleSignIn = function(){
  /* demo session — still a REAL server session cookie, just without Google verification */
  if (typeof fetch === 'undefined') {   // opened as a plain file: local-only session
    ambSetUser({ name:'Guest Shopper', email:'guest@demo.local', picture:'', sub:'offline-demo' });
    return;
  }
  A.api('/api/auth/demo', { method:'POST', body:{ name:'Guest Shopper' } })
    .then(function(d){ ambSetUser(d.user); })
    .catch(function(){
      ambSetUser({ name:'Guest Shopper', email:'guest@demo.local', picture:'', sub:'offline-demo' });
    });
};
window.ambSignOut = function(){
  A.api('/api/auth/logout', { method:'POST', body:{} }).catch(function(){});
  state.user=null; save('amb-user', null);
  ambCloseAll(); renderAccountUI();
  window.ambToast(state.lang==='am'?'ወጥተዋል':'Signed out');
};
window.ambOpenAccount = function(){
  var u=state.user; if(!u) return window.ambOpenSignIn();
  var initials=(u.name||'?').split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-auth-modal">'+
      '<div class="amb-acct-av">'+esc(initials)+'</div>'+
      '<div class="amb-auth-t">'+esc(u.name)+'</div>'+
      '<div class="amb-auth-s">'+esc(u.email)+'</div>'+
      '<button class="amb-acct-row" onclick="ambCloseAll();ambOpenOrders()"><span><i class="fas fa-receipt"></i> '+L('myOrders')+'</span><i class="fas fa-chevron-right"></i></button>'+
      '<button class="amb-acct-row" onclick="ambOpenTos()"><span><i class="fas fa-file-contract"></i> '+L('tos')+'</span><i class="fas fa-chevron-right"></i></button>'+
      '<button class="amb-acct-row" onclick="ambOpenPrivacy()"><span><i class="fas fa-user-shield"></i> '+L('privacy')+'</span><i class="fas fa-chevron-right"></i></button>'+
      '<button class="amb-auth-guest" onclick="ambSignOut()"><i class="fas fa-right-from-bracket"></i> '+L('signOut')+'</button>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};
/* reflect sign-in state into the nav button + prefill checkout */
function renderAccountUI(){
  var btn=$('ambAccountBtn'); if(btn){
    if(state.user){
      var ini=(state.user.name||'?').split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join('');
      btn.innerHTML='<span class="amb-acct-pill">'+esc(ini)+'</span>';
      btn.title=L('myAccount');
    } else {
      btn.innerHTML='<i class="fas fa-user"></i>';
      btn.title=L('signIn');
    }
  }
  // prefill checkout name/phone if empty
  if(state.user){
    if(!state.coData.name && state.user.name) state.coData.name=state.user.name;
  }
}
A.renderAccountUI = renderAccountUI;

/* ── ABANDONED CART RECOVERY ──
   On load, if the cart has items and was last touched over the threshold ago,
   show a gentle, dismissible banner (non-nagging: once per session). */
function maybeShowCartRecovery(){
  try{
    if(!state.cart || !state.cart.length) return;
    if(sessionStorage.getItem('amb-cart-nudged')) return;
  }catch(e){}
  var THRESH = 30*60*1000; // 30 min
  var age = state.cartTs ? (Date.now()-state.cartTs) : 0;
  if(!state.cartTs || age < THRESH) return;
  var n=cartQty();
  var bar=document.createElement('div');
  bar.className='amb-cart-recover';
  bar.innerHTML=
    '<div class="amb-cr-inner">'+
      '<i class="fas fa-cart-shopping"></i>'+
      '<span class="amb-cr-txt">'+L('resumeCart')+' <b>('+n+')</b></span>'+
      '<button class="amb-cr-resume" id="ambCrResume"><i class="fas fa-arrow-right"></i> '+L('resumeCartBtn')+'</button>'+
      '<button class="amb-cr-x" id="ambCrX" aria-label="dismiss"><i class="fas fa-times"></i></button>'+
    '</div>';
  document.getElementById('amb-store').appendChild(bar);
  requestAnimationFrame(function(){ bar.classList.add('on'); });
  function done(){ try{sessionStorage.setItem('amb-cart-nudged','1');}catch(e){} bar.classList.remove('on'); setTimeout(function(){bar.remove();},300); }
  bar.querySelector('#ambCrResume').addEventListener('click', function(){ done(); window.ambOpenCart(); });
  bar.querySelector('#ambCrX').addEventListener('click', done);
  setTimeout(function(){ if(document.body.contains(bar)) done(); }, 12000); // auto-hide
}
A.maybeShowCartRecovery = maybeShowCartRecovery;

A.renderCart = renderCart;
A.updateBadges = updateBadges;

})();

/* ════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
var A = window.__AMB;
function boot(){
  A.render.ribbon();
  A.render.chrome();
  A.render.tenants();
  A.render.services();
  A.render.onSale();
  A.render.filterChips();
  A.render.filterBar();
  A.render.products();
  A.render.heroVisual();
  A.render.directory();
  A.render.wishBadge();
  A.renderCart();
  A.updateBadges();
  A.render.i18n();
  if(A.renderAccountUI) A.renderAccountUI();
  if(A.maybeShowCartRecovery) setTimeout(A.maybeShowCartRecovery, 1200);
  if (location.hash && window.ambOpenFromHash) window.ambOpenFromHash();

  /* ── hydrate from the backend (config → catalog → session) ──
     Each call fails silently when offline; embedded data stays in charge. */
  A.api('/api/config').then(function(cfg){
    A.cfg.googleClientId = cfg.googleClientId || null;
    A.cfg.demoAuth = !!cfg.demoAuth;
    A.cfg.online = true;
  }).catch(function(){});
  A.api('/api/catalog').then(function(cat){
    A.applyCatalog(cat);
    // re-render everything that shows catalog data
    A.render.ribbon(); A.render.chrome(); A.render.tenants(); A.render.services();
    A.render.onSale(); A.render.filterChips(); A.render.filterBar(); A.render.products(); A.render.heroVisual(); A.render.directory(); A.render.i18n();
    if (window.ambOpenFromHash) window.ambOpenFromHash();
  }).catch(function(){});
  A.api('/api/auth/me').then(function(d){
    if(d.user){ A.state.user = d.user; A.save('amb-user', d.user); }
    else { A.state.user = null; A.save('amb-user', null); }   // server is source of truth for sessions
    if(A.renderAccountUI) A.renderAccountUI();
  }).catch(function(){});

  // set language button label to current
  var lb=A.$('ambLangBtn'); if(lb) lb.innerHTML = A.state.lang==='en' ? '<i class="fas fa-language"></i> አማ' : '<i class="fas fa-language"></i> EN';
  // nav scroll shadow + scroll-top
  var nav=A.$('ambNav');
  var top=A.$('ambScrollTop');
  window.addEventListener('scroll', function(){
    if(nav) nav.classList.toggle('scrolled', window.scrollY>40);
    if(top) top.classList.toggle('on', window.scrollY>600);
  }, {passive:true});
  // close search dropdown on outside click
  document.addEventListener('click', function(e){
    var wrap=A.$('ambSearchWrap');
    if(wrap && !wrap.contains(e.target)) window.ambCloseSearch();
  });
  // Escape closes floor panel / mobile search / search dropdown; Enter picks first result
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){
      var ms=A.$('ambMSearch');
      if(ms && ms.classList.contains('on')){ window.ambCloseMSearch(); return; }
      var fp=A.$('ambFloorPanel');
      if(fp && fp.classList.contains('open')){ window.ambCloseFloorPanel(); return; }
      window.ambCloseSearch();
    }
    if(e.key==='Enter'){
      var tgt=e.target||{};
      if(tgt.id==='ambSearch'){
        var d=A.$('ambSearchDrop');
        var first = d && d.classList.contains('on') && d.querySelector('.amb-sd-item');
        if(first){ e.preventDefault(); first.click(); }
      } else if(tgt.id==='ambMSearchIn'){
        var mb=A.$('ambMSearchBody');
        var mf = mb && mb.querySelector('.amb-sd-item');
        if(mf){ e.preventDefault(); mf.click(); }
      }
    }
  });
  // carousel arrow controls
  window.ambSlide = function(id, dir){
    var el=A.$(id); if(!el) return;
    var card = el.querySelector('.amb-tcard, .amb-pcard');
    var step = card ? card.getBoundingClientRect().width + 18 : Math.min(el.clientWidth*0.85, 600);
    var maxL = el.scrollWidth - el.clientWidth - 4;
    // loop the seller strip
    if(id==='ambTenantStrip'){
      if(dir>0 && el.scrollLeft >= maxL){ el.scrollTo({left:0, behavior:'smooth'}); return; }
      if(dir<0 && el.scrollLeft <= 2){ el.scrollTo({left:maxL, behavior:'smooth'}); return; }
    }
    el.scrollBy({left: dir*step, behavior:'smooth'});
  };
  // auto-slide the hero seller showcase
  var sellerTimer=null;
  function startSellers(){
    stopSellers();
    if(!A.$('ambTenantStrip')) return;   // hero showcase removed — nothing to auto-slide
    sellerTimer=setInterval(function(){
      var el=A.$('ambTenantStrip'); if(!el || el.offsetParent===null) return;
      window.ambSlide('ambTenantStrip',1);
    }, 3200);
  }
  function stopSellers(){ if(sellerTimer){ clearInterval(sellerTimer); sellerTimer=null; } }
  window.ambPauseSellers=stopSellers;
  window.ambResumeSellers=startSellers;
  startSellers();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
