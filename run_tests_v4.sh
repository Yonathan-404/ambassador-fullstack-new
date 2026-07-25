#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json
JWT_SECRET=t ADMIN_KEY=a123 PORT=3132 node server/server.js >/tmp/srv_v4.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3132
AK='x-admin-key: adminkey123'
{
echo "== bank_transfer order (default, unchanged) =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"M","phone":"0912222222","method":"pickup"},"bankKey":"cbe"}' | python3 -c "import json,sys;o=json.load(sys.stdin)['order'];print('method:',o['paymentMethod'],'bank:',o['bank']['name'])"

echo "== chapa order + init WITHOUT key (graceful 503) =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"M","phone":"0912222222","method":"pickup"},"paymentMethod":"chapa"}' > /tmp/oc.json
python3 -c "import json;o=json.load(open('/tmp/oc.json'))['order'];print('ref:',o['ref'],'method:',o['paymentMethod'],'bank:',o['bank'])"
REFC=$(python3 -c "import json;print(json.load(open('/tmp/oc.json'))['order']['ref'])")
curl -s -m 5 -w " STATUS:%{http_code}\n" -X POST "$B/api/orders/$REFC/pay/chapa"

echo "== ussd order + push WITHOUT provider (graceful 503, logged) =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"M","phone":"0912222222","method":"pickup"},"paymentMethod":"ussd"}' > /tmp/ou.json
python3 -c "import json;o=json.load(open('/tmp/ou.json'))['order'];print('ref:',o['ref'],'method:',o['paymentMethod'],'bank:',o['bank'])"
REFU=$(python3 -c "import json;print(json.load(open('/tmp/ou.json'))['order']['ref'])")
curl -s -m 5 -w " STATUS:%{http_code}\n" -X POST "$B/api/orders/$REFU/pay/ussd"
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/ussd-log | python3 -c "import json,sys;print('ussd log count:',len(json.load(sys.stdin)['messages']))"

echo "== chapa order MISSING bank_transfer's bankKey requirement is correctly skipped =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"M","phone":"0912222222","method":"pickup"},"paymentMethod":"chapa"}' -w " STATUS:%{http_code}\n" | tail -1

echo "== bank_transfer WITHOUT bankKey still correctly rejected =="
curl -s -m 5 -X POST $B/api/orders -H 'Content-Type: application/json' -d '{"tenantId":"gf5","items":[{"pid":"gf5-1","qty":1}],"buyer":{"name":"M","phone":"0912222222","method":"pickup"}}'; echo

echo "== simulate chapa webhook without configured key (should not crash, ok:false) =="
curl -s -m 5 -X POST $B/api/webhooks/chapa -H 'Content-Type: application/json' -d "{\"tx_ref\":\"$REFC\"}" -w " STATUS:%{http_code}\n"

echo "== nonexistent order ref returns 404 not a crash =="
curl -s -m 5 -X POST "$B/api/orders/NOPE/pay/chapa" -w " STATUS:%{http_code}\n"
curl -s -m 5 -X POST "$B/api/orders/NOPE/pay/ussd" -w " STATUS:%{http_code}\n"

echo "== index.html includes the new payment tabs code =="
curl -s -m 5 $B/ | grep -c "amb-pay-tab\|ambSelPayMethod"

echo ALLDONE
} > /tmp/apitest4.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
