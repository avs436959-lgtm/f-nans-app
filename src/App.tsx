import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesionGrid } from 'recharts';

interface Transaction {
  _id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

const CATEGORIES = {
  expense: ['Market & Gıda', 'Fatura & Kira', 'Eğlence & Sosyal', 'Ulaşım & Akaryakıt', 'Giyim & Alışveriş', 'Diğer Gider'],
  income: ['Maaş', 'Ek Gelir & Freelance', 'Yatırım Kazancı', 'Diğer Gelir']
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts'>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY');

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Grafik filtresi için seçilen ay (Boş ise tüm ayları gösterir)
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('Hepsi');

  const [rates, setRates] = useState({ TRY: 1, USD: 46.81, EUR: 53.55 });
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Tür değiştiğinde otomatik kategori listesini güncelle
  useEffect(() => {
    setCategory(CATEGORIES[type][0]);
  }, [type]);

  // 1. Verileri Çek
  useEffect(() => {
    fetch('http://localhost:5000/api/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(err => console.error("Veri hatası:", err));
  }, []);

  // Döviz Kurları
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

  const totalIncomeTL = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseTL = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalBalanceTL = totalIncomeTL - totalExpenseTL;

  const formatValue = (valueInTL: number) => {
    const converted = valueInTL / rates[selectedCurrency];
    const symbol = selectedCurrency === 'TRY' ? '₺' : selectedCurrency === 'USD' ? '$' : '€';
    return `${symbol}${converted.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
  };

  // Çizgi Grafiği Verisi Oluşturma (Aya göre filtreleme destekli)
  const getChartData = () => {
    const monthlyData: { [key: string]: { Gelir: number; Gider: number } } = {};

    // Önce ayları sıfırla doldur
    MONTHS.forEach(m => {
      monthlyData[m] = { Gelir: 0, Gider: 0 };
    });

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;
      
      const monthName = MONTHS[tDate.getMonth()];
      const amountInSelectedCurrency = t.amount / rates[selectedCurrency];

      if (t.type === 'income') {
        monthlyData[monthName].Gelir += amountInSelectedCurrency;
      } else {
        monthlyData[monthName].Gider += amountInSelectedCurrency;
      }
    });

    const fullChart = MONTHS.map(m => ({
      name: m,
      Gelir: Math.round(monthlyData[m].Gelir),
      Gider: Math.round(monthlyData[m].Gider)
    }));

    // Eğer filtre 'Hepsi' değilse sadece seçilen ayı döndür
    if (selectedMonthFilter !== 'Hepsi') {
      return fullChart.filter(item => item.name === selectedMonthFilter);
    }

    // Boş olan ayları grafikte kalabalık yapmasın diye gizlemek istersen filtreleyebilirsin
    return fullChart.filter(item => item.Gelir > 0 || item.Gider > 0);
  };

  // Yeni İşlem Kaydet
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date) return;

    const amountInTL = parseFloat(amount) * rates[selectedCurrency];

    const newTransaction = {
      title,
      amount: amountInTL,
      type,
      category, // Dinamik seçilen kategori gidiyor
      date: date
    };

    fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransaction)
    })
      .then(res => res.json())
      .then(savedData => {
        setTransactions(prev => [savedData, ...prev]);
        setTitle('');
        setAmount('');
      });
  };

  // İşlem Sil
  const handleDelete = (id: string) => {
    fetch(`http://localhost:5000/api/transactions/${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        setTransactions(prev => prev.filter(t => t._id !== id));
      });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* SOL PANEL */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">FinansÖzet</h1>
            <p className="text-slate-500 text-xs mt-1">Premium Varlık Yönetimi</p>
          </div>

          <nav className="space-y-2 mb-8">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>📊 Panel (Dashboard)</button>
            <button onClick={() => setActiveTab('charts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeTab === 'charts' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/50'}`}>📈 Gelişmiş Grafikler</button>
          </nav>

          <div className="border-t border-slate-800/60 pt-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Piyasa Takibi</p>
            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2"><span>🇺🇸</span><span className="text-xs font-medium text-slate-300">USD / TRY</span></div>
                <span className="text-xs font-bold text-white">{isLoadingRates ? '...' : `₺${rates.USD.toFixed(2)}`}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2"><span>🇪🇺</span><span className="text-xs font-medium text-slate-300">EUR / TRY</span></div>
                <span className="text-xs font-bold text-white">{isLoadingRates ? '...' : `₺${rates.EUR.toFixed(2)}`}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-full flex items-center justify-center font-bold text-white">U</div>
          <div><p className="text-sm font-semibold text-slate-200">Kullanıcı</p><p className="text-xs text-slate-500">Premium Hesap</p></div>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Hoş Geldiniz 👋</h2>
            <p className="text-slate-400 text-sm">Finansal durumunuz ve akıllı bütçe takibi.</p>
          </div>
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 shadow-md">
            {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
              <button key={curr} onClick={() => setSelectedCurrency(curr)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedCurrency === curr ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>{curr}</button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div>
            {/* Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-slate-400">Toplam Bakiye</p>
                <p className="text-3xl font-bold mt-2 text-white">{formatValue(totalBalanceTL)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-emerald-400">Toplam Gelir</p>
                <p className="text-3xl font-bold mt-2 text-emerald-400">+{formatValue(totalIncomeTL)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <p className="text-sm font-medium text-rose-400">Toplam Gider</p>
                <p className="text-3xl font-bold mt-2 text-rose-400">-{formatValue(totalExpenseTL)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Dinamik Form Geliştirmesi */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
                <h3 className="text-lg font-semibold mb-4 text-white">Yeni İşlem Ekle</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">TÜR</label>
                    <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm">
                      <option value="expense">Gider (-)</option>
                      <option value="income">Gelir (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">KATEGORİ</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-medium focus:outline-none text-sm">
                      {CATEGORIES[type].map((cat) => (
                        <option key={cat} value={cat} className="text-white">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">AÇIKLAMA</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Hafta Sonu Alışverişi" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">TUTAR ({selectedCurrency})</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" required min="0.01" step="any" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">İŞLEM TARİHİ</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none text-sm" required />
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium p-3 rounded-xl text-sm cursor-pointer hover:opacity-90 transition-opacity">İşlemi Kaydet</button>
                </form>
              </div>

              {/* Son İşlemler Listesi */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold mb-4 text-white">Son İşlemler</h3>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">Henüz eklenmiş bir işlem bulunmuyor.</p>
                  ) : (
                    transactions.map((t) => (
                      <div key={t._id} className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-850 hover:border-slate-700 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white text-sm">{t.title}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{t.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{t.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'income' ? '+' : '-'}{formatValue(t.amount)}</span>
                          <button onClick={() => handleDelete(t._id)} className="text-slate-600 hover:text-rose-400 cursor-pointer transition-colors text-xs">🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Akıcı Çizgi Grafiği & Ay Filtreleme */}
        {activeTab === 'charts' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Aylık Finansal Trend Analizi ({selectedCurrency})</h3>
                <p className="text-slate-400 text-xs">Gelir ve giderlerinizin aylık bazda akış çizgesi.</p>
              </div>
              
              {/* İkinci Görsel İçin Ay Filtreleme Butonları */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 max-w-full overflow-x-auto whitespace-nowrap">
                <span className="text-slate-500 text-xs font-semibold px-2">Filtre:</span>
                {['Hepsi', ...MONTHS].map((m) => {
                  // Sadece işlem olan ayları veya 'Hepsi' seçeneğini listelemek temiz gösterir
                  return (
                    <button key={m} onClick={() => setSelectedMonthFilter(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${selectedMonthFilter === m ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{m}</button>
                  );
                })}
              </div>
            </div>

            <div className="h-96 w-full bg-slate-950 p-4 rounded-xl border border-slate-850">
              <ResponsiveContainer width="100%" height="100%">
                {/* Modern Çizgi Grafiği Yapısı */}
                <LineChart data={getChartData()} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Gelir" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Toplam Gelir (+)" />
                  <Line type="monotone" dataKey="Gider" stroke="#f87171" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Toplam Gider (-)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}