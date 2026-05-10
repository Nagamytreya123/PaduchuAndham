/** Split bundle total across watch and bracelet by list-price ratio (integer paise). Mirrors server checkout validation. */
export function allocateWatchBraceletBundle(
  watchListPaise: number,
  braceletListPaise: number,
  bundleTotalPaise: number,
): { watchUnitPaise: number; braceletUnitPaise: number } {
  const sum = watchListPaise + braceletListPaise;
  if (sum <= 0) {
    const w = Math.floor(bundleTotalPaise / 2);
    return { watchUnitPaise: w, braceletUnitPaise: bundleTotalPaise - w };
  }
  const watchUnitPaise = Math.round((bundleTotalPaise * watchListPaise) / sum);
  return { watchUnitPaise, braceletUnitPaise: bundleTotalPaise - watchUnitPaise };
}

/** N-way split by list-price ratio (integer paise; last item absorbs rounding). Mirrors server checkout validation. */
export function allocateListRatioBundle(listPricesPaise: number[], bundleTotalPaise: number): number[] {
  const n = listPricesPaise.length;
  if (n === 0) return [];
  if (n === 1) return [bundleTotalPaise];
  const sum = listPricesPaise.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const base = Math.floor(bundleTotalPaise / n);
    const out = Array.from({ length: n }, () => base);
    out[n - 1] = bundleTotalPaise - base * (n - 1);
    return out;
  }
  const out: number[] = [];
  let remaining = bundleTotalPaise;
  for (let i = 0; i < n - 1; i++) {
    const p = Math.round((bundleTotalPaise * listPricesPaise[i]) / sum);
    out.push(p);
    remaining -= p;
  }
  out.push(remaining);
  return out;
}
