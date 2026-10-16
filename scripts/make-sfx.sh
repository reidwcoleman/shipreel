#!/bin/zsh
# Synthesises Shipreel's built-in sound effects with ffmpeg (no samples, no licences needed).
# usage: scripts/make-sfx.sh [outdir]   (default: public/sfx)
set -e
out=${1:-public/sfx}
mkdir -p "$out"
enc=(-ac 2 -ar 44100 -c:a libmp3lame -b:a 160k)
f() { ffmpeg -v error -y "$@"; }

# whoosh: band-passed noise sweeping up then down, fast attack/decay
f -f lavfi -i "anoisesrc=d=0.55:c=pink:a=0.9" -af "highpass=f=300,lowpass=f=5200,afade=t=in:d=0.18:curve=exp,afade=t=out:st=0.22:d=0.33:curve=exp,volume=2.2,aecho=0.6:0.4:18:0.25" $enc "$out/whoosh.mp3"
# swoosh: shorter, brighter
f -f lavfi -i "anoisesrc=d=0.32:c=white:a=0.6" -af "highpass=f=1200,lowpass=f=9000,afade=t=in:d=0.06,afade=t=out:st=0.08:d=0.24:curve=exp,volume=1.6" $enc "$out/swoosh.mp3"
# pop: pitch-dropping sine blip
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(380+900*exp(-t*40))*t)*exp(-t*28)':d=0.18" -af "volume=1.4" $enc "$out/pop.mp3"
# click: tiny noise transient
f -f lavfi -i "aevalsrc='(random(0)*2-1)*exp(-t*400)':d=0.05" -af "highpass=f=1800,volume=2.5" $enc "$out/click.mp3"
# ding: two bell partials
f -f lavfi -i "aevalsrc='0.55*sin(2*PI*1318.5*t)*exp(-t*4)+0.3*sin(2*PI*2637*t)*exp(-t*7)+0.15*sin(2*PI*3955*t)*exp(-t*11)':d=1.2" $enc "$out/ding.mp3"
# notification: iOS-ish tri-tone
f -f lavfi -i "aevalsrc='if(lt(t,0.11),0.6*sin(2*PI*1568*t),if(lt(t,0.22),0.6*sin(2*PI*1319*t),0.6*sin(2*PI*1760*t)*exp(-(t-0.22)*7)))*min(1,t*80)':d=0.75" $enc "$out/notification.mp3"
# boom: sub drop + noise hit (the "vine boom" family)
f -f lavfi -i "aevalsrc='0.95*sin(2*PI*(42+120*exp(-t*18))*t)*exp(-t*3.2)+0.25*(random(0)*2-1)*exp(-t*30)':d=1.4" -af "lowpass=f=900,volume=1.6" $enc "$out/boom.mp3"
# keyboard: a burst of clicks
f -f lavfi -i "aevalsrc='(random(0)*2-1)*exp(-mod(t,0.085)*260)*(0.5+0.5*sin(t*91))':d=0.7" -af "highpass=f=1500,lowpass=f=7000,volume=1.8" $enc "$out/keyboard.mp3"
# shutter: two clicks
f -f lavfi -i "aevalsrc='(random(0)*2-1)*(exp(-t*220)+0.8*exp(-abs(t-0.09)*260)*gte(t,0.09))':d=0.25" -af "highpass=f=900,volume=2" $enc "$out/shutter.mp3"
# rise: tension riser into a drop
f -f lavfi -i "aevalsrc='0.4*sin(2*PI*(200+900*t*t)*t)*min(1,t*2)+0.2*(random(0)*2-1)*t/1.6':d=1.6" -af "highpass=f=150,afade=t=out:st=1.5:d=0.1,volume=1.3" $enc "$out/rise.mp3"
ls -la "$out"
