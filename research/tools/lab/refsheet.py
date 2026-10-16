"""Contact sheets for a reference video: opening (0-3s every 0.2s) and overview (12 frames)."""
import subprocess, sys, os, json, tempfile
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 150
dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src]).decode().strip())
def grab(ts, w):
    with tempfile.NamedTemporaryFile(suffix=".png") as f:
        subprocess.run(["ffmpeg","-v","error","-y","-ss",f"{ts:.3f}","-i",src,"-frames:v","1","-vf",f"scale={w}:-2",f.name],check=True)
        return Image.open(f.name).convert("RGB").copy()
def row(times, w):
    ims=[grab(t,w) for t in times]
    h=max(i.height for i in ims); sheet=Image.new("RGB",(sum(i.width for i in ims)+4*(len(ims)-1),h),(20,20,20)); x=0
    for i in ims: sheet.paste(i,(x,0)); x+=i.width+4
    return sheet
o=row([min(dur-0.05,0.2*i) for i in range(15)], W)
v=row([0.1+i*(dur-0.2)/11 for i in range(12)], W)
H=Image.new("RGB",(max(o.width,v.width),o.height+v.height+10),(0,0,0)); H.paste(o,(0,0)); H.paste(v,(0,o.height+10)); H.save(out,quality=82)
print(out, f"{dur:.1f}s")
