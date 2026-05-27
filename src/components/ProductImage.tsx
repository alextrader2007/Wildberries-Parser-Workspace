import { useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { getBasketStatic } from '../shared/basket';

const basketCache = new Map<number, { basket: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function buildImgUrl(id: number, basket: string): string {
  return `https://basket-${basket}.wbbasket.ru/vol${Math.floor(id / 100000)}/part${Math.floor(id / 1000)}/${id}/images/big/1.webp`;
}

async function findBasket(id: number): Promise<string> {
  const vol = Math.floor(id / 100000);
  const cached = basketCache.get(vol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.basket;

  const staticBasket = getBasketStatic(vol);
  const check = async (b: string): Promise<boolean> => {
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 4000);
      const r = await fetch(buildImgUrl(id, b), { method: "HEAD", signal: c.signal });
      return r.ok;
    } catch { return false; }
  };

  if (await check(staticBasket)) { basketCache.set(vol, { basket: staticBasket, ts: Date.now() }); return staticBasket; }

  const common = ["39", "40", "41"].filter(b => b !== staticBasket);
  for (const b of common) {
    if (await check(b)) { basketCache.set(vol, { basket: b, ts: Date.now() }); return b; }
  }

  const allBaskets = Array.from({ length: 99 }, (_, i) => `${i + 1}`.padStart(2, "0"))
    .filter(b => b !== staticBasket && !common.includes(b));

  for (let i = 0; i < allBaskets.length; i += 10) {
    const batch = allBaskets.slice(i, i + 10);
    const results = await Promise.all(batch.map(async b => ({ b, ok: await check(b) })));
    const found = results.find(r => r.ok);
    if (found) { basketCache.set(vol, { basket: found.b, ts: Date.now() }); return found.b; }
  }

  basketCache.set(vol, { basket: staticBasket, ts: Date.now() });
  return staticBasket;
}

export default function ProductImage({ id, basket, alt, className }: { id: number; basket?: string; alt: string; className?: string }) {
  const vol = Math.floor(id / 100000);
  const cachedBasket = basketCache.get(vol);
  const [currentBasket, setCurrentBasket] = useState(() => basket || (cachedBasket && Date.now() - cachedBasket.ts < CACHE_TTL ? cachedBasket.basket : null) || getBasketStatic(vol));
  const [showModal, setShowModal] = useState(false);
  const searching = useRef(false);

  const handleError = useCallback(() => {
    if (searching.current) return;
    searching.current = true;
    findBasket(id).then(b => { setCurrentBasket(b); searching.current = false; });
  }, [id]);

  const src = buildImgUrl(id, currentBasket);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
        onError={handleError}
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer' }}
      />
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain"
              referrerPolicy="no-referrer"
              onError={handleError}
            />
          </div>
        </div>
      )}
    </>
  );
}
