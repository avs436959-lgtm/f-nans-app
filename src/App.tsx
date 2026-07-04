import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', title: 'Maaş', amount: 45000, type: 'income', category: 'Maaş', date: '2026-07-01' },
    { id: '2', title: 'Market Harcaması', amount: 3500, type: 'expense', category: 'Gıda', date: '2026-07-02' },
    { id: '3', title: 'Ev Kirası', amount: 12000, type: 'expense', category: 'Kira', date: '2026-07-03' },
    { id: '4', title: 'Haziran Maaşı', amount: 45000, type: 'income', category: 'Maaş', date: '2026-06-25' },
    { id: '5', title: 'Haziran Tatili', amount: 20000, type: 'expense', category: 'Seyahat', date: '2026-06-15' },
    { id: '6', title: 'Mayıs Primi', amount: 15000, type: 'income', category: 'Prim', date: '2026-05-10' },
    { id: '7', title: 'Mayıs Alışveriş', amount: 8000, type: 'expense', category: 'Giyim', date: '2026-05-12' },
  ]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts'>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Canlı Kurlar State
  const [rates, setRates] = useState({ TRY: 1, USD: 46.76, EUR: 53.68 });
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Canlı Döviz Kurunu API'den Çekme
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setRates({ TRY: 1, USD: data.rates.TRY, EUR: data.rates.TRY / data.rates.EUR });
          setIsLoadingRates(false);
        }
      })
      .catch(() => setIsLoadingRates(false));
  }, []);

  // Hesaplamalar (TL bazında)
  const totalIncomeTL = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseTL = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalanceTL = totalIncomeTL - totalExpenseTL;

  const formatValue = (valueInTL: number) => {
    const converted = valueInTL / rates[selectedCurrency];
    const symbol = selectedCurrency === 'TRY' ? '₺' : selectedCurrency === 'USD' ? '$' : '€';
    return `${symbol}${converted.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
  };

  // Aylık Grafik Verisi
  const getMonthlyChartData = () => {
    const monthsOrder = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthlyData: { [key: string]: { Gelir: number; Gider: number } } = {};

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;
      
      const monthName = monthsOrder[tDate.getMonth()];

      if (!monthlyData[monthName]) {
        monthlyData[monthName] = { Gelir: 0, Gider: 0 };
      }

      const amountInSelectedCurrency = t.amount / rates[selectedCurrency];

      if (t.type === 'income') {
        monthlyData[monthName].Gelir += amountInSelectedCurrency;
      } else {
        monthlyData[monthName].Gider += amountInSelectedCurrency;
      }
    });

    return monthsOrder
      .filter(m => monthlyData[m])
      .map(m => ({
        name: m,
        Gelir: Math.round(monthlyData[m].Gelir),
        Gider: Math.round(monthlyData[m].Gider)
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date) return;

    const amountInTL = parseFloat(amount) * rates[selectedCurrency];

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      title,
      amount: amountInTL,
      type,
      category: type === 'income' ? 'Gelir' : 'Gider',
      date: date
    };

    setTransactions([newTransaction, ...transactions]);
    setTitle('');
    setAmount('');
  };

  // 🔥 SİLME FONKSİYONU
  const handleDelete = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* SOL PANEL */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between hidden md:flex">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="mb-10">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                FinansÖzet
              </h1>
              <p className="text-slate-500 text-xs mt-1">Premium Varlık Yönetimi</p>
            </div>

            <nav className="space-y-2 mb-8">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>
                📊 Panel (Dashboard)
              </button>
              <button onClick={() => setActiveTab('charts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === 'charts' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>
                📈 Grafikler
              </button>
            </nav>

            {/* Canlı Kurlar */}
            <div className="border-t border-slate-800/60 pt-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Piyasa Takibi (Canlı)</p>
              <div className="space-y-3">
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-2"><span className="text-sm">🇺🇸</span><span className="text-xs font-medium text-slate-300">USD / TRY</span></div>
                  <span className="text-xs font-bold text-white">{isLoadingRates ? '...' : `₺${rates.USD.toFixed(2)}`}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-2"><span className="text-sm">🇪🇺</span><span className="text-xs font-medium text-slate-300">EUR / TRY</span></div>
                  <span className="text-xs font-bold text-white">{isLoadingRates ? '...' : `₺${rates.EUR.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-800 flex items-center gap-3 mt-auto">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-full flex items-center justify-center font-bold text-white">U</div>
            <div><p className="text-sm font-semibold text-slate-200">Kullanıcı</p><p className="text-xs text-slate-500">Premium Hesap</p></div>
          </div>
        </div>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Hoş Geldiniz 👋</h2>
            <p className="text-slate-400 text-sm">Finansal durumunuz ve cüzdan yönetimi.</p>
          </div>
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 shadow-md">
            {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
              <button key={curr} onClick={() => setSelectedCurrency(curr)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedCurrency === curr ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>{curr}</button>
            ))}
          </div>
        </div>

        {/* EKRAN 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-slate-400">Toplam Bakiye</p>
                <p className="text-3xl font-bold mt-2 text-white">{formatValue(totalBalanceTL)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-emerald-400">Aylık Gelir</p>
                <p className="text-3xl font-bold mt-2 text-emerald-400">+{formatValue(totalIncomeTL)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-rose-400">Aylık Gider</p>
                <p className="text-3xl font-bold mt-2 text-rose-400">-{formatValue(totalExpenseTL)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
                <h3 className="text-lg font-semibold mb-4 text-white">Yeni İşlem Ekle</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">AÇIKLAMA</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Bilet, Fatura" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">TUTAR ({selectedCurrency})</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">İŞLEM TARİHİ</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">TÜR</label>
                    <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm">
                      <option value="expense">Gider (-)</option>
                      <option value="income">Gelir (+)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium p-3 rounded-xl text-sm cursor-pointer">İşlemi Kaydet</button>
                </form>
              </div>

              {/* Liste */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 text-white">Son İşlemler</h3>
                <div className="space-y-3">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-850">
                      <div>
                        <p className="font-medium text-white text-sm">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t.date}</p>
                      </div>
                      {/* 🔥 SİLME BUTONU VE FİYAT GRUBU */}
                      <div className="flex items-center gap-4">
                        <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatValue(t.amount)}
                        </span>
                        <button onClick={() => handleDelete(t.id)} className="text-slate-600 hover:text-rose-400 cursor-pointer transition-colors" title="İşlemi Sil">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EKRAN 2: GRAFİKLER */}
        {activeTab === 'charts' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-2">Aylara Göre Gelir & Gider Dağılımı ({selectedCurrency})</h2>
            <p className="text-slate-400 text-sm mb-6">Hangi ay ne kadar kazandınız ve harcadınız yan yana inceleyin.</p>
            
            <div className="h-96 w-full bg-slate-950 p-4 rounded-xl border border-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getMonthlyChartData()}>
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Gelir" fill="#34d399" radius={[6, 6, 0, 0]} name="Toplam Gelir" />
                  <Bar dataKey="Gider" fill="#f87171" radius={[6, 6, 0, 0]} name="Toplam Gider" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}