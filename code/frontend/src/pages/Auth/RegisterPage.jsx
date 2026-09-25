import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { authService } from '../../services/auth.service';
import { agencyRegisterSchema } from '../../schemas/auth.schema';
import { Input } from '../../components/base/Input';
import { Button } from '../../components/base/Button';
import { useI18nStore } from '../../store/useI18nStore';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useI18nStore();
  const [accountType, setAccountType] = useState('AGENCY_ADMIN');

  // Common fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Agency fields
  const [agencyName, setAgencyName] = useState('');
  const [hotline, setHotline] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [commissionRateInternal, setCommissionRateInternal] = useState(30);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setSuccessMessage('');

    const payload = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      password,
      confirmPassword,
      accountType,
      ...(accountType === 'AGENCY_ADMIN' && {
        agencyName: agencyName.trim(),
        hotline: hotline.trim(),
        addressStreet: addressStreet.trim(),
        district: district.trim(),
        city: city.trim(),
        commissionRateInternal: Number(commissionRateInternal),
      }),
    };

    const validation = agencyRegisterSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const registerPayload = {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        password: payload.password,
        accountType: payload.accountType,
        ...(payload.accountType === 'AGENCY_ADMIN' && {
          agencyDetails: {
            agencyName: payload.agencyName,
            hotline: payload.hotline,
            addressStreet: payload.addressStreet,
            district: payload.district,
            city: payload.city,
            commissionRateInternal: payload.commissionRateInternal,
          },
        }),
      };

      await authService.register(registerPayload);
      setSuccessMessage(t('register_success_msg'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setServerError(err.message || t('register_failed_msg'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 sm:py-10 px-3.5 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-2 group mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-xl">
            {t('app_title')}
          </span>
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('register_title_main')}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('register_page_sub')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-slate-900 py-6 sm:py-8 px-4 sm:px-8 shadow-sm rounded-3xl border border-slate-200 dark:border-slate-800 transition-colors">
          {/* Account Type Selector Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setAccountType('AGENCY_ADMIN')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                accountType === 'AGENCY_ADMIN'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('tab_agency_owner')}</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('CUSTOMER')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                accountType === 'CUSTOMER'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t('tab_customer_artist')}</span>
            </button>
          </div>

          {serverError && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
              {serverError}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('field_fullname')}
                placeholder={t('placeholder_fullname')}
                required
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
              />

              <Input
                label={t('field_phone')}
                placeholder="0912345678"
                required
                icon={Phone}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={errors.phoneNumber}
              />
            </div>

            <Input
              label={t('field_email')}
              type="email"
              placeholder="name@example.com"
              required
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('field_password')}
                type="password"
                placeholder="••••••••"
                required
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                helperText={t('password_rule_hint')}
              />

              <Input
                label={t('field_confirm_password')}
                type="password"
                placeholder="••••••••"
                required
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />
            </div>

            {/* Specific Agency Details */}
            {accountType === 'AGENCY_ADMIN' && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  <span>{t('agency_info_heading')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('field_agency_name')}
                    placeholder="Glamour Beauty Studio"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    error={errors.agencyName}
                  />

                  <Input
                    label={t('field_agency_hotline')}
                    placeholder="0933112233"
                    required
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    error={errors.hotline}
                  />
                </div>

                <Input
                  label={t('field_agency_street')}
                  placeholder={t('placeholder_street')}
                  required
                  icon={MapPin}
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  error={errors.addressStreet}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('field_agency_district')}
                    placeholder={t('placeholder_district')}
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    error={errors.district}
                  />

                  <Input
                    label={t('field_agency_city')}
                    placeholder={t('placeholder_city')}
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    error={errors.city}
                  />
                </div>

                <Input
                  label={t('field_agency_commission')}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  icon={Percent}
                  value={commissionRateInternal}
                  onChange={(e) => setCommissionRateInternal(e.target.value)}
                  error={errors.commissionRateInternal}
                  helperText={t('agency_commission_helper_register')}
                />
              </div>
            )}

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                icon={ArrowRight}
                iconPosition="right"
                isLoading={isLoading}
              >
                {t('btn_register_submit')}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t('already_have_admin_account')} </span>
            <Link
              to="/login"
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline"
            >
              {t('login_here')}
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            ← {t('back_to_landing')}
          </Link>
        </div>
      </div>
    </div>
  );
};
