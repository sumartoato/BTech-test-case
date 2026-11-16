import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api('/auth/register', { method: 'POST', body: form });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Register</h1>

      <label>
        Email
        <input type="email" value={form.email} onChange={update('email')} required />
      </label>
      <label>
        Password
        <input type="password" value={form.password} onChange={update('password')} required />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          required
        />
      </label>

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
}
