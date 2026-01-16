import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Order, OrderItem, OrderStatus } from './types';
import CustomerView from './components/CustomerView';
import OwnerDashboard from './components/OwnerDashboard';
import OwnerLogin from './components/OwnerLogin';
import { Store, ShoppingBag, Lock } from 'lucide-react';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, update, Database } from 'firebase/database';

// --- 正式雲端資料庫設定 ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const Navigation: React.FC<{ isOwner: boolean }> = ({ isOwner }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:max-w-md md:mx-auto md:rounded-t-2xl no-print">
      <button
        onClick={() => navigate('/customer')}
        className={`flex-1 flex flex-col items-center gap-1 transition-colors ${path.startsWith('/customer') ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
      >
        <ShoppingBag size={20} />
        <span className="text-[10px] font-bold">我要點餐</span>
      </button>

      {isOwner ? (
        <button
          onClick={() => navigate('/owner')}
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${path.startsWith('/owner') ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
        >
          <Store size={20} />
          <span className="text-[10px] font-bold">老闆後台</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="flex-1 flex flex-col items-center gap-1 text-slate-300 hover:text-slate-400"
        >
          <Lock size={18} />
          <span className="text-[10px]">管理登入</span>
        </button>
      )}
    </div>
  );
};

const App: React.FC = () => {
  // 核心資料庫實例初始化，加入錯誤捕獲確保 App 不會因為初始化失敗而崩潰
  const db: Database | null = useMemo(() => {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      return getDatabase(app);
    } catch (e) {
      console.error("Firebase 初始化失敗:", e);
      return null;
    }
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean>(() => sessionStorage.getItem('is_owner') === 'true');

  const [ownerPasscode, setOwnerPasscode] = useState<string>(() => {
    const saved = localStorage.getItem('owner_passcode');
    return saved || '88888888';
  });

  // 1. 核心：監聽雲端連線狀態與訂單數據
  useEffect(() => {
    if (!db) return;

    // 監聽實際的資料
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (snapshot.exists() && data) {
        const list: Order[] = Object.keys(data).map(key => ({
          ...data[key],
          fbKey: key,
          createdAt: new Date(data[key].createdAt)
        }));
        setOrders(list);
        setIsConnected(true);
      } else {
        setOrders([]);
        setIsConnected(true);
      }
    }, (error) => {
      console.error("Firebase 連線錯誤:", error.message);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, [db]);

  const handleLogin = (pass: string) => {
    if (pass === ownerPasscode) {
      setIsOwner(true);
      sessionStorage.setItem('is_owner', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsOwner(false);
    sessionStorage.removeItem('is_owner');
  };

  const handleChangePasscode = (newPass: string) => {
    if (newPass.length === 8 && /^\d+$/.test(newPass)) {
      setOwnerPasscode(newPass);
      localStorage.setItem('owner_passcode', newPass);
      return true;
    }
    return false;
  };

  // 2. 送出訂單到雲端
  const handleAddOrder = useCallback((tableNumber: string, items: OrderItem[]) => {
    if (!db) return;
    const newOrder = {
      id: Math.random().toString(36).substr(2, 9),
      tableNumber,
      items,
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const ordersRef = ref(db, 'orders');
    const newOrderPushRef = push(ordersRef);

    set(newOrderPushRef, newOrder).catch((error) => {
      console.error("雲端訂單發送失敗:", error.message);
    });
  }, [db]);

  // 3. 更新訂單狀態同步到雲端
  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    if (!db) return;
    const targetOrder = orders.find(o => o.id === id);
    const fbKey = targetOrder?.fbKey;

    if (fbKey) {
      const orderUpdateRef = ref(db, `orders/${fbKey}`);
      update(orderUpdateRef, { status }).catch(err => {
        console.error("雲端更新失敗:", err);
      });
    }
  }, [orders, db]);

  // 4. 結帳清桌同步到雲端
  const clearTable = useCallback((tableNumber: string) => {
    if (!db) return;
    orders.forEach(o => {
      if (o.tableNumber === tableNumber && o.status !== 'cancelled' && o.status !== 'paid' && o.fbKey) {
        update(ref(db, `orders/${o.fbKey}`), { status: 'paid' }).catch(err => {
          console.error("結帳同步失敗:", err);
        });
      }
    });
  }, [orders, db]);

  return (
    <Router>
      <div className="pb-16 min-h-screen">
        <Routes>
          <Route path="/customer" element={<CustomerView onAddOrder={handleAddOrder} />} />
          <Route path="/customer/table/:tableId" element={<CustomerTableWrapper onAddOrder={handleAddOrder} />} />
          <Route
            path="/owner/*"
            element={isOwner ? (
              <OwnerDashboard
                orders={orders}
                onUpdateStatus={updateOrderStatus}
                onClearTable={clearTable}
                onAddOrder={handleAddOrder}
                onLogout={handleLogout}
                onChangePasscode={handleChangePasscode}
                isCloudEnabled={isConnected}
              />
            ) : <Navigate to="/login" replace />}
          />
          <Route path="/login" element={<OwnerLogin onLogin={handleLogin} />} />
          <Route path="/" element={<Navigate to="/customer" replace />} />
        </Routes>
        <Navigation isOwner={isOwner} />
      </div>
    </Router>
  );
};

const CustomerTableWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => void }> = ({ onAddOrder }) => {
  const { tableId } = useParams();
  return <CustomerView onAddOrder={onAddOrder} initialTable={tableId || ''} lockTable />;
};

export default App;