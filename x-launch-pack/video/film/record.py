"""Rend film.html image par image (30 i/s) puis assemble avec la musique (extrait 16 s → 42,5 s, fondu de sortie)."""
import os, subprocess, sys, imageio_ffmpeg
from playwright.sync_api import sync_playwright
FPS, DUR = 30, 26.5; os.makedirs("frames", exist_ok=True)
only = [float(x) for x in sys.argv[1:]]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome"); pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto("file://" + os.path.abspath(os.environ.get("FILM", "neural.html"))); pg.evaluate("Promise.all(['400','600','800'].map(w=>document.fonts.load(w+' 40px S')))"); pg.wait_for_timeout(1500); pg.evaluate("sampleText()")
    times = only or [i / FPS for i in range(int(DUR * FPS))]
    for i, t in enumerate(times):
        pg.evaluate(f"render({t})"); pg.wait_for_timeout(5 if not only else 120)
        pg.screenshot(path=f"frames/{'still_'+str(t) if only else f'{i:05d}'}.jpg", type="jpeg", quality=92)
    b.close()
if not only:
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, "-y", "-framerate", str(FPS), "-i", "frames/%05d.jpg", "-ss", "16.0", "-t", str(DUR), "-i", "../music/total-war.mp3",
                    "-filter:a", f"afade=t=in:d=0.2,afade=t=out:st={DUR-1.6}:d=1.6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "../golem-neural.mp4"], check=True)
    print("done")
