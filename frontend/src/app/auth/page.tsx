'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, LogOut, Smartphone, KeyRound, Lock } from 'lucide-react';
import { auth } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { PageHeader }  from '@/components/ui/PageHeader';
import { Button }      from '@/components/ui/Button';
import { Input }       from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';

type Step = 'phone' | 'code';

interface PhoneForm { phone: string }
interface CodeForm  { code: string; password?: string }

export default function AuthPage() {
  const qc = useQueryClient();
  const [step, setStep]   = useState<Step>('phone');
  const [phone, setPhone] = useState('');

  const { data: status, isLoading } = useQuery({ queryKey: ['auth-status'], queryFn: auth.status });

  const phoneForm = useForm<PhoneForm>();
  const codeForm  = useForm<CodeForm>();

  const startMut = useMutation({
    mutationFn: (d: PhoneForm) => auth.start(d.phone),
    onSuccess:  (_, d) => { setPhone(d.phone); setStep('code'); },
  });

  const verifyMut = useMutation({
    mutationFn: (d: CodeForm) => auth.verify(phone, d.code, d.password || undefined),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['auth-status'] }); codeForm.reset(); setStep('phone'); },
  });

  const logoutMut = useMutation({
    mutationFn: auth.logout,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['auth-status'] }),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6 sm:space-y-8 animate-slide-in max-w-2xl">
      <PageHeader title="Authentication" description="Manage Telegram user account login" />

      {/* Status card */}
      <Card className={status?.is_authorized ? 'border-success/30 shadow-success' : 'border-danger/30'}>
        <CardBody className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <div className={`p-3 sm:p-4 rounded-xl border ${status?.is_authorized ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
              {status?.is_authorized ? <ShieldCheck size={24} className="text-success sm:w-[30px] sm:h-[30px]" /> : <ShieldOff size={24} className="text-danger sm:w-[30px] sm:h-[30px]" />}
            </div>
            <div className="flex-1">
              <div className={`text-base sm:text-lg font-semibold ${status?.is_authorized ? 'text-success' : 'text-danger'}`}>
                {status?.is_authorized ? 'Logged In' : 'Not Logged In'}
              </div>
              {status?.is_authorized ? (
                <div className="text-sm text-text-secondary mt-1.5 space-y-1">
                  {status.me_username && <div>Username: <span className="text-accent mono">@{status.me_username}</span></div>}
                  {status.me_phone    && <div>Phone: <span className="text-text-primary mono">{status.me_phone}</span></div>}
                </div>
              ) : (
                <div className="text-sm text-text-secondary mt-1.5">Use the form below to authenticate</div>
              )}
            </div>
            {status?.is_authorized && (
              <Button variant="danger" size="md" loading={logoutMut.isPending}
                onClick={() => { if (confirm('Log out of Telegram?')) logoutMut.mutate(); }}>
                <LogOut size={16} /> Logout
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Login form */}
      {!status?.is_authorized && (
        <Card glow>
          <CardHeader className="px-5 sm:px-8 py-4 sm:py-6">
            <CardTitle className="text-base">{step === 'phone' ? 'Step 1 — Enter Phone' : 'Step 2 — Enter OTP'}</CardTitle>
            {step === 'code' && (
              <button className="text-sm text-text-secondary hover:text-text-primary" onClick={() => setStep('phone')}>← Back</button>
            )}
          </CardHeader>
          <CardBody className="p-5 sm:p-8 space-y-5">
            {step === 'phone' ? (
              <form onSubmit={phoneForm.handleSubmit(d => startMut.mutate(d))} className="space-y-5">
                <Input
                  label="Phone Number (with country code)"
                  placeholder="+31612345678"
                  mono
                  {...phoneForm.register('phone', { required: 'Required' })}
                  error={phoneForm.formState.errors.phone?.message}
                />
                <div className="bg-surface2 border border-border rounded-lg p-4 text-sm text-text-secondary space-y-1.5">
                  <div className="flex items-center gap-2.5 text-warn">
                    <Smartphone size={16} /> <span className="font-medium">Telegram will send you an OTP code</span>
                  </div>
                  <div>This is the phone linked to your Telegram account, not your bot.</div>
                </div>
                {startMut.error && <p className="text-sm text-danger">{(startMut.error as Error).message}</p>}
                <Button type="submit" variant="primary" size="lg" loading={startMut.isPending} className="w-full">
                  <Smartphone size={18} /> Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={codeForm.handleSubmit(d => verifyMut.mutate(d))} className="space-y-5">
                <div className="text-sm text-text-secondary">OTP sent to <span className="text-accent mono">{phone}</span></div>
                <Input
                  label="OTP Code"
                  placeholder="12345"
                  mono
                  maxLength={10}
                  {...codeForm.register('code', { required: 'Required' })}
                  error={codeForm.formState.errors.code?.message}
                />
                <div className="space-y-1.5">
                  <Input
                    label="2FA Password (if enabled)"
                    type="password"
                    placeholder="Leave blank if not using 2FA"
                    {...codeForm.register('password')}
                  />
                  <p className="text-xs text-text-muted flex items-center gap-2">
                    <Lock size={12} /> Only required if you have Two-Step Verification enabled in Telegram Settings
                  </p>
                </div>
                {verifyMut.error && <p className="text-sm text-danger">{(verifyMut.error as Error).message}</p>}
                {verifyMut.isSuccess && <p className="text-sm text-success">Logged in successfully!</p>}
                <Button type="submit" variant="primary" size="lg" loading={verifyMut.isPending} className="w-full">
                  <KeyRound size={18} /> Verify & Login
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
