import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { api, getToken, assetUrl } from './services/api';
import {
  Wallet, LayoutDashboard, ArrowLeftRight, Target, Sparkles, Plus,
  Search, Bell, ArrowUpRight, ArrowDownRight, Coffee, ShoppingBasket,
  CarFront, House, HeartPulse, Utensils, MoreHorizontal, Send, X,
  LogOut, Menu, CalendarDays, ReceiptText, CircleHelp, LoaderCircle,
  Trash2
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis
} from 'recharts';

const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0);

const categories = [
  'Food', 'Groceries', 'Transport', 'Housing', 'Health',
  'Shopping', 'Bills', 'Education', 'Entertainment', 'Salary', 'Other'
];

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

const dateForInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

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
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
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
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

const [profileForm, setProfileForm] = useState({
  name: '',
  phone: ''
});

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
  try {
  setIntelligenceLoading(true);
  setIntelligenceError('');

  const [intelligence, aiResult] = await Promise.all([
    api('/dashboard/intelligence'),
    api('/ai/insights')
  ]);

  setFinancialIntelligence(intelligence);
  setAiInsights(aiResult.aiInsights || []);
  setAiInsightsMode(aiResult.mode || 'basic');

} catch (err) {
  setIntelligenceError(err.message);
} finally {
  setIntelligenceLoading(false);
}
}

  useEffect(() => {
    if (token) {
      refresh()
        .catch((e) => {
          setError(e.message);
          localStorage.removeItem('spendwise_token');
          setToken(null);
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
  setChatBusy(true);

  try {
    const result = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: question,
        history: updatedChat.slice(-10).map((item) => ({
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
  } catch (err) {
    setChat((previous) => [
      ...previous,
      {
        role: 'assistant',
        text: 'I could not connect to the financial assistant. Please try again. ' +
          (err.message || '')
      }
    ]);
  } finally {
    setChatBusy(false);
  }
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
        report: monthlyComparison
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
                year: 'numeric'
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
            <Transactions
              transactions={transactions}
              onAdd={openNewTransaction}
              onEdit={openEditTransaction}
              onDelete={deleteTransaction}
            />
          )}

          {view === 'Budgets' && (
            <Budgets
               budgets={budgets}
               unbudgetedSpending={unbudgetedSpending}
               insights={budgetInsights}
               comparison={monthlyComparison}
               month={selectedBudgetMonth}
               onMonthChange={setSelectedBudgetMonth}
               onAdd={() => setModal('budget')}
            />
           )}

          {view === 'Goals' && (
            <Goals goals={goals} onAdd={() => setModal('goal')} />
          )}
         
          
          {view === 'Intelligence' && (
              <Intelligence
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
    const hour = new Date().getHours();

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

  const month = new Date().toLocaleDateString('en-IN', { month: 'long' });

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
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth();
    const currentDay = now.getUTCDate();

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
              month: 'long'
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
    <p>Ollama is analysing your monthly financial data...</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#648a70" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#648a70" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="#ecebe4"
                  />

                  <XAxis
                    dataKey="day"
                    interval="preserveStartEnd"
                    minTickGap={18}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#99998f', fontSize: 11 }}
                  />

                  <Tooltip
                    formatter={(value) => [money(value), 'Expenses']}
                    labelFormatter={(_, payload) => {
                      const date = payload?.[0]?.payload?.date;

                      return date
                        ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC'
                          })
                        : '';
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e9e8df',
                      fontFamily: 'DM Sans'
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#50785d"
                    strokeWidth={2.5}
                    fill="url(#spendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
            <TransactionRows transactions={transactions.slice(0, 5)} />
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

function TransactionRows({ transactions, onEdit, onDelete }) {
  return (
    <div className="transaction-list">
      {transactions.map((t) => {
        const Icon = icons[t.category] || MoreHorizontal;

        return (
          <div className="transaction-row" key={t.id}>
            <div className="transaction-icon"><Icon size={17} /></div>

            <div className="transaction-description">
              <strong>{t.merchant || t.category}</strong>
              <span>
                {t.category} · {t.paymentMethod || 'Other'} ·
                {' '}{new Date(t.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
              {t.note && <small className="transaction-note">{t.note}</small>}
            </div>

            <strong className={`transaction-amount ${t.type}`}>
              {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}
              {money(t.amount)}
            </strong>

            {(onEdit || onDelete) && (
              <div className="transaction-actions">
                {onEdit && (
                  <button
                    className="edit-button"
                    onClick={() => onEdit(t)}
                    title="Edit transaction"
                    type="button"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    className="delete-button"
                    onClick={() => onDelete(t.id)}
                    title="Delete transaction"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Transactions({ transactions, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions.filter((t) => {
      const matchesSearch = !term || [
        t.merchant,
        t.category,
        t.note
      ].some((value) => (value || '').toLowerCase().includes(term));

      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesCategory =
        categoryFilter === 'all' || t.category === categoryFilter;

      const transactionDate = dateForInput(t.date);
      const matchesFrom = !fromDate || transactionDate >= fromDate;
      const matchesTo = !toDate || transactionDate <= toDate;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [transactions, search, typeFilter, categoryFilter, fromDate, toDate]);

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setFromDate('');
    setToDate('');
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">YOUR MONEY, IN MOTION</div>
          <h1>Transactions</h1>
          <p>Every little thing that makes up your money story.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add transaction
        </button>
      </div>

      <section className="panel full-panel">
        <div className="transaction-tools">
          <div className="transaction-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search merchant, category or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <div className="filter-tabs">
              {[
                { value: 'all', label: 'Everything' },
                { value: 'income', label: 'Money in' },
                { value: 'expense', label: 'Money out' },
                { value: 'transfer', label: 'Transfers' }
              ].map((item) => (
                <button
                  key={item.value}
                  className={typeFilter === item.value ? 'selected' : ''}
                  onClick={() => setTypeFilter(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="soft-count">
              {filtered.length} of {transactions.length} transactions
            </span>
          </div>

          <div className="transaction-filter-grid">
            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              From date
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              To date
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <button
              className="clear-filters-button"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>

        {filtered.length ? (
          <TransactionRows
            transactions={filtered}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <div className="empty-state">
            <ReceiptText size={28} />
            <strong>No matching transactions</strong>
            <span>Try changing your search or filters.</span>
            <button
              className="secondary-button"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function Budgets({ 
  budgets,
  unbudgetedSpending,
  insights, 
  comparison,
  month, 
  onMonthChange, 
  onAdd 
}) {
  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallUsage = totalLimit > 0 ? totalSpent / totalLimit * 100 : 0;

  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">A LITTLE ROOM TO BREATHE</div>
          <h1>Budgets</h1>
          <p>Think of these as gentle guardrails, not hard rules.</p>
        </div>
        <div className="budget-page-actions">
          <label className="budget-month-picker">
            <span>View month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
            />
          </label>
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} /> Create budget
          </button>
        </div>
      </div>

      <div className="budget-summary-grid">
        <div className="panel budget-summary-card">
          <span>PLANNED BUDGET</span>
          <strong>{money(totalLimit)}</strong>
          <small>Across {budgets.length} budget{budgets.length === 1 ? '' : 's'}</small>
        </div>
        <div className="panel budget-summary-card">
          <span>RECORDED SPENDING</span>
          <strong>{money(totalSpent)}</strong>
          <small>{overallUsage.toFixed(0)}% of planned budget</small>
        </div>
        <div className="panel budget-summary-card">
          <span>REMAINING</span>
          <strong>{money(totalRemaining)}</strong>
          <small>{totalSpent > totalLimit ? `${money(totalSpent - totalLimit)} over plan` : 'Room left in your budgets'}</small>
        </div>
      </div>

        
      {/* Monthly Spending Comparison */}
      {comparison && (
        <section className="monthly-comparison-panel">
          <div className="budget-section-heading">
            <div>
              <span className="section-kicker">MONTH-OVER-MONTH</span>
              <h3>Monthly spending comparison</h3>
              <p>See how your spending compares with the previous month.</p>
            </div>
          </div>

          <div className="comparison-summary-grid">
            <div className="panel budget-summary-card">
              <span>CURRENT MONTH</span>
              <strong>{money(comparison.currentTotal)}</strong>
              <small>{comparison.month}</small>
            </div>

            <div className="panel budget-summary-card">
              <span>PREVIOUS MONTH</span>
              <strong>{money(comparison.previousTotal)}</strong>
              <small>{comparison.previousMonth}</small>
            </div>

            <div className="panel budget-summary-card">
              <span>SPENDING CHANGE</span>
              <strong>
                {comparison.change > 0 ? '+' : ''}
                {money(comparison.change)}
              </strong>
              <small>
                {comparison.previousTotal === 0
                  ? 'New spending this month'
                  : `${comparison.changePercentage > 0 ? '+' : ''}${comparison.changePercentage}% compared with last month`}
              </small>
            </div>
          </div>

          {comparison.categoryComparison?.length > 0 && (
            <div className="panel comparison-category-panel">
              <h3>Category-wise comparison</h3>

              {comparison.categoryComparison.map((item) => (
                <div className="comparison-category-row" key={item.category}>
                  <strong>{item.category}</strong>
                  <span>
                    <small>Previous</small>
                    {money(item.previous)}
                  </span>
                  <span>
                    <small>Current</small>
                    {money(item.current)}
                  </span>
                  <span className={
                    item.current > item.previous
                      ? 'comparison-increased'
                      : item.current < item.previous
                        ? 'comparison-decreased'
                        : 'comparison-unchanged'
                  }>
                    {item.current > item.previous
                      ? 'Increased'
                      : item.current < item.previous
                        ? 'Decreased'
                        : 'Unchanged'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {insights && insights.length > 0 && (


        
  <section className="budget-insights-panel">
    <div className="budget-insights-heading">
      <div>
        <span className="section-kicker">SMART MONEY CHECK</span>
        <h3>Your budget insights</h3>
      </div>
      <span className="insights-count">
        {insights.length} insight{insights.length === 1 ? '' : 's'}
      </span>
    </div>

    <div className="budget-insights-list">
      {insights.map((insight, index) => (
        <div
          className={`budget-insight-item ${insight.type || 'info'}`}
          key={`${insight.title}-${index}`}
        >
          <div className="insight-indicator" />
          <div>
            <strong>{insight.title}</strong>
            <p>{insight.message}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
)}

      <div className="budget-section-heading">
        <div>
          <span className="section-kicker">CATEGORY BREAKDOWN</span>
          <h3>Your monthly guardrails</h3>
        </div>
        <span className="soft-count">{month}</span>
      </div>

      <div className="budget-cards">
        {budgets.length ? budgets.map((b) => {
          const usage = b.limit > 0 ? b.spent / b.limit * 100 : 0;
          const status = usage > 100
            ? 'Over budget'
            : usage >= 80
              ? 'Near limit'
              : 'On track';
          const remaining = Math.max(0, b.limit - b.spent);
          const Icon = icons[b.category] || Wallet;

          return (
            <div className="panel budget-card" key={b.id}>
              <div className="budget-card-top">
                <div className="category-icon tone-1"><Icon size={18} /></div>
                <span className={`budget-status ${usage > 100 ? 'over' : usage >= 80 ? 'near' : ''}`}>
                  {status}
                </span>
              </div>
              <h3>{b.category}</h3>
              <div className="budget-amount">
                {money(b.spent)} <span>of {money(b.limit)}</span>
              </div>
              <div className="budget-track">
                <i
                  className={usage > 100 ? 'over' : usage >= 80 ? 'near' : ''}
                  style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
                />
              </div>
              <div className="budget-card-footer">
                <span>{Math.min(100, Math.round(usage))}% used</span>
                <strong>{usage > 100 ? `${money(b.spent - b.limit)} over` : `${money(remaining)} left`}</strong>
              </div>
            </div>
          );
        }) : (
          <div className="panel empty-state">
            <Wallet size={28} />
            <strong>No budgets for this month</strong>
            <span>Choose one category that matters to you and create a gentle spending plan.</span>
            <button className="primary-button" onClick={onAdd}>
              Create your first budget
            </button>
          </div>
        )}
      </div>
        
     <section className="panel unbudgeted-panel">
        <div className="unbudgeted-header">
          <div>
            <span className="section-kicker">OUTSIDE YOUR PLAN</span>
            <h3>Unbudgeted spending</h3>
            <p>Expenses in categories where you haven't created a budget.</p>
         </div>

         <div className="unbudgeted-total">
           <span>Total</span>
           <strong>
             {money(
               unbudgetedSpending.reduce(
                (sum, item) => sum + Number(item.spent || 0),
                0
               )
             )}
           </strong>
         </div>
      </div>

  {unbudgetedSpending.length > 0 ? (
    <div className="unbudgeted-list">
      {unbudgetedSpending.map((item) => (
        <div className="unbudgeted-row" key={item.category}>
          <div>
            <strong>{item.category}</strong>
            <span>
              {item.transactionCount} transaction
              {item.transactionCount === 1 ? '' : 's'}
            </span>
          </div>
          <strong>{money(item.spent)}</strong>
        </div>
      ))}
    </div>
  ) : (
    <p className="unbudgeted-empty">
      No expenses outside your configured budgets this month.
    </p>
  )}
</section>
    </>
  );
}

function Goals({ goals, onAdd }) {
  return (
    <>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">SOMETHING TO LOOK FORWARD TO</div>
          <h1>Savings goals</h1>
          <p>Small steps can take you somewhere meaningful.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add a goal
        </button>
      </div>

      <div className="goal-grid">
        {goals.length ? goals.map((g) => (
          <div className="panel goal-card" key={g.id}>
            <div className="goal-spark"><Target size={20} /></div>
            <h3>{g.name}</h3>
            <div className="goal-numbers">
              <strong>{money(g.saved)}</strong>
              <span>of {money(g.target)}</span>
            </div>
            <div className="goal-track">
              <i style={{ width: `${Math.min(100, g.saved / g.target * 100)}%` }} />
            </div>
            <p>{Math.round(g.saved / g.target * 100)}% of the way there</p>
          </div>
        )) : (
          <div className="panel empty-state">
            <Target size={28} />
            <strong>What are you saving for?</strong>
            <span>
              A rainy-day fund, a new laptop, a trip—or something just for you.
            </span>
            <button className="primary-button" onClick={onAdd}>
              Create a savings goal
            </button>
          </div>
        )}
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
    date: transaction ? dateForInput(transaction.date) : new Date().toISOString().slice(0, 10),
    paymentMethod: transaction?.paymentMethod || 'UPI',
    month: defaultBudgetMonth || new Date().toISOString().slice(0, 7),
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



function Intelligence({ 
  data, 
  loading, 
  error, 
  onRetry, 
  onChat,
  aiInsights = [],
  aiInsightsMode = 'basic'
 }) {
  const health = data?.financialHealth;
  const spendingRecommendations = data?.spendingRecommendations;
  const recommendations = spendingRecommendations?.recommendations || [];
  const categorySpending = spendingRecommendations?.categories || [];
  const budgetRecommendations = spendingRecommendations?.budgetRecommendations || [];
  const recurring = data?.recurringExpenses || [];
  const unusual = data?.unusualSpending || [];
  const insights = data?.insights || [];
  const displayedInsights = aiInsights.length
  ? aiInsights
  : insights;
  console.log('SpendWise insight rendering:', {
  aiInsightsCount: aiInsights.length,
  displayedCount: displayedInsights.length,
  mode: aiInsightsMode
});

  const formatDate = (value) => {
    if (!value) return 'Not available';
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && !data) {
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" size={28} />
        <strong>Analysing your financial activity...</strong>
        <span>Looking for spending patterns and useful insights.</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <section className="panel">
        <div className="empty-state">
          <strong>Unable to load financial intelligence</strong>
          <span>{error}</span>
          <button className="primary-button" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <div className="intelligence-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">YOUR FINANCIAL ASSISTANT</span>
          <h1>Financial Intelligence</h1>
          <p>Understand your money patterns and make informed decisions.</p>
        </div>
        <button className="primary-button" onClick={onRetry} disabled={loading}>
          <Sparkles size={15} />
          {loading ? 'Analysing...' : 'Refresh analysis'}
        </button>
      </div>

      <section className="intelligence-overview">
        <div className="health-score-card">
          <span className="section-kicker">FINANCIAL HEALTH SCORE</span>
          <div className="health-score-ring"
            style={{
              '--score': `${health?.score ?? 0}%`
            }}
          >
            <div>
              <strong>{health?.score ?? '—'}</strong>
              <span>/100</span>
            </div>
          </div>
          <h2>{health?.status || 'Building your profile'}</h2>
          <p>{health?.explanation || 'More financial records are needed.'}</p>
        </div>

        <div className="health-details panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">SCORE BREAKDOWN</span>
              <h3>What influences your score?</h3>
            </div>
            <Sparkles size={19} />
          </div>

          {health?.components?.length ? (
            health.components.map((item) => (
              <div className="health-factor" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.score}/100 · {item.weight}</span>
                </div>
                <div className="budget-track">
                  <i style={{ width: `${item.score}%` }} />
                </div>
                <p>{item.detail}</p>
              </div>
            ))
          ) : (
            <div className="empty-small">
              Add more income and expense transactions to unlock your score breakdown.
            </div>
          )}
        </div>
      </section>

      <section className="intelligence-metrics">
        <div className="panel intelligence-metric">
          <span className="section-kicker">RECORDS ANALYSED</span>
          <strong>{data.transactionCount ?? 0}</strong>
          <span>Transactions in the last {data.historyDays ?? 180} days</span>
        </div>
        <div className="panel intelligence-metric">
          <span className="section-kicker">RECURRING PATTERNS</span>
          <strong>{recurring.length}</strong>
          <span>Possible regular payments</span>
        </div>
        <div className="panel intelligence-metric">
          <span className="section-kicker">SPENDING ALERTS</span>
          <strong>{unusual.length}</strong>
          <span>Categories needing attention</span>
        </div>
      </section>

      
      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PERSONALIZED FINANCIAL GUIDANCE</span>
            <h3>Spending recommendations</h3>
            <p>
              Practical observations based on your recorded spending and budgets.
            </p>
          </div>
          <Sparkles size={19} />
        </div>

        {spendingRecommendations?.transactionCount > 0 ? (
          <>
            <div className="intelligence-metrics">
              <div className="intelligence-metric">
                <span className="section-kicker">MONTHLY EXPENSES</span>
                <strong>{money(spendingRecommendations.totalExpenses)}</strong>
                <span>
                  {spendingRecommendations.transactionCount} recorded transactions
                </span>
              </div>

              <div className="intelligence-metric">
                <span className="section-kicker">CATEGORIES TRACKED</span>
                <strong>{categorySpending.length}</strong>
                <span>Spending categories this month</span>
              </div>
            </div>

            <h4>Where your money goes</h4>

            {categorySpending.map((item) => (
              <div className="health-factor" key={item.category}>
                <div>
                  <strong>{item.category}</strong>
                  <span>
                    {money(item.amount)} · {item.sharePercentage}% of expenses
                  </span>
                </div>

                <div className="budget-track">
                  <i
                    style={{
                      width: `${item.sharePercentage}%`
                    }}
                  />
                </div>
              </div>
            ))}

            <h4>Budget recommendations</h4>

            {budgetRecommendations.length ? (
              <div className="intelligence-list">
                {budgetRecommendations.map((item) => (
                  <div className="intelligence-list-item" key={item.category}>
                    <div className="intelligence-item-icon">
                      <Sparkles size={18} />
                    </div>

                    <div className="intelligence-item-copy">
                      <strong>{item.category}</strong>

                      <span>
                        Spent {money(item.spent)} of {money(item.budgetLimit)}
                      </span>

                      <div className="budget-track">
                        <i
                          style={{
                            width: `${Math.min(item.usagePercentage, 100)}%`
                          }}
                        />
                      </div>

                      <small>
                        {item.status === 'over_budget'
                          ? `Exceeded by ${money(Math.abs(item.remaining))}`
                          : `${money(item.remaining)} remaining`}
                      </small>
                    </div>

                    <badge
                      color={
                        item.status === 'over_budget'
                          ? 'danger'
                          : item.status === 'approaching_limit'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {item.status === 'over_budget'
                        ? 'Over budget'
                        : item.status === 'approaching_limit'
                          ? 'Near limit'
                          : 'On track'}
                    </badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-small">
                No monthly budgets configured yet.
              </div>
            )}

            <h4>Personalized observations</h4>

            {recommendations.length ? (
              <div className="intelligence-insights">
                {recommendations.map((item, index) => (
                  <div
                    className="insight-strip"
                    key={`${item.type}-${item.category}-${index}`}
                  >
                    <div className="insight-icon">
                      <Sparkles size={17} />
                    </div>

                    <div className="insight-copy">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-small">
                More recorded transactions will help generate useful recommendations.
              </div>
            )}
          </>
        ) : (
          <div className="empty-small">
            Record some expenses this month to unlock personalized spending recommendations.
          </div>
        )}
      </section>

      
      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PAYMENT PATTERNS</span>
            <h3>Recurring expenses</h3>
          </div>
          <CalendarDays size={19} />
        </div>

        {recurring.length ? (
          <div className="intelligence-list">
            {recurring.map((item, index) => (
              <div className="intelligence-list-item" key={`${item.merchant}-${index}`}>
                <div className="intelligence-item-icon">
                  <CalendarDays size={18} />
                </div>
                <div className="intelligence-item-copy">
                  <strong>{item.merchant}</strong>
                  <span>{item.category} · {item.frequency} · {item.confidence} confidence</span>
                  <small>Last payment: {formatDate(item.lastPayment)}</small>
                  <small>Estimated next payment: {formatDate(item.estimatedNextPayment)}</small>
                  <small>{item.note}</small>
                </div>
                <strong className="intelligence-amount">{money(item.averageAmount)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            No consistent weekly or monthly merchant payment patterns detected yet.
            More transaction history may help identify them.
          </div>
        )}
      </section>

      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">SPENDING MONITOR</span>
            <h3>Unusual spending alerts</h3>
          </div>
          <ArrowUpRight size={19} />
        </div>

        {unusual.length ? (
          <div className="intelligence-list">
            {unusual.map((item) => (
              <div className="intelligence-list-item" key={item.category}>
                <div className="intelligence-item-icon alert-icon">
                  <ArrowUpRight size={18} />
                </div>
                <div className="intelligence-item-copy">
                  <strong>{item.category}</strong>
                  <span>{item.message}</span>
                  <small>
                    Historical monthly average: {money(item.historicalMonthlyAverage)}
                  </small>
                </div>
                <div className="intelligence-alert-value">
                  <strong>+{item.increasePercentage}%</strong>
                  <span>{money(item.recentSpending)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            No unusual spending alerts were detected against the available historical baseline.
          </div>
        )}
        <p className="intelligence-footnote">
          Alerts compare the latest 30 days with the preceding 90-day monthly average.
        </p>
      </section>

      <section className="panel intelligence-section">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              {aiInsights.length > 0 && aiInsightsMode === 'local'
                ? 'LOCAL AI-POWERED OBSERVATIONS'
                : aiInsights.length > 0 && aiInsightsMode === 'ai'
                  ? 'AI-POWERED OBSERVATIONS'
                  : 'PERSONALISED OBSERVATIONS'}
            </span>
            <h3>Your spending insights</h3>
            <small>
              {aiInsights.length
                ? aiInsightsMode === 'local'
                  ? 'Local AI-powered observations · Ollama'
                  : aiInsightsMode === 'ai'
                    ? 'AI-powered observations'
                    : 'Rule-based observations'
                : 'Based on your recorded financial activity'}
            </small>
          </div>
          <Sparkles size={19} />
        </div>

        {displayedInsights.length ? (
          <div className="intelligence-insights">
            {displayedInsights.map((item, index) => (
              <div className="insight-strip" key={`${item.title}-${index}`}>
                <div className="insight-icon">
                  <Sparkles size={17} />
                </div>
                <div className="insight-copy">
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-small">
            Add more transactions to generate useful spending observations.
          </div>
        )}

        <button className="primary-button intelligence-chat-button" onClick={onChat}>
          <Sparkles size={15} />
          Ask SpendWise about my finances
        </button>
      </section>

      <p className="intelligence-disclaimer">
        Analysis is based only on transactions recorded in SpendWise.
        Recurring payments are estimates, not confirmed scheduled debits.
        The financial health score is an indicative budgeting measure,
        not a credit score or a complete financial assessment.
      </p>
    </div>
  );
}
