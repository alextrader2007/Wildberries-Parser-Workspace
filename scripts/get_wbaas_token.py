import sys, time, os, warnings
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
from seleniumbase import Driver

driver = Driver(
    uc=True,
    headless=False,
    browser="chrome",
    user_data_dir=os.path.join(
        os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
        "WBParser", "chrome-data"
    ),
)

driver.open("https://www.wildberries.ru/")

found = None
for _ in range(30):
    time.sleep(1.0)
    cookies = driver.execute_cdp_cmd("Network.getAllCookies", {})
    for cookie in cookies.get("cookies", []):
        if cookie.get("name") == "x_wbaas_token":
            found = cookie.get("value")
            break
    if found:
        break

try:
    driver.quit()
except:
    pass

if found:
    print(found, flush=True)
    sys.exit(0)
sys.exit(1)
