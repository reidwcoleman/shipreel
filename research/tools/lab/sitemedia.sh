#!/bin/zsh
# Export renders for the GitHub Pages site: 540-wide H.264 (small, web-friendly) + a poster JPEG.
#   research/tools/lab/sitemedia.sh <project> <video-id> <name> [poster-second]
ROOT=${0:A:h}/../../..
src=$ROOT/workspace/projects/$1/renders/$2.mp4
out=$ROOT/docs/media/$3
at=${4:-1.2}
ffmpeg -nostdin -v error -y -i $src -vf "scale=540:-2" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart $out.mp4 || exit 1
ffmpeg -nostdin -v error -y -ss $at -i $src -frames:v 1 -vf "scale=540:-2" -q:v 4 $out.jpg || exit 1
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $out.mp4)
echo "$3  $(printf %.0f $d)s  $(du -h $out.mp4 | cut -f1)"
