#!/bin/bash
cd "$(dirname "$0")"
pkill -9 -f "server/server.js" 2>/dev/null
rm -f server/data.json
JWT_SECRET=t ADMIN_KEY=a123 PORT=3220 node server/server.js >/tmp/srv_v6.log 2>&1 &
SRV=$!
sleep 2
B=localhost:3220
AK='x-admin-key: adminkey123'
{
echo "== BMS tenants view includes lease (null initially) =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/tenants | python3 -c "
import json,sys
ts=json.load(sys.stdin)['tenants']
gf5=[t for t in ts if t['id']=='gf5'][0]
print('gf5 unit:', gf5['unit'], '| lease:', gf5['lease'])
"

echo "== create a lease for GF5 (Sahis Cafe) =="
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/lease -H 'Content-Type: application/json' -d '{"lease":{"unit":"GF5","rent":26000,"cycleMonths":1,"firstPeriodMonths":1,"deposit":52000}}' | python3 -c "import json,sys;l=json.load(sys.stdin)['lease'];print('lease created:',l['unit'],'rent:',l['rent'],'nextDue:',l['nextDue'])"

echo "== leases list shows it =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/leases | python3 -c "import json,sys;print('lease count:',len(json.load(sys.stdin)['leases']))"

echo "== sweep generates the first invoice (nextDue is today, so it's due now) =="
curl -s -m 5 -H "x-admin-key: a123" -X POST $B/api/admin/bms/sweep | python3 -c "import json,sys;d=json.load(sys.stdin);print('created:',d['invoicesCreated'],'overdue:',d['markedOverdue'])"

echo "== invoices for GF5 =="
curl -s -m 5 -H "x-admin-key: a123" "$B/api/admin/bms/invoices?unit=GF5" > /tmp/invs.json
python3 -c "import json;invs=json.load(open('/tmp/invs.json'))['invoices'];print('count:',len(invs));print('first:',invs[0]['id'],invs[0]['amount'],invs[0]['status'])"
INVID=$(python3 -c "import json;print(json.load(open('/tmp/invs.json'))['invoices'][0]['id'])")

echo "== mark it paid =="
curl -s -m 5 -H "x-admin-key: a123" -X POST "$B/api/admin/bms/invoice/$INVID/pay" -H 'Content-Type: application/json' -d '{"method":"bank_transfer","ref":"TESTREF"}' | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['invoice']['status'],'| penalty:',d['penaltyCharged'])"

echo "== finance: add income + expense =="
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/finance -H 'Content-Type: application/json' -d '{"entry":{"type":"income","category":"Rent","amount":26000,"note":"GF5 rent"}}' | python3 -c "import json,sys;print('income id:',json.load(sys.stdin)['entry']['id'])"
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/finance -H 'Content-Type: application/json' -d '{"entry":{"type":"expense","category":"Maintenance","amount":5000,"note":"AC repair"}}' | python3 -c "import json,sys;print('expense id:',json.load(sys.stdin)['entry']['id'])"
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/finance | python3 -c "import json,sys;print('entries:',len(json.load(sys.stdin)['entries']))"

echo "== maintenance ticket lifecycle =="
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/ticket -H 'Content-Type: application/json' -d '{"ticket":{"title":"Leaking pipe","loc":"GF5","pri":"high"}}' > /tmp/tk.json
python3 -c "import json;t=json.load(open('/tmp/tk.json'))['ticket'];print('ticket:',t['id'],t['status'])"
TKID=$(python3 -c "import json;print(json.load(open('/tmp/tk.json'))['ticket']['id'])")
curl -s -m 5 -H "x-admin-key: a123" -X POST "$B/api/admin/bms/ticket/$TKID/status" -H 'Content-Type: application/json' -d '{"status":"prog"}' | python3 -c "import json,sys;print('now:',json.load(sys.stdin)['ticket']['status'])"
curl -s -m 5 -H "x-admin-key: a123" -X POST "$B/api/admin/bms/ticket/$TKID/status" -H 'Content-Type: application/json' -d '{"status":"done"}' | python3 -c "import json,sys;t=json.load(sys.stdin)['ticket'];print('now:',t['status'],'doneAt:',t['done_at'])"

echo "== announcement =="
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/announcement -H 'Content-Type: application/json' -d '{"announcement":{"title":"Power outage","body":"Scheduled maintenance Friday","aud":"all"}}' | python3 -c "import json,sys;print('announcement:',json.load(sys.stdin)['announcement']['id'])"

echo "== config: default then update penalty =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/config | python3 -c "import json,sys;print('default penalty:',json.load(sys.stdin)['config']['penalty'])"
curl -s -m 5 -H "x-admin-key: a123" -X PUT $B/api/admin/bms/config -H 'Content-Type: application/json' -d '{"config":{"penalty":{"amount":300,"per":"day"}}}' | python3 -c "import json,sys;print('updated penalty:',json.load(sys.stdin)['config']['penalty'])"

echo "== dashboard stats =="
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/dashboard | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('units:',d['totalUnits'],'occupied:',d['occupiedUnits'],'leases:',d['activeLeases'],'income:',d['incomeThisMonth'],'expense:',d['expenseThisMonth'],'openTickets:',d['openTickets'])
"

echo "== TERMINATE GF5 -> lease should end today =="
curl -s -m 5 -H "x-admin-key: a123" -X POST $B/api/admin/tenant/gf5/toggle -H 'Content-Type: application/json' -d '{"active":false}' > /dev/null
curl -s -m 5 -H "x-admin-key: a123" $B/api/admin/bms/leases | python3 -c "
import json,sys,datetime
leases=json.load(sys.stdin)['leases']
l=[l for l in leases if l['unit']=='GF5'][0]
today=datetime.date.today().isoformat()
print('lease end_date:',l['end_date'],'| ends today:',l['end_date']==today)
"

echo "== admin.html includes a link/reference to the BMS =="
curl -s -m 5 $B/admin.html | grep -c "bms.html\|Building Management" 2>/dev/null || echo "0 (bms.html not yet linked/built)"

echo ALLDONE
} > /tmp/apitest6.out 2>&1
kill -9 $SRV 2>/dev/null
exit 0
