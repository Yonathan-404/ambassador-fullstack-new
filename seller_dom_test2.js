const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(__dirname+'/seller_live.html','utf8');
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:3232/seller.html', resources:'usable' });
const w = dom.window, d = w.document;
let cookieJar = '';
w.fetch = async (url, opts) => {
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, cookieJar ? {Cookie: cookieJar} : {});
  const r = await fetch(new URL(url, 'http://localhost:3232/seller.html'), opts);
  const setCookie = r.headers.get('set-cookie');
  if (setCookie) cookieJar = setCookie.split(';')[0];
  return r;
};

async function run(){
  await new Promise(r=>setTimeout(r,300));
  d.getElementById('ph').value = '251911201616';
  d.getElementById('code').value = '634413';
  try { await w.doLogin(); } catch(e) { console.log('doLogin threw:', e.message); }
  await new Promise(r=>setTimeout(r,300));
  console.log('me =', JSON.stringify(w.me));
  console.log('err text =', d.getElementById('err') ? d.getElementById('err').textContent : 'no err el');
  process.exit(0);
}
run();
