import type { Types } from 'mongoose';

export type BundleProductLean = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  matchingBraceletIds?: Types.ObjectId[];
  watchBraceletBundlePrice?: number | null;
};

export type JewelleryComboDefinition = {
  productIds: string[];
  bundlePricePaise: number;
};

export type OrderItemInput = {
  productId: string;
  qty: number;
  unitPricePaise?: number;
};

/** Split bundle total across watch and bracelet by list-price ratio (integer paise). */
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

/** Split bundle total across N catalogue lines by list-price ratio (integer paise; last line absorbs rounding). */
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

type PoolUnit = { productId: string; unitPricePaise: number };

function pickIndicesForJewelleryCombo(
  unmatched: PoolUnit[],
  expected: { productId: string; unitPricePaise: number }[],
  mustIncludeIndex: number,
): number[] | null {
  const n = expected.length;
  const used = new Set<number>();
  const path: number[] = [];

  function dfs(k: number): number[] | null {
    if (k === n) {
      return path.includes(mustIncludeIndex) ? [...path] : null;
    }
    const { productId, unitPricePaise } = expected[k];
    for (let i = 0; i < unmatched.length; i++) {
      if (used.has(i)) continue;
      const u = unmatched[i];
      if (u.productId !== productId || u.unitPricePaise !== unitPricePaise) continue;
      used.add(i);
      path.push(i);
      const r = dfs(k + 1);
      if (r) return r;
      path.pop();
      used.delete(i);
    }
    return null;
  }

  return dfs(0);
}

function tryRemoveJewelleryCombo(
  unmatched: PoolUnit[],
  mustIncludeIndex: number,
  productsById: Map<string, BundleProductLean>,
  combos: JewelleryComboDefinition[],
): boolean {
  const must = unmatched[mustIncludeIndex];
  for (const combo of combos) {
    const chainIds = combo.productIds;
    if (chainIds.length < 2) continue;
    if (!chainIds.includes(must.productId)) continue;
    const bundleP = combo.bundlePricePaise;
    if (bundleP == null || bundleP <= 0) continue;
    const prods = chainIds.map((id) => productsById.get(id));
    if (prods.some((x) => !x)) continue;
    const listPrices = prods.map((x) => x!.price);
    const alloc = allocateListRatioBundle(listPrices, bundleP);
    const expected = chainIds.map((id, i) => ({ productId: id, unitPricePaise: alloc[i] }));
    const picked = pickIndicesForJewelleryCombo(unmatched, expected, mustIncludeIndex);
    if (!picked) continue;
    picked.sort((a, b) => b - a);
    for (const idx of picked) unmatched.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Validates declared unit prices against catalogue prices, watch+bracelet bundles, and jewellery combo sets.
 * Returns aggregated order lines (merged qty per productId + charged unit price).
 */
export function validateOrderItemsWithBundles(
  items: OrderItemInput[],
  productsById: Map<string, BundleProductLean>,
  jewelleryCombos: JewelleryComboDefinition[] = [],
): { amountPaise: number; lines: { productId: Types.ObjectId; name: string; price: number; qty: number }[] } {
  const pool: PoolUnit[] = [];
  for (const line of items) {
    const p = productsById.get(line.productId);
    if (!p) throw new Error(`Invalid product: ${line.productId}`);
    const list = p.price;
    const declared = line.unitPricePaise !== undefined ? line.unitPricePaise : list;
    if (!Number.isInteger(declared) || declared < 0) {
      throw new Error('Invalid unit price');
    }
    if (line.qty < 1 || !Number.isInteger(line.qty)) {
      throw new Error('Invalid quantity');
    }
    for (let i = 0; i < line.qty; i++) {
      pool.push({ productId: line.productId, unitPricePaise: declared });
    }
  }

  const unmatched: PoolUnit[] = [...pool];

  function validBundlePair(a: PoolUnit, b: PoolUnit): boolean {
    const pa = productsById.get(a.productId)!;
    const pb = productsById.get(b.productId)!;

    const idsOnPa = new Set((pa.matchingBraceletIds ?? []).map((id) => String(id)));
    const bundleA = pa.watchBraceletBundlePrice;
    if (bundleA != null && bundleA >= 0 && idsOnPa.has(b.productId)) {
      const alloc = allocateWatchBraceletBundle(pa.price, pb.price, bundleA);
      if (alloc.watchUnitPaise === a.unitPricePaise && alloc.braceletUnitPaise === b.unitPricePaise) {
        return true;
      }
    }

    const idsOnPb = new Set((pb.matchingBraceletIds ?? []).map((id) => String(id)));
    const bundleB = pb.watchBraceletBundlePrice;
    if (bundleB != null && bundleB >= 0 && idsOnPb.has(a.productId)) {
      const alloc = allocateWatchBraceletBundle(pb.price, pa.price, bundleB);
      if (alloc.watchUnitPaise === b.unitPricePaise && alloc.braceletUnitPaise === a.unitPricePaise) {
        return true;
      }
    }

    return false;
  }

  function removePairAtIndices(i: number, j: number) {
    const hi = Math.max(i, j);
    const lo = Math.min(i, j);
    unmatched.splice(hi, 1);
    unmatched.splice(lo, 1);
  }

  while (unmatched.length > 0) {
    const mismatchIdx = unmatched.findIndex((u) => {
      const p = productsById.get(u.productId)!;
      return u.unitPricePaise !== p.price;
    });
    if (mismatchIdx === -1) break;

    let removed = false;
    for (let j = 0; j < unmatched.length; j++) {
      if (j === mismatchIdx) continue;
      if (validBundlePair(unmatched[mismatchIdx], unmatched[j])) {
        removePairAtIndices(mismatchIdx, j);
        removed = true;
        break;
      }
    }
    if (removed) continue;

    if (tryRemoveJewelleryCombo(unmatched, mismatchIdx, productsById, jewelleryCombos)) {
      continue;
    }

    let pairIndices: [number, number] | null = null;
    outer: for (let i = 0; i < unmatched.length; i++) {
      for (let j = i + 1; j < unmatched.length; j++) {
        if (validBundlePair(unmatched[i], unmatched[j])) {
          pairIndices = [i, j];
          break outer;
        }
      }
    }

    if (!pairIndices) {
      throw new Error('Cart prices do not match current catalogue');
    }

    removePairAtIndices(pairIndices[0], pairIndices[1]);
  }

  for (const u of unmatched) {
    const p = productsById.get(u.productId)!;
    if (u.unitPricePaise !== p.price) {
      throw new Error('Cart prices do not match current catalogue');
    }
  }

  const groups = new Map<string, { productId: string; unitPricePaise: number; qty: number }>();
  for (const u of pool) {
    const key = `${u.productId}:${u.unitPricePaise}`;
    const cur = groups.get(key);
    if (cur) cur.qty += 1;
    else groups.set(key, { productId: u.productId, unitPricePaise: u.unitPricePaise, qty: 1 });
  }

  let amountPaise = 0;
  const lines: { productId: Types.ObjectId; name: string; price: number; qty: number }[] = [];

  for (const g of groups.values()) {
    const p = productsById.get(g.productId)!;
    amountPaise += g.unitPricePaise * g.qty;
    lines.push({
      productId: p._id,
      name: p.name,
      price: g.unitPricePaise,
      qty: g.qty,
    });
  }

  return { amountPaise, lines };
}
