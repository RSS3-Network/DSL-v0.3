#!/bin/bash

# trigger mongodb pulling
cd ~/RSS3-PreNode-Data
node --max-old-space-size=4096 src/index.js

# calculate stats
cd statics

TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
VALUE=`cat ./overall.json`

truncate -s-1 ./history.json
printf ",\"$TIME\":$VALUE}" >> ./history.json

# commit and push via git
echo "push to git"
git config user.name "RSS3 Bot"
git config user.email "contact@rss3.io"

git pull
git add -A
git commit -m ':sparkles: auto update rss3 statistics'
git push
