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
  name: 'Ambassador Shopping Mall',
  nameAm: 'አምባሳደር ሾፒንግ ሞል',
  tagline: "Addis Ababa's Trust-First Marketplace",
  logo:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSc2FRwDvY4BaccDBwAi9TKDXTgmw7cffqkPbLfjC5xVDG-IomQSM0KDfi3&s=10',
  phone: '+251926785987',
  copyright: '© 2026 Ambassador Shopping Mall. All rights reserved.',
  /* building identity / about */
  about: '5 floors and 130+ shops in the heart of Arat Kilo — one of Addis Ababa\'s largest jewelry and gold markets, alongside fashion, beauty, food, and everyday services.',
  aboutAm: 'በአራት ኪሎ ልብ የሚገኝ 5 ፎቅ እና ከ130 በላይ ሱቆች — ከአዲስ አበባ ትልቁ የወርቅና ጌጣጌጥ ገበያዎች አንዱ፣ ከፋሽን፣ ውበት፣ ምግብና የዕለት ተዕለት አገልግሎቶች ጋር።',
  location: 'Arat Kilo, Addis Ababa, Ethiopia',
  hours: 'Mon \u2013 Sun: 9:00 AM \u2013 9:00 PM',
  /* headline building stats (shown on hero + about) — only what's verified true of the real dataset */
  stats: { tenants:'130+', online:'0', floors:'5', daily:'\u2014' },
  /* mall coordinates — approximate (Arat Kilo area); verify/adjust on Google Maps */
  geo: { lat:9.0348, lng:38.7631 },
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
      'Ambassador Shopping Mall online store is operated by Bisinka Marketplace as a directory and ordering platform. Each product is sold by an independent, verified tenant — not by Bisinka.',
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

  /* ── REAL TENANT DIRECTORY — 130 shops across 5 floors, Arat Kilo ──
     Sourced directly from Ambassador's own floor listings. Product
     catalogs are intentionally empty until each tenant (or admin)
     adds their own real items via the seller portal / admin panel —
     nothing here is a stand-in for actual products or pricing. */
  tenants: [
    { id:'gf-soshca-cafe-and-restaurant', unit:'GF1', floor:'Ground Floor', name:'Soshca Cafe and restaurant', nameAm:'Soshca Cafe and restaurant', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#B5651D', rating:0, reviews:0, whatsapp:'251988201395', mobile:'+251988201395', photo:'', socials:{}, responseTime:'', blurb:'Soshca Cafe and restaurant — Food & Beverage at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF1.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-lalibela-jewelry', unit:'GF2', floor:'Ground Floor', name:'Lalibela Jewelry', nameAm:'Lalibela Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911201616', mobile:'+251911201616', photo:'', socials:{}, responseTime:'', blurb:'Lalibela Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF2.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-dagim-jewelry', unit:'GF3', floor:'Ground Floor', name:'Dagim Jewelry', nameAm:'Dagim Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'2519112016163', mobile:'+2519112016163', photo:'', socials:{}, responseTime:'', blurb:'Dagim Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF3.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-eyersusalem-jewelry', unit:'GF4', floor:'Ground Floor', name:'Eyersusalem Jewelry', nameAm:'Eyersusalem Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'2519112014453', mobile:'+2519112014453', photo:'', socials:{}, responseTime:'', blurb:'Eyersusalem Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF4.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-ambassador-garment', unit:'GF5', floor:'Ground Floor', name:'Ambassador Garment', nameAm:'Ambassador Garment', cat:'Fashion & Apparel', catKey:'fashion', icon:'fa-shirt', color:'#8A1450', rating:0, reviews:0, whatsapp:'', mobile:'', photo:'', socials:{}, responseTime:'', blurb:'Ambassador Garment — Fashion & Apparel at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF5.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-stare-jewelry', unit:'GF6', floor:'Ground Floor', name:'Stare Jewelry', nameAm:'Stare Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251935244444', mobile:'+251935244444', photo:'', socials:{}, responseTime:'', blurb:'Stare Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF6.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-lion-jewelry', unit:'GF7', floor:'Ground Floor', name:'Lion Jewelry', nameAm:'Lion Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'2519112014273', mobile:'+2519112014273', photo:'', socials:{}, responseTime:'', blurb:'Lion Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF7.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-nigat-jewelry', unit:'GF8', floor:'Ground Floor', name:'Nigat Jewelry', nameAm:'Nigat Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'2519112011691', mobile:'+2519112011691', photo:'', socials:{}, responseTime:'', blurb:'Nigat Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF8.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-dashn-jewelry', unit:'GF9', floor:'Ground Floor', name:'Dashn Jewelry', nameAm:'Dashn Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'2519111738140', mobile:'+2519111738140', photo:'', socials:{}, responseTime:'', blurb:'Dashn Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF9.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-sara-jewelry', unit:'GF10', floor:'Ground Floor', name:'Sara Jewelry', nameAm:'Sara Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'2519112013219', mobile:'+2519112013219', photo:'', socials:{}, responseTime:'', blurb:'Sara Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF10.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-raki-jewelry', unit:'GF11', floor:'Ground Floor', name:'Raki Jewelry', nameAm:'Raki Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'2519112014576', mobile:'+2519112014576', photo:'', socials:{}, responseTime:'', blurb:'Raki Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF11.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-getahune-jewelry', unit:'GF12', floor:'Ground Floor', name:'Getahune Jewelry', nameAm:'Getahune Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'2519112014453', mobile:'+2519112014453', photo:'', socials:{}, responseTime:'', blurb:'Getahune Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF12.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-arsema-jewelry', unit:'GF13', floor:'Ground Floor', name:'Arsema Jewelry', nameAm:'Arsema Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'', mobile:'', photo:'', socials:{}, responseTime:'', blurb:'Arsema Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF13.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-tsige-jewelry', unit:'GF14', floor:'Ground Floor', name:'Tsige Jewelry', nameAm:'Tsige Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'', mobile:'', photo:'', socials:{}, responseTime:'', blurb:'Tsige Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF14.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-mulu-jewelry', unit:'GF15', floor:'Ground Floor', name:'Mulu Jewelry', nameAm:'Mulu Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911026444', mobile:'+251911026444', photo:'', socials:{}, responseTime:'', blurb:'Mulu Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF15.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-tana-jewelry', unit:'GF16', floor:'Ground Floor', name:'Tana Jewelry', nameAm:'Tana Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251930078183', mobile:'+251930078183', photo:'', socials:{}, responseTime:'', blurb:'Tana Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF16.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-rahmete-jewelry', unit:'GF17', floor:'Ground Floor', name:'Rahmete Jewelry', nameAm:'Rahmete Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251921220033', mobile:'+251921220033', photo:'', socials:{}, responseTime:'', blurb:'Rahmete Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF17.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-promise-jewelry', unit:'GF18', floor:'Ground Floor', name:'promise Jewelry', nameAm:'promise Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251923636363', mobile:'+251923636363', photo:'', socials:{}, responseTime:'', blurb:'promise Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF18.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-beta-meresa', unit:'GF19', floor:'Ground Floor', name:'Beta meresa', nameAm:'Beta meresa', cat:'General Retail & Apparel', catKey:'general-retail', icon:'fa-store', color:'#3D5A80', rating:0, reviews:0, whatsapp:'251911223312', mobile:'+251911223312', photo:'', socials:{}, responseTime:'', blurb:'Beta meresa — General Retail & Apparel at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF19.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-christal-jewelry', unit:'GF20', floor:'Ground Floor', name:'Christal Jewelry', nameAm:'Christal Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251921332222', mobile:'+251921332222', photo:'', socials:{}, responseTime:'', blurb:'Christal Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF20.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-zemzem-bank', unit:'GF21', floor:'Ground Floor', name:'Zemzem Bank', nameAm:'Zemzem Bank', cat:'Banking & Finance', catKey:'banking', icon:'fa-building-columns', color:'#1E3A8A', rating:0, reviews:0, whatsapp:'', mobile:'', photo:'', socials:{}, responseTime:'', blurb:'Zemzem Bank — Banking & Finance at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF21.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-hosahena-jewelry', unit:'GF22', floor:'Ground Floor', name:'Hosahena Jewelry', nameAm:'Hosahena Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911660045', mobile:'+251911660045', photo:'', socials:{}, responseTime:'', blurb:'Hosahena Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF22.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-wow-jewelry', unit:'GF23', floor:'Ground Floor', name:'Wow Jewelry', nameAm:'Wow Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911259528', mobile:'+251911259528', photo:'', socials:{}, responseTime:'', blurb:'Wow Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF23.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-ezana-jewelry', unit:'GF24', floor:'Ground Floor', name:'Ezana Jewelry', nameAm:'Ezana Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911670079', mobile:'+251911670079', photo:'', socials:{}, responseTime:'', blurb:'Ezana Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF24.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-zenju-jewelry', unit:'GF25', floor:'Ground Floor', name:'Zenju Jewelry', nameAm:'Zenju Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251911313528', mobile:'+251911313528', photo:'', socials:{}, responseTime:'', blurb:'Zenju Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF25.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-wisdom-flower', unit:'GF26', floor:'Ground Floor', name:'Wisdom Flower', nameAm:'Wisdom Flower', cat:'Home & Living', catKey:'home-living', icon:'fa-couch', color:'#5B4636', rating:0, reviews:0, whatsapp:'251915590357', mobile:'+251915590357', photo:'', socials:{}, responseTime:'', blurb:'Wisdom Flower — Home & Living at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF26.', active:true, hidden:false, banks:[], products:[] },
    { id:'gf-grand-jewelry', unit:'GF27', floor:'Ground Floor', name:'Grand Jewelry', nameAm:'Grand Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251912612790', mobile:'+251912612790', photo:'', socials:{}, responseTime:'', blurb:'Grand Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the Ground Floor, unit GF27.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-t-sige-jewelry', unit:'101', floor:'1st Floor', name:'T\'sige Jewelry', nameAm:'T\'sige Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251910669977', mobile:'+251910669977', photo:'', socials:{}, responseTime:'', blurb:'T\'sige Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 101.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-getahune-jewelry', unit:'102', floor:'1st Floor', name:'Getahune Jewelry', nameAm:'Getahune Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911204453', mobile:'+251911204453', photo:'', socials:{}, responseTime:'', blurb:'Getahune Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 102.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-bazen-jewelry', unit:'103', floor:'1st Floor', name:'Bazen Jewelry', nameAm:'Bazen Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911595253', mobile:'+251911595253', photo:'', socials:{}, responseTime:'', blurb:'Bazen Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 103.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-gift-jewelry', unit:'104', floor:'1st Floor', name:'Gift Jewelry', nameAm:'Gift Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251923083491', mobile:'+251923083491', photo:'', socials:{}, responseTime:'', blurb:'Gift Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 104.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-bethelhem-jewelry', unit:'105', floor:'1st Floor', name:'Bethelhem Jewelry', nameAm:'Bethelhem Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251939509853', mobile:'+251939509853', photo:'', socials:{}, responseTime:'', blurb:'Bethelhem Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 105.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-habesha-jewelry', unit:'106', floor:'1st Floor', name:'Habesha Jewelry', nameAm:'Habesha Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911208567', mobile:'+251911208567', photo:'', socials:{}, responseTime:'', blurb:'Habesha Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 106.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-homefer-furniture', unit:'107', floor:'1st Floor', name:'Homefer Furniture', nameAm:'Homefer Furniture', cat:'Home & Living', catKey:'home-living', icon:'fa-couch', color:'#6B5642', rating:0, reviews:0, whatsapp:'251911251520', mobile:'+251911251520', photo:'', socials:{}, responseTime:'', blurb:'Homefer Furniture — Home & Living at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 107.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-sara-jewelry', unit:'108', floor:'1st Floor', name:'Sara Jewelry', nameAm:'Sara Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251911213219', mobile:'+251911213219', photo:'', socials:{}, responseTime:'', blurb:'Sara Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 108.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-banchi-jewelry', unit:'109', floor:'1st Floor', name:'Banchi Jewelry', nameAm:'Banchi Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911220835', mobile:'+251911220835', photo:'', socials:{}, responseTime:'', blurb:'Banchi Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 109.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-fasika-jewelry', unit:'110', floor:'1st Floor', name:'Fasika Jewelry', nameAm:'Fasika Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911235838', mobile:'+251911235838', photo:'', socials:{}, responseTime:'', blurb:'Fasika Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 110.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-debol-jewelry', unit:'111', floor:'1st Floor', name:'Debol Jewelry', nameAm:'Debol Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251910541976', mobile:'+251910541976', photo:'', socials:{}, responseTime:'', blurb:'Debol Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 111.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-abreham-jewelry', unit:'112', floor:'1st Floor', name:'Abreham Jewelry', nameAm:'Abreham Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251911205207', mobile:'+251911205207', photo:'', socials:{}, responseTime:'', blurb:'Abreham Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 112.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-dashen-bank', unit:'113', floor:'1st Floor', name:'Dashen Bank', nameAm:'Dashen Bank', cat:'Banking & Finance', catKey:'banking', icon:'fa-building-columns', color:'#1E56C0', rating:0, reviews:0, whatsapp:'251911704469', mobile:'+251911704469', photo:'', socials:{}, responseTime:'', blurb:'Dashen Bank — Banking & Finance at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 113.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-tsegaye-jewelry', unit:'114', floor:'1st Floor', name:'Tsegaye Jewelry', nameAm:'Tsegaye Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911244534', mobile:'+251911244534', photo:'', socials:{}, responseTime:'', blurb:'Tsegaye Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 114.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-ethio-jewelry', unit:'115', floor:'1st Floor', name:'Ethio Jewelry', nameAm:'Ethio Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251911357458', mobile:'+251911357458', photo:'', socials:{}, responseTime:'', blurb:'Ethio Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 115.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-shukri-jewelry', unit:'116', floor:'1st Floor', name:'shukri Jewelry', nameAm:'shukri Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251916820093', mobile:'+251916820093', photo:'', socials:{}, responseTime:'', blurb:'shukri Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 116.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-fasil-fasi-jewelry', unit:'117', floor:'1st Floor', name:'Fasil / Fasi Jewelry', nameAm:'Fasil / Fasi Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911209453', mobile:'+251911209453', photo:'', socials:{}, responseTime:'', blurb:'Fasil / Fasi Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 117.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-kaleb-jewelry', unit:'118', floor:'1st Floor', name:'Kaleb Jewelry', nameAm:'Kaleb Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911402225', mobile:'+251911402225', photo:'', socials:{}, responseTime:'', blurb:'Kaleb Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 118.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-sabian-jewelry', unit:'119', floor:'1st Floor', name:'Sabian Jewelry', nameAm:'Sabian Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251928434080', mobile:'+251928434080', photo:'', socials:{}, responseTime:'', blurb:'Sabian Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 119.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-zemen-bank', unit:'120', floor:'1st Floor', name:'Zemen Bank', nameAm:'Zemen Bank', cat:'Banking & Finance', catKey:'banking', icon:'fa-building-columns', color:'#16307A', rating:0, reviews:0, whatsapp:'251911660045', mobile:'+251911660045', photo:'', socials:{}, responseTime:'', blurb:'Zemen Bank — Banking & Finance at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 120.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-galaxy-jewelry', unit:'121', floor:'1st Floor', name:'Galaxy Jewelry', nameAm:'Galaxy Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911232149', mobile:'+251911232149', photo:'', socials:{}, responseTime:'', blurb:'Galaxy Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 121.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-sheger-jewelry', unit:'122', floor:'1st Floor', name:'Sheger Jewelry', nameAm:'Sheger Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251911660045', mobile:'+251911660045', photo:'', socials:{}, responseTime:'', blurb:'Sheger Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 122.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-sammer-jewelry', unit:'123', floor:'1st Floor', name:'Sammer Jewelry', nameAm:'Sammer Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911236853', mobile:'+251911236853', photo:'', socials:{}, responseTime:'', blurb:'Sammer Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 123.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-bela-jewelry', unit:'124', floor:'1st Floor', name:'Bela jewelry', nameAm:'Bela jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'2519916933114', mobile:'+2519916933114', photo:'', socials:{}, responseTime:'', blurb:'Bela jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 124.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-yordanos-jewelry', unit:'125', floor:'1st Floor', name:'Yordanos Jewelry', nameAm:'Yordanos Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911600903', mobile:'+251911600903', photo:'', socials:{}, responseTime:'', blurb:'Yordanos Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 125.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-mikael-jewelry', unit:'126', floor:'1st Floor', name:'Mikael Jewelry', nameAm:'Mikael Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251915322164', mobile:'+251915322164', photo:'', socials:{}, responseTime:'', blurb:'Mikael Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 126.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-jolly-jewelry', unit:'127', floor:'1st Floor', name:'Jolly Jewelry', nameAm:'Jolly Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911738140', mobile:'+251911738140', photo:'', socials:{}, responseTime:'', blurb:'Jolly Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 127.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-joni-jewelry', unit:'128', floor:'1st Floor', name:'Joni Jewelry', nameAm:'Joni Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'2519168872955', mobile:'+2519168872955', photo:'', socials:{}, responseTime:'', blurb:'Joni Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 128.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-arsema-jewelry', unit:'129', floor:'1st Floor', name:'Arsema jewelry', nameAm:'Arsema jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911218503', mobile:'+251911218503', photo:'', socials:{}, responseTime:'', blurb:'Arsema jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 129.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-sunpher-jewelry', unit:'130', floor:'1st Floor', name:'Sunpher jewelry', nameAm:'Sunpher jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911464791', mobile:'+251911464791', photo:'', socials:{}, responseTime:'', blurb:'Sunpher jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 130.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-crowen-jewelry', unit:'131', floor:'1st Floor', name:'Crowen jewelry', nameAm:'Crowen jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911219368', mobile:'+251911219368', photo:'', socials:{}, responseTime:'', blurb:'Crowen jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 131.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-kalit-wach', unit:'132', floor:'1st Floor', name:'Kalit Wach', nameAm:'Kalit Wach', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251911457147', mobile:'+251911457147', photo:'', socials:{}, responseTime:'', blurb:'Kalit Wach — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 132.', active:true, hidden:false, banks:[], products:[] },
    { id:'f1-alex-wach', unit:'133', floor:'1st Floor', name:'Alex Wach', nameAm:'Alex Wach', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911453988', mobile:'+251911453988', photo:'', socials:{}, responseTime:'', blurb:'Alex Wach — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 1st Floor, unit 133.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-hagos-jewelery', unit:'201', floor:'2nd Floor', name:'Hagos Jewelery', nameAm:'Hagos Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251930033353', mobile:'+251930033353', photo:'', socials:{}, responseTime:'', blurb:'Hagos Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 201.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-ask-jewelery', unit:'202', floor:'2nd Floor', name:'Ask Jewelery', nameAm:'Ask Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911259528', mobile:'+251911259528', photo:'', socials:{}, responseTime:'', blurb:'Ask Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 202.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-root-jewelery', unit:'203', floor:'2nd Floor', name:'Root Jewelery', nameAm:'Root Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'25191108616', mobile:'+25191108616', photo:'', socials:{}, responseTime:'', blurb:'Root Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 203.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-homefer-furniture', unit:'204', floor:'2nd Floor', name:'Homefer Furniture', nameAm:'Homefer Furniture', cat:'Home & Living', catKey:'home-living', icon:'fa-couch', color:'#4A3A2C', rating:0, reviews:0, whatsapp:'251911236148', mobile:'+251911236148', photo:'', socials:{}, responseTime:'', blurb:'Homefer Furniture — Home & Living at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 204.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-loti-jewelery', unit:'205', floor:'2nd Floor', name:'Loti Jewelery', nameAm:'Loti Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911236148', mobile:'+251911236148', photo:'', socials:{}, responseTime:'', blurb:'Loti Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 205.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-helen-jewelery', unit:'206', floor:'2nd Floor', name:'Helen Jewelery', nameAm:'Helen Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251912899529', mobile:'+251912899529', photo:'', socials:{}, responseTime:'', blurb:'Helen Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 206.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-zemenawi-jewelery', unit:'207', floor:'2nd Floor', name:'Zemenawi Jewelery', nameAm:'Zemenawi Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'2519129458727', mobile:'+2519129458727', photo:'', socials:{}, responseTime:'', blurb:'Zemenawi Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 207.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-parsegian-jewelery', unit:'208', floor:'2nd Floor', name:'Parsegian Jewelery', nameAm:'Parsegian Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251911210610', mobile:'+251911210610', photo:'', socials:{}, responseTime:'', blurb:'Parsegian Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 208.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-new-jewelery', unit:'209', floor:'2nd Floor', name:'New Jewelery', nameAm:'New Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251913253221', mobile:'+251913253221', photo:'', socials:{}, responseTime:'', blurb:'New Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 209.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-lion-bank', unit:'210', floor:'2nd Floor', name:'Lion bank', nameAm:'Lion bank', cat:'Banking & Finance', catKey:'banking', icon:'fa-building-columns', color:'#2451A8', rating:0, reviews:0, whatsapp:'251911210610', mobile:'+251911210610', photo:'', socials:{}, responseTime:'', blurb:'Lion bank — Banking & Finance at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 210.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-enku-jewelery', unit:'211', floor:'2nd Floor', name:'Enku Jewelery', nameAm:'Enku Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911600701', mobile:'+251911600701', photo:'', socials:{}, responseTime:'', blurb:'Enku Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 211.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-shewa-jewelery', unit:'212', floor:'2nd Floor', name:'Shewa Jewelery', nameAm:'Shewa Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251911509197', mobile:'+251911509197', photo:'', socials:{}, responseTime:'', blurb:'Shewa Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 212.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-mulu-jewelery', unit:'213', floor:'2nd Floor', name:'Mulu Jewelery', nameAm:'Mulu Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251911026444', mobile:'+251911026444', photo:'', socials:{}, responseTime:'', blurb:'Mulu Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 213.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-valentino-jewelery', unit:'214', floor:'2nd Floor', name:'Valentino Jewelery', nameAm:'Valentino Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251911520033', mobile:'+251911520033', photo:'', socials:{}, responseTime:'', blurb:'Valentino Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 214.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-geez-jewelery', unit:'215', floor:'2nd Floor', name:'Geez Jewelery', nameAm:'Geez Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251915322164', mobile:'+251915322164', photo:'', socials:{}, responseTime:'', blurb:'Geez Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 215.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-tesfaye-jewelery', unit:'216', floor:'2nd Floor', name:'Tesfaye Jewelery', nameAm:'Tesfaye Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911207805', mobile:'+251911207805', photo:'', socials:{}, responseTime:'', blurb:'Tesfaye Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 216.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-alem-jewelery', unit:'217', floor:'2nd Floor', name:'Alem Jewelery', nameAm:'Alem Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251911026444', mobile:'+251911026444', photo:'', socials:{}, responseTime:'', blurb:'Alem Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 217.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-yosan-jewelery', unit:'218', floor:'2nd Floor', name:'Yosan Jewelery', nameAm:'Yosan Jewelery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251912200033', mobile:'+251912200033', photo:'', socials:{}, responseTime:'', blurb:'Yosan Jewelery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 218.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-melat-jewelry', unit:'219', floor:'2nd Floor', name:'Melat Jewelry', nameAm:'Melat Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'25191136811', mobile:'+25191136811', photo:'', socials:{}, responseTime:'', blurb:'Melat Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 219.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-selamawit-jewelry', unit:'220', floor:'2nd Floor', name:'Selamawit Jewelry', nameAm:'Selamawit Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'251908212048', mobile:'+251908212048', photo:'', socials:{}, responseTime:'', blurb:'Selamawit Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 220.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-teklu-desta-jewelry', unit:'221', floor:'2nd Floor', name:'Teklu Desta Jewelry', nameAm:'Teklu Desta Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'251929900092', mobile:'+251929900092', photo:'', socials:{}, responseTime:'', blurb:'Teklu Desta Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 221.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-perfect-book', unit:'222', floor:'2nd Floor', name:'Perfect Book', nameAm:'Perfect Book', cat:'Books & Stationery', catKey:'books', icon:'fa-book-open', color:'#96601F', rating:0, reviews:0, whatsapp:'251911927558', mobile:'+251911927558', photo:'', socials:{}, responseTime:'', blurb:'Perfect Book — Books & Stationery at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 222.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-naile-jewelry', unit:'223', floor:'2nd Floor', name:'Naile Jewelry', nameAm:'Naile Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251911243444', mobile:'+251911243444', photo:'', socials:{}, responseTime:'', blurb:'Naile Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 223.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-ramada-jewelry', unit:'224', floor:'2nd Floor', name:'RAMADA Jewelry', nameAm:'RAMADA Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'251920477514', mobile:'+251920477514', photo:'', socials:{}, responseTime:'', blurb:'RAMADA Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 224.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-semaldon-jewelry', unit:'225', floor:'2nd Floor', name:'Semaldon Jewelry', nameAm:'Semaldon Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251929907573', mobile:'+251929907573', photo:'', socials:{}, responseTime:'', blurb:'Semaldon Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 225.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-dubai-jewelry', unit:'226', floor:'2nd Floor', name:'Dubai Jewelry', nameAm:'Dubai Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'251920891627', mobile:'+251920891627', photo:'', socials:{}, responseTime:'', blurb:'Dubai Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 226.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-bego-jewelry', unit:'227', floor:'2nd Floor', name:'Bego Jewelry', nameAm:'Bego Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#9C7209', rating:0, reviews:0, whatsapp:'25191135021', mobile:'+25191135021', photo:'', socials:{}, responseTime:'', blurb:'Bego Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 227.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-essential-oil', unit:'228', floor:'2nd Floor', name:'Essential oil', nameAm:'Essential oil', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#C13584', rating:0, reviews:0, whatsapp:'251937459252', mobile:'+251937459252', photo:'', socials:{}, responseTime:'', blurb:'Essential oil — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 228.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-noli-speciality-dental-clinic', unit:'229', floor:'2nd Floor', name:'Noli Speciality Dental clinic', nameAm:'Noli Speciality Dental clinic', cat:'Healthcare & Wellness', catKey:'healthcare', icon:'fa-briefcase-medical', color:'#8C2F5A', rating:0, reviews:0, whatsapp:'251918376345', mobile:'+251918376345', photo:'', socials:{}, responseTime:'', blurb:'Noli Speciality Dental clinic — Healthcare & Wellness at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 229.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-awash-bank', unit:'230', floor:'2nd Floor', name:'Awash Bank', nameAm:'Awash Bank', cat:'Banking & Finance', catKey:'banking', icon:'fa-building-columns', color:'#1E3A8A', rating:0, reviews:0, whatsapp:'251937459252', mobile:'+251937459252', photo:'', socials:{}, responseTime:'', blurb:'Awash Bank — Banking & Finance at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 230.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-melos-jewelry', unit:'231', floor:'2nd Floor', name:'Melos Jewelry', nameAm:'Melos Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#D4A017', rating:0, reviews:0, whatsapp:'2519175871976', mobile:'+2519175871976', photo:'', socials:{}, responseTime:'', blurb:'Melos Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 231.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-geez-jewellery', unit:'232', floor:'2nd Floor', name:'Geez jewellery', nameAm:'Geez jewellery', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B08D57', rating:0, reviews:0, whatsapp:'251906646091', mobile:'+251906646091', photo:'', socials:{}, responseTime:'', blurb:'Geez jewellery — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 232.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-mohammed', unit:'233', floor:'2nd Floor', name:'Mohammed', nameAm:'Mohammed', cat:'General Retail & Apparel', catKey:'general-retail', icon:'fa-store', color:'#4C6B94', rating:0, reviews:0, whatsapp:'2519175802512', mobile:'+2519175802512', photo:'', socials:{}, responseTime:'', blurb:'Mohammed — General Retail & Apparel at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 233.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-mahir', unit:'234', floor:'2nd Floor', name:'Mahir', nameAm:'Mahir', cat:'General Retail & Apparel', catKey:'general-retail', icon:'fa-store', color:'#2E4560', rating:0, reviews:0, whatsapp:'2519142377286', mobile:'+2519142377286', photo:'', socials:{}, responseTime:'', blurb:'Mahir — General Retail & Apparel at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 234.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-werku-afework-jewelry', unit:'235', floor:'2nd Floor', name:'Werku Afework Jewelry', nameAm:'Werku Afework Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#B8860B', rating:0, reviews:0, whatsapp:'2519165025512', mobile:'+2519165025512', photo:'', socials:{}, responseTime:'', blurb:'Werku Afework Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 235.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-kalebyans-jewelry', unit:'236', floor:'2nd Floor', name:'Kalebyans Jewelry', nameAm:'Kalebyans Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#A67C0A', rating:0, reviews:0, whatsapp:'251919917520', mobile:'+251919917520', photo:'', socials:{}, responseTime:'', blurb:'Kalebyans Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 236.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-rimna-jewelry', unit:'237', floor:'2nd Floor', name:'Rimna Jewelry', nameAm:'Rimna Jewelry', cat:'Jewelry & Accessories', catKey:'jewelry', icon:'fa-gem', color:'#C6941B', rating:0, reviews:0, whatsapp:'2519130033230', mobile:'+2519130033230', photo:'', socials:{}, responseTime:'', blurb:'Rimna Jewelry — Jewelry & Accessories at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 237.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-phone-drip', unit:'238', floor:'2nd Floor', name:'phone drip', nameAm:'phone drip', cat:'Electronics & Technology', catKey:'electronics', icon:'fa-mobile-screen', color:'#1F2937', rating:0, reviews:0, whatsapp:'251919862666', mobile:'+251919862666', photo:'', socials:{}, responseTime:'', blurb:'phone drip — Electronics & Technology at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 238.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-eyosiyas-cosmetics', unit:'239', floor:'2nd Floor', name:'Eyosiyas Cosmetics', nameAm:'Eyosiyas Cosmetics', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#D4468F', rating:0, reviews:0, whatsapp:'251911215166', mobile:'+251911215166', photo:'', socials:{}, responseTime:'', blurb:'Eyosiyas Cosmetics — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 239.', active:true, hidden:false, banks:[], products:[] },
    { id:'f2-perfume-by-merwan', unit:'240', floor:'2nd Floor', name:'perfume by merwan', nameAm:'perfume by merwan', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#A82B70', rating:0, reviews:0, whatsapp:'2519166038611', mobile:'+2519166038611', photo:'', socials:{}, responseTime:'', blurb:'perfume by merwan — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 2nd Floor, unit 240.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-sahnis-juice', unit:'301', floor:'3rd Floor', name:'Sahnis Juice', nameAm:'Sahnis Juice', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#C7702A', rating:0, reviews:0, whatsapp:'251929174723', mobile:'+251929174723', photo:'', socials:{}, responseTime:'', blurb:'Sahnis Juice — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 301.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-long-tea', unit:'302', floor:'3rd Floor', name:'Long Tea', nameAm:'Long Tea', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#A85C1A', rating:0, reviews:0, whatsapp:'251939990404', mobile:'+251939990404', photo:'', socials:{}, responseTime:'', blurb:'Long Tea — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 302.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-faresegna-restaurant', unit:'303', floor:'3rd Floor', name:'Faresegna Restaurant', nameAm:'Faresegna Restaurant', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#D4823A', rating:0, reviews:0, whatsapp:'251942028888', mobile:'+251942028888', photo:'', socials:{}, responseTime:'', blurb:'Faresegna Restaurant — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 303.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-smile-burger', unit:'304', floor:'3rd Floor', name:'Smile Burger', nameAm:'Smile Burger', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#B5651D', rating:0, reviews:0, whatsapp:'251942028888', mobile:'+251942028888', photo:'', socials:{}, responseTime:'', blurb:'Smile Burger — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 304.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-nona-s-restaurant', unit:'305', floor:'3rd Floor', name:'Nona\'s Restaurant', nameAm:'Nona\'s Restaurant', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#C7702A', rating:0, reviews:0, whatsapp:'251913087841', mobile:'+251913087841', photo:'', socials:{}, responseTime:'', blurb:'Nona\'s Restaurant — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 305.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-chow-mein-noodles-and-salad', unit:'306', floor:'3rd Floor', name:'Chow Mein Noodles and Salad', nameAm:'Chow Mein Noodles and Salad', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#A85C1A', rating:0, reviews:0, whatsapp:'251983959117', mobile:'+251983959117', photo:'', socials:{}, responseTime:'', blurb:'Chow Mein Noodles and Salad — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 306.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-chito-buna', unit:'307', floor:'3rd Floor', name:'Chito Buna', nameAm:'Chito Buna', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#D4823A', rating:0, reviews:0, whatsapp:'251913087841', mobile:'+251913087841', photo:'', socials:{}, responseTime:'', blurb:'Chito Buna — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 307.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-lego', unit:'308', floor:'3rd Floor', name:'LEGO', nameAm:'LEGO', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#B5651D', rating:0, reviews:0, whatsapp:'251983959117', mobile:'+251983959117', photo:'', socials:{}, responseTime:'', blurb:'LEGO — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 308.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-pizza-hut', unit:'309', floor:'3rd Floor', name:'Pizza Hut', nameAm:'Pizza Hut', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#C7702A', rating:0, reviews:0, whatsapp:'251913087841', mobile:'+251913087841', photo:'', socials:{}, responseTime:'', blurb:'Pizza Hut — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 309.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-amifa-chicken', unit:'310', floor:'3rd Floor', name:'Amifa Chicken', nameAm:'Amifa Chicken', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#A85C1A', rating:0, reviews:0, whatsapp:'25191612060', mobile:'+25191612060', photo:'', socials:{}, responseTime:'', blurb:'Amifa Chicken — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 310.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-chocolate-shop', unit:'311', floor:'3rd Floor', name:'Chocolate Shop', nameAm:'Chocolate Shop', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#D4823A', rating:0, reviews:0, whatsapp:'251913158538', mobile:'+251913158538', photo:'', socials:{}, responseTime:'', blurb:'Chocolate Shop — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 311.', active:true, hidden:false, banks:[], products:[] },
    { id:'f3-yihun-leljochachen', unit:'312', floor:'3rd Floor', name:'Yihun Leljochachen', nameAm:'Yihun Leljochachen', cat:'Food & Beverage', catKey:'food-beverage', icon:'fa-utensils', color:'#B5651D', rating:0, reviews:0, whatsapp:'251921454442', mobile:'+251921454442', photo:'', socials:{}, responseTime:'', blurb:'Yihun Leljochachen — Food & Beverage at Ambassador Shopping Mall. Visit us on the 3rd Floor, unit 312.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-yaya-mobile', unit:'F0-01', floor:'4th Floor', name:'Yaya Mobile', nameAm:'Yaya Mobile', cat:'Electronics & Technology', catKey:'electronics', icon:'fa-mobile-screen', color:'#374151', rating:0, reviews:0, whatsapp:'251915123456', mobile:'+251915123456', photo:'', socials:{}, responseTime:'', blurb:'Yaya Mobile — Electronics & Technology at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-01.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-glamour', unit:'F0-02', floor:'4th Floor', name:'Glamour', nameAm:'Glamour', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#E0579C', rating:0, reviews:0, whatsapp:'251911222671', mobile:'+251911222671', photo:'', socials:{}, responseTime:'', blurb:'Glamour — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-02.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-cosmetics', unit:'F0-02', floor:'4th Floor', name:'Cosmetics', nameAm:'Cosmetics', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#C13584', rating:0, reviews:0, whatsapp:'251934434032', mobile:'+251934434032', photo:'', socials:{}, responseTime:'', blurb:'Cosmetics — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-02.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-lilac-beauty', unit:'F0-03', floor:'4th Floor', name:'Lilac Beauty', nameAm:'Lilac Beauty', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#D4468F', rating:0, reviews:0, whatsapp:'251943059989', mobile:'+251943059989', photo:'', socials:{}, responseTime:'', blurb:'Lilac Beauty — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-03.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-fikir-design', unit:'F0-03', floor:'4th Floor', name:'Fikir Design', nameAm:'Fikir Design', cat:'Fashion & Apparel', catKey:'fashion', icon:'fa-shirt', color:'#A83269', rating:0, reviews:0, whatsapp:'251922877178', mobile:'+251922877178', photo:'', socials:{}, responseTime:'', blurb:'Fikir Design — Fashion & Apparel at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-03.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-ashara-wellness', unit:'F0-04', floor:'4th Floor', name:'Ashara Wellness', nameAm:'Ashara Wellness', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#A82B70', rating:0, reviews:0, whatsapp:'251911859433', mobile:'+251911859433', photo:'', socials:{}, responseTime:'', blurb:'Ashara Wellness — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-04.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-ashara-nails', unit:'F0-05', floor:'4th Floor', name:'Ashara Nails', nameAm:'Ashara Nails', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#E0579C', rating:0, reviews:0, whatsapp:'251920112223', mobile:'+251920112223', photo:'', socials:{}, responseTime:'', blurb:'Ashara Nails — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-05.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-eyosiyas-cosmetics', unit:'F0-06', floor:'4th Floor', name:'Eyosiyas Cosmetics', nameAm:'Eyosiyas Cosmetics', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#C13584', rating:0, reviews:0, whatsapp:'251911215166', mobile:'+251911215166', photo:'', socials:{}, responseTime:'', blurb:'Eyosiyas Cosmetics — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-06.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-tilla-cosmetics', unit:'F0-07', floor:'4th Floor', name:'Tilla Cosmetics', nameAm:'Tilla Cosmetics', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#D4468F', rating:0, reviews:0, whatsapp:'251912004911', mobile:'+251912004911', photo:'', socials:{}, responseTime:'', blurb:'Tilla Cosmetics — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-07.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-ayine-tibeb', unit:'F0-08', floor:'4th Floor', name:'Ayine Tibeb', nameAm:'Ayine Tibeb', cat:'Fashion & Apparel', catKey:'fashion', icon:'fa-shirt', color:'#7A1A44', rating:0, reviews:0, whatsapp:'251943740454', mobile:'+251943740454', photo:'', socials:{}, responseTime:'', blurb:'Ayine Tibeb — Fashion & Apparel at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-08.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-kal-obtics', unit:'F0-09', floor:'4th Floor', name:'Kal Obtics', nameAm:'Kal Obtics', cat:'Eyewear & Optics', catKey:'eyewear', icon:'fa-glasses', color:'#374151', rating:0, reviews:0, whatsapp:'251911224005', mobile:'+251911224005', photo:'', socials:{}, responseTime:'', blurb:'Kal Obtics — Eyewear & Optics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-09.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-eros-perfume', unit:'F0-10', floor:'4th Floor', name:'Eros perfume', nameAm:'Eros perfume', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#A82B70', rating:0, reviews:0, whatsapp:'251911195665', mobile:'+251911195665', photo:'', socials:{}, responseTime:'', blurb:'Eros perfume — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-10.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-tschay-perfume', unit:'F0-11', floor:'4th Floor', name:'Tschay perfume', nameAm:'Tschay perfume', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#E0579C', rating:0, reviews:0, whatsapp:'251911223718', mobile:'+251911223718', photo:'', socials:{}, responseTime:'', blurb:'Tschay perfume — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-11.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-shanti-perfum', unit:'F0-12', floor:'4th Floor', name:'Shanti Perfum', nameAm:'Shanti Perfum', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#C13584', rating:0, reviews:0, whatsapp:'251912103010', mobile:'+251912103010', photo:'', socials:{}, responseTime:'', blurb:'Shanti Perfum — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-12.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-buna-sport-club', unit:'F0-13 A', floor:'4th Floor', name:'Buna sport club', nameAm:'Buna sport club', cat:'Sports & Fitness', catKey:'sports', icon:'fa-dumbbell', color:'#A8641C', rating:0, reviews:0, whatsapp:'251313356541', mobile:'+251313356541', photo:'', socials:{}, responseTime:'', blurb:'Buna sport club — Sports & Fitness at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-13 A.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-shanti-perfum-2', unit:'F0-13 B', floor:'4th Floor', name:'Shanti Perfum', nameAm:'Shanti Perfum', cat:'Beauty & Cosmetics', catKey:'beauty', icon:'fa-spa', color:'#D4468F', rating:0, reviews:0, whatsapp:'251912103010', mobile:'+251912103010', photo:'', socials:{}, responseTime:'', blurb:'Shanti Perfum — Beauty & Cosmetics at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-13 B.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-fillon-fashion', unit:'F0-14', floor:'4th Floor', name:'Fillon Fashion', nameAm:'Fillon Fashion', cat:'Fashion & Apparel', catKey:'fashion', icon:'fa-shirt', color:'#9C2359', rating:0, reviews:0, whatsapp:'251944737268', mobile:'+251944737268', photo:'', socials:{}, responseTime:'', blurb:'Fillon Fashion — Fashion & Apparel at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-14.', active:true, hidden:false, banks:[], products:[] },
    { id:'f4-nasam-print', unit:'F0-15', floor:'4th Floor', name:'Nasam Print', nameAm:'Nasam Print', cat:'Books & Stationery', catKey:'books', icon:'fa-book-open', color:'#7A4A1E', rating:0, reviews:0, whatsapp:'251911219787', mobile:'+251911219787', photo:'', socials:{}, responseTime:'', blurb:'Nasam Print — Books & Stationery at Ambassador Shopping Mall. Visit us on the 4th Floor, unit F0-15.', active:true, hidden:false, banks:[], products:[] }
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
    navTenants:'Tenants', navShop:'Shop', navServices:'Services', navHow:'How It Works', navJobs:'Vacancies',
    mgmtCallLbl:'Call the mall', mgmtAddrLbl:'Address', mgmtHoursLbl:'Hours',
    mgmtFeedbackLbl:'Send feedback', mgmtFeedbackSub:'Message management directly',
    gReviewsTitle:'Read & write reviews on Google Maps', gReviewsSub:'Real reviews from real visitors — opens Google Maps',
    shareEyebrow:"We'd Love to Hear From You", shareTitle:'Share Your Experience',
    fbTitle:'Send Us Feedback', fbName:'Your Name (optional)', fbEmail:'Email Address (optional)',
    fbPhone:'Phone Number (optional)', fbMsg:'Your Message', fbMsgPh:'Share your feedback...',
    fbSend:'Send Message', fbNamePh:'Yonas K.', fbEmailPh:'you@example.com', fbPhonePh:'09xx xxx xxx',
    tagShop:'Come for the shopping,', tagFun:'stay for the fun!', partnersTitle:'Trusted Partners',
    jobsEyebrow:'Work With Us', jobsTitle:'Job Vacancies',
    jobsSub:'Openings posted by shops inside the mall, by Ambassador management, and by building operations.',
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
    heroSub:'Every product here is sold by a verified tenant inside Ambassador Shopping Mall. Visit them in person or buy online — your choice.',
    statTenants:'Verified Tenants', statOnline:'Online Stores', statFloors:'Floors', statDaily:'Daily Visitors',
    statProducts:'Products', statVerified:'Verified',
    aboutEyebrow:'The Building', aboutVisit:'Visit in person', aboutTrust:'Trust-first shopping',
    onSale:'On Sale Now', onSaleSub:'Limited-time deals from verified sellers across the building.',
    tenantsTitle:'Some of our shops you can visit', tenantsSub:'A fresh sample from every floor, updated daily — tap any seller to shop their products or visit them in person.', tenantsEyebrow:'Our Sellers',
    shopTitle:'Shop All Products', shopSub:'Filter by floor, tenant, or category. Items from different tenants check out separately — straight to each shop.', shopEyebrow:'The Marketplace',
    servicesTitle:'Services in the Building', servicesSub:'Banking and beauty & cosmetics tenants inside Ambassador Mall — a fresh sample shown daily.', servicesEyebrow:'Building Services',
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
    tos:'Terms of Service', privacy:'Privacy Policy', legalUpdated:'Last updated', returnsTitle:'Returns & Buyer Safety',
    setLocation:'Set delivery location', useGps:'Use my GPS location', orPickArea:'or choose your subcity', deliveryAddisOnly:'Delivery within Addis Ababa only',
    deliveryCalcNext:'Delivery calculated at the next step', locatingYou:'Finding your location\u2026', nearestZone:'Nearest zone',
    orderConfirmed:'Order confirmed', orderConfirmedSub:'Save your reference and send your payment proof to the seller on WhatsApp.', whatNext:'What happens next', nextStep1:'Transfer the exact total to the seller\u2019s account', nextStep2:'Send your payment screenshot to the seller on WhatsApp', nextStep3:'The seller confirms and arranges your delivery',
    noResults:'No matches found', noResultsTip:'Try a different word, or browse popular categories below.', popular:'Popular', clearSearch:'Clear search',
    resumeCart:'You left items in your cart', resumeCartBtn:'Resume', dismiss:'Dismiss',
    account:'Account', signIn:'Sign in', signOut:'Sign out', signInGoogle:'Continue with Google', signInTitle:'Sign in to Ambassador', signInSub:'Save your details for faster checkout. We never post anything.', signedInAs:'Signed in as', orContinueGuest:'Continue as guest', myAccount:'My Account'
  },
  am: {
    navTenants:'ተከራዮች', navShop:'ሱቅ', navServices:'አገልግሎቶች', navHow:'እንዴት እንደሚሰራ', navJobs:'ክፍት የስራ ቦታ',
    mgmtCallLbl:'ሞሉን ይደውሉ', mgmtAddrLbl:'አድራሻ', mgmtHoursLbl:'የስራ ሰዓት',
    mgmtFeedbackLbl:'አስተያየት ላክ', mgmtFeedbackSub:'ለአስተዳደር በቀጥታ መልእክት',
    gReviewsTitle:'በGoogle Maps ላይ ግምገማዎችን ያንብቡ ወይም ይጻፉ', gReviewsSub:'ከእውነተኛ ጎብኚዎች እውነተኛ ግምገማ — Google Maps ይከፍታል',
    shareEyebrow:'ከእርስዎ መስማት እንወዳለን', shareTitle:'ተሞክሮዎን ያካፍሉን',
    fbTitle:'አስተያየት ይላኩልን', fbName:'ስምዎ (አማራጭ)', fbEmail:'ኢሜይል (አማራጭ)',
    fbPhone:'ስልክ ቁጥር (አማራጭ)', fbMsg:'መልእክትዎ', fbMsgPh:'አስተያየትዎን ያካፍሉ...',
    fbSend:'መልእክት ላክ', fbNamePh:'ዮናስ ከ.', fbEmailPh:'you@example.com', fbPhonePh:'09xx xxx xxx',
    tagShop:'ለግብይት ይምጡ፣', tagFun:'ለመዝናናት ይቆዩ!', partnersTitle:'የታመኑ አጋሮች',
    jobsEyebrow:'አብረውን ይስሩ', jobsTitle:'የስራ ማስታወቂያ',
    jobsSub:'ከሱቆች፣ ከሞሉ አስተዳደር እና ከህንፃ ጥገና ክፍል የተለጠፉ ክፍት የስራ ቦታዎች።',
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
    heroSub:'እዚህ ያለ እያንዳንዱ ምርት በአምባሳደር ሾፒንግ ሞል ውስጥ ባለ የተረጋገጠ ተከራይ ይሸጣል። በአካል ይጎብኙ ወይም በመስመር ላይ ይግዙ — ምርጫው የእርስዎ ነው።',
    statTenants:'የተረጋገጡ ተከራዮች', statOnline:'የመስመር ላይ ሱቆች', statFloors:'ፎቆች', statDaily:'ዕለታዊ ጎብኚዎች',
    statProducts:'ምርቶች', statVerified:'የተረጋገጠ',
    aboutEyebrow:'ህንፃው', aboutVisit:'በአካል ይጎብኙ', aboutTrust:'በመተማመን ላይ የተመሰረተ ግዢ',
    onSale:'አሁን በቅናሽ', onSaleSub:'ከህንፃው ውስጥ ካሉ የተረጋገጡ ሻጮች የተወሰነ ጊዜ ቅናሽ።',
    tenantsTitle:'ከሱቆቻችን ውስጥ አንዳንዶቹ', tenantsSub:'ከእያንዳንዱ ፎቅ በየቀኑ የሚታደስ ናሙና — ለመግዛት ወይም በአካል ለመጎብኘት ሻጭ ይንኩ።', tenantsEyebrow:'ሻጮቻችን',
    shopTitle:'ሁሉንም ምርቶች ይግዙ', shopSub:'በፎቅ፣ በተከራይ ወይም በምድብ ያጣሩ። ከተለያዩ ተከራዮች ያሉ ምርቶች ለየብቻ ይከፈላሉ።', shopEyebrow:'ገበያ',
    servicesTitle:'በህንፃው ውስጥ ያሉ አገልግሎቶች', servicesSub:'ባንክ እና ውበትና ኮስሜቲክስ ተከራዮች በአምባሳደር ሞል ውስጥ — በየቀኑ የሚታደስ ናሙና።', servicesEyebrow:'የህንፃ አገልግሎቶች',
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
    tos:'የአገልግሎት ውሎች', privacy:'የግላዊነት መመሪያ', legalUpdated:'መጨረሻ የተሻሻለው', returnsTitle:'ተመላሽና የገዢ ደህንነት',
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
  filter: 'verified',     // 'all' | 'verified' | 'grp:<group>' | tenantId | 'floor:<floor>'
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
  ['name','nameAm','tagline','taglineAm','location','phone','hours','logo','stats','geo','tax','areas','delivery','admin','policy','legal','quickLinks','tenants','floorStats','sections','vacantUnits','commission'].forEach(function(k){
    if (b[k] !== undefined) BUILDING[k] = b[k];
  });
  var svcs = cat.services || b.services;
  if (svcs) { SERVICES.length = 0; svcs.forEach(function(s){ SERVICES.push(s); }); }
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

/* ── daily rotation: a stable-for-today, different-tomorrow 10% sample of
   tenants from EACH floor. Deterministic (seeded by today's date + floor
   name) so every visitor sees the same picks today, and the picks change
   automatically at local midnight — no server cron job needed. */
function seededRandom(seed){
  var s = 0; for (var i=0;i<seed.length;i++) s = (s*31 + seed.charCodeAt(i)) >>> 0;
  return function(){ s = (s*1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function todayKey(){
  var d = new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}
var __dailySubsetCache = null, __dailySubsetDay = null;
function dailyTenantSubset(){
  var day = todayKey();
  if (__dailySubsetCache && __dailySubsetDay === day) return __dailySubsetCache;
  var byFloor = {};
  BUILDING.tenants.forEach(function(tn){ if(tn.hidden) return; (byFloor[tn.floor] = byFloor[tn.floor]||[]).push(tn); });
  var picked = [];
  Object.keys(byFloor).forEach(function(floor){
    var list = byFloor[floor].slice();
    var rnd = seededRandom(day+'|'+floor);
    // Fisher–Yates shuffle, seeded — same order every time today, different tomorrow
    for (var i=list.length-1; i>0; i--){ var j=Math.floor(rnd()*(i+1)); var tmp=list[i]; list[i]=list[j]; list[j]=tmp; }
    var n = Math.max(1, Math.round(list.length*0.10));
    picked = picked.concat(list.slice(0, n));
  });
  __dailySubsetCache = picked; __dailySubsetDay = day;
  return picked;
}

function stars(r){ var n=Math.round(r), s=''; for(var i=0;i<5;i++) s += i<n?'★':'☆'; return s; }
/* real tenants with no reviews yet show a "New" pill instead of a fake ★0 — a
   zero rating is not the same as "no ratings", so we never render it as one.
   Returns inner HTML only; callers keep their own wrapper element. */
function ratingLine(tn){
  if(!tn.reviews){
    return '<span class="amb-new-pill"><i class="fas fa-sparkles"></i> '+(state.lang==='am'?'አዲስ':'New')+'</span>';
  }
  return '<span class="amb-kiosk-stars">'+stars(tn.rating)+'</span> <b>'+tn.rating+'</b> <span class="amb-rev">('+tn.reviews+')</span>';
}

/* products that are on sale (have an old price) */
function onSaleProducts(){ return ALL_PRODUCTS.filter(function(p){ return !p.hidden && p.old && p.old>p.price; }); }

/* expose for inline handlers + later parts */
window.__AMB = {
  BUILDING:BUILDING, SERVICES:SERVICES, I18N:I18N, state:state, ALL_PRODUCTS:ALL_PRODUCTS,
  load:load, save:save, $:$, esc:esc, fmt:fmt, fmtN:fmtN, P:P, tenant:tenant, stars:stars, ratingLine:ratingLine, dailyTenantSubset:dailyTenantSubset, seededRandom:seededRandom, todayKey:todayKey, t:t,
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
var save=A.save, $=A.$, esc=A.esc, fmt=A.fmt, fmtN=A.fmtN, P=A.P, tenant=A.tenant, stars=A.stars, ratingLine=A.ratingLine, dailyTenantSubset=A.dailyTenantSubset, seededRandom=A.seededRandom, todayKey=A.todayKey, t=A.t;
var onSaleProducts=A.onSaleProducts;

function initials(name){ return name.split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join(''); }
function nameFor(obj){ return state.lang==='am' && obj.nameAm ? obj.nameAm : obj.name; }
function floorUnit(obj){ return obj && obj.unit ? obj.floor + ' - ' + obj.unit : (obj ? obj.floor : ''); }
A.floorUnit = floorUnit;
var FLOOR_AM = { 'Ground Floor':'መሬት ወለል', '1st Floor':'1ኛ ፎቅ', '2nd Floor':'2ኛ ፎቅ', '3rd Floor':'3ኛ ፎቅ', '4th Floor':'4ኛ ፎቅ', '5th Floor':'5ኛ ፎቅ', '6th Floor':'6ኛ ፎቅ' };
A.FLOOR_AM = FLOOR_AM;
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

window.ambScrollTo = function (id) {
  var el=$(id); if(!el) return ambCloseSearch();
  if (A.lenis) A.lenis.scrollTo(el, { offset: -76, duration: 1.15 });
  else el.scrollIntoView({behavior:'smooth', block:'start'});
  ambCloseSearch();
};

/* ════ LANGUAGE TOGGLE ════ */
window.ambSetLang = function (lang) {
  state.lang = lang; save('amb-lang', lang);
  applyI18n();
  renderRibbon(); renderTenants(); renderServices(); renderOnSale(); renderFilterChips(); renderFilterBar(); renderProducts(); renderHeroVisual(); if(A.renderJobsSection) A.renderJobsSection();
  if(A.renderRail){ try{ A.renderRail(); A.renderRailDrawer(); }catch(e){ console.error('rail render failed, rest of page unaffected:', e); } }
  var btn=$('ambLangBtn'); if(btn) btn.innerHTML = lang==='en' ? '<i class="fas fa-language"></i> አማ' : '<i class="fas fa-language"></i> EN';
};
window.ambToggleLang = function(){ ambSetLang(state.lang==='en'?'am':'en'); };

function applySections(){
  var sec = BUILDING.sections || {};
  var shopEl = $('ambShop'), sellersEl = $('ambTenants');
  if(shopEl) shopEl.style.display = (sec.shop && sec.shop.visible===false) ? 'none' : '';
  if(sellersEl) sellersEl.style.display = (sec.sellers && sec.sellers.visible===false) ? 'none' : '';
  var onSaleEl = $('ambOnSaleSection');
  if(onSaleEl && sec.shop && sec.shop.visible===false) onSaleEl.style.display='none';
  function setTitle(rootId, o){
    if(!o) return; var root=$(rootId); if(!root) return;
    var h=root.querySelector('.amb-title'), p=root.querySelector('.amb-sub');
    if(o.title && h) h.textContent = o.title;
    if(o.sub && p) p.textContent = o.sub;
  }
  setTitle('ambShop', sec.shop); setTitle('ambTenants', sec.sellers);
}
function applyI18n(){
  // any element with data-i18n gets its text replaced; data-i18n-html allows <em>
  document.querySelectorAll('#amb-store [data-i18n]').forEach(function(el){
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('#amb-store [data-i18n-ph]').forEach(function(el){
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  document.querySelectorAll('#amb-store [data-i18n-html]').forEach(function(el){
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  var s=$('ambSearch'); if(s) s.placeholder = t('searchPh');
  document.documentElement.lang = state.lang;
  applySections();   // section visibility + admin title overrides (must run after the i18n pass)
}

/* ── RIBBON ── */
function renderRibbon() {
  var items = [
    ['fa-shield-halved', state.lang==='am'?'እውነተኛ አድራሻ ካላቸው የተረጋገጡ ሻጮች ይግዙ':'Buy from verified sellers with a real address'],
    ['fa-building-columns', state.lang==='am'?'በቀጥታ ለእያንዳንዱ ሱቅ ይክፈሉ · CBE · አቢሲኒያ ባንክ · Telebirr':'Pay each shop directly · CBE · Bank of Abyssinia · Telebirr'],
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
  var fc=$('ambFooterCall'); if(fc && BUILDING.phone) fc.href='tel:'+BUILDING.phone.replace(/\s/g,'');
  // hero stats — trust framing (no "sample tenant" language)
  renderHeroStats();
  renderAbout();
  renderQuickLinks();
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

/* ── BUYER SAFETY / RETURNS — now a footer modal (see ambOpenReturns) ── */
function policyCardsHTML(){
  var pol=BUILDING.policy, am=state.lang==='am';
  return '<div class="amb-help-card">'+
      '<div class="amb-help-ic" style="background:linear-gradient(135deg,var(--gold-d),var(--gold-deep))"><i class="fas fa-shield-halved"></i></div>'+
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
window.ambOpenReturns = function(){
  var pol=BUILDING.policy;
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div style="padding:28px 26px 22px">'+
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:1.6rem;font-weight:900;color:var(--wine-d);margin-bottom:6px">'+esc(pol.returnsTitle||L('returnsTitle'))+'</h3>'+
      '<p style="font-size:.8rem;color:var(--mid);margin-bottom:18px">'+(state.lang==='am'?'ስለ ክፍያ ደህንነት፣ ተመላሽ እና ድጋፍ ያንብቡ።':'How payments are protected, how returns work, and how to reach support.')+'</p>'+
      '<div class="amb-help-grid" style="grid-template-columns:1fr">'+policyCardsHTML()+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};

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
  var subset = dailyTenantSubset();
  var cards = subset.map(function(tn){ return tenantCardHTML(tn); }).join('');
  var strip=$('ambTenantStrip'); if(strip) strip.innerHTML = cards;
  var gal=$('ambTenantGallery'); if(gal) gal.innerHTML = cards;
  var cnt=$('ambHeroSellerCount'); if(cnt) cnt.textContent = BUILDING.tenants.length;
}
/* brand-colored social pills — platform key: [title, url-builder prefix, icon, css class] */
var SOC_DEFS = [
  ['telegram','Telegram','https://t.me/','fab fa-telegram-plane','sc-telegram'],
  ['facebook','Facebook','https://facebook.com/','fab fa-facebook-f','sc-facebook'],
  ['instagram','Instagram','https://instagram.com/','fab fa-instagram','sc-instagram'],
  ['tiktok','TikTok','https://tiktok.com/','fab fa-tiktok','sc-tiktok'],
  ['whatsapp','WhatsApp','https://wa.me/','fab fa-whatsapp','sc-whatsapp'],
  ['youtube','YouTube','https://youtube.com/','fab fa-youtube','sc-youtube'],
  ['pinterest','Pinterest','https://pinterest.com/','fab fa-pinterest-p','sc-pinterest'],
  ['linkedin','LinkedIn','https://linkedin.com/company/','fab fa-linkedin-in','sc-linkedin'],
  ['x','X (Twitter)','https://x.com/','fab fa-x-twitter','sc-x'],
  ['twitter','X (Twitter)','https://x.com/','fab fa-x-twitter','sc-x'],
  ['snapchat','Snapchat','https://snapchat.com/add/','fab fa-snapchat-ghost','sc-snapchat'],
  ['website','Website','','fas fa-globe','sc-website'],
  ['email','Email','mailto:','fas fa-envelope','sc-email']
];
function socialIcons(s, color){
  if(!s) return '';
  var out=[];
  SOC_DEFS.forEach(function(d){
    var entry = s[d[0]]; if(!entry) return;
    // new shape: { value, on }. old shape (still supported): a plain string.
    var v = (typeof entry === 'object') ? entry.value : entry;
    var on = (typeof entry === 'object') ? entry.on !== false : true;
    if(!v || !on) return;
    var href = /^https?:|^mailto:/.test(v) ? v : (d[0]==='website' ? 'https://'+v : d[2]+v);
    out.push('<a class="amb-soc-mini '+d[4]+'" title="'+d[1]+'" href="'+esc(href)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="'+d[3]+'"></i></a>');
  });
  return out.join('');
}
function tenantCardHTML(tn){
  var active = state.filter===tn.id;
  var dark = shade(tn.color,-50);
  // 6 awning stripes alternating tenant color / dark shade
  var stripes='';
  /* 10 alternating stripes = 5 coloured bars across the awning (was 3) */
  for(var i=0;i<10;i++){ stripes += '<span class="amb-kstripe" style="background:'+(i%2?dark:tn.color)+'"></span>'; }
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
      '</div>'+
      /* logo row: the shop's own picture (initials until they upload one),
         with floor + unit sitting horizontally beside it */
      '<div class="amb-kiosk-idrow">'+
        (tn.logo
          ? '<div class="amb-kiosk-sign has-logo" style="background:linear-gradient(150deg,'+tn.color+','+dark+')">'+
              '<img src="'+esc(tn.logo)+'" alt="'+esc(tn.name)+'" loading="lazy" '+
              'onerror="this.parentNode.classList.remove(\'has-logo\');this.parentNode.textContent=\''+esc(initials(tn.name)).replace(/'/g,"\\'")+'\'">'+
            '</div>'
          : '<div class="amb-kiosk-sign" style="background:linear-gradient(150deg,'+tn.color+','+dark+')">'+esc(initials(tn.name))+'</div>')+
        '<span class="amb-kiosk-floor">'+esc(floorUnit(tn))+'</span>'+
      '</div>'+
      '<div class="amb-kiosk-interior">'+
        '<div class="amb-kiosk-cat"><i class="fas '+tn.icon+'"></i> '+esc(tn.cat)+'</div>'+
        '<h3 class="amb-kiosk-title display">'+esc(nameFor(tn))+'</h3>'+
        '<div class="amb-kiosk-rating">'+ratingLine(tn)+'</div>'+
        (tn.owner?'<div class="amb-kiosk-owner"><i class="fas fa-user-tie"></i> '+esc(tn.owner)+'</div>':'')+
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
  var callHref = tn.mobile ? 'tel:'+tn.mobile.replace(/\s/g,'') : '';
  var waHref = tn.whatsapp ? 'https://wa.me/'+tn.whatsapp : '';
  var rows = [
    ['fa-user', t('owner'), tn.owner, null],
    ['fa-phone', t('mobile'), tn.mobile, callHref ? {href:callHref, cls:'call', label:(state.lang==='am'?'ይደውሉ':'Call'), icon:'fa-phone'} : null],
    ['fa-building', t('floorLbl'), floorUnit(tn), null],
    ['fab fa-whatsapp', 'WhatsApp', tn.whatsapp ? '+'+tn.whatsapp : '', waHref ? {href:waHref, cls:'wa', label:(state.lang==='am'?'መልእክት':'Chat'), icon:'fab fa-whatsapp', ext:true} : null]
  ].filter(function(r){ return !!r[2]; }).map(function(r){
    var fa=r[0].indexOf('fab')===0?r[0]:'fas '+r[0];
    var action = r[3];
    var actionHTML = action ? '<a class="amb-tp-row-act '+action.cls+'" href="'+esc(action.href)+'"'+(action.ext?' target="_blank" rel="noopener"':'')+' onclick="event.stopPropagation()"><i class="'+action.icon+'"></i> '+esc(action.label)+'</a>' : '';
    return '<div class="amb-tp-row"><span class="amb-tp-row-l"><i class="'+fa+'"></i> '+esc(r[1])+'</span><span class="amb-tp-row-v">'+esc(r[2])+'</span>'+actionHTML+'</div>';
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
        '<div class="amb-tp-ratebox" id="ambTpRateBox"><i class="fas fa-spinner fa-spin"></i></div>'+
        '<div class="amb-tp-rows">'+rows+'</div>'+
        (tn.reviewLink?'<a class="amb-tp-reviews" href="'+esc(tn.reviewLink)+'" target="_blank" rel="noopener"><i class="fas fa-star"></i> '+t('seeReviews')+' ('+tn.reviews+') <i class="fas fa-arrow-up-right-from-square" style="font-size:.6rem"></i></a>':'')+
        '<div class="amb-tp-socials">'+socialIcons(tn.socials,tn.color)+'</div>'+
        '<div class="amb-tp-acts">'+
          '<button class="amb-tp-shop" onclick="ambCloseAll();ambCloseFloorPanel();ambFilter(\''+tn.id+'\');ambScrollTo(\'ambShop\')"><i class="fas fa-bag-shopping"></i> '+(state.lang==='am'?'ምርቶችን ይግዙ':'Shop Products')+'</button>'+
          (tn.whatsapp?'<a class="amb-tp-wa" href="https://wa.me/'+tn.whatsapp+'" target="_blank" rel="noopener" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>':'')+
          '<button class="amb-tp-wa" style="background:var(--accent)" onclick="ambShareTenant(\''+tn.id+'\')" title="'+esc(t('share'))+'"><i class="fas fa-share-nodes"></i></button>'+
        '</div>'+
        /* save-contact + appointment: a vCard downloads straight into the phone's
           address book; booking opens WhatsApp pre-filled so the shop gets a
           complete request instead of a blank "hi" */
        '<div class="amb-tp-acts2">'+
          '<a class="amb-tp-vcard" href="/api/tenant/'+tn.id+'/vcard" download><i class="fas fa-address-card"></i> '+
            (state.lang==='am'?'እውቂያ አስቀምጥ':'Save Contact')+'</a>'+
          /* booking shows only when the shop (or admin) has enabled it AND a
             WhatsApp number exists — service shops want it, most retail doesn't */
          ((tn.appointments && tn.whatsapp)?'<button class="amb-tp-book" onclick="ambBookAppointment(\''+tn.id+'\')"><i class="fas fa-calendar-check"></i> '+
            (state.lang==='am'?'ቀጠሮ ይያዙ':'Book Appointment')+'</button>':'')+
        '</div>'+
      '</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
  ambSetDeepLink('tenant', tn.id);
  ambTrack(tn.id, 'visit');
  ambLoadRatingWidget(tn.id);
};

/* ── real tenant ratings: signed-in users only, one rating each, updatable ── */
function starsInputHTML(tid, current, locked){
  var out = '<div class="amb-rate-stars'+(locked?' locked':'')+'">';
  for (var i=1; i<=5; i++){
    out += '<i class="'+(i<=current?'fas':'far')+' fa-star"'+(locked?'':' onclick="ambSubmitRating(\''+tid+'\','+i+')"')+' data-n="'+i+'"></i>';
  }
  out += '</div>';
  return out;
}
window.ambLoadRatingWidget = function(tid){
  var box = $('ambTpRateBox'); if(!box) return;
  var tn = tenant(tid); if(!tn) return;
  var summary = '<div class="amb-tp-rate-summary">'+ratingLine(tn)+'</div>';
  if (!state.user){
    box.innerHTML = summary +
      '<button class="amb-tp-rate-cta" onclick="ambCloseAll();ambOpenSignIn()"><i class="fas fa-star"></i> '+
      (state.lang==='am'?'ይህን ሱቅ ለመገምገም ይግቡ':'Sign in to rate this shop')+'</button>';
    return;
  }
  box.innerHTML = summary + '<div class="amb-tp-rate-label">'+(state.lang==='am'?'ይህን ሱቅ ይገምግሙ':'Rate this shop')+'</div>' + starsInputHTML(tid, 0, false);
  A.api('/api/tenant/'+tid+'/my-rating').then(function(d){
    var b = $('ambTpRateBox'); if(!b) return; // modal may have closed already
    if (d.myRating){
      var stars = b.querySelector('.amb-rate-stars');
      if(stars) stars.outerHTML = starsInputHTML(tid, d.myRating, false);
    }
  }).catch(function(){});
};
window.ambSubmitRating = function(tid, n){
  var box = $('ambTpRateBox');
  // optimistic feedback: fill the stars and lock them immediately, so the
  // click always feels instant even before the network round-trip finishes
  if (box) {
    var starsEl = box.querySelector('.amb-rate-stars');
    if (starsEl) starsEl.outerHTML = starsInputHTML(tid, n, true);
  }
  A.api('/api/tenant/'+tid+'/rate', { method:'POST', body:{ rating:n } }).then(function(d){
    var tn = tenant(tid);
    if (tn){ tn.rating = d.rating; tn.reviews = d.reviews; }
    var b = $('ambTpRateBox');
    if (b){
      b.innerHTML = '<div class="amb-tp-rate-summary">'+ratingLine(tn)+'</div>'+
        '<div class="amb-tp-rate-label">'+(state.lang==='am'?'ይህን ሱቅ ይገምግሙ':'Rate this shop')+'</div>'+
        starsInputHTML(tid, n, false);
    }
    window.ambToast(state.lang==='am'?'እናመሰግናለን — ደረጃዎ ተመዝግቧል!':'Thanks — your rating was saved!', 'suc');
    // keep other visible surfaces (kiosk gallery, floor panel) in sync without a full reload
    if (typeof renderTenants==='function') renderTenants();
  }).catch(function(e){
    // roll the optimistic update back so the UI never shows a rating that
    // didn't actually save (e.g. session expired mid-click)
    ambLoadRatingWidget(tid);
    window.ambToast(e.message || (state.lang==='am'?'አልተሳካም':'Could not save your rating'), 'err');
  });
};

/* ── SERVICES (dedicated enhanced card — genuine service-tenants only) ── */
/* Building Services draws from real tenants that are ACTUAL service
   providers, not product retailers — and, per Ambassador's own direction,
   only those with a confirmed REAL office number. Only the 4th floor's
   listing came with real "F0-xx" unit numbers in the source data; every
   other floor's unit codes here were sequentially generated (the original
   list didn't include real numbers for those floors), so services on those
   floors are excluded until real office numbers are confirmed for them.
   Banking tenants are voided by this same rule (none are on the 4th floor).
   Beauty & Cosmetics is voided EXCEPT the two genuine salon/wellness
   businesses (Ashara Nails, Ashara Wellness) — the rest of that category is
   product retail (perfume, cosmetics), which belongs in the marketplace,
   not here. */
var SERVICE_TENANT_IDS = ['f4-ashara-wellness', 'f4-ashara-nails', 'f4-buna-sport-club', 'f4-nasam-print'];
function dailyServiceSubset(){
  var pool = BUILDING.tenants.filter(function(tn){
    return !tn.hidden && SERVICE_TENANT_IDS.indexOf(tn.id) >= 0;
  });
  if (pool.length <= 6) return pool;   // small real pool — show all of it, no need to hide any
  var rnd = seededRandom(todayKey()+'|services');
  var list = pool.slice();
  for (var i=list.length-1;i>0;i--){ var j=Math.floor(rnd()*(i+1)); var tmp=list[i]; list[i]=list[j]; list[j]=tmp; }
  return list.slice(0, Math.max(4, Math.round(list.length*0.5)));
}
function serviceCardHTML(tn){
  var g = 'linear-gradient(135deg,'+tn.color+','+shade(tn.color,-28)+')';
  var callHref = tn.mobile ? 'tel:'+tn.mobile.replace(/\s/g,'') : '';
  return '<div class="amb-svc2" onclick="ambOpenTenant(\''+tn.id+'\')">'+
    '<div class="amb-svc2-top" style="background:'+g+'">'+
      '<div class="amb-svc2-ic"><i class="fas '+tn.icon+'"></i></div>'+
      '<span class="amb-svc2-badge">'+esc(tn.cat)+'</span>'+
    '</div>'+
    '<div class="amb-svc2-body">'+
      '<div class="amb-svc2-name">'+esc(nameFor(tn))+'</div>'+
      '<div class="amb-svc2-loc"><i class="fas fa-location-dot"></i> '+esc(floorUnit(tn))+'</div>'+
      (tn.blurb?'<p class="amb-svc2-blurb">'+esc(tn.blurb)+'</p>':'')+
      '<div class="amb-svc2-foot">'+
        (callHref?'<a class="amb-svc2-call" href="'+callHref+'" onclick="event.stopPropagation()"><i class="fas fa-phone"></i> '+(state.lang==='am'?'ይደውሉ':'Call')+'</a>':'')+
        '<button class="amb-svc2-view" onclick="event.stopPropagation();ambOpenTenant(\''+tn.id+'\')"><i class="fas fa-arrow-right"></i> '+(state.lang==='am'?'ዝርዝር':'Details')+'</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderServices(){
  var el=$('ambServicesGrid'); if(!el) return;
  el.innerHTML = dailyServiceSubset().map(serviceCardHTML).join('');
}

/* ── SERVICE DETAIL MODAL (legacy — kept for any future standalone services list) ── */
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

  /* hero showcase — mixed media: short videos sit alongside stills.
     type:'video' slides autoplay muted+inline (required for mobile autoplay),
     pause when off-screen, and hold the carousel until they finish. */
  var carouselMedia = [
    { type:'video', src:'/media/ambassador-hero.mp4', poster:'/media/hero-poster.jpg', label:'Ambassador Shopping Mall' },
    { type:'image', src:'https://i.postimg.cc/NMLJc5qx/main.jpg', label:'Ambassador Mall' },
    { type:'image', src:'https://ketemajournal.com/wp-content/uploads/2022/11/IMG_8681-719x1024.jpg', label:'Inside the Mall' },
    { type:'image', src:'https://i.postimg.cc/G3GmK6F2/ketemajournal-com.jpg', label:'Shopping Floors' },
    { type:'image', src:'https://i.postimg.cc/L6PzMmcM/shinegold.jpg', label:'Gold Mart' },
    { type:'image', src:'https://pbs.twimg.com/media/GoHFw_BXwAAsk2v?format=jpg&name=900x900', label:'Our Location' }
  ];
  var carouselHTML = carouselMedia.map(function(m,idx){
    var inner = m.type==='video'
      ? '<video class="explore-video" muted playsinline preload="metadata" '+
          (m.poster?'poster="'+esc(m.poster)+'" ':'')+
          'aria-label="'+esc(m.label)+'"><source src="'+esc(m.src)+'" type="video/mp4"></video>'+
        '<span class="explore-badge"><i class="fas fa-play"></i> '+(state.lang==='am'?'ቪዲዮ':'Video')+'</span>'
      : '<img src="'+esc(m.src)+'" alt="'+esc(m.label)+'" loading="lazy">';
    return '<div class="explore-slide" data-index="'+idx+'" data-type="'+m.type+'">'+inner+
           '<span class="explore-cap">'+esc(m.label)+'</span></div>';
  }).join('');
  var dotsHTML = carouselMedia.map(function(m,idx){
    return '<button class="explore-dot'+(idx===0?' active':'')+'" data-index="'+idx+'" '+
           'onclick="ambGoToExploreSlide('+idx+',true)" aria-label="Slide '+(idx+1)+'"></button>';
  }).join('');
  var slot=$('ambHeroCarouselSlot');
  if(slot){
    slot.innerHTML =
      '<div class="explore-carousel-wrap">'+
        '<div class="explore-track" id="exploreTrack">'+carouselHTML+'</div>'+
        '<button class="explore-arrow prev" onclick="ambExploreSlide(-1,true)" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>'+
        '<button class="explore-arrow next" onclick="ambExploreSlide(1,true)" aria-label="Next"><i class="fas fa-chevron-right"></i></button>'+
        '<div class="explore-progress"><span id="exploreBar"></span></div>'+
      '</div>'+
      '<div class="explore-dots" id="exploreDots">'+dotsHTML+'</div>';
  }

  var totalUnits = BUILDING.tenants.length;
  var totalFloors = floorList.length;
  el.innerHTML =
    '<div class="amb-floor-directory">'+
      '<div class="amb-fd-head">'+
        '<div class="amb-fd-head-ic"><i class="fas fa-building-columns"></i></div>'+
        '<div class="amb-fd-head-txt">'+
          '<h3>'+(state.lang==='am'?'የፎቅ ማውጫ':'Building Directory')+'</h3>'+
          '<span>'+totalFloors+' '+(state.lang==='am'?'ፎቆች':'floors')+' · '+totalUnits+' '+(state.lang==='am'?'ቢሮዎች':'offices')+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="floor-vertical-list">'+floorsHTML+'</div>'+
      '<button class="amb-fd-all" onclick="ambOpenDirectory()">'+
        '<i class="fas fa-list-ul"></i> '+(state.lang==='am'?'ሙሉ ማውጫ':'Full Directory')+'</button>'+
    '</div>';
  initExploreCarousel();
}
var IMAGE_SLIDE_MS = 5200;
var exploreObserver = null, exploreVisible = true;
function initExploreCarousel(){
  var track=$('exploreTrack'); if(!track) return;
  var slides = track.querySelectorAll('.explore-slide');
  exploreTotal = slides.length; if(!exploreTotal) return;
  // when a video ends, move on immediately rather than cutting it off
  track.querySelectorAll('.explore-video').forEach(function(v){
    v.addEventListener('ended', function(){ ambExploreSlide(1); });
  });
  // don't burn battery/data animating a carousel nobody can see
  if (exploreObserver) exploreObserver.disconnect();
  if (window.IntersectionObserver){
    exploreObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        exploreVisible = en.isIntersecting;
        if (!exploreVisible){ stopExploreTimer(); pauseAllExploreVideos(); }
        else ambGoToExploreSlide(exploreIdx);
      });
    }, {threshold:0.15});
    exploreObserver.observe(track);
  }
  ambGoToExploreSlide(0);
}
function stopExploreTimer(){ clearTimeout(exploreInterval); exploreInterval=null; }
function pauseAllExploreVideos(){
  var track=$('exploreTrack'); if(!track) return;
  track.querySelectorAll('.explore-video').forEach(function(v){ try{ v.pause(); }catch(e){} });
}
function restartProgressBar(ms){
  var bar=$('exploreBar'); if(!bar) return;
  bar.style.transition='none'; bar.style.width='0%';
  // force reflow so the reset takes effect before the new transition starts
  void bar.offsetWidth;
  if(ms){ bar.style.transition='width '+ms+'ms linear'; bar.style.width='100%'; }
}
window.ambGoToExploreSlide = function(idx, userInitiated){
  var track=$('exploreTrack'), dots=$('exploreDots'); if(!track) return;
  var slides=track.querySelectorAll('.explore-slide'); if(!slides.length) return;
  idx = Math.max(0, Math.min(exploreTotal-1, idx));
  exploreIdx = idx;
  track.style.transform = 'translateX(-'+(idx*100)+'%)';
  if(dots) dots.querySelectorAll('.explore-dot').forEach(function(d,i){ d.classList.toggle('active', i===idx); });
  slides.forEach(function(sl,i){ sl.classList.toggle('is-active', i===idx); });

  pauseAllExploreVideos();
  stopExploreTimer();
  if (!exploreVisible) { restartProgressBar(0); return; }

  var active = slides[idx];
  var vid = active ? active.querySelector('.explore-video') : null;
  if (vid){
    restartProgressBar(0);   // the video itself paces this slide
    try { vid.currentTime = 0; } catch(e){}
    var p = vid.play();
    // autoplay can be refused (data saver, low power) — fall back to a timer
    if (p && p.catch) p.catch(function(){
      restartProgressBar(IMAGE_SLIDE_MS);
      exploreInterval = setTimeout(function(){ ambExploreSlide(1); }, IMAGE_SLIDE_MS);
    });
  } else {
    restartProgressBar(IMAGE_SLIDE_MS);
    exploreInterval = setTimeout(function(){ ambExploreSlide(1); }, IMAGE_SLIDE_MS);
  }
};
window.ambExploreSlide = function(dir, userInitiated){
  var n = exploreIdx+dir;
  if(n<0) n=exploreTotal-1; if(n>=exploreTotal) n=0;
  ambGoToExploreSlide(n, userInitiated);
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
    '<span class="fp-meta"><span>'+(tn.reviews?('★ '+tn.rating):(state.lang==='am'?'አዲስ':'New'))+'</span><span>'+(tn.products?tn.products.length:0)+' '+t('fpProducts')+'</span></span>'+
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
    '<button class="amb-fp-shopbtn" onclick="ambCloseFloorPanel();ambFilterByFloor(\''+flEsc+'\')"><i class="fas fa-bag-shopping"></i> '+esc(t('shopThisFloor'))+'</button>';
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


/* ── ON-SALE CAROUSEL ── */
function renderOnSale(){
  var el=$('ambOnSaleStrip'); if(!el) return;
  var sale=onSaleProducts();
  el.innerHTML = sale.map(function(p){ return productCard(p, true); }).join('');
  var sec=$('ambOnSaleSection'); if(sec) sec.style.display = sale.length? '' : 'none';
}

/* ── FILTER CHIPS ── */
/* marketplace category groups — each maps to a set of tenant catKeys */
/* category groups reflect Ambassador's REAL tenant mix (Jewelry & Accessories
   is the dominant category by a wide margin — this is a real gold/jewelry
   market at Arat Kilo, not a generic mall) */
var CAT_GROUPS = [
  ['verified',   {en:'Some of our products', am:'ከምርቶቻችን ውስጥ አንዳንዶቹ'}, 'fa-circle-check', null],
  ['jewelry',    {en:'Jewelry & Accessories', am:'ጌጣጌጥ'},          'fa-gem',              ['jewelry']],
  ['beauty',     {en:'Beauty & Cosmetics',    am:'ውበትና ኮስሜቲክስ'},  'fa-spa',              ['beauty']],
  ['food',       {en:'Food & Beverage',       am:'ምግብ እና መጠጥ'},    'fa-utensils',         ['food-beverage']],
  ['fashion',    {en:'Fashion & Apparel',     am:'ፋሽን'},           'fa-shirt',            ['fashion','general-retail']],
  ['banking',    {en:'Banking & Finance',     am:'ባንክ'},           'fa-building-columns', ['banking']],
  ['electronics',{en:'Electronics & Technology', am:'ኤሌክትሮኒክስ'}, 'fa-mobile-screen',    ['electronics']],
  ['home',       {en:'Home & Living',         am:'የቤት እቃ'},        'fa-couch',            ['home-living']],
  ['books',      {en:'Books & Stationery',    am:'መጻሕፍት'},        'fa-book-open',        ['books']],
  ['health',     {en:'Health & Sport',        am:'ጤናና ስፖርት'},     'fa-briefcase-medical',['healthcare','sports','eyewear']]
];
function groupKeys(gid){
  var g = CAT_GROUPS.filter(function(x){ return x[0]===gid; })[0];
  return g ? g[3] : null;
}
function groupCount(gid){
  if(gid==='verified'){
    var dailyIds = {}; dailyTenantSubset().forEach(function(tn){ dailyIds[tn.id]=true; });
    var seenT = {}, n = 0;
    ALL_PRODUCTS.forEach(function(p){
      if(p.hidden || !dailyIds[p.tenantId] || seenT[p.tenantId]) return;
      seenT[p.tenantId] = true; n++;
    });
    return n;
  }
  var keys = groupKeys(gid) || [];
  return ALL_PRODUCTS.filter(function(p){
    if(p.hidden) return false;
    var tn = tenant(p.tenantId);
    return tn && keys.indexOf(tn.catKey)>=0;
  }).length;
}
function renderFilterChips() {
  var el=$('ambFilterChips'); if(!el) return;
  var chips = '<button class="amb-chip'+(state.filter==='all'?' active':'')+'" onclick="ambFilter(\'all\')"><i class="fas fa-grip"></i> '+(state.lang==='am'?'ሁሉም':'All')+' <span class="amb-chip-ct">('+ALL_PRODUCTS.filter(function(p){return !p.hidden;}).length+')</span></button>';
  CAT_GROUPS.forEach(function(g){
    var val = g[0]==='verified' ? 'verified' : 'grp:'+g[0];
    chips += '<button class="amb-chip'+(state.filter===val?' active':'')+'" onclick="ambFilter(\''+val+'\')">'+
      '<i class="fas '+g[2]+'"></i> '+esc(g[1][state.lang]||g[1].en)+' <span class="amb-chip-ct">('+groupCount(g[0])+')</span></button>';
  });
  // if a single seller is being viewed (via Shop Products / search), show it as a removable chip
  var tnF = tenant(state.filter);
  if(tnF){
    chips += '<button class="amb-chip active" onclick="ambFilter(\'verified\')">'+
      '<i class="fas '+tnF.icon+'"></i> '+esc(nameFor(tnF))+' <span class="amb-chip-ct">('+tnF.products.length+')</span> <i class="fas fa-xmark"></i></button>';
  }
  el.innerHTML = chips;
}
window.ambFilter = function (key) {
  state.filter = key;
  renderFilterChips(); renderTenants(); renderProducts();
};

/* ── PRODUCT GRID ── */
function visibleProducts() {
  var dailyIds = null;
  if (state.filter==='verified') {
    dailyIds = {};
    dailyTenantSubset().forEach(function(tn){ dailyIds[tn.id] = true; });
  }
  var list = ALL_PRODUCTS.filter(function(p){
    if (p.hidden) return false;   // hidden: off the main grid, but still searchable, orderable & in floor listings
    if (state.filter==='verified') {
      if (!dailyIds[p.tenantId]) return false;   // only today's rotating 10%-per-floor sample of sellers
    } else if (state.filter!=='all') {
      if (('' + state.filter).indexOf('floor:') === 0) {
        var fl = state.filter.slice(6);
        var tn0 = tenant(p.tenantId);
        if (!tn0 || tn0.floor !== fl) return false;
      } else if (('' + state.filter).indexOf('grp:') === 0) {
        var keys = groupKeys(state.filter.slice(4)) || [];
        var tng = tenant(p.tenantId);
        if (!tng || keys.indexOf(tng.catKey) < 0) return false;
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
  // "Some of our products" (default view): exactly ONE product per seller in
  // today's rotating sample — not their whole catalog. Search/other filters
  // above still narrow within that same daily sample.
  if (state.filter==='verified') {
    var seen = {}, deduped = [];
    list.forEach(function(p){ if(!seen[p.tenantId]){ seen[p.tenantId]=true; deduped.push(p); } });
    list = deduped;
  }
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
      '<div class="amb-pcard-stars">'+(p.reviews?('<span class="s">'+stars(p.rating)+'</span> '+p.rating+' <span style="opacity:.6">('+p.reviews+')</span>'):('<span class="amb-new-pill sm"><i class="fas fa-sparkles"></i> '+(state.lang==='am'?'አዲስ':'New')+'</span>'))+'</div>'+
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
window.ambResetShop = function(){ state.filter='verified'; state.priceMax=0; state.priceMin=0; state.stockF='all'; state.ratingMin=0; state.floorF='all'; state.sort='featured'; state.search=''; var i=$('ambSearch'); if(i) i.value=''; var mi=$('ambMSearchIn'); if(mi) mi.value=''; renderFilterChips(); renderFilterBar(); renderProducts(); };

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
      '<p>'+(state.lang==='am'?'አንድ ሻጭ የወርቅ ባጅ የሚያገኘው አምባሳደር ማዕከል በአካል ካረጋገጠ በኋላ ብቻ ነው፦':'A seller earns the Verified badge only after Ambassador Shopping Mall confirms it in person:')+'</p>'+
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
/* ── appointment booking — collects the details first, then hands a complete
   request to WhatsApp. Service tenants (salons, wellness, clinics) benefit
   most, but any shop with WhatsApp can take a booking. ── */
window.ambBookAppointment = function(tid){
  var tn = tenant(tid); if(!tn || !tn.whatsapp) return;
  var am = state.lang==='am';
  var today = new Date(); today.setDate(today.getDate()+1);
  var min = today.toISOString().slice(0,10);
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-book-modal">'+
      '<div class="amb-book-ic"><i class="fas fa-calendar-check"></i></div>'+
      '<div class="amb-book-t">'+(am?'ቀጠሮ ይያዙ':'Book an Appointment')+'</div>'+
      '<div class="amb-book-s">'+esc(nameFor(tn))+' · '+esc(floorUnit(tn))+'</div>'+
      '<div class="amb-book-f"><label>'+(am?'ስምዎ':'Your name')+'</label>'+
        '<input id="ambBkName" placeholder="'+(am?'ስም':'Name')+'"></div>'+
      '<div class="amb-book-grid">'+
        '<div class="amb-book-f"><label>'+(am?'ቀን':'Date')+'</label>'+
          '<input type="date" id="ambBkDate" min="'+min+'" value="'+min+'"></div>'+
        '<div class="amb-book-f"><label>'+(am?'ሰዓት':'Time')+'</label>'+
          '<input type="time" id="ambBkTime" value="10:00"></div>'+
      '</div>'+
      '<div class="amb-book-f"><label>'+(am?'የሚፈልጉት አገልግሎት':'Service or reason')+'</label>'+
        '<input id="ambBkFor" placeholder="'+(am?'ለምሳሌ: ጸጉር፣ ምክክር':'e.g. haircut, consultation, viewing')+'"></div>'+
      '<div class="amb-book-f"><label>'+(am?'ተጨማሪ ማስታወሻ':'Anything else (optional)')+'</label>'+
        '<textarea id="ambBkNote" rows="2" placeholder="'+(am?'ማስታወሻ':'Notes')+'"></textarea></div>'+
      '<button class="amb-book-btn" onclick="ambSendBooking(\''+tn.id+'\')"><i class="fab fa-whatsapp"></i> '+
        (am?'በWhatsApp ይላኩ':'Send via WhatsApp')+'</button>'+
      '<div class="amb-book-note">'+(am?'መልእክቱ ተሞልቶ ይከፈታል — ከመላክዎ በፊት ማረም ይችላሉ።'
        :'WhatsApp opens pre-filled — you can edit it before sending.')+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};
window.ambSendBooking = function(tid){
  var tn = tenant(tid); if(!tn) return;
  var am = state.lang==='am';
  var g = function(id){ var e=$(id); return e ? e.value.trim() : ''; };
  var name=g('ambBkName'), date=g('ambBkDate'), time=g('ambBkTime'), forWhat=g('ambBkFor'), note=g('ambBkNote');
  if(!date || !time){ window.ambToast(am?'ቀን እና ሰዓት ይምረጡ':'Please pick a date and time','err'); return; }
  var lines = am
    ? ['ሰላም '+tn.name+'፣ ቀጠሮ መያዝ እፈልጋለሁ።','', 'ቀን: '+date, 'ሰዓት: '+time]
    : ['Hello '+tn.name+', I would like to book an appointment.','', 'Date: '+date, 'Time: '+time];
  if(forWhat) lines.push((am?'አገልግሎት: ':'For: ')+forWhat);
  if(name)    lines.push((am?'ስም: ':'Name: ')+name);
  if(note)    lines.push((am?'ማስታወሻ: ':'Note: ')+note);
  lines.push('', (am?'— በአምባሳደር ሾፒንግ ሞል ማውጫ በኩል':'— via the Ambassador Shopping Mall directory'));
  window.open('https://wa.me/'+tn.whatsapp+'?text='+encodeURIComponent(lines.join('\n')), '_blank');
  ambCloseAll();
  window.ambToast(am?'WhatsApp እየተከፈተ ነው…':'Opening WhatsApp…','suc');
};
window.ambShareTenant = function(tid){
  var tn=tenant(tid); if(!tn) return;
  ambTrack(tid, 'share');
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
  filterBar:renderFilterBar,
  wishBadge:updateWishBadge, i18n:applyI18n, langBtn:function(){ ambSetLang(state.lang); }
};
A.shade = shade;
A.nameFor = nameFor;
A.socialIcons = socialIcons;
A.floorsList = floorsList;

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
var nameFor=A.nameFor, socialIcons=A.socialIcons, FLOOR_AM=A.FLOOR_AM, floorsList=A.floorsList;

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
  // ── E-COMMERCE ON HOLD ── checkout isn't live yet; show the coming-soon
  // experience instead of actually adding to cart. Directory browsing,
  // seller contact (call/WhatsApp), and the seller portal all still work.
  window.ambComingSoon();
};
window.ambComingSoon = function(){
  var am = state.lang==='am';
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-soon-modal">'+
      '<div class="amb-soon-orb"><i class="fas fa-wand-magic-sparkles"></i></div>'+
      '<div class="amb-soon-t">'+(am?'የሚያምር ነገር በቅርቡ ይመጣል':'Something amazing is coming soon')+'</div>'+
      '<div class="amb-soon-s">'+(am
        ? 'የመስመር ላይ ግዢ በቅርቡ ይጀምራል። ለአሁን ግን ሱቆችን፣ ወለሎችንና ሻጮችን ማሰስ ይችላሉ — እና በቀጥታ በስልክ ወይም በWhatsApp ማነጋገር ይችላሉ።'
        : "Online checkout is on its way. For now, browse every floor and seller freely — and reach out directly by phone or WhatsApp any time.")+
      '</div>'+
      '<button class="amb-soon-btn" onclick="ambCloseAll()"><i class="fas fa-compass"></i> '+(am?'ማሰስ ቀጥል':'Keep Browsing')+'</button>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
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
    body.innerHTML='<div class="amb-cart-empty"><i class="fas fa-shopping-bag"></i><div style="font-weight:700">'+(state.lang==='am'?'ጋሪዎ ባዶ ነው':'Your cart is empty')+'</div><div style="font-size:.74rem">'+(state.lang==='am'?'ሱቆችን አስሱና ምርቶች ይጨምሩ':'Browse tenants and add products')+'</div></div>';
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
window.ambOpenCart = function(){ window.ambComingSoon(); };
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
        '<div class="amb-bank-row"><div><div class="amb-bank-row-l">'+(state.lang==='am'?'የሂሳብ ስም':'Account name')+'</div><div class="amb-bank-row-v" style="font-family:Outfit">'+esc(b.holder)+'</div></div></div>'+
        '<div class="amb-bank-row" style="background:var(--gold-tint);border-color:rgba(212,175,55,.3)"><div><div class="amb-bank-row-l">'+(state.lang==='am'?'የሚተላለፍ መጠን':'Amount to transfer')+'</div><div class="amb-bank-row-v" style="color:var(--wine)">'+fmt(grand)+'</div></div><button class="amb-copy" onclick="event.stopPropagation();ambCopy(\''+grand+'\')"><i class="fas fa-copy"></i></button></div>'+
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
window.ambOpenAdmin = function(topic){
  var a=BUILDING.admin; if(!a) return;
  var am = state.lang==='am';
  var topics = am
    ? [['Order issue','ትዕዛዝ ችግር'],['Payment issue','የክፍያ ችግር'],['Seller complaint','ስለ ሻጭ ቅሬታ'],['General question','አጠቃላይ ጥያቄ']]
    : [['Order issue','Order issue'],['Payment issue','Payment issue'],['Seller complaint','Seller complaint'],['General question','General question']];
  var msgBase = topic ? topic+' — ' : '';
  var waMsg = encodeURIComponent('Hello '+a.name+', '+msgBase+'I have a question about '+BUILDING.name+' online store.');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-admin-modal">'+
      '<div class="amb-admin-ic"><i class="fas fa-headset"></i><span class="amb-admin-dot"></span></div>'+
      '<div class="amb-admin-name">'+esc(am&&a.nameAm?a.nameAm:a.name)+'</div>'+
      '<div class="amb-admin-role">'+esc(a.role)+'</div>'+
      '<div class="amb-admin-badge"><i class="fas fa-circle"></i> '+esc(a.responseTime || (am?'ብዙ ጊዜ በደቂቃዎች ውስጥ ምላሽ ይሰጣል':'Usually replies within minutes'))+'</div>'+
      '<div class="amb-admin-topics">'+
        topics.map(function(tp){ return '<button class="amb-admin-topic" onclick="ambOpenAdmin(\''+tp[0].replace(/'/g,"\\'")+'\')">'+esc(tp[1])+'</button>'; }).join('')+
      '</div>'+
      '<div class="amb-admin-rows">'+
        '<a class="amb-admin-row" href="tel:'+esc(a.phone)+'"><span><i class="fas fa-phone"></i> '+L('callUs')+'</span><b>'+esc(a.phone)+'</b></a>'+
        '<a class="amb-admin-row" href="https://wa.me/'+esc(a.whatsapp)+'?text='+waMsg+'" target="_blank" rel="noopener"><span><i class="fab fa-whatsapp"></i> WhatsApp</span><b>'+esc(a.phone)+'</b></a>'+
        '<a class="amb-admin-row" href="https://t.me/'+esc(a.telegram)+'" target="_blank" rel="noopener"><span><i class="fab fa-telegram"></i> Telegram</span><b>@'+esc(a.telegram)+'</b></a>'+
        '<a class="amb-admin-row" href="mailto:'+esc(a.email)+'"><span><i class="fas fa-envelope"></i> '+L('emailUs')+'</span><b>'+esc(a.email)+'</b></a>'+
      '</div>'+
      '<div class="amb-admin-note"><i class="fas fa-circle-info"></i> '+(am
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
/* ── OFFICE FOR RENT — unoccupied units gallery ── */
/* real vacant units — flagged directly by Ambassador management. Ground/1st/2nd
   floor unit codes in the tenant directory were generated sequentially (the
   original tenant list didn't include real unit numbers for those floors),
   so these use the short-form codes as given rather than being force-matched
   against that sequential numbering — ask Ambassador to confirm/reconcile
   if a precise cross-reference is needed. No size/price is invented here;
   only what was actually provided. */
var AVAILABLE_OFFICES = [
  { unit:'G-25', floor:'Ground Floor', floorAm:'መሬት ወለል' },
  { unit:'G-27', floor:'Ground Floor', floorAm:'መሬት ወለል' },
  { unit:'F-26', floor:'1st Floor', floorAm:'1ኛ ፎቅ' },
  { unit:'S-20', floor:'2nd Floor', floorAm:'2ኛ ፎቅ' },
  { unit:'S-32', floor:'2nd Floor', floorAm:'2ኛ ፎቅ' },
  { unit:'FO-01', floor:'4th Floor', floorAm:'4ኛ ፎቅ' }
];
function vacantUnitsList(){
  var live = BUILDING.vacantUnits;
  if (live && live.length) {
    return live.map(function(v){ return { unit:v.unit, floor:v.floor, floorAm:FLOOR_AM[v.floor]||'' }; });
  }
  return AVAILABLE_OFFICES; // embedded fallback if BUILDING.vacantUnits hasn't loaded yet
}
/* shared card builder — used by both the standalone Vacancies section
   and the older modal, so the two can never drift apart */
function ambJobCardsHTML(jobs, am){
  return jobs.map(function(j){
      var badge = j.posterType==='mall' ? (am?'የሞል አስተዳደር':'Mall Management')
                : j.posterType==='bms'  ? (am?'የህንፃ ጥገና':'Building Operations')
                : esc(j.posterName||'');
      /* only prefix ETB when the poster typed a bare number — otherwise we
         end up with "ETB 8000 ETB / month" for realistic free-text input */
      var salTxt = ('' + (j.salary || '')).trim();
      var bareNum = /^[\d,. ]+$/.test(salTxt);
      var pay = salTxt ? (bareNum ? 'ETB ' + esc(salTxt) : esc(salTxt))
                       : (j.negotiable ? (am?'ሊደራደር የሚችል':'Negotiable') : '');
      var waMsg = encodeURIComponent((am?'ሰላም፣ ስለ ':'Hello, I would like to apply for the ')+j.position+(am?' የስራ ቦታ ማመልከት እፈልጋለሁ።':' position.'));
      /* every figure gets a label — a bare "8000" or "9:00–18:00" told the
         reader nothing about what it referred to */
      var rows='';
      function jobRow(icon, label, value){
        return '<div class="amb-job-row"><i class="fas '+icon+'"></i>'+
               '<span class="amb-job-k">'+esc(label)+'</span>'+
               '<span class="amb-job-v">'+value+'</span></div>';
      }
      if(pay)       rows+=jobRow('fa-money-bill-wave', am?'ደሞዝ':'Salary',
                        '<b class="amb-job-pay">'+pay+'</b>'+(j.salary&&j.negotiable?(am?' (ሊደራደር የሚችል)':' (negotiable)'):''));
      if(j.hours)   rows+=jobRow('fa-clock', am?'የስራ ሰዓት':'Working hours', esc(j.hours));
      if(j.employmentType) rows+=jobRow('fa-briefcase', am?'የቅጥር አይነት':'Employment', esc(j.employmentType));
      if(j.location)rows+=jobRow('fa-location-dot', am?'ቦታ':'Location', esc(j.location));
      if(j.deadline)rows+=jobRow('fa-calendar-day', am?'ማመልከቻ እስከ':'Apply by', esc(j.deadline));
      var acts='';
      if(j.contactPhone)    acts+='<a href="tel:'+esc(j.contactPhone.replace(/\s/g,''))+'" class="amb-job-call"><i class="fas fa-phone"></i> '+(am?'ይደውሉ':'Call')+'</a>';
      if(j.contactWhatsapp) acts+='<a href="https://wa.me/'+esc(j.contactWhatsapp)+'?text='+waMsg+'" target="_blank" rel="noopener" class="amb-job-wa"><i class="fab fa-whatsapp"></i> '+(am?'ያመልክቱ':'Apply')+'</a>';
      return '<div class="amb-job-card">'+
        '<div class="amb-job-top '+esc(j.posterType)+'">'+
          '<div class="amb-job-pos">'+esc(j.position)+'</div>'+
          '<div class="amb-job-by"><i class="fas fa-building"></i> '+badge+'</div>'+
        '</div>'+
        '<div class="amb-job-body">'+
          (rows?'<div class="amb-job-rows">'+rows+'</div>':'')+
          (j.description?'<div class="amb-job-descwrap"><span class="amb-job-k">'+(am?'መግለጫ':'Description')+
            '</span><div class="amb-job-desc">'+esc(j.description)+'</div></div>':'')+
          (acts?'<div class="amb-job-acts">'+acts+'</div>':'')+
        '</div></div>';
  }).join('');
}

/* ── Vacancies rendered inline as its own page section ── */
function renderJobsSection(){
  var grid = $('ambJobSection'); if(!grid) return;
  var am = state.lang==='am';
  grid.innerHTML = '<div class="amb-job-empty"><i class="fas fa-spinner fa-spin"></i>'+(am?'በመጫን ላይ…':'Loading…')+'</div>';
  A.api('/api/jobs').then(function(d){
    var jobs = d.jobs || [];
    var sect = document.getElementById('ambJobs');
    if(!jobs.length){
      /* nothing to advertise: collapse the whole section rather than leave a
         wide empty band on a large screen. Small screens keep a short notice. */
      if(sect) sect.classList.add('amb-jobs-empty');
      grid.innerHTML = '<div class="amb-job-empty"><i class="fas fa-briefcase"></i> '+
        (am?'በአሁኑ ጊዜ ክፍት የስራ ቦታ የለም።':'No job posts right now.')+'</div>';
      return;
    }
    if(sect) sect.classList.remove('amb-jobs-empty');
    grid.innerHTML = ambJobCardsHTML(jobs, am);
  }).catch(function(){
    grid.innerHTML = '<div class="amb-job-empty"><i class="fas fa-triangle-exclamation"></i>'+
      (am?'ማስታወቂያዎችን መጫን አልተቻለም።':'Could not load vacancies right now.')+'</div>';
  });
}
A.renderJobsSection = renderJobsSection;
/* fire-and-forget analytics — a failed beacon must never affect browsing */
function ambTrack(tid, kind){
  if(!tid) return;
  try{
    var url = '/api/tenant/'+encodeURIComponent(tid)+'/event';
    var body = JSON.stringify({kind:kind});
    // sendBeacon survives the page being closed mid-share; fetch is the fallback
    if(navigator.sendBeacon){
      navigator.sendBeacon(url, new Blob([body],{type:'application/json'}));
    } else {
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});
    }
  }catch(e){}
}
A.track = ambTrack;

/* ════════════════════════════════════════════════════════════════
   LEFT RAIL + INFO SHEET
   Mall-information sections were taken off the home page so the
   storefront leads with shops and products. They live inside
   #ambSheetStage and are reached from the rail (desktop) or the
   hamburger drawer (phones). Ids are unchanged, so every existing
   renderer still finds its element.
═══════════════════════════════════════════════════════════════════ */
var RAIL_PAGES = [
  { id:'ambFloorsPage',icon:'fa-layer-group',      en:'Floors',         am:'ፎቆች' },
  { id:'__directory',  icon:'fa-list-ul',          en:'Directory',      am:'ማውጫ' },
  { id:'ambServices',  icon:'fa-star',             en:'Amenities',      am:'አገልግሎቶች' },
  { id:'ambVisit',     icon:'fa-map-location-dot', en:'Getting Here',   am:'እንዴት ይድረሱ' },
  { id:'sep' },
  { id:'ambRent',      icon:'fa-key',              en:'Office for Rent',am:'ለኪራይ ቢሮ' },
  { id:'ambJobs',      icon:'fa-briefcase',        en:'Vacancies',      am:'ክፍት የስራ ቦታ' },
  { id:'ambManagement',icon:'fa-building-user',    en:'Management',     am:'አስተዳደር' },
  { id:'ambSpotlight', icon:'fa-video',            en:'Media',          am:'ሚዲያ' },
  { id:'ambShare',     icon:'fa-star-half-stroke', en:'Reviews',        am:'ግምገማዎች' },
  { id:'ambPartners',  icon:'fa-handshake',        en:'Partners',       am:'አጋሮች' }
];
function railLabel(p){ return state.lang==='am' ? p.am : p.en; }
function railMeta(id){ for(var i=0;i<RAIL_PAGES.length;i++) if(RAIL_PAGES[i].id===id) return RAIL_PAGES[i]; return null; }

window.ambSheetOpen = function(id){
  if(id==='__directory') return window.ambOpenDirectory();
  var meta = railMeta(id); if(!meta) return;
  var stage=$('ambSheetStage'); if(!stage) return;
  stage.querySelectorAll('.amb-sheet-page').forEach(function(p){
    p.classList.toggle('on', p.getAttribute('data-page')===id);
  });
  var ttl=$('ambSheetTitle'); if(ttl) ttl.textContent = railLabel(meta);
  var ic=$('ambSheetIcon'); if(ic) ic.className = 'fas '+meta.icon;
  document.querySelectorAll('#ambRail .amb-rail-btn').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-target')===id);
  });
  $('ambSheet').classList.add('on');
  $('ambSheetScrim').classList.add('on');
  document.body.style.overflow='hidden';
  stage.scrollTop = 0;
  // these render on demand so the sheet always shows current data
  if(id==='ambJobs' && A.renderJobsSection) A.renderJobsSection();
  if(id==='ambServices' && A.render && A.render.services) A.render.services();
  if(id==='ambManagement') renderManagementPage();
  if(id==='ambFloorsPage') renderFloorsPage();
  if(id==='ambShare') wireGoogleReviewsLink();
};
function renderManagementPage(){
  var p=$('ambMgmtPhone'); if(p) p.textContent = BUILDING.phone||'';
  var c=$('ambMgmtCall'); if(c && BUILDING.phone) c.href = 'tel:'+BUILDING.phone.replace(/\s/g,'');
  var l=$('ambMgmtLoc'); if(l) l.textContent = BUILDING.location||'';
  var h=$('ambMgmtHours'); if(h) h.textContent = BUILDING.hours || (state.lang==='am'?'ሰኞ–እሁድ 9:00–21:00':'Mon–Sun, 9:00 AM–9:00 PM');
}
function renderFloorsPage(){
  var grid=$('ambFloorsGrid'); if(!grid) return;
  var byFloor={};
  BUILDING.tenants.forEach(function(t){ if(!t.hidden) (byFloor[t.floor]=byFloor[t.floor]||[]).push(t); });
  grid.innerHTML = floorsList().map(function(fl){
    var n=(byFloor[fl]||[]).length;
    return '<button class="amb-floors-card" onclick="ambSheetClose();ambOpenFloorPanel(\''+fl+'\')">'+
      '<i class="fas fa-building"></i><b>'+esc(fl)+'</b>'+
      '<span>'+n+' '+(state.lang==='am'?'ሱቆች':'shops')+'</span></button>';
  }).join('');
}
function wireGoogleReviewsLink(){
  var a=$('ambGoogleReviews'); if(!a) return;
  // a real Google Maps SEARCH url built from the mall's actual name + address —
  // never a fabricated place id or invented review content
  var q = encodeURIComponent((BUILDING.name||'Ambassador Shopping Mall')+' '+(BUILDING.location||''));
  a.href = 'https://www.google.com/maps/search/?api=1&query='+q;
}
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && document.getElementById('ambSheet') &&
     document.getElementById('ambSheet').classList.contains('on')) window.ambSheetClose();
});
window.ambSheetClose = function(){
  var sh=$('ambSheet'); if(sh) sh.classList.remove('on');
  var sc=$('ambSheetScrim'); if(sc) sc.classList.remove('on');
  document.querySelectorAll('#ambRail .amb-rail-btn').forEach(function(b){ b.classList.remove('on'); });
  // another overlay may still be open — only release scrolling then
  if(!document.querySelector('#amb-store .amb-modal.on, #amb-store .amb-cart.open, #amb-store .amb-floor-panel.open'))
    document.body.style.overflow='';
};
function renderRail(){
  var rail=$('ambRail'); if(!rail) return;
  rail.innerHTML = RAIL_PAGES.map(function(p){
    if(p.id==='sep') return '<span class="amb-rail-sep"></span>';
    return '<button type="button" class="amb-rail-btn" data-target="'+p.id+'" '+
      'onclick="ambSheetOpen(\''+p.id+'\')" aria-label="'+esc(railLabel(p))+'">'+
      '<i class="fas '+p.icon+'"></i>'+
      '<span class="amb-rail-lbl">'+esc(railLabel(p))+'</span></button>';
  }).join('');
}
/* the same items inside the mobile hamburger */
function renderRailDrawer(){
  var host=$('ambRailDrawerLinks'); if(!host) return;
  host.innerHTML = RAIL_PAGES.filter(function(p){ return p.id!=='sep'; }).map(function(p){
    return '<a onclick="ambCloseMobileMenu();ambSheetOpen(\''+p.id+'\')">'+
      '<i class="fas '+p.icon+'"></i> <span>'+esc(railLabel(p))+'</span></a>';
  }).join('');
}
A.renderRail = renderRail;
A.renderRailDrawer = renderRailDrawer;

/* ── FULL DIRECTORY — every office, floor by floor ── */
window.ambOpenDirectory = function(){
  var am = state.lang==='am';
  var byFloor = {};
  BUILDING.tenants.filter(function(t){ return !t.hidden; }).forEach(function(t){
    (byFloor[t.floor] = byFloor[t.floor] || []).push(t);
  });
  var order = floorsList();
  var html = order.map(function(fl){
    var list = byFloor[fl] || [];
    if(!list.length) return '';
    list.sort(function(a,b){ return String(a.unit||'').localeCompare(String(b.unit||''), undefined, {numeric:true}); });
    return '<div class="amb-dir-floor">'+
      '<div class="amb-dir-floor-h"><b>'+esc(fl)+'</b>'+
        '<span>'+list.length+' '+(am?'ሱቆች':'shops')+'</span></div>'+
      '<div class="amb-dir-grid">'+ list.map(function(t){
        return '<button class="amb-dir-item" onclick="ambSheetClose();ambOpenTenant(\''+t.id+'\')">'+
          '<span class="amb-dir-unit">'+esc(t.unit||'')+'</span>'+
          '<span class="amb-dir-name">'+esc(nameFor(t))+'</span>'+
          '<span class="amb-dir-cat">'+esc(t.cat||'')+'</span>'+
        '</button>';
      }).join('') +'</div></div>';
  }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div class="amb-dir-wrap">'+
      '<div class="amb-dir-head">'+
        '<h3>'+(am?'ሙሉ የህንፃ ማውጫ':'Full Building Directory')+'</h3>'+
        '<p>'+BUILDING.tenants.length+' '+(am?'ሱቆች በ':'shops across')+' '+order.length+' '+(am?'ፎቆች':'floors')+'</p>'+
        '<input class="amb-dir-search" id="ambDirSearch" placeholder="'+(am?'ሱቅ ወይም ምድብ ይፈልጉ…':'Search shop, unit or category…')+'" oninput="ambDirFilter(this.value)">'+
      '</div>'+
      '<div class="amb-dir-body" id="ambDirBody">'+html+'</div>'+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on');
  document.body.style.overflow='hidden';
};
window.ambDirFilter = function(q){
  q=(q||'').toLowerCase().trim();
  document.querySelectorAll('#ambDirBody .amb-dir-item').forEach(function(el){
    el.style.display = !q || el.textContent.toLowerCase().indexOf(q)>=0 ? '' : 'none';
  });
  document.querySelectorAll('#ambDirBody .amb-dir-floor').forEach(function(fl){
    var any = Array.prototype.some.call(fl.querySelectorAll('.amb-dir-item'), function(i){ return i.style.display!=='none'; });
    fl.style.display = any ? '' : 'none';
  });
};

/* ── public job / vacancy board — posted by shops, mall management, or BMS ── */
window.ambOpenJobs = function(){
  var am = state.lang==='am';
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div style="padding:26px 24px 6px">'+
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:1.5rem;font-weight:900;color:var(--wine-d);margin-bottom:6px">'+
        (am?'የስራ ማስታወቂያ':'Job Vacancies')+'</h3>'+
      '<p style="font-size:.8rem;color:var(--mid)">'+
        (am?'ከሱቆች፣ ከሞሉ አስተዳደር እና ከህንፃ ጥገና ክፍል የተለጠፉ ክፍት የስራ ቦታዎች።'
           :'Openings posted by shops inside the mall, by Ambassador management, and by building operations.')+'</p>'+
    '</div>'+
    '<div class="amb-job-grid" id="ambJobGrid"><div class="amb-job-empty"><i class="fas fa-spinner fa-spin"></i>'+
      (am?'በመጫን ላይ…':'Loading…')+'</div></div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';

  A.api('/api/jobs').then(function(d){
    var grid=$('ambJobGrid'); if(!grid) return;          // modal may already be closed
    var jobs=(d.jobs||[]);
    if(!jobs.length){
      grid.innerHTML='<div class="amb-job-empty"><i class="fas fa-briefcase"></i>'+
        (am?'በአሁኑ ጊዜ ክፍት የስራ ቦታ የለም። እባክዎ በኋላ ይመልከቱ።'
           :'No openings posted right now — please check back soon.')+'</div>';
      return;
    }
    grid.innerHTML = ambJobCardsHTML(jobs, am);
  }).catch(function(){
    var grid=$('ambJobGrid');
    if(grid) grid.innerHTML='<div class="amb-job-empty"><i class="fas fa-triangle-exclamation"></i>'+
      (am?'ማስታወቂያዎችን መጫን አልተቻለም።':'Could not load vacancies right now.')+'</div>';
  });
};

window.ambOpenAvailableOffices = function(){
  var am = state.lang==='am';
  var cards = vacantUnitsList().map(function(o){
    var waMsg = encodeURIComponent((am?'ሰላም፣ ስለ ቢሮ ':'Hello, I am interested in office ')+o.unit+' ('+o.floor+') '+(am?'ፍላጎት አለኝ።':'that is for rent.'));
    var meta = esc(am?o.floorAm:o.floor) + (o.size ? ' · '+esc(o.size) : '');
    return '<div class="amb-off-card">'+
      '<div class="amb-off-pic'+(o.img?'':' amb-off-pic-empty')+'"'+(o.img?' style="background-image:url(\''+o.img+'\')"':'')+'>'+
        (o.img?'':'<i class="fas fa-door-open"></i>')+
        '<span class="amb-off-badge">'+(am?'ክፍት':'Available')+'</span>'+
      '</div>'+
      '<div class="amb-off-body">'+
        '<h5>'+(am?'ቢሮ ':'Office ')+esc(o.unit)+'</h5>'+
        '<div class="amb-off-meta">'+meta+'</div>'+
        (o.price?'<div class="amb-off-price">'+esc(o.price)+'</div>':'<div class="amb-off-price amb-off-price-tbd">'+(am?'ዋጋ ለማወቅ ያግኙን':'Contact for pricing')+'</div>')+
        '<a href="https://wa.me/251926785987?text='+waMsg+'" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> '+(am?'ይጠይቁ':'Inquire')+'</a>'+
      '</div>'+
    '</div>';
  }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div style="padding:26px 24px 6px">'+
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:1.5rem;font-weight:900;color:var(--wine-d);margin-bottom:6px">'+(am?'ክፍት ቢሮዎች':'Available Offices')+'</h3>'+
      '<p style="font-size:.8rem;color:var(--mid)">'+(am?'በአሁኑ ጊዜ ለኪራይ ክፍት የሆኑ ቢሮዎች — ለመጎብኘት ይደውሉልን ወይም መልዕክት ይላኩ።':'Currently unoccupied offices open for rent — call or message us to arrange a visit.')+'</p>'+
    '</div>'+
    '<div class="amb-off-grid">'+cards+'</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};

/* ── SHARE YOUR EXPERIENCE — feedback form (mailto, no backend needed) ── */
/* pure builder (kept separate from the DOM/navigation side effect so it can be unit-tested) */
function buildFeedbackMailto(name, email, phone, msg){
  var to = (BUILDING.admin && BUILDING.admin.email) || 'support@ambassadormall.et';
  var subject = 'Feedback from ' + (name || 'a visitor') + ' — ' + (BUILDING.name || 'Ambassador Mall');
  var bodyLines = [msg, ''];
  if (name) bodyLines.push('Name: ' + name);
  if (email) bodyLines.push('Email: ' + email);
  if (phone) bodyLines.push('Phone: ' + phone);
  return 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyLines.join('\n'));
}
A.buildFeedbackMailto = buildFeedbackMailto;
window.ambSubmitFeedback = function(){
  var name = ($('ambFbName')||{}).value || '';
  var email = ($('ambFbEmail')||{}).value || '';
  var phone = ($('ambFbPhone')||{}).value || '';
  var msg = (($('ambFbMsg')||{}).value || '').trim();
  if (!msg) {
    ambToast(state.lang==='am' ? 'እባክዎ መልዕክትዎን ይጻፉ' : 'Please write your message', 'err');
    var ta=$('ambFbMsg'); if(ta) ta.focus();
    return;
  }
  window.location.href = buildFeedbackMailto(name, email, phone, msg);
  ambToast(state.lang==='am' ? 'ኢሜይል ተከፍቷል — ልከው ይላኩ!' : 'Your email app is opening — hit send!', 'suc');
};
window.ambShareMall = function(){
  var url = (typeof location!=='undefined') ? (location.origin+location.pathname) : '';
  var text = state.lang==='am'
    ? 'ለተጠቃሚው ምቹ የሆነውን Ambassador Shopping Mall ድህረገፅ ይመልከቱ'
    : 'Check out Ambassador Shopping Mall — verified tenants, real addresses:';
  if (navigator.share) {
    navigator.share({ title: BUILDING.name || 'Ambassador Shopping Mall', text: text, url: url }).catch(function(){});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function(){
      ambToast(state.lang==='am' ? 'ማገናኛ ተቀድቷል!' : 'Link copied!');
    }).catch(function(){ window.open('sms:?body='+encodeURIComponent(text+' '+url)); });
    return;
  }
  window.open('sms:?body='+encodeURIComponent(text+' '+url));
};
window.ambOpenHow = function(){
  var steps = state.lang==='am' ? [
    ['fa-cart-plus','ወደ ጋሪ ያክሉ','ከማንኛውም ሻጭ ምርቶችን ይመልከቱና የሚወዱትን ያክሉ። ጋሪዎ ዕቃዎችን በሻጭ በራስ-ሰር ይመድባል።'],
    ['fa-building-columns','ባንክ ይምረጡ','እያንዳንዱ ሻጭ የራሱን CBE፣ አዋሽ፣ አቢሲኒያ እና ቴሌብር አካውንት ይዘረዝራል። አንዱን መርጠው ጠቅላላውን ያስተላልፉ።'],
    ['fab fa-whatsapp','ትዕዛዝ ያረጋግጡ','የክፍያ ማስረጃዎን በWhatsApp ለሻጩ ይላኩ — ወይም ደረሰኝዎን ብቻ ያውርዱ።'],
    ['fa-box-open','ይረከቡ','ሻጩ አረጋግጦ መረከቢያ ወይም መላኪያ ያዘጋጃል። ትዕዛዙ በጀርባ ይመዘገባል።']
  ] : [
    ['fa-cart-plus','Add to Cart','Browse products from any seller and add what you like. Your cart groups items by tenant automatically.'],
    ['fa-building-columns','Pick a Bank','Each tenant lists their own CBE, Bank of Abyssinia & Telebirr accounts. Choose one and transfer the total.'],
    ['fab fa-whatsapp','Confirm Order','Send your payment proof to the seller on WhatsApp — or just download your invoice if you prefer.'],
    ['fa-box-open','Get It','The seller confirms and arranges pickup or delivery. The order is logged to them in the background.']
  ];
  var rows = steps.map(function(st,i){
    var fa = st[0].indexOf('fab')===0 ? st[0] : 'fas '+st[0];
    return '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px">'+
      '<div style="width:40px;height:40px;border-radius:12px;background:var(--wine-tint);color:var(--wine);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="'+fa+'"></i></div>'+
      '<div><div style="font-weight:800;font-size:.9rem;color:var(--ink);margin-bottom:3px">'+(i+1)+'. '+esc(st[1])+'</div>'+
      '<div style="font-size:.8rem;color:var(--mid);line-height:1.6">'+esc(st[2])+'</div></div></div>';
  }).join('');
  $('ambProdModalBox').innerHTML =
    '<button class="amb-modal-x" onclick="ambCloseAll()"><i class="fas fa-times"></i></button>'+
    '<div style="padding:28px 26px 20px">'+
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:1.6rem;font-weight:900;color:var(--wine-d);margin-bottom:6px">'+esc(L('howTitle'))+'</h3>'+
      '<p style="font-size:.8rem;color:var(--mid);margin-bottom:20px">'+esc(L('howSub'))+'</p>'+rows+
    '</div>';
  $('ambProdModal').classList.add('on'); $('ambOverlay').classList.add('on'); document.body.style.overflow='hidden';
};
window.ambOpenTos = function(){ var lg=BUILDING.legal; legalModal(lg.tosTitle, lg.tos, lg.updated); };
window.ambOpenPrivacy = function(){ var lg=BUILDING.legal; legalModal(lg.privacyTitle, lg.privacy, lg.updated); };

/* ── ACCOUNT: Google sign-in ──
   REAL when the server has GOOGLE_CLIENT_ID: loads Google Identity Services,
   renders the official button, and the server verifies the ID token + sets a
   session cookie. Without a client ID, a clearly-labeled demo session is used.
   Every failure mode (script blocked, init throws, slow network) surfaces a
   visible fallback instead of leaving a blank box — see ambGsiFallback(). */
var gsiLoaded = false, gsiFailed = false;
function loadGsi(cb, onerr){
  if (gsiFailed) { onerr && onerr(); return; }
  if (window.google && window.google.accounts && window.google.accounts.id) { cb(); return; }
  if (gsiLoaded) { setTimeout(function(){ loadGsi(cb, onerr); }, 200); return; }
  gsiLoaded = true;
  var s=document.createElement('script');
  s.src='https://accounts.google.com/gsi/client'; s.async=true; s.defer=true;
  s.onload=cb;
  s.onerror=function(){ gsiLoaded=false; gsiFailed=true; onerr && onerr(); };
  document.head.appendChild(s);
  // belt-and-braces: some ad/privacy blockers neither fire onerror nor onload —
  // if nothing has happened in 6s, treat it as failed so the UI doesn't hang blank
  setTimeout(function(){
    if (!(window.google && window.google.accounts && window.google.accounts.id)) {
      gsiFailed = true; onerr && onerr();
    }
  }, 6000);
}
function ambGsiFallback(reason){
  var host=$('ambGsiHost'); if(!host) return;
  var am = state.lang==='am';
  host.innerHTML =
    '<div style="width:100%;text-align:center">'+
      '<div style="font-size:.74rem;color:var(--mid);margin-bottom:10px">'+
        (am ? 'የGoogle ግባ ማገልገል አልተጫነም (ምናልባት ማገጃ ወይም የግንኙነት ችግር)።' : 'Google sign-in couldn\'t load (maybe a blocker or connection issue).')+
      '</div>'+
      '<button class="amb-google-btn" onclick="ambOpenSignIn()"><i class="fas fa-rotate-right"></i> '+(am?'እንደገና ይሞክሩ':'Try again')+'</button>'+
    '</div>';
}
A.ambGsiFallback = ambGsiFallback;   // exposed for testability
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
        ? '<div id="ambGsiHost" style="display:flex;justify-content:center;min-height:44px"><div class="amb-gsi-spinner"></div></div>'
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
        if(host){
          host.innerHTML='';
          google.accounts.id.renderButton(host, { theme:'outline', size:'large', shape:'pill', width:280 });
          // renderButton fails silently on a bad/misconfigured client_id (e.g. wrong
          // Authorized JavaScript origin) — if the host is still empty a beat later,
          // treat it the same as a load failure instead of leaving a blank box
          setTimeout(function(){ if(host && !host.firstChild){ ambGsiFallback('render-empty'); } }, 1200);
        }
      }catch(e){ ambGsiFallback('init-threw'); }
    }, function(){ ambGsiFallback('load-failed'); });
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
  // mirror the same state into the mobile hamburger drawer's account row
  var dIc=$('ambMDrawerAccount'), dName=$('ambMDrawerAcctName'), dSub=$('ambMDrawerAcctSub');
  if(dIc){
    var icEl = dIc.querySelector('.amb-mdrawer-account-ic');
    if(state.user){
      var ini2=(state.user.name||'?').split(' ').slice(0,2).map(function(w){return w.charAt(0);}).join('');
      if(icEl) icEl.innerHTML = esc(ini2);
      if(dName) dName.textContent = state.user.name || L('myAccount');
      if(dSub) dSub.textContent = state.user.email || '';
      dIc.onclick = function(){ ambCloseMobileMenu(); window.ambOpenAccount(); };
    } else {
      if(icEl) icEl.innerHTML = '<i class="fas fa-user"></i>';
      if(dName) dName.textContent = L('signIn');
      if(dSub) dSub.textContent = state.lang==='am' ? 'ለፈጣን ክፍያ ዝርዝሮችዎን ያስቀምጡ' : 'Save details for faster checkout';
      dIc.onclick = function(){ ambCloseMobileMenu(); window.ambOpenSignIn(); };
    }
  }
  // prefill checkout name/phone if empty
  if(state.user){
    if(!state.coData.name && state.user.name) state.coData.name=state.user.name;
  }
}
A.renderAccountUI = renderAccountUI;

/* ── mobile hamburger drawer: login, tenants, shop, services, orders, cart, wishlist, language ── */
window.ambOpenMobileMenu = function(){
  var d=$('ambMDrawer'), sc=$('ambMDrawerScrim'); if(!d) return;
  var logo=$('ambMDrawerLogo'), nm=$('ambMDrawerName');
  if(logo && BUILDING.logo) logo.src = BUILDING.logo;
  if(nm && BUILDING.name) nm.textContent = BUILDING.name;
  var cb=$('ambMDrawerCartBadge'); if(cb) cb.textContent = ($('ambCartBadge')||{}).textContent || '0';
  var wb=$('ambMDrawerWishBadge'); if(wb) wb.textContent = ($('ambWishBadge')||{}).textContent || '0';
  var lt=$('ambMDrawerLangTxt'); if(lt) lt.textContent = state.lang==='am' ? 'English / አማርኛ' : 'አማርኛ / English';
  d.classList.add('open'); if(sc) sc.classList.add('on');
  document.body.style.overflow='hidden';
};
window.ambCloseMobileMenu = function(){
  var d=$('ambMDrawer'), sc=$('ambMDrawerScrim'); if(!d) return;
  d.classList.remove('open'); if(sc) sc.classList.remove('on');
  var modalOpen = document.querySelector('#amb-store .amb-modal.on, #amb-store .amb-cart.open, #amb-store .amb-floor-panel.open, #amb-store .amb-msearch.on');
  if(!modalOpen) document.body.style.overflow='';
};
window.ambMNav = function(id){ ambCloseMobileMenu(); ambScrollTo(id); };


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
  if(A.renderJobsSection) A.renderJobsSection();
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
    A.render.onSale(); A.render.filterChips(); A.render.filterBar(); A.render.products(); A.render.heroVisual(); A.render.i18n();
    if (A.renderRail){ try{ A.renderRail(); A.renderRailDrawer(); }catch(e){ console.error('rail render failed, rest of page unaffected:', e); } }
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
  /* ── Lenis smooth scroll (github.com/darkroomengineering/lenis) ──
     Progressive: if the CDN script didn't load, everything falls back to
     native smooth scrolling. Overlay scrollers keep native behavior via
     data-lenis-prevent, and reduced-motion users get no smoothing at all. */
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
  if (typeof Lenis !== 'undefined' && !reduceMotion) {
    try {
      A.lenis = new Lenis({ autoRaf: true, duration: 1.1, smoothWheel: true });
    } catch(e) { A.lenis = null; }
  }
  // overlay scroll areas stay native so panels/modals scroll normally
  ['ambFpBody','ambMSearchBody','ambSearchDrop','ambProdModalBox','ambCartBody','ambCoBody'].forEach(function(id){
    var el = A.$(id); if (el) el.setAttribute('data-lenis-prevent','');
  });
  document.querySelectorAll('#amb-store .amb-modal, #amb-store .amb-cart, #amb-store .amb-floor-panel').forEach(function(el){
    el.setAttribute('data-lenis-prevent','');
  });
  // scroll-reveal: sections fade up; grids stagger their children
  if ('IntersectionObserver' in window && !reduceMotion) {
    var staggerSel = ['.amb-vibe-lines','.amb-mosaic','.amb-spot-grid','.amb-help-grid','.amb-steps'];
    staggerSel.forEach(function(sel){
      document.querySelectorAll('#amb-store '+sel).forEach(function(el){ el.classList.add('amb-stagger'); });
    });
    var revealEls = [];
    document.querySelectorAll('#amb-store section.amb-section > .amb-container, #amb-store .amb-trust-band, #amb-store .amb-partners').forEach(function(el){
      el.classList.add('amb-reveal'); revealEls.push(el);
    });
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) {
          en.target.classList.add('amb-reveal-in');
          en.target.querySelectorAll('.amb-stagger').forEach(function(g){ g.classList.add('amb-reveal-in'); });
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function(el){ io.observe(el); });
  }
  // gentle hero parallax driven by the Lenis scroll event (desktop only)
  if (A.lenis && window.innerWidth > 900) {
    var heroVis = document.querySelector('#amb-store .amb-hero-visual');
    var heroCar = A.$('ambHeroCarouselSlot');
    A.lenis.on('scroll', function(e){
      var y = e.scroll || 0;
      if (y < 900) {
        if (heroVis) heroVis.style.transform = 'translateY(' + (y * 0.10) + 'px)';
        if (heroCar) heroCar.style.transform = 'translateY(' + (y * 0.05) + 'px)';
      }
    });
  }

  // clicking the dimmed area outside any modal box closes that window
  document.querySelectorAll('#amb-store .amb-modal').forEach(function(m){
    m.addEventListener('click', function(e){
      if(e.target===m){
        if(m.id==='ambCoModal'){ window.ambCloseCheckout(); }
        else window.ambCloseAll();
      }
    });
  });
  // Escape closes floor panel / mobile search / search dropdown; Enter picks first result
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){
      var md=A.$('ambMDrawer');
      if(md && md.classList.contains('open')){ window.ambCloseMobileMenu(); return; }
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

/* ════════════════════════════════════════════════════════════════
   PART 5 — PWA: installable app, offline shell, install prompt
   The service worker is registered only over http(s) (never file://)
   and only for the public storefront — admin/seller/bms stay live.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var A = window.__AMB;

  // ── register the service worker ──
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').catch(function(){ /* offline support is optional */ });
    });
  }

  // ── "Install app" button, shown only when the browser says it's installable ──
  var deferredPrompt = null;
  function installBtn(){ return document.getElementById('ambInstallBtn'); }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();               // keep Chrome's mini-infobar from stealing the moment
    deferredPrompt = e;
    var b = installBtn();
    if (b) b.style.display = 'inline-flex';
    var d = document.getElementById('ambInstallDrawerBtn');
    if (d) d.style.display = 'flex';
  });

  window.ambInstallApp = function(){
    if (!deferredPrompt) {
      // iOS Safari never fires beforeinstallprompt — tell people how to do it manually
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      window.ambToast(
        isIOS ? (A.state.lang==='am'
                  ? 'ለመጫን: የShare ቁልፍ ➜ "Add to Home Screen" ይንኩ'
                  : 'To install: tap Share ➜ "Add to Home Screen"')
              : (A.state.lang==='am'
                  ? 'ለመጫን የአሳሽዎን ምናሌ ይጠቀሙ'
                  : 'Use your browser menu ➜ "Install app"'),
        'suc');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(){
      deferredPrompt = null;
      var b = installBtn(); if (b) b.style.display = 'none';
      var d = document.getElementById('ambInstallDrawerBtn'); if (d) d.style.display = 'none';
    });
  };

  // once installed, stop advertising it
  window.addEventListener('appinstalled', function(){
    deferredPrompt = null;
    var b = installBtn(); if (b) b.style.display = 'none';
    var d = document.getElementById('ambInstallDrawerBtn'); if (d) d.style.display = 'none';
    if (window.ambToast) window.ambToast(
      A.state.lang==='am' ? 'መተግበሪያው ተጭኗል!' : 'App installed — find it on your home screen!', 'suc');
  });
})();
