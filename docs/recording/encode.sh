#!/bin/bash
# usage: encode.sh <framedir> <outbase> <width> <fps>
DIR=$1; OUT=$2; W=${3:-1000}; FPS=${4:-8}
ffmpeg -y -loglevel error -framerate $FPS -i "$DIR/%05d.png" \
  -vf "scale=$W:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=112:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 "$OUT.gif"
ffmpeg -y -loglevel error -framerate $FPS -i "$DIR/%05d.png" \
  -vf "scale=$W:-2:flags=lanczos,format=yuv420p" -c:v libx264 -crf 23 -movflags +faststart "$OUT.mp4"
ls -lh "$OUT.gif" "$OUT.mp4" | awk '{print $9, $5}'
