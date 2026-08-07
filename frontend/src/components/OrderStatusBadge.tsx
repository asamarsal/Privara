import React from 'react';
import { OrderStatus } from '../hooks/useOrderStatus';

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  switch (status) {
    case 'open':
      return <span className="badge badge-blue">Open</span>;
    case 'settled':
    case 'matched':
      return <span className="badge badge-green">Settled</span>;
    case 'cancelled':
      return <span className="badge badge-grey">Cancelled</span>;
    case 'expired':
      return <span className="badge badge-orange">Expired</span>;
    default:
      return null;
  }
};
