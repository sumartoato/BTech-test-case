import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const registered = (location.state as { registered?: boolean } | null)?.registered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Login</h1>
      {registered && <p className="success">Account created, please log in.</p>}

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      <p className="muted">
        No account yet? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
