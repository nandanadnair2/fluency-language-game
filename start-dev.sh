#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=384"
while true; do
  npx next dev -p 3000 2>&1 | tee -a dev.log
  echo "Server exited, restarting in 3s..."
  sleep 3
done
