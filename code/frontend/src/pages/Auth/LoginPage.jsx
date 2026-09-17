import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, User, ArrowRight, Shield, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18nStore } from '../../store/useI18nStore';
import { loginSchema } from '../../schemas/auth.schema';
import { USER_ROLES } from '../../constants/roles.constant';
import { Input } from '../../components/base/Input';
import { Button } from '../../components/base/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useI18nStore();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const validation = loginSchema.safeParse({ loginIdentifier, password });
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const result = await login({ loginIdentifier, password });
      if (result.role === USER_ROLES.SUPER_ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (result.role === USER_ROLES.AGENCY_ADMIN) {
        navigate('/agency/dashboard', { replace: true });
      } else {
        setServerError(
          'Tài khoản này không có quyền truy cập Cổng Quản Trị (Yêu cầu vai trò Super Admin hoặc Agency Admin).',
        );
      }
    } catch (err) {
      setServerError(
        err.message || t('error_general'),
      );
    }
  };

  const handleQuickFill = (identifier, pass) => {
    setLoginIdentifier(identifier);
    setPassword(pass);
    setErrors({});
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/70 via-white to-pink-50/40 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-2xl">
            {t('app_title')}
          </span>
        </Link>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {t('login_title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {t('login_sub')}
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-rose-100 sm:px-10">
          {serverError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium leading-relaxed">
              {serverError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t('login_identifier_label')}
              type="text"
              placeholder={t('login_identifier_placeholder')}
              required
              icon={User}
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              error={errors.loginIdentifier}
            />

            <Input
              label={t('login_password_label')}
              type="password"
              placeholder={t('login_password_placeholder')}
              required
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full flex items-center justify-center shadow-md shadow-rose-500/25 font-bold"
                icon={ArrowRight}
                iconPosition="right"
                isLoading={isLoading}
              >
                {t('btn_login')}
              </Button>
            </div>
          </form>

          {/* Direct Link to Register */}
          <div className="mt-5 text-center text-xs pt-4 border-t border-slate-100">
            <span className="text-slate-500">{t('dont_have_account')} </span>
            <Link
              to="/register"
              className="font-bold text-rose-600 hover:text-rose-700 hover:underline"
            >
              {t('register_here')}
            </Link>
          </div>

          {/* Quick-fill testing buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickFill('0900000001', 'Admin@123')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-rose-50/50 hover:border-rose-200 text-left transition-all text-xs group"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800 group-hover:text-rose-600">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>Super Admin</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">0900000001</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('0933112233', 'Agency@123')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-all text-xs group"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800 group-hover:text-indigo-600">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Agency Admin</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">0933112233</p>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
          >
            <span>← {t('back_to_home')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
