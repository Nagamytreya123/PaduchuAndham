type ComboLike = {
  _id: unknown;
  name: string;
  images?: string[] | null;
  productIds?: unknown[] | null;
  price: number;
  isActive?: boolean | null;
};

export function jewelleryComboToJson(c: ComboLike) {
  const ids = c.productIds?.length ? c.productIds.map((id) => String(id)) : [];
  return {
    id: String(c._id),
    name: c.name,
    images: c.images?.length ? [...c.images] : [],
    productIds: ids,
    price: c.price,
    isActive: c.isActive !== false,
  };
}
