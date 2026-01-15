
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Order, OrderItem, OrderStatus } from './types';
import CustomerView from './components/CustomerView';
import OwnerDashboard from './components/OwnerDashboard';

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Load from local storage for simulation persistent across refresh
  useEffect(() => {
    const saved = localStorage.getItem('snack_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Revive Date objects
        setOrders(parsed.map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) })));
      } catch (e) {
        console.error("Failed to parse orders", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('snack_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (tableNumber: string, items: OrderItem[]) => {
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      tableNumber,
      items,
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      createdAt: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
  };

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const clearTable = (tableNumber: string) => {
    setOrders(prev => prev.filter(o => o.tableNumber !== tableNumber));
  };

  return (
    <Router>
      <Routes>
        <Route path="/customer" element={<CustomerView onAddOrder={handleAddOrder} />} />
        <Route path="/customer/table/:tableId" element={<CustomerTableWrapper onAddOrder={handleAddOrder} />} />
        <Route path="/owner" element={<OwnerDashboard orders={orders} onUpdateStatus={updateOrderStatus} onClearTable={clearTable} onManualOrder={() => window.location.hash = '/owner/manual'} />} />
        <Route path="/owner/manual" element={<ManualOrderWrapper onAddOrder={handleAddOrder} />} />
        <Route path="/" element={<Navigate to="/customer" replace />} />
      </Routes>
    </Router>
  );
};

// Wrapper for table-specific QR links
const CustomerTableWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => void }> = ({ onAddOrder }) => {
  const tableId = window.location.hash.split('/').pop() || '';
  return <CustomerView onAddOrder={onAddOrder} initialTable={tableId} />;
};

// Wrapper for staff manual orders
const ManualOrderWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => void }> = ({ onAddOrder }) => {
  const navigate = useNavigate();
  return (
    <div className="relative">
      <CustomerView 
        onAddOrder={(t, i) => {
          onAddOrder(t, i);
          navigate('/owner');
        }} 
        isStaffMode 
      />
      <button 
        onClick={() => navigate('/owner')}
        className="fixed top-4 left-4 z-50 bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/40 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
    </div>
  );
};

export default App;
