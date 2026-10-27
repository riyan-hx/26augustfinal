import sys, asyncio, pathlib
from playwright.async_api import async_playwright
D=pathlib.Path(sys.argv[1]); out=D/'out'; out.mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome")
        pg=await b.new_page(viewport={'width':1080,'height':1350}, device_scale_factor=1)
        await pg.goto((D/'slides.html').as_uri()); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.fonts.ready")
        for i in range(1,10):
            await pg.locator(f'#s{i}').screenshot(path=str(out/f'lumid-post1-{i:02d}.png'))
        await b.close()
asyncio.run(main())
