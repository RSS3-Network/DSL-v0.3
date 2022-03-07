#!bin/sh
node src/avatars.js
mkdir tmp/results
for d in tmp/images/*
do
    if [ -d "$d" ]; then
        echo $d
        convert -background white -gravity center -resize 20x20 -extent 20x20 +append "$d/*[1]" "tmp/results/$(basename $d).png"
    fi
done

convert -append tmp/results/*.png statics/avatars.png