import sys, asyncio, pathlib
from playwright.async_api import async_playwright
D=pathlib.Path(sys.argv[1]); (D/'out').mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome")
        pg=await b.new_page(viewport={'width':1080,'height':1350})
        await pg.goto((D/'single.html').as_uri()); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.fonts.ready")
        await pg.locator('#single').screenshot(path=str(D/'out'/'lumid-post0-single.png'))
        await b.close()
asyncio.run(main())
