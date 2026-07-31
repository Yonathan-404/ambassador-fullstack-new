const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(__dirname+'/seller_live.html','utf8');
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:3233/seller.html', resources:'usable' });
const w = dom.window, d = w.document;
let cookieJar = '';
w.fetch = async (url, opts) => {
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, cookieJar ? {Cookie: cookieJar} : {});
  const r = await fetch(new URL(url, 'http://localhost:3233/seller.html'), opts);
  const setCookie = r.headers.get('set-cookie');
  if (setCookie) cookieJar = setCookie.split(';')[0];
  return r;
};
const ok=(n,c)=>console.log((c?'PASS':'FAIL')+'  '+n);

async function run(){
  await new Promise(r=>setTimeout(r,300));
  d.getElementById('ph').value = '251911201616';
  d.getElementById('code').value = '861226';
  await w.doLogin();
  await new Promise(r=>setTimeout(r,400));
  ok('login rendered the app shell (tabs present)', d.querySelectorAll('.tabs button').length===3);
  ok('shop name shown in header after login', d.querySelector('.top h1') && d.querySelector('.top h1').textContent.indexOf('Lalibela')>=0);

  // switch to profile tab via the actual button click path
  const profileBtn = Array.from(d.querySelectorAll('.tabs button')).find(b=>b.textContent.indexOf('Shop Profile')>=0);
  ok('Shop Profile tab button exists', !!profileBtn);
  profileBtn.click();
  await new Promise(r=>setTimeout(r,500));
  ok('profile tab active + form rendered', d.getElementById('pf-blurb')!==null);
  ok('6 social platform rows rendered', d.querySelectorAll('.soc-row').length===6);
  ok('toggle switches rendered', d.querySelectorAll('.toggle input[type=checkbox]').length===6);

  d.getElementById('pf-blurb').value='Handmade gold jewelry since 1998.';
  const instaInput = d.getElementById('pf-soc-instagram');
  instaInput.value = 'lalibela_gold';
  instaInput.dispatchEvent(new w.Event('input'));

  let threw=false;
  try{ await w.saveProfile(); }catch(e){ threw=true; console.log('save error:', e.message); }
  await new Promise(r=>setTimeout(r,500));
  ok('saveProfile runs without throwing', !threw);
  ok('blurb persisted after save+rerender', d.getElementById('pf-blurb') && d.getElementById('pf-blurb').value==='Handmade gold jewelry since 1998.');
  process.exit(0);
}
run();
