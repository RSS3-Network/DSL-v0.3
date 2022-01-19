cd ~/RSS3-PreNode-Data

node src/index.js

sleep 300

git config user.name "RSS3 Bot"
git config user.email "contact@rss3.io"

git pull
git add -A
git commit -m ':sparkles: auto update rss3 statistics'
git push