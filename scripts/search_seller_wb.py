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
    driver.open(f"https://www.wildberries.ru/seller/{seller_id}")

    for _ in range(30):
        time.sleep(1.0)
        cookies = driver.execute_cdp_cmd("Network.getAllCookies", {})
        has_token = any(c.get("name") == "x_wbaas_token" for c in cookies.get("cookies", []))
        if has_token:
            break

    for page in range(1, pages + 1):
        if page == 1:
            time.sleep(3)
        else:
            driver.get(f"https://www.wildberries.ru/seller/{seller_id}?page={page}")
            time.sleep(3)

        product_ids = driver.execute_script("""
            var links = document.querySelectorAll('a');
            var ids = [];
            var seen = new Set();
            for (var i = 0; i < links.length; i++) {
                var href = links[i].getAttribute('href') || '';
                var m = href.match(/\\/catalog\\/(\\d+)\\/detail/);
                if (m && !seen.has(m[1])) {
                    seen.add(m[1]);
                    ids.push({id: parseInt(m[1])});
                }
            }
            return ids;
        """)

        if product_ids and len(product_ids) > 0:
            seen_ids = {p.get("id") for p in all_products if p.get("id")}
            for p in product_ids:
                pid = p.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    all_products.append(p)

    if not all_products:
        print(json.dumps({"success": False, "error": "Не удалось найти товары продавца на странице."}), flush=True)
    else:
        print(json.dumps({"success": True, "count": len(all_products), "products": all_products}), flush=True)
except Exception as e:
    import traceback
    print(json.dumps({"success": False, "error": str(e) + " " + traceback.format_exc()}), flush=True)
finally:
    driver.quit()
