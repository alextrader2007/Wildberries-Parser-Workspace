import sys, time, os, json, warnings
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
from seleniumbase import Driver

seller_id = sys.argv[1] if len(sys.argv) > 1 else ""
pages = int(sys.argv[2]) if len(sys.argv) > 2 else 1
dest = sys.argv[3] if len(sys.argv) > 3 else "-2888067"
curr = sys.argv[4] if len(sys.argv) > 4 else "byn"

if not seller_id:
    print(json.dumps({"success": False, "error": "ID продавца не указан."}), flush=True)
    sys.exit(0)

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
    driver.open("https://www.wildberries.ru/")
    for _ in range(20):
        time.sleep(1.0)
        cookies = driver.execute_cdp_cmd("Network.getAllCookies", {})
        has_token = any(c.get("name") == "x_wbaas_token" for c in cookies.get("cookies", []))
        if has_token:
            break

    driver.execute_script(f"window.location.href = 'https://www.wildberries.ru/seller/{seller_id}';")
    time.sleep(10)

    for _ in range(20):
        time.sleep(1.0)
        product_ids = driver.execute_script("""
            var links = document.querySelectorAll('a');
            var ids = [];
            links.forEach(function(a) {
                var m = a.href.match(/\\/catalog\\/(\\d+)\\/detail/);
                if (m && ids.indexOf(parseInt(m[1],10)) === -1) ids.push(parseInt(m[1],10));
            });
            return ids.slice(0, 100);
        """)
        if product_ids and len(product_ids) > 0:
            break
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    if product_ids:
        for pid in product_ids:
            if not any(p.get("id") == pid for p in all_products):
                all_products.append({"id": pid, "name": "", "brand": "", "panelPromoId": 0})

    print(json.dumps({"success": True, "count": len(all_products), "products": all_products}), flush=True)
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), flush=True)
finally:
    driver.quit()