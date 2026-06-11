import { randomBytes } from 'crypto';

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export const createBuyerId = () => createId('byr');
export const createAddressId = () => createId('adr');
export const createCartId = () => createId('crt');
export const createCartItemId = () => createId('cit');
export const createFavoriteId = () => createId('fav');
export const createOrderId = () => createId('ord');
export const createOrderSellerGroupId = () => createId('osg');
export const createOrderItemId = () => createId('oit');
export const createOrderStatusHistoryId = () => createId('osh');
