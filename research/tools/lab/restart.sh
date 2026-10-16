#!/bin/zsh
# Rebuild Shipreel and restart the production server on 127.0.0.1:4747 (logs in refs/_lab/).
ROOT=${0:A:h}/../../..
cd $ROOT || exit 1
L=$PWD/refs/_lab; mkdir -p $L
for pid in $(lsof -tiTCP:4747 -sTCP:LISTEN) $(pgrep -f "next start -H 127.0.0.1 -p 4747") $(pgrep -f "Shipreel/scripts/render-worker.mjs"); do kill -9 $pid 2>/dev/null; done
sleep 1
npx next build > $L/build.log 2>&1 || { tail -30 $L/build.log; exit 1; }
nohup npm run start > $L/prod.log 2>&1 &
for i in {1..40}; do curl -s -o /dev/null http://127.0.0.1:4747/api/bootstrap && break; sleep 0.5; done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4747/)"
