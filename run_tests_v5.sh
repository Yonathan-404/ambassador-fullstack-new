#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json
JWT_SECRET=t ADMIN_KEY=a123 PORT=3212 node server/server.js >/tmp/srv_v5.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3212
AK='x-admin-key: adminkey123'
{
echo "== admin.html loads and includes the new Sellers UI (search, floor grouping, terminate/restore) =="
curl -s -m 5 $B/admin.html | grep -c "sellerSearch\|renderSellerList\|Currently OFF"

echo "== baseline: gf5 (Sahis Cafe, unit GF5, Ground Floor) is visible in admin catalog =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
t=[t for t in c['tenants'] if t['id']=='gf5'][0]
print('name:', t['name'], '| unit:', t['unit'], '| floor:', t['floor'], '| active:', t['active'])
"

echo "== TERMINATE gf5 via the real toggle endpoint (what the BMS Terminate button calls) =="
curl -s -m 5 -H "x-admin-key: a123" -X POST $B/api/admin/tenant/gf5/toggle -H 'Content-Type: application/json' -d '{"active":false}' | python3 -c "import json,sys;print('gf5 active now:',json.load(sys.stdin)['tenant']['active'])"

echo "== confirm gf5 is GONE from the real public storefront (this is the actual store, not a copy) =="
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
ids = [t['id'] for t in json.load(sys.stdin)['building']['tenants']]
print('gf5 present in public store:', 'gf5' in ids, '| total public tenants:', len(ids))
"
echo "== confirm ordering from gf5 is now rejected on the real store =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"X","phone":"1","method":"pickup"},"bankKey":"cbe"}'; echo

echo "== confirm gf5 still shows in ADMIN view, marked OFF, not deleted (data intact) =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/catalog | python3 -c "
import json,sys
c=json.load(sys.stdin)['building']
t=[t for t in c['tenants'] if t['id']=='gf5'][0]
print('still exists in admin:', True, '| active:', t['active'], '| products still there:', len(t['products']))
"

echo "== RESTORE gf5 (what the BMS Restore button calls) =="
curl -s -m 5 -H "x-admin-key: a123" -X POST $B/api/admin/tenant/gf5/toggle -H 'Content-Type: application/json' -d '{"active":true}' | python3 -c "import json,sys;print('gf5 active now:',json.load(sys.stdin)['tenant']['active'])"

echo "== confirm gf5 is BACK in the real public storefront =="
curl -s -m 5 $B/api/catalog | python3 -c "
import json,sys
ids = [t['id'] for t in json.load(sys.stdin)['building']['tenants']]
print('gf5 present in public store:', 'gf5' in ids)
"
echo "== confirm ordering from gf5 works again =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"X","phone":"0911111111","method":"pickup"},"bankKey":"cbe"}' | python3 -c "import json,sys;o=json.load(sys.stdin)['order'];print('order ok, ref:',o['ref'])"

echo "== new-seller form now includes a Unit field, and it's saved correctly =="
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/tenant -H 'Content-Type: application/json' -d '{"tenant":{"id":"testshop","name":"Test Shop","unit":"607","floor":"6th Floor","cat":"Test"}}' | python3 -c "import json,sys;t=json.load(sys.stdin)['tenant'];print('unit saved:',t['unit'],'floor:',t['floor'])"
curl -s -m 5 -H "x-admin-key: a123" -X DELETE $B/api/admin/tenant/testshop > /dev/null

echo ALLDONE
} > /tmp/apitest5.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
