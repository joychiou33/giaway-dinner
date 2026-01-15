
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, TableTotal } from '../types';
import { TABLES } from '../constants';
import { Clock, ChefHat, CreditCard, XCircle, PlusCircle, LayoutDashboard, ReceiptText, AlertCircle, History, Printer, X, Settings2, BellRing, BellOff, HelpCircle, FileDown, Calendar, QrCode, LogOut, ShieldEllipsis, KeyRound, Check } from 'lucide-react';

interface OwnerDashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClearTable: (tableNumber: string) => void;
  onManualOrder: () => void;
  onLogout: () => void;
  onChangePasscode: (newPass: string) => boolean;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, onUpdateStatus, onClearTable, onManualOrder, onLogout, onChangePasscode }) => {
  const [activeTab, setActiveTab] = React.useState<'kitchen' | 'billing' | 'history' | 'settings'>('kitchen');
  const [confirmingTable, setConfirmingTable] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPrintHint, setShowPrintHint] = useState(false);
  
  // 密碼修改狀態
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => {
    return localStorage.getItem('auto_print_enabled') === 'true';
  });
  
  const autoPrintedIds = useRef<Set<string>>(new Set());

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'preparing'), [orders]);
  
  const activeTables = useMemo(() => {
    const tableMap: Record<string, TableTotal> = {};
    orders.filter(o => o.status !== 'cancelled' && o.status !== 'paid').forEach(o => {
      const tNum = o.tableNumber || '未知';
      if (!tableMap[tNum]) {
        tableMap[tNum] = { tableNumber: tNum, totalAmount: 0, orderIds: [] };
      }
      tableMap[tNum].totalAmount += o.totalPrice;
      tableMap[tNum].orderIds.push(o.id);
    });
    return Object.values(tableMap).sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
  }, [orders]);

  const totalUnpaidRevenue = useMemo(() => activeTables.reduce((acc, t) => acc + t.totalAmount, 0), [activeTables]);

  const filteredHistoryOrders = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders
      .filter(o => o.status === 'paid' && o.createdAt >= start && o.createdAt <= end)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [orders, startDate, endDate]);

  const totalFilteredRevenue = useMemo(() => filteredHistoryOrders.reduce((acc, o) => acc + o.totalPrice, 0), [filteredHistoryOrders]);

  useEffect(() => {
    localStorage.setItem('auto_print_enabled', String(autoPrintEnabled));
  }, [autoPrintEnabled]);

  const handlePrint = (order: Order) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    if (!autoPrintEnabled) return;
    const newPendingOrder = pendingOrders.find(o => !autoPrintedIds.current.has(o.id));
    if (newPendingOrder) {
      autoPrintedIds.current.add(newPendingOrder.id);
      handlePrint(newPendingOrder);
    }
  }, [pendingOrders, autoPrintEnabled]);

  const handleClearTable = (tableNumber: string) => {
    onClearTable(tableNumber);
    setConfirmingTable(null);
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length !== 8) {
      setPassMessage({ text: '密碼必須為 8 位數字', type: 'error' });
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassMessage({ text: '兩次輸入的密碼不一致', type: 'error' });
      return;
    }
    if (onChangePasscode(newPass)) {
      setPassMessage({ text: '密碼修改成功！下次登入請使用新密碼。', type: 'success' });
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setPassMessage(null), 3000);
    }
  };

  const exportToCSV = () => {
    if (filteredHistoryOrders.length === 0) {
      alert("所選區間內尚無成交資料可匯出");
      return;
    }
    const headers = ["日期時間", "桌號", "訂單ID", "餐點摘要", "總金額"];
    const rows = filteredHistoryOrders.map(o => [
      o.createdAt.toLocaleString().replace(',', ''),
      o.tableNumber,
      o.id,
      o.items.map(i => `${i.name}x${i.quantity}`).join('; '),
      o.totalPrice
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `小吃店營收報表_${startDate}_至_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PrintSettingHint = () => {
    if (!showPrintHint) return null;
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-blue-50">
            <h3 className="font-bold text-blue-800 flex items-center gap-2"><Settings2 size={18} /> 直接出單教學</h3>
            <button onClick={() => setShowPrintHint(false)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-slate-600 text-sm">在 Chrome 捷徑「內容」的「目標」最後面加上：<code className="bg-blue-100 px-1 text-blue-700"> --kiosk-printing</code> 即可跳過列印預覽視窗。</p>
            <button onClick={() => setShowPrintHint(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">我明白了</button>
          </div>
        </div>
      </div>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">訂單明細 #{selectedOrder.id.slice(-4)}</h3>
            <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6"><span className="text-3xl font-black bg-slate-900 text-white px-4 py-1 rounded-xl">桌號 {selectedOrder.tableNumber}</span></div>
            <div className="space-y-3 mb-6">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span className="font-medium text-slate-700">{item.name} x{item.quantity}</span>
                  <span className="font-bold text-slate-900">${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2"><span className="font-bold text-slate-500">總計金額</span><span className="text-2xl font-black text-orange-600">${selectedOrder.totalPrice}</span></div>
          </div>
          <div className="p-4 bg-slate-50 flex gap-2">
            {selectedOrder.status !== 'paid' && <button onClick={() => handlePrint(selectedOrder)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={18} /> 列印</button>}
            <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold">關閉</button>
          </div>
        </div>
      </div>
    );
  };

  const PrintableReceipt = () => {
    if (!selectedOrder) return null;
    const ReceiptContent = ({ type }: { type: '廚房備餐聯' | '顧客確認聯' }) => (
      <div className="py-4">
        <div className="text-center mb-4"><h2 className="text-xl font-bold">{type}</h2></div>
        <div className="flex justify-between mb-2"><span className="font-black text-3xl">桌號: {selectedOrder.tableNumber}</span></div>
        <div className="border-t border-b border-black py-2 mb-4">
          {selectedOrder.items.map((item, idx) => (
            <div key={idx} className="flex justify-between mb-1"><span className="font-bold text-lg">{item.name} x {item.quantity}</span></div>
          ))}
        </div>
        <div className={`flex justify-between font-bold text-xl mb-4 ${type === '廚房備餐聯' ? 'hidden' : ''}`}><span>總額: ${selectedOrder.totalPrice}</span></div>
      </div>
    );
    return (
      <div className="print-only text-black bg-white w-full max-w-[80mm] mx-auto p-4">
        <ReceiptContent type="廚房備餐聯" />
        <div className="border-t-2 border-dashed border-black my-8"></div>
        <ReceiptContent type="顧客確認聯" />
      </div>
    );
  };

  const SettingsSection = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const printAllQRs = () => window.print();

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* 安全密碼設定 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><ShieldEllipsis size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">安全設定</h3>
              <p className="text-slate-500 text-xs">修改管理後台的 8 位數進入密碼</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdatePasscode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12}/> 新密碼 (8 位數字)</label>
              <input 
                type="password" 
                inputMode="numeric"
                maxLength={8}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value.replace(/\D/g, ''))}
                placeholder="輸入 8 位數字"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12}/> 確認新密碼</label>
              <input 
                type="password" 
                inputMode="numeric"
                maxLength={8}
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value.replace(/\D/g, ''))}
                placeholder="再次輸入新密碼"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4">
              <button 
                type="submit"
                className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95"
              >
                儲存新密碼
              </button>
              {passMessage && (
                <p className={`text-xs font-bold flex items-center gap-1 ${passMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {passMessage.type === 'success' && <Check size={14} />} {passMessage.text}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* 桌碼管理 */}
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center no-print">
            <div>
              <h2 className="text-xl font-black text-slate-800">桌碼管理</h2>
              <p className="text-slate-500 text-sm">點擊按鈕列印所有桌號專屬點餐 QR Code</p>
            </div>
            <button onClick={printAllQRs} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all">
              <Printer size={18} /> 列印桌碼
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {TABLES.map(table => {
              const tableUrl = `${baseUrl}#/customer/table/${encodeURIComponent(table)}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tableUrl)}`;
              
              return (
                <div key={table} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-orange-500 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-slate-900 text-white px-2 py-0.5 text-[10px] font-bold no-print">{table}</div>
                  <img src={qrUrl} alt={`QR Code for Table ${table}`} className="w-full aspect-square mb-3" />
                  <p className="text-xs font-bold text-slate-600 mb-1">{table === '外帶' ? '門口外帶區' : `第 ${table} 桌`}</p>
                  <div className="print-only mt-2 font-black text-lg">桌號: {table}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 列印專用的 QR 列表 */}
        <div className="print-only fixed inset-0 bg-white z-[500] p-8">
           <div className="grid grid-cols-2 gap-12">
             {TABLES.map(table => {
               const tableUrl = `${baseUrl}#/customer/table/${encodeURIComponent(table)}`;
               const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
               return (
                 <div key={table} className="border-2 border-black p-8 text-center flex flex-col items-center">
                    <h3 className="text-2xl font-black mb-4 tracking-tighter">SmartSnack 掃碼點餐</h3>
                    <img src={qrUrl} className="w-64 h-64 mb-4" />
                    <p className="text-4xl font-black uppercase">桌號: {table}</p>
                    <p className="mt-4 text-sm font-bold opacity-70">掃描上方 QR Code 立即開始點餐</p>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <PrintSettingHint />
      <OrderDetailsModal />
      <PrintableReceipt />

      <header className="bg-slate-900 text-white p-4 shadow-xl flex flex-wrap gap-4 justify-between items-center shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg"><LayoutDashboard className="w-6 h-6" /></div>
          <h1 className="text-xl font-bold tracking-tight">小吃店管理</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button onClick={() => setAutoPrintEnabled(!autoPrintEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${autoPrintEnabled ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {autoPrintEnabled ? <BellRing size={14} /> : <BellOff size={14} />} 自動列印: {autoPrintEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setShowPrintHint(true)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"><HelpCircle size={16} /></button>
          </div>
          <button onClick={onManualOrder} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20"><PlusCircle size={18} /> 現場代點</button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <nav className="flex bg-white border-b shadow-sm shrink-0 no-print overflow-x-auto">
        <button onClick={() => setActiveTab('kitchen')} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-3 font-bold transition-all border-b-4 ${activeTab === 'kitchen' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ChefHat size={18} /><span className="text-[10px]">出餐進度</span></button>
        <button onClick={() => setActiveTab('billing')} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-3 font-bold transition-all border-b-4 ${activeTab === 'billing' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ReceiptText size={18} /><span className="text-[10px]">桌況結帳</span></button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-3 font-bold transition-all border-b-4 ${activeTab === 'history' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><History size={18} /><span className="text-[10px]">營收報表</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-3 font-bold transition-all border-b-4 ${activeTab === 'settings' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><QrCode size={18} /><span className="text-[10px]">桌碼設定</span></button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-print">
        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2"><Clock className="text-orange-500" /> 等待中 ({pendingOrders.length})</div>
              </h2>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border-l-8 border-orange-500">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2"><span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-md">{order.tableNumber}</span><button onClick={() => handlePrint(order)} className="text-slate-400 hover:text-blue-500 p-1"><Printer size={16}/></button></div>
                      <span className="text-xs text-slate-400">{order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-slate-700"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold text-sm">開始製作</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><ChefHat className="text-blue-500" /> 製作中 ({preparingOrders.length})</h2>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                    <div className="flex justify-between mb-3"><div className="flex items-center gap-2"><span className="text-lg font-black bg-white px-3 py-1 rounded-md">{order.tableNumber}</span></div></div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-blue-900 font-medium"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <button onClick={() => onUpdateStatus(order.id, 'completed')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">已出餐</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200">
               <div><p className="text-slate-500 text-sm">店內待收</p><p className="text-4xl font-black text-slate-900 font-mono">${totalUnpaidRevenue}</p></div>
               <div className="bg-orange-100 p-4 rounded-2xl"><CreditCard className="w-8 h-8 text-orange-600" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTables.map(table => (
                <div key={table.tableNumber} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2"><span className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">{table.tableNumber}</span></div>
                    <div className="text-right"><p className="text-2xl font-black text-orange-600 font-mono">${table.totalAmount}</p></div>
                  </div>
                  {confirmingTable === table.tableNumber ? (
                    <div className="flex gap-2"><button onClick={() => handleClearTable(table.tableNumber)} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold">結帳完成</button><button onClick={() => setConfirmingTable(null)} className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-lg">取消</button></div>
                  ) : (
                    <button onClick={() => setConfirmingTable(table.tableNumber)} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold">結帳/清桌</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1"><label className="text-xs font-bold text-slate-500">開始日期</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                <div className="flex-1 min-w-[150px] space-y-1"><label className="text-xs font-bold text-slate-500">結束日期</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
                <button onClick={exportToCSV} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 h-[42px]"><FileDown size={18} /> 匯出報表</button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div><p className="text-slate-500 text-xs">區間營收</p><span className="text-3xl font-black text-green-600">${totalFilteredRevenue}</span></div>
                <div><p className="text-slate-500 text-xs">單數</p><p className="text-3xl font-black text-slate-900">{filteredHistoryOrders.length}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="divide-y divide-slate-100">
                  {filteredHistoryOrders.map(order => (
                    <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-sm">{order.tableNumber}</div>
                          <div className="space-y-0.5 overflow-hidden">
                             <p className="font-black text-slate-900">${order.totalPrice}</p>
                             <p className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-md">{order.items.map(i => `${i.name}x${i.quantity}`).join(', ')}</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedOrder(order)} className="text-slate-300 hover:text-slate-900 p-2"><AlertCircle size={20} /></button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
};

export default OwnerDashboard;
