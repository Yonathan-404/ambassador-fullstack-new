#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json
JWT_SECRET=t ADMIN_KEY=a123 PORT=3221 node server/server.js >/tmp/srv_v7.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3221
{
echo "== index.html includes service-search wiring =="
curl -s -m 5 $B/ | grep -c "ambSearchPick(.service."

echo "== index.html footer includes the new Verified/Orders additions =="
curl -s -m 5 $B/ | grep -c "amb-foot-verified-btn"
curl -s -m 5 $B/ | grep -c "ambOpenOrders()\">My Orders"

echo "== public catalog still has services for the search to use =="
curl -s -m 5 $B/api/catalog | python3 -c "import json,sys;print('services:',len(json.load(sys.stdin)['building'].get('services',[])))"

echo ALLDONE
} > /tmp/apitest7.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
