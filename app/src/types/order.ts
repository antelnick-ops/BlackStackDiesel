export interface Order {
  id: string;
  date: string;       // display string for now
  total: string;
  status: 'Shipped' | 'Delivered' | 'Pending' | string;
}
