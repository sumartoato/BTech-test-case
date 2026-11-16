import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

interface Transfer {
  id: string;
  direction: 'in' | 'out';
  counterparty: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

interface Wallet {
  balance: number;
  transfers: Transfer[];
}

const formatMoney = (n: number) => n.toLocaleString('id-ID');

// crypto.randomUUID is only available on https/localhost
const newKey = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Home() {
  const { token, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadWallet = useCallback(async () => {
    try {
      setWallet(await api<Wallet>('/wallet', { token }));
      setLoadError('');
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [token]);

  useEffect(() => {
    api<{ message: string }>('/me', { token })
      .then((res) => setMessage(res.message))
      .catch((err) => setLoadError(err.message));
    loadWallet();
  }, [token, loadWallet]);

  return (
    <>
      <header className="header">
        <h2>{message || 'Loading...'}</h2>
        <button className="link" onClick={logout}>
          Logout
        </button>
      </header>

      {loadError && (
        <p className="error">
          {loadError}{' '}
          <button className="link" onClick={loadWallet}>
            Retry
          </button>
        </p>
      )}

      <section className="card">
        <p className="muted">Balance</p>
        <p className="balance">{wallet ? formatMoney(wallet.balance) : '-'}</p>
      </section>

      <TransferForm onDone={loadWallet} />

      <section className="card">
        <h3>History</h3>
        {wallet?.transfers.length === 0 && <p className="muted">No transfers yet.</p>}
        <ul className="history">
          {wallet?.transfers.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.direction === 'out' ? `To ${t.counterparty}` : `From ${t.counterparty}`}</strong>
                {t.notes && <span className="muted"> - {t.notes}</span>}
                <div className="muted small">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <span className={t.direction === 'out' ? 'amount out' : 'amount in'}>
                {t.direction === 'out' ? '-' : '+'}
                {formatMoney(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function TransferForm({ onDone }: { onDone: () => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ recipient: '', amount: '', notes: '' });
  // one key per transfer attempt, so retries over a bad connection don't send money twice
  const [idempotencyKey, setIdempotencyKey] = useState(() => newKey());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    setIdempotencyKey(newKey());
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Amount must be a positive whole number');
      return;
    }

    setSending(true);
    try {
      await api('/wallet/transfer', {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { recipient: form.recipient, amount, notes: form.notes || undefined },
        retries: 3,
      });
      setSuccess(`Sent ${formatMoney(amount)} to ${form.recipient}`);
      setForm({ recipient: '', amount: '', notes: '' });
      setIdempotencyKey(newKey());
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3>Transfer</h3>
      <label>
        Recipient email
        <input type="email" value={form.recipient} onChange={update('recipient')} required />
      </label>
      <label>
        Amount
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={form.amount}
          onChange={update('amount')}
          required
        />
      </label>
      <label>
        Notes
        <input value={form.notes} onChange={update('notes')} maxLength={255} />
      </label>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <button disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
    </form>
  );
}
