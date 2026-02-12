import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../features/auth/AuthContext';

export const AuthPage = () => {
  const isLogin = useLocation().pathname === '/login';
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await signup(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 to-emerald-900 p-4">
      <motion.form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white/95 p-8 shadow-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900">{isLogin ? 'Welcome back' : 'Create account'}</h1>
        {!isLogin && <input className="w-full rounded-lg border p-3" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}
        <input className="w-full rounded-lg border p-3" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full rounded-lg border p-3" type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        {error && <p className="rounded-lg bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-emerald-600 p-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{loading ? 'Processing...' : isLogin ? 'Login' : 'Signup'}</button>
        <p className="text-sm text-slate-600">
          {isLogin ? 'Need an account?' : 'Already registered?'}{' '}
          <Link className="font-semibold text-emerald-700" to={isLogin ? '/signup' : '/login'}>{isLogin ? 'Sign up' : 'Login'}</Link>
        </p>
      </motion.form>
    </div>
  );
};
