
import React, { useMemo } from 'react';
import { Order, OrderStatus, TableTotal } from '../types';
import { Clock, CheckCircle, ChefHat, CreditCard, ChevronRight, XCircle, PlusCircle, LayoutDashboard, ReceiptText } from 'lucide-react';

interface OwnerDashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClearTable: (tableNumber: string) => void;
  onManualOrder: () => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, onUpdateStatus, onClearTable, onManualOrder }) => {
  const [activeTab, setActiveTab] = React.useState<'kitchen' | 'billing'>('kitchen');

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'preparing'), [orders]);
  const activeTables = useMemo(() => {
    const tableMap: Record<string, TableTotal> = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      if (!tableMap[o.tableNumber]) {
        tableMap[o.tableNumber] = { tableNumber: o.tableNumber, totalAmount: 0, orderIds: [] };
      }
      tableMap[o.tableNumber].totalAmount += o.totalPrice;
      tableMap[o.tableNumber].orderIds.push(o.id);
    });
    return Object.values(tableMap).sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
  }, [orders]);

  const totalRevenue = useMemo(() => activeTables.reduce((acc, t) => acc + t.totalAmount, 0), [activeTables]);

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Sidebar / Desktop Header */}
      <header className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg">
             <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">小吃店管理後臺</h1>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={onManualOrder}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
           >
             <PlusCircle size={18} /> 現場代點餐
           </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex bg-white border-b shadow-sm">
        <button 
          onClick={() => setActiveTab('kitchen')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-4 ${activeTab === 'kitchen' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-500'}`}
        >
          <ChefHat size={20} /> 出餐進度
        </button>
        <button 
          onClick={() => setActiveTab('billing')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-4 ${activeTab === 'billing' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-500'}`}
        >
          <ReceiptText size={20} /> 桌況結帳
        </button>
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'kitchen' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Pending Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700">
                  <Clock className="text-orange-500" /> 等待中 ({pendingOrders.length})
                </h2>
                <span className="text-xs text-slate-400">依時間順序</span>
              </div>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border-l-8 border-orange-500 animate-in slide-in-from-left duration-300">
                    <div className="flex justify-between mb-3">
                      <span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-md">桌號: {order.tableNumber}</span>
                      <span className="text-xs text-slate-400">{order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ul className="space-y-1 mb-4">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-slate-700">
                          <span>{item.name}</span>
                          <span className="font-bold">x {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onUpdateStatus(order.id, 'preparing')}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-600"
                      >
                        開始製作
                      </button>
                      <button 
                         onClick={() => onUpdateStatus(order.id, 'cancelled')}
                         className="p-2 text-slate-300 hover:text-red-500"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingOrders.length === 0 && (
                   <div className="text-center py-12 text-slate-400 bg-white rounded-xl border-2 border-dashed">
                      暫無新訂單
                   </div>
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700">
                <ChefHat className="text-blue-500" /> 製作中 ({preparingOrders.length})
              </h2>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                    <div className="flex justify-between mb-3">
                      <span className="text-lg font-black bg-white px-3 py-1 rounded-md border border-blue-100">桌號: {order.tableNumber}</span>
                    </div>
                    <ul className="space-y-1 mb-4">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-blue-900 font-medium">
                          <span>{item.name}</span>
                          <span className="font-bold">x {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <button 
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                      <CheckCircle size={18} /> 已出餐
                    </button>
                  </div>
                ))}
                 {preparingOrders.length === 0 && (
                   <div className="text-center py-12 text-slate-400 bg-white rounded-xl border-2 border-dashed">
                      沒有正在製作的餐點
                   </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Billing View */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200">
               <div>
                  <p className="text-slate-500 text-sm">目前店內總待收款</p>
                  <p className="text-4xl font-black text-slate-900">${totalRevenue}</p>
               </div>
               <div className="bg-orange-100 p-4 rounded-2xl">
                  <CreditCard className="w-8 h-8 text-orange-600" />
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTables.map(table => (
                <div key={table.tableNumber} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                       <span className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                         {table.tableNumber}
                       </span>
                       <span className="text-slate-500 font-medium">桌</span>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-slate-400">總金額</p>
                       <p className="text-2xl font-black text-orange-600">${table.totalAmount}</p>
                    </div>
                  </div>
                  <div className="border-t border-dashed py-3 mb-2">
                    <p className="text-xs text-slate-400 mb-1">包含訂單:</p>
                    <div className="flex flex-wrap gap-1">
                      {table.orderIds.map(id => (
                        <span key={id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{id.slice(-4)}</span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(window.confirm(`確定桌號 ${table.tableNumber} 已結帳並清空？`)) {
                        onClearTable(table.tableNumber);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800"
                  >
                    結帳完成 / 清桌
                  </button>
                </div>
              ))}
              {activeTables.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                   <p className="text-slate-400">目前沒有用餐中的桌號</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerDashboard;
