#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json /tmp/j_seller.txt /tmp/j_seller2.txt
JWT_SECRET=testsecret ADMIN_KEY=adminkey123 PORT=3131 node server/server.js >/tmp/srv_v3.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3131
AK='x-admin-key: adminkey123'
{
echo "== health =="; curl -s -m 5 $B/api/health; echo

echo; echo "########## PUBLIC CATALOG — BASELINE (everything on) ##########"
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
print('public tenants:', len(c['tenants']))
print('public services:', len(c.get('services',[])))
print('gf5 products:', len([p for t in c['tenants'] if t['id']=='gf5' for p in t['products']]))
"

echo; echo "########## ADMIN: toggle a tenant OFF ##########"
curl -s -m 5 -H "$AK" -X POST $B/api/admin/tenant/gf5/toggle | python3 -c "import json,sys;t=json.load(sys.stdin)['tenant'];print('gf5 active now:',t['active'])"

echo "== public catalog after tenant OFF (gf5 must be gone) =="
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
ids=[t['id'] for t in c['tenants']]
print('tenant count:', len(c['tenants']), '| gf5 present:', 'gf5' in ids)
"
echo "== admin catalog still shows gf5 (unfiltered) =="
curl -s -m 5 -H "$AK" $B/api/admin/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
ids=[t['id'] for t in c['tenants']]
print('admin tenant count:', len(c['tenants']), '| gf5 present:', 'gf5' in ids)
"
echo "== ordering from a disabled tenant is rejected =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"X","phone":"1","method":"pickup"},"bankKey":"cbe"}'; echo

echo "== turn gf5 back ON =="
curl -s -m 5 -H "$AK" -X POST $B/api/admin/tenant/gf5/toggle -H 'Content-Type: application/json' -d '{"active":true}' | python3 -c "import json,sys;t=json.load(sys.stdin)['tenant'];print('gf5 active now:',t['active'])"
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
ids=[t['id'] for t in c['tenants']]
print('after re-enable, gf5 present:', 'gf5' in ids)
"

echo; echo "########## ADMIN: toggle a single PRODUCT OFF (tenant stays on) ##########"
curl -s -m 5 -H "$AK" -X POST $B/api/admin/product/gf5-2/toggle | python3 -c "import json,sys;p=json.load(sys.stdin)['product'];print('gf5-2 active now:',p['active'])"
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
t=[t for t in c['tenants'] if t['id']=='gf5'][0]
pids=[p['id'] for p in t['products']]
print('gf5 still listed:', True, '| gf5-2 in public products:', 'gf5-2' in pids, '| product count:', len(pids))
"
echo "== ordering the disabled product is rejected, tenant itself is fine =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-2","qty":1}],"buyer":{"name":"X","phone":"1","method":"pickup"},"bankKey":"cbe"}'; echo
echo "== ordering a DIFFERENT (still active) product from same tenant still works =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"Marta","phone":"0912222222","method":"pickup"},"bankKey":"cbe"}' | python3 -c "import json,sys;o=json.load(sys.stdin)['order'];print('order placed ok, ref:',o['ref'],'status:',o['status'])"
echo "== turn gf5-2 back on =="
curl -s -m 5 -H "$AK" -X POST $B/api/admin/product/gf5-2/toggle -H 'Content-Type: application/json' -d '{"active":true}' | python3 -c "import json,sys;print('gf5-2 active:',json.load(sys.stdin)['product']['active'])"

echo; echo "########## BUILDING SERVICES — full CRUD + toggle (new feature) ##########"
echo "== public catalog includes services =="
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;c=json.load(sys.stdin)['building'];print('public services:',len(c.get('services',[])), [s['id'] for s in c.get('services',[])])"
echo "== toggle svc-clinic OFF =="
curl -s -m 5 -H "$AK" -X POST $B/api/admin/service/svc-clinic/toggle | python3 -c "import json,sys;print('svc-clinic active:',json.load(sys.stdin)['service']['active'])"
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;c=json.load(sys.stdin)['building'];ids=[s['id'] for s in c.get('services',[])];print('public services now:',len(ids),'| svc-clinic present:','svc-clinic' in ids)"
echo "== admin catalog still shows svc-clinic (unfiltered) =="
curl -s -m 5 -H "$AK" $B/api/admin/catalog | python3 -c "import json,sys;c=json.load(sys.stdin)['building'];ids=[s['id'] for s in c.get('services',[])];print('admin services:',len(ids),'| svc-clinic present:','svc-clinic' in ids)"
echo "== turn svc-clinic back on =="
curl -s -m 5 -H "$AK" -X POST $B/api/admin/service/svc-clinic/toggle -H 'Content-Type: application/json' -d '{"active":true}' > /dev/null
echo "== admin adds a brand-new service =="
curl -s -m 5 -H "$AK" -X PUT $B/api/admin/service -H 'Content-Type: application/json' -d '{"service":{"name":"Quick Locksmith","floor":"3rd Floor","type":"Repair","mobile":"+251 911 999 000","owner":"Test Owner","hours":"9-6","blurb":"key cutting"}}' > /tmp/svc.json
python3 -c "import json;s=json.load(open('/tmp/svc.json'))['service'];print('new service id:',s['id'],'| active default:',s['active'],'| name:',s['name'])"
NEWSVC=$(python3 -c "import json;print(json.load(open('/tmp/svc.json'))['service']['id'])")
echo "== new service appears in public catalog immediately (starts ON) =="
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys,os;c=json.load(sys.stdin)['building'];ids=[s['id'] for s in c.get('services',[])];print('present:', os.environ['NEWSVC'] in ids)" NEWSVC="$NEWSVC" 2>/dev/null || \
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;c=json.load(sys.stdin)['building'];print('present:','$NEWSVC' in [s['id'] for s in c.get('services',[])])"
echo "== delete the test service =="
curl -s -m 5 -H "$AK" -X DELETE $B/api/admin/service/$NEWSVC; echo
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;c=json.load(sys.stdin)['building'];print('services back to:',len(c.get('services',[])))"

echo; echo "########## SELLER SELF-SERVICE ON/OFF ##########"
curl -s -m 5 -H "$AK" -X POST $B/api/admin/seller-code -H 'Content-Type: application/json' -d '{"tenantId":"gf5","phone":"0911111111"}' > /tmp/code.json
CODE=$(python3 -c "import json;print(json.load(open('/tmp/code.json'))['code'])")
curl -s -m 5 -c /tmp/j_seller.txt -X POST $B/api/seller/login -H 'Content-Type: application/json' -d "{\"phone\":\"0911111111\",\"code\":\"$CODE\"}" > /dev/null
echo "== seller turns their own product OFF =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/product -H 'Content-Type: application/json' -d '{"pid":"gf5-1","active":false}' | python3 -c "import json,sys;p=json.load(sys.stdin)['product'];print('gf5-1 active:',p['active'])"
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
t=[t for t in c['tenants'] if t['id']=='gf5'][0]
print('public gf5 products now:', [p['id'] for p in t['products']])
"
echo "== seller CANNOT toggle another shop's product (ownership enforced) =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/product -H 'Content-Type: application/json' -d '{"pid":"402-1","active":false}'; echo
echo "== seller turns it back on =="
curl -s -m 5 -b /tmp/j_seller.txt -X POST $B/api/seller/product -H 'Content-Type: application/json' -d '{"pid":"gf5-1","active":true}' | python3 -c "import json,sys;print('gf5-1 active:',json.load(sys.stdin)['product']['active'])"

echo; echo "########## REGRESSION: original flows still work ##########"
echo "== seller/me =="; curl -s -m 5 -b /tmp/j_seller.txt $B/api/seller/me; echo
echo "== seller sees own orders =="
curl -s -m 5 -b /tmp/j_seller.txt $B/api/seller/orders | python3 -c "import json,sys;d=json.load(sys.stdin);print('seller orders:',len(d['orders']))"
echo "== admin: add + delete a tenant still works =="
curl -s -m 5 -H "$AK" -X PUT $B/api/admin/tenant -H 'Content-Type: application/json' -d '{"tenant":{"id":"bluecafe","name":"Blue Cafe","floor":"5th Floor","cat":"Café","whatsapp":"251900000000","mobile":"+251 900 000 000","owner":"Blue Owner","bank":{"acct":"1000999","holder":"Blue Cafe"}}}' | python3 -c "import json,sys;t=json.load(sys.stdin)['tenant'];print('added:',t['id'],'| active default:',t['active'])"
curl -s -m 5 -H "$AK" -X DELETE $B/api/admin/tenant/bluecafe; echo
echo "== SMS log recorded activity =="
curl -s -m 5 -H "$AK" $B/api/admin/sms | python3 -c "import json,sys;print('sms count:',len(json.load(sys.stdin)['messages']))"
echo "== admin.html and seller.html still served =="
curl -s -m 5 $B/admin.html | head -c 40; echo
curl -s -m 5 $B/seller.html | head -c 40; echo
echo "== storefront index.html served, includes verified-info + deep-link code =="
curl -s -m 5 $B/ > /tmp/storefront.html
grep -c "ambShowVerifiedInfo" /tmp/storefront.html
grep -c "ambOpenFromHash" /tmp/storefront.html
echo "== persistence: data.json has active flags + services =="
python3 -c "
import json
d=json.load(open('server/data.json'))
cat=d['catalog']['building']
print('tenants active flags:', [t.get('active') for t in cat['tenants']])
print('services stored:', len(cat.get('services',[])))
"
echo ALLDONE
} > /tmp/apitest3.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
