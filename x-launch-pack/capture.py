"""Captures du site pour le pack X (2x). Les animations Reveal et les canvas ont besoin de quelques secondes."""
from playwright.sync_api import sync_playwright
BASE = "https://hire-desk-five.vercel.app"
VIEWS_ALL = [("hero", "/", 0), ("live", "/", 820), ("how", "/", 2300), ("gate", "/", 4600), ("studio", "/studio", 0), ("studio2", "/studio", 520), ("floor", "/floor", 0), ("floor2", "/floor", 470), ("board", "/agents", 0), ("scout", "/a/scout", 0)]
import sys
VIEWS = [v for v in VIEWS_ALL if len(sys.argv) < 2 or v[0] in sys.argv[1:]]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=2)
    for name, path, y in VIEWS:
        pg.goto(BASE + path, wait_until="networkidle"); pg.wait_for_timeout(5000)
        if y:
            for _ in range(6): pg.mouse.wheel(0, y / 6); pg.wait_for_timeout(250)
            pg.wait_for_timeout(2500)
        pg.screenshot(path=f"shots/{name}.png"); print(name)
    b.close()
