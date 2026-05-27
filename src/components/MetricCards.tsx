import { TrendingUp, Award, Layers, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface MetricCardsProps {
  products: Product[];
  currencySymbol: string;
}

export default function MetricCards({ products, currencySymbol }: MetricCardsProps) {
  if (products.length === 0) return null;

  // Total stock
  const totalStockSum = products.reduce((acc, p) => acc + (p.totalStock || 0), 0);

  // Average price discounted
  const totalPrices = products.filter(p => p.priceDiscounted > 0);
  const avgPrice = totalPrices.length > 0 
    ? (totalPrices.reduce((acc, p) => acc + p.priceDiscounted, 0) / totalPrices.length).toFixed(2)
    : "0.00";

  // Average rating
  const totalRatings = products.filter(p => p.rating > 0);
  const avgRating = totalRatings.length > 0
    ? (totalRatings.reduce((acc, p) => acc + p.rating, 0) / totalRatings.length).toFixed(1)
    : "0.0";

  // Promo items count
  const promoCount = products.filter(p => p.isPromo === "Да").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-xl">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Собрано позиций</p>
          <p className="text-2xl font-bold font-display text-slate-800">{products.length} шт.</p>
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Средняя цена</p>
          <p className="text-2xl font-bold font-display text-slate-800">{avgPrice} <span className="text-sm font-normal text-slate-500">{currencySymbol}</span></p>
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Средний рейтинг</p>
          <p className="text-2xl font-bold font-display text-slate-800">★ {avgRating}</p>
        </div>
      </div>

      {/* Card 4 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all hover:translate-y-[-2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Общие остатки (МСК)</p>
          <p className="text-2xl font-bold font-display text-slate-800">{totalStockSum.toLocaleString()} шт.</p>
        </div>
      </div>
    </div>
  );
}
