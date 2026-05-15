import { Product } from '../types';
import { PDF_PRODUCTS } from './pdfProducts';

// Exporting the real products extracted from the PDF
export const MOCK_PRODUCTS = PDF_PRODUCTS.map(product => {
  const { colors, ...rest } = product;
  return {
    ...product
  };
});
