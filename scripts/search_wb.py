import sys, time, os, json, urllib.parse, warnings
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
from seleniumbase import Driver

query = sys.argv[1] if len(sys.argv) > 1 else "платье"
pages = int(sys.argv[2]) if len(sys.argv) > 2 else 1
dest = sys.argv[3] if len(sys.argv) > 3 else "-2888067"
curr = sys.argv[4] if len(sys.argv) > 4 else "byn"
seller_id = sys.argv[5] if len(sys.argv) > 5 else ""

driver = Driver(
    uc=True,
    headless=False,
    browser="chrome",
    user_data_dir=os.path.join(
        os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
        "WBParser", "chrome-data"
    ),
)

all_products = []
try:
    driver.set_page_load_timeout(30)
    if seller_id:
        driver.open(f"https://www.wildberries.ru/seller/{seller_id}")
    else:
        driver.open("https://www.wildberries.ru/")
    for _ in range(20):
        time.sleep(1.0)
        cookies = driver.execute_cdp_cmd("Network.getAllCookies", {})
        has_token = any(c.get("name") == "x_wbaas_token" for c in cookies.get("cookies", []))
        if has_token:
            break

    if seller_id:
        time.sleep(2)
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)
        product_ids = driver.execute_script("""
            var links = document.querySelectorAll('a');
            var ids = [];
            links.forEach(function(a) {
                var m = a.href.match(/\\/catalog\\/(\\d+)\\/detail/);
                if (m && ids.indexOf(parseInt(m[1],10)) === -1) ids.push(parseInt(m[1],10));
            });
            return ids.slice(0, 100);
        """)
        if product_ids:
            for pid in product_ids:
                if not any(p.get("id") == pid for p in all_products):
                    all_products.append({"id": pid, "name": "", "brand": "", "panelPromoId": 0})
    else:
        for page in range(1, pages + 1):
            params = (
                f"ab_testing=false&appType=64&curr={curr}&dest={dest}"
                f"&query={urllib.parse.quote(query)}&resultset=catalog&sort=popular&spp=30&limit=100&page={page}"
            )

            search_url = f"https://www.wildberries.ru/__internal/u-search/exactmatch/sng/common/v18/search?{params}"

            result = driver.execute_async_script("""
                var url = arguments[0];
                var done = arguments[1];
                var controller = new AbortController();
                setTimeout(function() { controller.abort(); }, 15000);
                fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Spa-Version': '13.15.1',
                        'X-Userid': '0',
                        'Accept': '*/*',
                    }
                })
                .then(r => r.text())
                .then(t => JSON.parse(t))
                .then(data => done(data))
                .catch(e => done({error: e.message}));
            """, search_url)

            products = result.get("products") or result.get("data", {}).get("products") or []
            if not products:
                break

            for prod in products:
                prod_id = prod.get("id")
                if prod_id and not any(p.get("id") == prod_id for p in all_products):
                    all_products.append(prod)

            if page < pages:
                time.sleep(1.5)

    print(json.dumps({"success": True, "count": len(all_products), "products": all_products}), flush=True)
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), flush=True)
finally:
    driver.quit()
