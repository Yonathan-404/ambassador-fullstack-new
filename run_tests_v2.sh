#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json /tmp/j_buyer.txt /tmp/j_seller.txt
JWT_SECRET=testsecret ADMIN_KEY=adminkey123 PORT=3130 node server/server.js >/tmp/srv_v2.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3130
AK='x-admin-key: adminkey123'
{
echo "== health =="; curl -s -m 5 $B/api/health; echo
echo "== admin: generate seller code (sahis, phone 0911111111) =="
curl -s -m 5 -H "$AK" -X POST $B/api/admin/seller-code -H 'Content-Type: application/json' -d '{"tenantId":"sahis","phone":"0911111111"}' > /tmp/code.json
CODE=$(python3 -c "import json;print(json.load(open('/tmp/code.json'))['code'])")
python3 -c "import json;d=json.load(open('/tmp/code.json'));print('code issued for', d['tenantId'], '→ phone', d['phone'])"
echo "== seller login WRONG code =="; curl -s -m 5 -X POST $B/api/seller/login -H 'Content-Type: application/json' -d '{"phone":"0911111111","code":"000000"}'; echo
echo "== seller login RIGHT code =="; curl -s -m 5 -c /tmp/j_seller.txt -X POST $B/api/seller/login -H 'Content-Type: application/json' -d "{\"phone\":\"0911111111\",\"code\":\"$CODE\"}"; echo
echo "== seller/me =="; curl -s -m 5 -b /tmp/j_seller.txt $B/api/seller/me; echo
echo "== buyer places order (sahis, pickup) =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"sahis","items":[{"pid":"sahis-1","qty":2}],"buyer":{"name":"Marta T","phone":"0912222222","method":"pickup"},"bankKey":"cbe"}' > /tmp/o.json
REF=$(python3 -c "import json;print(json.load(open('/tmp/o.json'))['order']['ref'])")
python3 -c "import json;o=json.load(open('/tmp/o.json'))['order'];print('ref:',o['ref'],'total:',o['total'],'status:',o['status'])"
echo "== SMS log after order (expect 1, to 251912222222) =="
curl -s -m 5 -H "$AK" $B/api/admin/sms | python3 -c "import json,sys;m=json.load(sys.stdin)['messages'];print('sms count:',len(m),'| to:',m[0]['to'],'| text starts:',m[0]['text'][:60])"
echo "== seller sees the order =="
curl -s -m 5 -b /tmp/j_seller.txt $B/api/seller/orders | python3 -c "import json,sys;d=json.load(sys.stdin);print('seller orders:',len(d['orders']),'| statuses offered:',len(d['statuses']))"
echo "== seller cannot be impersonated (no cookie) =="; curl -s -m 5 $B/api/seller/orders; echo
echo "== seller updates status → out_for_delivery =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/order-status -H 'Content-Type: application/json' -d "{\"ref\":\"$REF\",\"status\":\"out_for_delivery\"}" | python3 -c "import json,sys;print('new status:',json.load(sys.stdin)['order']['status'])"
echo "== SMS log now (expect 2; latest is OUT FOR DELIVERY) =="
curl -s -m 5 -H "$AK" $B/api/admin/sms | python3 -c "import json,sys;m=json.load(sys.stdin)['messages'];print('sms count:',len(m),'| latest:',m[0]['text'][:55])"
echo "== buyer checks status by phone =="
curl -s -m 5 "$B/api/my/orders?phone=0912222222" | python3 -c "import json,sys;o=json.load(sys.stdin)['orders'][0];print('buyer sees ref:',o['ref'],'status:',o['status'])"
echo "== invalid status rejected =="; curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/order-status -H 'Content-Type: application/json' -d "{\"ref\":\"$REF\",\"status\":\"hacked\"}"; echo
echo "== seller updates own product price+stock =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/product -H 'Content-Type: application/json' -d '{"pid":"sahis-2","price":999,"stock":{"state":"out"}}' | python3 -c "import json,sys;p=json.load(sys.stdin)['product'];print('sahis-2 →',p['price'],'ETB, stock:',p['stock']['state'])"
echo "== seller cannot touch another shop's product =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/product -H 'Content-Type: application/json' -d '{"pid":"rose-1","price":1}'; echo
echo "== sold-out product now refuses orders =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"sahis","items":[{"pid":"sahis-2","qty":1}],"buyer":{"name":"X","phone":"1","method":"pickup"},"bankKey":"cbe"}'; echo
echo "== /api/catalog reflects mutation =="
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys;c=json.load(sys.stdin)
p=[p for t in c['building']['tenants'] for p in t['products'] if p['id']=='sahis-2'][0]
print('public catalog sahis-2:',p['price'],'ETB,',p['stock']['state'])"
echo "== admin adds a new seller =="
curl -s -m 5 -H "$AK" -X PUT $B/api/admin/tenant -H 'Content-Type: application/json' -d '{"tenant":{"id":"bluecafe","name":"Blue Cafe","floor":"5th Floor","cat":"Café","whatsapp":"251900000000","mobile":"+251 900 000 000","owner":"Blue Owner","bank":{"acct":"1000999","holder":"Blue Cafe"}}}' | python3 -c "import json,sys;t=json.load(sys.stdin)['tenant'];print('added:',t['id'],'| banks:',len(t['banks']),'| color default:',t['color'])"
echo "== admin adds a product to it =="
curl -s -m 5 -H "$AK" -X PUT $B/api/admin/product -H 'Content-Type: application/json' -d '{"tenantId":"bluecafe","product":{"name":"Macchiato","cat":"Drinks","price":80,"img":"https://x"}}' | python3 -c "import json,sys;p=json.load(sys.stdin)['product'];print('product:',p['id'],p['name'],p['price'],'| stock default:',p['stock']['state'],'| gallery:',len(p['gallery']))"
echo "== catalog now has 8 tenants + Macchiato orderable =="
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;c=json.load(sys.stdin);print('tenants:',len(c['building']['tenants']))"
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"bluecafe","items":[{"pid":"bluecafe-1","qty":1}],"buyer":{"name":"Y","phone":"0913333333","method":"pickup"},"bankKey":"cbe"}' | python3 -c "import json,sys;o=json.load(sys.stdin)['order'];print('bluecafe order total:',o['total'],'(80 + VAT 12 = 92?)')"
echo "== admin deletes product + tenant =="
curl -s -m 5 -H "$AK" -X DELETE $B/api/admin/product/bluecafe-1; echo
curl -s -m 5 -H "$AK" -X DELETE $B/api/admin/tenant/bluecafe; echo
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;print('tenants back to:',len(json.load(sys.stdin)['building']['tenants']))"
echo "== persistence: catalog stored in DB (file store) =="
python3 -c "import json;d=json.load(open('server/data.json'));print('store has catalog:', bool(d.get('catalog')), '| sellerCodes:', list(d.get('sellerCodes',{}).keys()), '| orders:', len(d.get('orders',[])))"
echo "== seller pages served =="
curl -s -m 5 $B/seller.html | head -c 50; echo
echo ALLDONE
} > /tmp/apitest2.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
