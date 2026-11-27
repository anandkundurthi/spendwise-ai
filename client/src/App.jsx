import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { api, getToken, assetUrl } from './services/api';
import TransactionRows from './components/TransactionRows';
import {
  money,
  categories,
  REPORTING_TIME_ZONE,
  getIndiaDateKey,
  getIndiaMonthKey,
  dateForInput
} from './utils/dashboard';
import {
  Wallet, LayoutDashboard, ArrowLeftRight, Target, Sparkles, Plus,
  Search, Bell, ArrowUpRight, ArrowDownRight, Coffee, ShoppingBasket,
  CarFront, House, HeartPulse, Utensils, MoreHorizontal, Send, X,
  LogOut, Menu, CalendarDays, ReceiptText, CircleHelp, LoaderCircle,
  Trash2
} from 'lucide-react';

const icons = {
  Food: Utensils,
  Groceries: ShoppingBasket,
  Transport: CarFront,
  Housing: House,
  Health: HeartPulse,
  Shopping: ShoppingBasket,
  Bills: ReceiptText,
  Salary: Wallet,
  Education: ReceiptText,
  Entertainment: Coffee,
  Other: MoreHorizontal
};

const LazyTransactions = React.lazy(() =>
  import('./components/views/Transactions.jsx')
);

const LazyBudgets = React.lazy(() =>
  import('./components/views/Budgets.jsx')
);

const LazyGoals = React.lazy(() =>
  import('./components/views/Goals.jsx')
);

const LazyIntelligence = React.lazy(() =>
  import('./components/views/Intelligence.jsx')
);

const LazySpendingChart = React.lazy(() =>
  import('./components/SpendingChart.jsx')
);

const LazyReactMarkdown = React.lazy(() =>
  import('react-markdown').then((module) => ({
    default: module.default
  }))
);

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(null);
  const [view, setView] = useState(() => {
  const savedView = window.location.hash.replace('#', '');

  const validViews = [
    'Overview',
    'Transactions',
    'Budgets',
    'Goals',
    'Intelligence'
  ];

  return validViews.includes(savedView) ? savedView : 'Overview';
});
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [unbudgetedSpending, setUnbudgetedSpending] = useState([]);
  const [budgetInsights, setBudgetInsights] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState(null);
  const [monthlyReportAI, setMonthlyReportAI] = useState('');
  const [monthlyReportLoading, setMonthlyReportLoading] = useState(false);
  const [monthlyReportError, setMonthlyReportError] = useState('');
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(() =>
    getIndiaMonthKey()
  );
  const [goals, setGoals] = useState([]);
  const [financialIntelligence, setFinancialIntelligence] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsMode, setAiInsightsMode] = useState('basic');
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [modal, setModal] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm here to help you make sense of your money. Ask me about this month's spending, your budgets, or a purchase you're considering."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatRetry, setChatRetry] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

const [profileForm, setProfileForm] = useState({
  name: '',
  phone: ''
});

async function loadIntelligence() {
  try {
    setIntelligenceLoading(true);
    setIntelligenceError('');

    const [intelligenceResult, aiResult] = await Promise.allSettled([
      api('/dashboard/intelligence'),
      api('/ai/insights')
    ]);

    const errors = [];

    // Preserve backend-generated financial intelligence independently.
    if (intelligenceResult.status === 'fulfilled') {
      setFinancialIntelligence(intelligenceResult.value);
    } else {
      errors.push(intelligenceResult.reason.message);
    }

    // Gemini AI insights are handled independently.
    if (aiResult.status === 'fulfilled') {
      setAiInsights(aiResult.value.aiInsights || []);
      setAiInsightsMode(aiResult.value.mode || 'gemini');
    } else {
      setAiInsights([]);
      setAiInsightsMode('unavailable');
      errors.push(aiResult.reason.message);
    }

    setIntelligenceError(errors.join(' '));
  } finally {
    setIntelligenceLoading(false);
  }
}

async function refresh() {
  const [me, dash, tx, bd, gl] = await Promise.all([
    api('/auth/me'),
    api('/dashboard/summary'),
    api('/transactions'),
    api(`/budgets?month=${selectedBudgetMonth}`),
    api('/goals')
  ]);

  setUser(me.user);
  setSummary(dash);
  setTransactions(tx.transactions);
  setBudgets(bd.budgets || []);
  setUnbudgetedSpending(bd.unbudgetedSpending || []);
  setBudgetInsights(bd.insights || []);
  setGoals(gl.goals);

  // Load intelligence separately without blocking the dashboard.
  void loadIntelligence();
}



useEffect(() => {
  if (token) {
    refresh()
      .then(() => {
        setError('');
      })
      .catch((e) => {
        setError(e.message);

        if (e.status === 401) {
          localStorage.removeItem('spendwise_token');
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }
}, [token]);


  useEffect(() => {
    if (!token) return;
    api(`/budgets?month=${selectedBudgetMonth}`)
      .then((result) => {
        setBudgets(result.budgets || []);
        setUnbudgetedSpending(result.unbudgetedSpending || []);
        setBudgetInsights(result.insights || []);
      })
      .catch((e) => setError(e.message));
     }, [token, selectedBudgetMonth]);

  useEffect(() => {
  if (!token) return;
  api(`/dashboard/comparison?month=${selectedBudgetMonth}`)
    .then((result) => setMonthlyComparison(result))
    .catch((e) => setError(e.message));
}, [token, selectedBudgetMonth]);

  function onLogin(data) {
    localStorage.setItem('spendwise_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('spendwise_token');
    setToken(null);
    setUser(null);
    setSummary(null);
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
  }

  function openProfile() {
  setProfileForm({
    name: user.name || '',
    phone: user.phone || ''
  });
  setProfileError('');
  setProfileOpen(true);
}


async function saveProfile(avatarFile) {
  setProfileSaving(true);
  setProfileError('');

  try {
    // Save name and phone first.
    let result = await api('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileForm)
    });

    // Upload the selected photo, if one was chosen.
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      result = await api('/auth/profile/avatar', {
        method: 'POST',
        body: formData
      });
    }

    setUser(result.user);
    setProfileOpen(false);
  } catch (err) {
    setProfileError(
      err.message || 'Could not update your profile.'
    );
  } finally {
    setProfileSaving(false);
  }
}




async function requestChat(question, history) {
  setChatBusy(true);
  setChatError('');

  try {
    const result = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: question,
        history: history.slice(-10).map((item) => ({
          role: item.role,
          content: item.text
        }))
      })
    });

    setChat((previous) => [
      ...previous,
      {
        role: 'assistant',
        text: result.reply || 'I could not generate a response. Please try again.'
      }
    ]);

    setChatError('');
    setChatRetry(null);
  } catch (err) {
    const quotaExhausted =
      err.code === 'GEMINI_QUOTA_EXHAUSTED' ||
      err.status === 429;

    setChatError(
      quotaExhausted
        ? err.message
        : err.message || 'SpendWise AI is temporarily unavailable. Please try again shortly.'
    );

    setChatRetry(
      quotaExhausted ? null : { question, history }
    );
  } finally {
    setChatBusy(false);
  }
}


async function sendChat(event) {
  event.preventDefault();

  const question = chatInput.trim();

  if (!question || chatBusy) return;

  const updatedChat = [
    ...chat,
    { role: 'user', text: question }
  ];

  setChat(updatedChat);
  setChatInput('');
  setChatError('');
  setChatRetry(null);

  await requestChat(question, updatedChat);
}

async function retryChat() {
  if (!chatRetry || chatBusy) return;

  await requestChat(
    chatRetry.question,
    chatRetry.history
  );
}


async function generateMonthlyReport() {
  if (!monthlyComparison || monthlyReportLoading) return;

  setMonthlyReportLoading(true);
  setMonthlyReportError('');
  setMonthlyReportAI('');

  try {
    const result = await api('/ai/monthly-report', {
      method: 'POST',
      body: JSON.stringify({
        month: monthlyComparison.month
      })
    });

    setMonthlyReportAI(result.explanation || '');
  } catch (err) {
    setMonthlyReportError(
      err.message || 'Could not generate monthly report.'
    );
  } finally {
    setMonthlyReportLoading(false);
  }
}


async function downloadMonthlyReport() {
  if (!monthlyComparison) return;

  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const formatPdfMoney = (value) =>
    'INR ' + new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const addWrappedText = (text, options = {}) => {
    const {
      size = 10,
      bold = false,
      gap = 6
    } = options;

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);

    const lines = doc.splitTextToSize(
      String(text),
      contentWidth
    );

    const requiredHeight = lines.length * (size * 0.45) + gap;

    if (y + requiredHeight > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }

    doc.text(lines, margin, y);
    y += requiredHeight;
  };

  const monthLabel = monthlyComparison.month
    ? new Date(`${monthlyComparison.month}-01T00:00:00`)
        .toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric'
        })
    : 'Monthly Report';

  // Header
  doc.setFillColor(38, 83, 62);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SPENDWISE AI', margin, 19);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Financial Report', margin, 29);

  doc.setFontSize(9);
  doc.text(monthLabel, margin, 36);

  doc.setTextColor(40, 50, 43);
  y = 55;

  addWrappedText(
    `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    { size: 9, gap: 12 }
  );

  // Financial summary
  addWrappedText('FINANCIAL SUMMARY', {
    size: 13,
    bold: true,
    gap: 10
  });

  const current = monthlyComparison.current || {};

  const summaryItems = [
    ['Recorded Income', formatPdfMoney(current.income)],
    ['Recorded Expenses', formatPdfMoney(current.expenses)],
    ['Net Cash Flow', formatPdfMoney(current.netCashFlow)],
    ['Transactions', String(current.transactionCount || 0)]
  ];

  summaryItems.forEach(([label, value]) => {
    addWrappedText(`${label}: ${value}`, {
      size: 11,
      gap: 7
    });
  });

  y += 5;

  // Category breakdown
  addWrappedText('CATEGORY-WISE SPENDING', {
    size: 13,
    bold: true,
    gap: 10
  });

  const categories = monthlyComparison.categoryComparison || [];

  if (categories.length) {
    categories.forEach((item) => {
      addWrappedText(
        `${item.category}: ${formatPdfMoney(item.current)}`,
        { size: 10, gap: 7 }
      );
    });
  } else {
    addWrappedText('No category spending records available.', {
      size: 10
    });
  }

  y += 5;

  // Previous-month comparison
  addWrappedText('MONTH-TO-MONTH COMPARISON', {
    size: 13,
    bold: true,
    gap: 10
  });

  if (monthlyComparison.previous?.hasRecords) {
    addWrappedText(
      `Previous month: ${monthlyComparison.previousMonth}`,
      { size: 10 }
    );

    addWrappedText(
      `Previous expenses: ${formatPdfMoney(monthlyComparison.previous.expenses)}`,
      { size: 10 }
    );
  } else {
    addWrappedText(
      'Previous-month records are unavailable. A reliable comparison cannot be made.',
      { size: 10 }
    );
  }

  y += 5;

  // AI explanation
  addWrappedText('AI FINANCIAL EXPLANATION', {
    size: 13,
    bold: true,
    gap: 10
  });

  if (monthlyReportAI) {
    const cleanExplanation = monthlyReportAI
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '• ')
      .trim();

    cleanExplanation.split('\n').forEach((line) => {
      if (line.trim()) {
        addWrappedText(line.trim(), {
          size: 10,
          gap: 7
        });
      }
    });
  } else {
    addWrappedText(
      'AI explanation has not been generated for this report.',
      { size: 10 }
    );
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    doc.text(
      'SpendWise AI | Personal Financial Report',
      margin,
      pageHeight - 10
    );

    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const filename = `SpendWise_Report_${monthlyComparison.month || 'Monthly'}.pdf`;

  doc.save(filename);
}



  function openNewTransaction() {
    setEditingTransaction(null);
    setModal('transaction');
  }

  function openEditTransaction(transaction) {
    setEditingTransaction(transaction);
    setModal('edit-transaction');
  }

  function closeModal() {
    setModal('');
    setEditingTransaction(null);
  }

  async function deleteTransaction(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await api(`/transactions/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) return <AuthScreen onLogin={onLogin} />;

  if (loading || !user) {
    return (
      <div className="loading-screen">
        <LoaderCircle className="spin" />
        Getting your money space ready…
      </div>
    );
  }

  const s = summary?.summary || { income: 0, expenses: 0, net: 0 };
  const firstName = user.name?.split(' ')[0] || 'there';

  const nav = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Transactions', icon: ArrowLeftRight },
    { name: 'Budgets', icon: Wallet },
    { name: 'Goals', icon: Target },
    { name: 'Intelligence', icon: Sparkles}
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Wallet size={19} /></div>
          <span>spendwise<span className="brand-ai">.ai</span></span>
        </div>

        <div className="workspace-label">YOUR MONEY SPACE</div>

        <nav>
          {nav.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${view === item.name ? 'active' : ''}`}
              onClick={() => {
                setView(item.name);
                window.location.hash = item.name;
                setMobileNav(false);
              }}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={18} /></div>
            <strong>A little help?</strong>
            <p>Your money journey doesn't have to be complicated.</p>
            <button onClick={() => setChatOpen(true)}>
              Talk to SpendWise <ArrowUpRight size={14} />
            </button>
          </div>

          <button className="profile-row" onClick={logout}>
            <div className="avatar">
              {user.avatarUrl ? (
                <img src={assetUrl(user.avatarUrl)} alt="Profile" />
              ) : (
                firstName[0]?.toUpperCase()
              )}
            </div>

            <div className="profile-text">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            My space <span>/</span> <strong>{view}</strong>
          </div>

          <div className="top-actions">
            <div className="date-chip">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString('en-IN', {
                month: 'short',
                year: 'numeric',
                timeZone: REPORTING_TIME_ZONE
              })}
            </div>
            <button className="icon-button" title="Notifications">
              <Bell size={18} /><i />
            </button>
            <button
              className="top-avatar profile-avatar-button"
              onClick={openProfile}
              title="Profile settings"
              aria-label="Open profile settings"
            >
              {user.avatarUrl ? (
                <img src={assetUrl(user.avatarUrl)} alt="Profile" />
              ) : (
                firstName[0]?.toUpperCase()
              )}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {error && (
            <div className="notice error-notice">
              {error}
              <button onClick={() => setError('')}><X size={15} /></button>
            </div>
          )}

          {view === 'Overview' && (
            <Overview
              firstName={firstName}
              summary={s}
              categoriesData={summary?.categories || []}
              dailySpending={summary?.dailySpending || []}
              transactions={transactions}
              budgets={budgets}
              monthlyComparison={monthlyComparison}
              monthlyReportAI={monthlyReportAI}
              monthlyReportLoading={monthlyReportLoading}
              monthlyReportError={monthlyReportError}
              onGenerateMonthlyReport={generateMonthlyReport}
              onDownloadMonthlyReport={downloadMonthlyReport}
              onAdd={openNewTransaction}
              onChat={() => setChatOpen(true)}
            />
          )}

          {view === 'Transactions' && (
            <React.Suspense
              fallback={<div className="empty-chart">Loading transactions...</div>}
            >
              <LazyTransactions
                transactions={transactions}
                onAdd={openNewTransaction}
                onEdit={openEditTransaction}
                onDelete={deleteTransaction}
                icons={icons}
              />
            </React.Suspense>
          )}

          {view === 'Budgets' && (
            <React.Suspense
              fallback={<div className="empty-chart">Loading budgets...</div>}
            >
              <LazyBudgets
                budgets={budgets}
                unbudgetedSpending={unbudgetedSpending}
                insights={budgetInsights}
                comparison={monthlyComparison}
                month={selectedBudgetMonth}
                onMonthChange={setSelectedBudgetMonth}
                onAdd={() => setModal('budget')}
                icons={icons}
              />
            </React.Suspense>
          )}

          {view === 'Goals' && (
            <React.Suspense
              fallback={<div className="empty-chart">Loading goals...</div>}
            >
              <LazyGoals
                goals={goals}
                onAdd={() => setModal('goal')}
              />
            </React.Suspense>
          )}
         
          
          {view === 'Intelligence' && (
            <React.Suspense
              fallback={<div className="empty-chart">Loading intelligence...</div>}
            >
              <LazyIntelligence
                data={financialIntelligence}
                loading={intelligenceLoading}
                error={intelligenceError}
                onRetry={async () => {
                  try {
                    setIntelligenceLoading(true);
                    setIntelligenceError('');

                    const [result, aiResult] = await Promise.all([
                      api('/dashboard/intelligence'),
                      api('/ai/insights')
                    ]);

                    setFinancialIntelligence(result);
                    setAiInsights(aiResult.aiInsights || []);
                    setAiInsightsMode(aiResult.mode || 'basic');
                  } catch (err) {
                    setIntelligenceError(err.message);
                  } finally {
                    setIntelligenceLoading(false);
                  }
                }}
                onChat={() => setChatOpen(true)}
                aiInsights={aiInsights}
                aiInsightsMode={aiInsightsMode}
              />
            </React.Suspense>
          )}
        </div>
      </main>

      <button className="copilot-fab" onClick={() => setChatOpen(true)}>
        <Sparkles size={17} /> Ask SpendWise
      </button>

      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-head">
            <div className="copilot-avatar"><Sparkles size={17} /></div>
            <div>
              <strong>Your money companion</strong>
              <span>Here to help, never to judge</span>
            </div>
            <button className="icon-button" onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {chat.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="mini-avatar"><Sparkles size={13} /></div>
                )}
                <div className="bubble">
                  {m.text}
                  {m.mode === 'basic' && (
                    <small>Based on your recorded transactions · Basic assistant</small>
                  )}
                </div>
              </div>
            ))}



              {chatError && (
                <div className="chat-message assistant">
                  <div className="mini-avatar">
                    <Sparkles size={13} />
                  </div>
                  <div className="bubble">
                    <div>{chatError}</div>

                    {chatRetry && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={retryChat}
                        disabled={chatBusy}
                        style={{ marginTop: '10px' }}
                      >
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              )}


            {chatBusy && (
              <div className="chat-message assistant">
                <div className="mini-avatar"><Sparkles size={13} /></div>
                <div className="bubble">
                  <LoaderCircle className="spin" size={15} /> Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="suggestions">
            <button onClick={() => setChatInput('Where did my money go this month?')}>
              Where did my money go?
            </button>
            <button onClick={() => setChatInput('Can I afford a ₹3,000 purchase?')}>
              Can I afford a purchase?
            </button>
          </div>

          <form className="chat-form" onSubmit={sendChat}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about your money…"
            />
            <button disabled={chatBusy || !chatInput.trim()}>
              <Send size={17} />
            </button>
          </form>
        </div>
      )}

      {modal && (
        <Modal
          type={modal}
          transaction={editingTransaction}
          defaultBudgetMonth={selectedBudgetMonth}
          onClose={closeModal}
          onSaved={async () => {
            closeModal();
            await refresh();
          }}
        />
      )}
      
      {profileOpen && (
        <ProfileModal
          user={user}
          form={profileForm}
          setForm={setProfileForm}
          error={profileError}
          saving={profileSaving}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}

    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const r = await api(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onLogin(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="brand">
          <div className="brand-mark"><Wallet size={19} /></div>
          <span>spendwise<span className="brand-ai">.ai</span></span>
        </div>

        <div className="auth-story">
          <div className="eyebrow"><span /> A calmer way to manage money</div>
          <h1>Your money.<br /><em>Your pace.</em><br />Your peace.</h1>
          <p>
            Understand your spending, make room for what matters, and feel a
            little more in control every day.
          </p>
          <div className="auth-note">
            <div className="note-icon"><Sparkles size={18} /></div>
            <span>Thoughtful money guidance, without the guilt.</span>
          </div>
        </div>

        <div className="auth-footer">A more human relationship with money.</div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={submit}>
          <div className="form-kicker">
            WELCOME {mode === 'login' ? 'BACK' : 'ABOARD'}
          </div>
          <h2>{mode === 'login' ? 'Good to see you.' : 'Let’s get to know you.'}</h2>
          <p>
            {mode === 'login'
              ? 'Your financial picture is right where you left it.'
              : 'Create your personal money space. It only takes a minute.'}
          </p>

          {mode === 'register' && (
            <label>
              Your name
              <input
                required
                minLength="2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Anand"
              />
            </label>
          )}

          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength="8"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-button full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create my account'}
            <ArrowUpRight size={17} />
          </button>

          <div className="switch-auth">
            {mode === 'login' ? 'New to SpendWise?' : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>

          <div className="privacy-line">
            <span /> Your financial information stays yours.
          </div>
        </form>
      </div>
    </div>
  );
}

function Overview({
    

  firstName,
  summary,
  categoriesData,
  dailySpending,
  transactions,
  budgets,
  monthlyComparison,
  monthlyReportAI,
  monthlyReportLoading,
  monthlyReportError,
  onGenerateMonthlyReport,
  onDownloadMonthlyReport,
  onAdd,
  onChat
}) {
  
  const getGreeting = () => {
    const hour = Number(new Intl.DateTimeFormat('en-IN', {
      timeZone: REPORTING_TIME_ZONE,
      hour: '2-digit',
      hourCycle: 'h23'
    }).format(new Date()));

    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    }

    if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  };

  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting());
    };

    const interval = setInterval(updateGreeting, 60000);

    return () => clearInterval(interval);
  }, []);

   const formatReportMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const formatReportMonth = (value) => {
    if (!value) return 'Month unavailable';

    const [year, month] = value.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, 1))
      .toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });
  };

  const month = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    timeZone: REPORTING_TIME_ZONE
  });

  const spentPct = summary.income > 0
    ? Math.min(100, summary.expenses / summary.income * 100)
    : 0;
 
  // Monthly savings and budget performance.
const savingsRate = summary.income > 0
  ? (summary.net / summary.income) * 100
  : null;

const totalBudget = budgets.reduce(
  (sum, budget) => sum + Number(budget.limit || 0),
  0
);

const totalBudgetSpent = budgets.reduce(
  (sum, budget) => sum + Number(budget.spent || 0),
  0
);

const budgetRemaining = totalBudget - totalBudgetSpent;

const budgetUsage = totalBudget > 0
  ? (totalBudgetSpent / totalBudget) * 100
  : 0;

const formatMonth = (value) => {
  if (!value) return 'Not available';

  return new Date(`${value}-01T00:00:00Z`)
    .toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
};


  // Build a real daily series from the API response.
  const chartData = useMemo(() => {
    const [year, month, currentDay] = getIndiaDateKey()
      .split('-')
      .map(Number);
    const monthIndex = month - 1;

    const totals = new Map(
      dailySpending.map((item) => [item.date, item.amount])
    );

    return Array.from({ length: currentDay }, (_, index) => {
      const day = index + 1;

      const date = new Date(
        Date.UTC(year, monthIndex, day)
      ).toISOString().slice(0, 10);

      return {
        day: String(day),
        date,
        amount: totals.get(date) || 0
      };
    });
  }, [dailySpending]);

  const insight = summary.expenses === 0
    ? 'Your money story starts with your first transaction. Add an expense or income to see your month take shape.'
    : summary.net >= 0
      ? `You've recorded ${money(summary.net)} more income than expenses this month. Keep your upcoming commitments in view as you plan what comes next.`
      : `Your recorded expenses are currently higher than your recorded income by ${money(Math.abs(summary.net))}. Check whether all income has been added.`;

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: REPORTING_TIME_ZONE
            }).toUpperCase()}
          </div>
          <h1>{greeting}, {firstName}<span className="wave">✳</span></h1>
          <p>Here's a gentle look at how your money is doing.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add a transaction
        </button>
      </div>

      <section className="balance-card">
        <div className="balance-top">
          <div>
            <span className="balance-label">YOUR MONTH AT A GLANCE</span>
            <div className="balance-value">{money(summary.net)}</div>
            <span className="balance-caption">
              Income minus expenses recorded in {month}
            </span>
          </div>
          <div className="balance-symbol"><Wallet size={23} /></div>
        </div>

        <div className="balance-divider" />

        <div className="balance-bottom">
          <div className="balance-stat">
            <span><i className="income-dot" /> Money in</span>
            <strong>{money(summary.income)}</strong>
          </div>
          <div className="balance-stat">
            <span><i className="expense-dot" /> Money out</span>
            <strong>{money(summary.expenses)}</strong>
          </div>
        </div>

        <div className="balance-progress">
          <div className="progress-label">
            <span>Income spent</span>
            <strong>{Math.round(spentPct)}%</strong>
          </div>
          <div className="progress-track">
            <div style={{ width: `${spentPct}%` }} />
          </div>
        </div>
      </section>
     
    <section className="budget-summary-grid monthly-report-grid">

  <div className="panel budget-summary-card">
    <span>RECORDED SAVINGS RATE</span>

    <strong>
      {savingsRate === null
        ? '—'
        : `${savingsRate.toFixed(1)}%`}
    </strong>

    <small>
      {savingsRate === null
        ? 'Add recorded income to calculate'
        : savingsRate < 0
          ? 'Recorded expenses exceed income'
          : 'Based on recorded income and expenses'}
    </small>
  </div>

  <div className="panel budget-summary-card">
    <span>PLANNED MONTHLY BUDGET</span>

    <strong>{money(totalBudget)}</strong>

    <small>
      Across {budgets.length} budget categories
    </small>
  </div>

  <div className="panel budget-summary-card">
    <span>BUDGET PERFORMANCE</span>

    <strong>{totalBudget > 0
      ? `${budgetUsage.toFixed(0)}%`
      : '—'}
    </strong>

    <small>
      {totalBudget === 0
        ? 'No budgets configured'
        : budgetRemaining >= 0
          ? `${money(budgetRemaining)} remaining`
          : `${money(Math.abs(budgetRemaining))} over budget`}
    </small>
  </div>

</section>

{monthlyComparison && (
  <section className="panel monthly-report-panel">
    <div className="panel-heading">
      <div>
        <span className="section-kicker">MONTHLY FINANCIAL REPORT</span>
        <h3>{formatMonth(monthlyComparison.month)} at a glance</h3>
        <p>
          Compared with {formatMonth(monthlyComparison.previousMonth)}
        </p>
      </div>
    </div>

    <div className="budget-summary-grid">
      <div className="panel budget-summary-card">
        <span>RECORDED INCOME</span>
        <strong>{money(monthlyComparison.current.income)}</strong>
        <small>
          Previous: {money(monthlyComparison.previous.income)}
        </small>
      </div>

      <div className="panel budget-summary-card">
        <span>RECORDED EXPENSES</span>
        <strong>{money(monthlyComparison.current.expenses)}</strong>
        <small>
          Previous: {money(monthlyComparison.previous.expenses)}
        </small>
      </div>

      <div className="panel budget-summary-card">
        <span>NET CASH FLOW</span>
        <strong>{money(monthlyComparison.current.netCashFlow)}</strong>
        <small>
          Previous: {money(monthlyComparison.previous.netCashFlow)}
        </small>
      </div>
    </div>

    {!monthlyComparison.hasPreviousRecords && (
      <p className="empty-chart">
        No transactions were recorded in the previous month.
        A month-to-month comparison will be available when
        previous-month data exists.
      </p>
    )}

    {monthlyComparison.categoryComparison?.length > 0 && (
      <div className="monthly-category-comparison">
        <h4>Category-wise spending</h4>

        {monthlyComparison.categoryComparison.map((item) => (
          
          <div className="monthly-category-row" key={item.category}>
            <strong className="monthly-category-name">
              {item.category}
            </strong>

            <div className="monthly-category-values">
              <div>
                <small>Current month</small>
                <strong>{money(item.current)}</strong>
              </div>

              <div>
                <small>Previous month</small>
                <strong>{money(item.previous)}</strong>
              </div>
            </div>
          </div>
          ))}
          </div>
    )}
   
<div className="monthly-ai-report">
  <div className="monthly-ai-report-heading">
    <h4>AI Financial Explanation</h4>
    <p>
      Get a personalised explanation of your monthly financial activity.
    </p>
  </div>

  <button
    type="button"
    className="primary-button"
    onClick={onGenerateMonthlyReport}
    disabled={monthlyReportLoading}
  >
    {monthlyReportLoading
      ? 'Generating report...'
      : 'Generate AI Explanation'}
  </button>


<button
  type="button"
  className="secondary-button"
  onClick={onDownloadMonthlyReport}
  disabled={!monthlyComparison}
>
  Download Monthly Report PDF
</button>


  {monthlyReportLoading && (
    <p>Gemini is analysing your monthly financial data...</p>
  )}

  {monthlyReportError && (
    <p className="error-notice">{monthlyReportError}</p>
  )}

  

{monthlyReportAI && (
  <div className="monthly-ai-report-text">
    <React.Suspense
      fallback={<p>Loading report formatting...</p>}
    >
      <LazyReactMarkdown
        components={{
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h4>{children}</h4>,
          h3: ({ children }) => <h4>{children}</h4>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong>{children}</strong>
        }}
      >
        {monthlyReportAI}
      </LazyReactMarkdown>
    </React.Suspense>
  </div>
)}


</div>

  </section>
)}

      <div className="insight-strip">
        <div className="insight-icon"><Sparkles size={19} /></div>
        <div className="insight-copy">
          <strong>A small thought for your month</strong>
          <p>{insight}</p>
        </div>
        <button onClick={onChat}>Let's talk <ArrowUpRight size={15} /></button>
      </div>

      <div className="dashboard-grid">
        <section className="panel spending-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">YOUR RHYTHM</span>
              <h3>Spending, over time</h3>
            </div>
            <span className="period-pill">This month</span>
          </div>

          <div className="chart-area">
            {summary.expenses > 0 ? (
              <React.Suspense
                fallback={<div className="empty-chart">Loading spending chart...</div>}
              >
                <LazySpendingChart chartData={chartData} money={money} />
              </React.Suspense>
            ) : (
              <div className="empty-chart">
                <div className="empty-chart-icon"><ArrowDownRight /></div>
                <strong>Your spending rhythm will appear here</strong>
                <span>Add a few transactions to see your month take shape.</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel category-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">WHERE IT GOES</span>
              <h3>Spending areas</h3>
            </div>
            <button className="text-button">This month</button>
          </div>

          {categoriesData.length ? (
            <div className="category-list">
              {categoriesData.slice(0, 5).map((c, i) => {
                const Icon = icons[c.category] || MoreHorizontal;
                const max = categoriesData[0].amount || 1;

                return (
                  <div className="category-item" key={c.category}>
                    <div className={`category-icon tone-${i}`}>
                      <Icon size={17} />
                    </div>
                    <div className="category-info">
                      <div>
                        <strong>{c.category}</strong>
                        <span>{money(c.amount)}</span>
                      </div>
                      <div className="category-track">
                        <i style={{ width: `${c.amount / max * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-small">
              Your spending categories will show up here once you add expenses.
            </div>
          )}
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel transactions-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">THE LATEST</span>
              <h3>Recent activity</h3>
            </div>
            <span className="soft-count">{transactions.length} records</span>
          </div>

          {transactions.length ? (
            <TransactionRows transactions={transactions.slice(0, 5)} icons={icons} />
          ) : (
            <div className="empty-small">
              No transactions yet. Your first entry can be as simple as today's coffee.
            </div>
          )}
        </section>

        <section className="panel budgets-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">GENTLE GUARDRAILS</span>
              <h3>Your budgets</h3>
            </div>
            <Target size={19} className="muted-icon" />
          </div>

          {budgets.length ? (
            budgets.slice(0, 3).map((b) => (
              <div className="budget-row" key={b.id}>
                <div>
                  <strong>{b.category}</strong>
                  <span>{money(b.spent)} of {money(b.limit)}</span>
                </div>
                <div className="budget-track">
                  <i
                    className={b.spent > b.limit ? 'over' : ''}
                    style={{ width: `${Math.min(100, b.spent / b.limit * 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="empty-small">
              A budget isn't a restriction; it's a little plan for what matters.
              Add your first one.
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Modal({ type, transaction, defaultBudgetMonth, onClose, onSaved }) {
  const isEditing = type === 'edit-transaction';

  const [form, setForm] = useState(() => ({
    type: transaction?.type || 'expense',
    amount: transaction ? String(transaction.amount) : '',
    category: transaction?.category || 'Food',
    merchant: transaction?.merchant || '',
    note: transaction?.note || '',
    date: transaction ? dateForInput(transaction.date) : getIndiaDateKey(),
    paymentMethod: transaction?.paymentMethod || 'UPI',
    month: defaultBudgetMonth || getIndiaMonthKey(),
    limit: '',
    name: '',
    target: '',
    saved: ''
  }));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (type === 'transaction' || isEditing) {
        const payload = {
          type: form.type,
          amount: Number(form.amount),
          category: form.category,
          merchant: form.merchant,
          note: form.note,
          date: form.date,
          paymentMethod: form.paymentMethod
        };

        if (isEditing) {
          await api(`/transactions/${transaction.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
        } else {
          await api('/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
      }

      if (type === 'budget') {
        await api('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            category: form.category,
            limit: Number(form.limit),
            month: form.month
          })
        });
      }

      if (type === 'goal') {
        await api('/goals', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            target: Number(form.target),
            saved: Number(form.saved || 0)
          })
        });
      }

      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const title = isEditing
    ? 'Edit transaction'
    : type === 'transaction'
      ? 'Add a transaction'
      : type === 'budget'
        ? 'Create a budget'
        : 'Start a savings goal';

  const merchantText = form.merchant.toLowerCase();

  const merchantSuggestions = [
    { keywords: ['swiggy', 'zomato', 'restaurant', 'cafe'], category: 'Food' },
    { keywords: ['bigbasket', 'blinkit', 'zepto', 'grocery'], category: 'Groceries' },
    { keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol'], category: 'Transport' },
    { keywords: ['amazon', 'flipkart', 'myntra'], category: 'Shopping' },
    { keywords: ['netflix', 'spotify', 'cinema'], category: 'Entertainment' },
    { keywords: ['electricity', 'internet', 'recharge'], category: 'Bills' },
    { keywords: ['hospital', 'pharmacy', 'clinic'], category: 'Health' }
  ];

  const suggestedCategory = merchantSuggestions.find((item) =>
    item.keywords.some((keyword) => merchantText.includes(keyword))
  )?.category;


  return (
    
  

    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <span className="section-kicker">A SMALL MONEY MOMENT</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        {(type === 'transaction' || isEditing) && (
          <>
            <div className="type-toggle">
              {[
                { value: 'expense', label: 'Money out' },
                { value: 'income', label: 'Money in' },
                { value: 'transfer', label: 'Transfer' }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={form.type === item.value ? 'chosen' : ''}
                  onClick={() => update('type', item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label>
              Amount (₹)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                placeholder="0.00"
              />
            </label>

            <div className="form-grid">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                >
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label>
                Payment method
                <select
                  value={form.paymentMethod}
                  onChange={(e) => update('paymentMethod', e.target.value)}
                >
                  {['UPI', 'Cash', 'Card', 'Bank transfer', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Merchant or person
              <input
                value={form.merchant}
                onChange={(e) => update('merchant', e.target.value)}
                placeholder="e.g. Local grocery store"
              />
            </label>
            
                       {suggestedCategory &&
              suggestedCategory !== form.category && (
                <button
                  type="button"
                  className="category-suggestion"
                  onClick={() => update('category', suggestedCategory)}
                >
                  ✨ Suggested category: {suggestedCategory}
                  <span>Apply</span>
                </button>
              )}


            <div className="form-grid">
              <label>
                Date
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                />
              </label>

              <label>
                Note
                <input
                  value={form.note}
                  onChange={(e) => update('note', e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
          </>
        )}

        {type === 'budget' && (
          <>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
              >
                {categories.filter((c) => c !== 'Salary').map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              Monthly limit (₹)
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.limit}
                onChange={(e) => update('limit', e.target.value)}
                placeholder="e.g. 5000"
              />
            </label>

            <label>
              Month
              <input
                type="month"
                required
                value={form.month}
                onChange={(e) => update('month', e.target.value)}
              />
            </label>
          </>
        )}

        {type === 'goal' && (
          <>
            <label>
              What are you saving for?
              <input
                required
                minLength="2"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Emergency fund"
              />
            </label>

            <div className="form-grid">
              <label>
                Target amount (₹)
                <input
                  required
                  type="number"
                  min="1"
                  value={form.target}
                  onChange={(e) => update('target', e.target.value)}
                />
              </label>

              <label>
                Already saved (₹)
                <input
                  type="number"
                  min="0"
                  value={form.saved}
                  onChange={(e) => update('saved', e.target.value)}
                />
              </label>
            </div>
          </>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Save'}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}



function ProfileModal({
  user,
  form,
  setForm,
  error,
  saving,
  onSave,
  onClose
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const initials =
    form.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  const photoSource = previewUrl || assetUrl(user.avatarUrl);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError('Choose a JPG, PNG or WebP image.');
      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Image must be 5 MB or smaller.');
      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    setFileError('');
    setSelectedFile(file);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal-card profile-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="modal-head">
          <div>
            <span className="section-kicker">YOUR ACCOUNT</span>
            <h2 id="profile-modal-title">Profile settings</h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close profile settings"
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <div className="profile-photo-section">
          <div className="profile-photo-preview">
            {photoSource ? (
              <img
                src={photoSource}
                alt="Profile preview"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="profile-photo-details">
            <strong>{form.name || 'Your name'}</strong>
            <p>Personalise your SpendWise account</p>

            <label className="profile-upload-button">
              Choose photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                disabled={saving}
              />
            </label>
          </div>
        </div>

        {fileError && (
          <div className="form-error">{fileError}</div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(selectedFile);
          }}
        >
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField('name', event.target.value)
              }
              placeholder="Enter your full name"
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              value={user.email || ''}
              readOnly
              disabled
            />
            <small className="profile-field-note">
              Email changes will require verification.
            </small>
          </label>

          <label>
            Phone number
            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                updateField('phone', event.target.value)
              }
              placeholder="Enter your phone number"
              maxLength={20}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <div className="profile-security-note">
          Your account details are protected by your SpendWise login.
        </div>
      </section>
    </div>
  );
}
