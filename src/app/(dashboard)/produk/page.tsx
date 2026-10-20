import { connection } from 'next/server';
import { getProducts } from '@/app/actions/products';
import { ProductsClient } from '@/components/products/products-client';

export default async function ProductsPage() {
  await connection();
  const result = await getProducts({
    page: 1,
    per_page: 20,
    filter: 'all',
  });

  const products = result.success && result.data ? result.data.data : [];
  const total = result.success && result.data ? result.data.total : 0;

  return (
    <ProductsClient
      initialProducts={products}
      initialTotal={total}
    />
  );
}
