import { PaymentConfig } from "../types";
import { PAYMENT_CACHE_DURATION_MS } from "../../shared/constants";
import { fetchWithTimeout } from "../utils/fetch";

let paymentSettingsCache: PaymentConfig | null = null;
let lastPaymentFetch = 0;

export async function getWalletConfig(): Promise<PaymentConfig> {
  const now = Date.now();
  if (paymentSettingsCache && now - lastPaymentFetch < PAYMENT_CACHE_DURATION_MS) {
    return paymentSettingsCache;
  }

  let discount = 3;
  let maxPrice = 12000;

  try {
    const payRes = await fetchWithTimeout("https://static-basket-01.wbbasket.ru/vol1/global-payment/default-payment.json");
    if (payRes.ok) {
      const payload: any = await payRes.json();
      if (payload.state === 0 && Array.isArray(payload.data)) {
        const item = payload.data.find((d: any) => d.wc_type === "Незалогиненный кошелёк" && d.is_active === true);
        if (item?.discount_value) {
          discount = Number(item.discount_value);
        }
      }
    }
  } catch (e) {
    console.error("Error fetching default payment settings:", e);
  }

  try {
    const setRes = await fetchWithTimeout("https://static-basket-01.wbbasket.ru/vol0/data/settings-front.json");
    if (setRes.ok) {
      const payload: any = await setRes.json();
      if (payload.variables?.wlt1DiscountDisplayMaxPrice) {
        maxPrice = Number(payload.variables.wlt1DiscountDisplayMaxPrice);
      }
    }
  } catch (e) {
    console.error("Error fetching global settings variables:", e);
  }

  paymentSettingsCache = { discount, maxPrice };
  lastPaymentFetch = now;
  return paymentSettingsCache;
}
