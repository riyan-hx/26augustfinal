import sys, asyncio, pathlib
from playwright.async_api import async_playwright
D=pathlib.Path(sys.argv[1]); (D/'out').mkdir(exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel="chrome")
        pg=await b.new_page(viewport={'width':1080,'height':1350})
        await pg.goto((D/'teaser.html').as_uri()); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.fonts.ready")
        for i in range(1,5):
            await pg.evaluate(f"document.querySelector('#t{i}').scrollIntoView()"); await pg.wait_for_timeout(600)
            await pg.screenshot(path=str(D/'out'/f'lumid-teaser-v{i}.png'))
        await b.close()
asyncio.run(main())
