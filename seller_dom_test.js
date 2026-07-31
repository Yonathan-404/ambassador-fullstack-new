const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(__dirname+'/seller_live.html','utf8');
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:3231/seller.html', resources:'usable' });
const w = dom.window, d = w.document;
w.fetch = (url, opts) => fetch(new URL(url, 'http://localhost:3231/seller.html'), opts);
const errs=[]; w.addEventListener('error', e=>errs.push(e.message));

async function run(){
  await new Promise(r=>setTimeout(r,300));
  const ok=(n,c)=>console.log((c?'PASS':'FAIL')+'  '+n);
  d.getElementById('ph').value = '251911201616';
  d.getElementById('code').value = '565853';
  await w.doLogin();
  await new Promise(r=>setTimeout(r,300));
  ok('login succeeds', !!w.me);
  w.tab='profile'; await w.render();
  await new Promise(r=>setTimeout(r,400));
  ok('Shop Profile tab renders', !!d.getElementById('pf-blurb'));
  ok('social rows rendered (6 platforms)', d.querySelectorAll('.soc-row').length===6);
  ok('toggle switches rendered', d.querySelectorAll('.toggle input[type=checkbox]').length===6);
  d.getElementById('pf-blurb').value = 'Handmade gold jewelry since 1998.';
  d.getElementById('pf-soc-instagram').value = 'lalibela_gold';
  w.__soc.instagram.value = 'lalibela_gold'; w.__soc.instagram.on = true;
  let threw=false;
  try{ await w.saveProfile(); }catch(e){ threw=true; console.log('  error:',e.message); }
  await new Promise(r=>setTimeout(r,400));
  ok('saveProfile runs without throwing', !threw);
  ok('no runtime errors', errs.length===0);
  if(errs.length) console.log('ERRORS:', errs.slice(0,6));
  process.exit(0);
}
run();
