"""Visuels du pack X de golem. Fonds = captures du site floutées et assombries ; police Sora ; orange #ff6a24."""
import json, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
F = lambda w, s: ImageFont.truetype(f"fonts/Sora-{w}.ttf", s)
BG, INK, FG, MUT, OR = (11, 12, 11), (11, 12, 11), (236, 233, 224), (143, 140, 131), (255, 106, 36)
DOMAIN = "getgolem.xyz"

def mark(size, tile=True, bg=OR, ink=INK):
    """The G + node mark, drawn at 4x then reduced (same geometry as src/app/icon.svg, 64-unit grid)."""
    S = size * 4; u = S / 64; im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if tile: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=16 * u, fill=bg)
    cx, cy, r, w = 32 * u, 32 * u, 16.2 * u, 8.4 * u
    import math
    a0 = 0; a1 = 360 - math.degrees(math.atan2(11.6, 11.6))  # top-right end, as in the SVG
    d.arc([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], start=a0, end=a1, fill=ink, width=int(w))
    for ang in (a0, a1):
        x, y = cx + r * math.cos(math.radians(ang)), cy + r * math.sin(math.radians(ang))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=ink)
    d.rectangle([34 * u, cy - w / 2, cx + r, cy + w / 2], fill=ink)
    d.ellipse([33.6 * u - 5.6 * u, cy - 5.6 * u, 33.6 * u + 5.6 * u, cy + 5.6 * u], fill=ink)
    return im.resize((size, size), Image.LANCZOS)

def backdrop(shot, W, H, blur=80, dark=0.42):
    im = Image.open(f"shots/{shot}.png").convert("RGB"); r = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * r) + 1, int(im.height * r) + 1)).crop((0, 0, W, H)).filter(ImageFilter.GaussianBlur(blur))
    im = Image.blend(Image.new("RGB", (W, H), BG), im, dark)
    glow = Image.new("RGB", (W, H), BG); g = ImageDraw.Draw(glow)
    for i in range(40):
        rr = int(W * 0.5 * (1 - i / 40)); a = i / 40
        g.ellipse([W * 0.82 - rr, -H * 0.2 - rr, W * 0.82 + rr, -H * 0.2 + rr], fill=tuple(int(BG[k] + (OR[k] - BG[k]) * a * 0.22) for k in range(3)))
    return ImageChops.lighter(im, glow.filter(ImageFilter.GaussianBlur(60)))

def wrap(d, text, font, max_w):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) > max_w and cur: out.append(cur); cur = w
        else: cur = t
    out.append(cur); return out

def text_block(d, x, y_top, y_bot, label, l1, l2, body, max_w=1380):
    size = 78
    while max(d.textlength(l1, font=F(800, size)), d.textlength(l2, font=F(800, size))) > max_w and size > 40: size -= 2
    bf = F(400, 30 if max_w > 1000 else 27); lines = []
    for para in body: lines += wrap(d, para, bf, max_w) + [""]
    lh = 41 if max_w > 1000 else 37
    hT = size * 1.08 * 2 + 30 + len(lines) * lh
    y = y_top + (y_bot - y_top - hT) / 2
    d.text((x, y_top - 60), label, font=F(700, 22), fill=OR)
    d.text((x, y), l1, font=F(800, size), fill=FG); y += size * 1.08
    d.text((x, y), l2, font=F(800, size), fill=OR); y += size * 1.08 + 30
    for l in lines:
        if l: d.text((x, y), l, font=bf, fill=(200, 197, 189))
        y += lh

def post(name, shot, label, l1, l2, body, extra=None):
    W, H = 1600, 900; im = backdrop(shot, W, H); d = ImageDraw.Draw(im)
    text_block(d, 110, 190, 760, label.upper(), l1, l2, body, max_w=740 if extra else 1380)
    d.line([110, 790, W - 110, 790], fill=(60, 58, 54), width=2)
    im.paste(mark(44), (110, 815), mark(44)); d.text((168, 822), "golem", font=F(700, 28), fill=FG)
    d.text((W - 110, 826), f"{DOMAIN} · Robinhood Chain", font=F(400, 24), fill=MUT, anchor="ra")
    if extra: extra(im, d)
    im.save(f"img/{name}.png"); print(name)

def shot_frame(im, shot, box, crop=None):
    s = Image.open(f"shots/{shot}.png").convert("RGB")
    if crop: s = s.crop(crop)
    x0, y0, x1, y1 = box; r = min((x1 - x0) / s.width, (y1 - y0) / s.height); s = s.resize((int(s.width * r), int(s.height * r)), Image.LANCZOS)
    m = Image.new("L", s.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, s.width - 1, s.height - 1], radius=18, fill=255)
    sh = Image.new("RGBA", (s.width + 80, s.height + 80), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([40, 50, s.width + 40, s.height + 50], radius=22, fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(24)); im.paste(sh, (x0 - 40, y0 - 40), sh); im.paste(s, (x0, y0), m)
    ImageDraw.Draw(im).rounded_rectangle([x0, y0, x0 + s.width, y0 + s.height], radius=18, outline=(70, 66, 60), width=2)

# ---------- avatar + banner
mark(1024, tile=False).save("img/_g.png")
pfp = Image.new("RGB", (1024, 1024), OR); g = mark(820, tile=False); pfp.paste(g, (102, 102), g); pfp.save("img/pfp.png"); print("pfp")
W, H = 1500, 500; ban = backdrop("hero", W, H, blur=90, dark=0.35); d = ImageDraw.Draw(ban)
d.text((560, 150), "Build an agent in one sentence.", font=F(800, 50), fill=FG)
d.text((560, 214), "Fire it when it loses.", font=F(800, 50), fill=OR)
d.text((562, 300), "AI trading agents in public on Robinhood Chain", font=F(400, 24), fill=MUT)
ban.save("img/x-banner.png"); print("banner")

# ---------- article cover 5:2
W, H = 1500, 600; cov = Image.new("RGB", (W, H), BG); fl = Image.open("../public/art/floor-dark.jpg").convert("RGB")
fl = fl.resize((W, int(fl.height * W / fl.width))); cov.paste(fl, (0, H - fl.height + 40))
grad = Image.new("L", (W, H), 0); gd = ImageDraw.Draw(grad)
for y in range(H): gd.line([0, y, W, y], fill=int(255 * max(0, min(1, (330 - y) / 230))))
cov.paste(Image.new("RGB", (W, H), BG), (0, 0), grad); d = ImageDraw.Draw(cov)
cov.paste(mark(64), (90, 70), mark(64)); d.text((170, 80), "golem", font=F(700, 40), fill=FG)
d.text((90, 170), "Build an agent in one sentence.", font=F(800, 60), fill=FG); d.text((90, 240), "Fire it when it loses.", font=F(800, 60), fill=OR)
cov.save("img/A0-cover.png"); print("cover")

# ---------- live data for the posts
floor = json.load(urllib.request.urlopen("https://getgolem.xyz/api/floor" if False else "https://hire-desk-five.vercel.app/api/floor"))
st = floor.get("stats", {})
pools, live, passed, blocked = st.get("pools"), st.get("tracked"), st.get("passed"), st.get("blocked")

post("T1-studio", "studio", "agent studio · no code", "Type one sentence.", "Get a trading agent.",
     ["“buy ETH when RSI drops below 25, fire it at 12%” becomes rules you can read, a backtest on 720 real hourly candles and a public page."],
     lambda im, d: shot_frame(im, "studio2", (930, 140, 1500, 760), (1560, 200, 2900, 1500)))
post("T2-gate", "floor", "the gate", "Seven checks before", "any agent may call.",
     [f"{pools:,} Robinhood Chain pools read from the chain. {passed} pass the gate right now, {blocked} are blocked." if pools else "Every Robinhood Chain pool is read from the chain and run through seven checks.",
      "liquidity · depth · someone sold · organic flow · original ticker · age · not already pumped"],
     lambda im, d: shot_frame(im, "floor2", (960, 150, 1500, 760), (1890, 890, 2860, 1700)))
post("T3-fired", "how", "the firing line", "Every agent has a limit.", "Cross it, it's fired.",
     ["each agent carries a maximum drawdown. cross it and it stops, in public, with its record kept on the leaderboard forever."])
post("T4-open", "board", "open source", "Every line is public.", "Every call has a receipt.",
     ["the code is on github. the calls, the gate checks and the firings are on the site, with timestamps."])

# ---------- LIVE (no ticker) + DEX PAID
W, H = 1600, 900; im = backdrop("hero", W, H, blur=95, dark=0.4); d = ImageDraw.Draw(im)
gm = mark(200); im.paste(gm, (W // 2 - 100, 190), gm)
d.text((W // 2, 470), "we are live", font=F(800, 120), fill=FG, anchor="mm")
d.text((W // 2, 570), "build an agent in one sentence. fire it when it loses.", font=F(400, 34), fill=MUT, anchor="mm")
d.text((W // 2, 800), DOMAIN, font=F(600, 30), fill=OR, anchor="mm")
im.save("img/L1-live.png"); print("live")
im = backdrop("floor", W, H, blur=95, dark=0.4); d = ImageDraw.Draw(im)
dx = Image.open("logos/dex.png").convert("RGBA").resize((220, 220), Image.LANCZOS); gm = mark(220)
im.paste(gm, (W // 2 - 300, 230), gm); d.text((W // 2, 340), "×", font=F(400, 90), fill=MUT, anchor="mm")
dm = Image.new("L", (220, 220), 0); ImageDraw.Draw(dm).rounded_rectangle([0, 0, 219, 219], radius=52, fill=255)
im.paste(dx, (W // 2 + 80, 230), dm)
d.text((W // 2, 590), "dex screener paid", font=F(800, 92), fill=FG, anchor="mm")
d.text((W // 2, 680), "golem on DEX Screener · Robinhood Chain", font=F(400, 32), fill=MUT, anchor="mm")
im.save("img/D1-dex-paid.png"); print("dex")
