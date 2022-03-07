#!bin/sh
mkdir result
mkdir result/images
for d in images/*
do
    if [ -d "$d" ]; then
        echo $d
        convert -background white -gravity center -resize 20x20 -extent 20x20 +append $d/* result/$d.png
    fi
done

convert -append result/images/* images/avatars.png
rm -rf result