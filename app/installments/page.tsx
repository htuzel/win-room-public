// Win Room v2.0 - Sales Installment Tracker
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { InstallmentPlan, InstallmentPayment } from '@/lib/types';

export default function MyInstallmentsPage() {
  const router = useRouter();
  const { token, user, isAuthenticated, logout } = useAuth();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    fetchPlans();
  }, [token]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/installments/mine', {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
      if (!res.ok) {
        setPlans([]);
        return;
      }
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('My installments error', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (payment: InstallmentPayment) => {
    if (!token) return;
    const defaultAmount = payment.amount && typeof payment.amount === 'number' ? payment.amount.toString() : '';
    const paidAmountStr = window.prompt('Amount paid', defaultAmount);
    if (paidAmountStr === null) return; // User cancelled

    // Validate amount
    const paidAmount = paidAmountStr ? parseFloat(paidAmountStr) : undefined;
    if (paidAmount !== undefined && (!Number.isFinite(paidAmount) || paidAmount <= 0)) {
      alert('Please enter a valid amount (positive number)');
      return;
    }

    const paymentChannel = window.prompt('Payment channel (wire transfer, etc.)', payment.payment_channel || '');
    const note = window.prompt('Notes (optional)', payment.notes || '');

    try {
      const res = await fetch(`/api/installments/payments/${payment.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paid_amount: paidAmount, payment_channel: paymentChannel, notes: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Submission failed');
        return;
      }
      alert('Submitted for finance approval');
      fetchPlans();
    } catch (error) {
      console.error('Submit installment payment error', error);
      alert('Submission failed');
    }
  };

  return (
    <div className="min-h-screen bg-background/60 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/flalingoLogo.webp"
              alt="Flalingo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Installment Tracker</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/60">{user?.seller_id}</span>
                <span className="text-foreground/40">•</span>
                <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/recent-sales')}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-400/40 font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              All Sales (120h)
            </button>
            <button
              onClick={() => router.push('/my-sales')}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              My Sales
            </button>
            {['admin', 'finance', 'sales_lead'].includes(user?.role || '') && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Installment Tracking</h2>
            <p className="text-sm text-foreground/60">Student installments and finance approval statuses</p>
          </div>

          {loading && <p className="text-sm text-foreground/60">Loading...</p>}
          {!loading && plans.length === 0 && <p className="text-sm text-foreground/60">You do not have any active installment plans.</p>}

          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border/40 bg-surface/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-foreground/60">Subscription #{plan.subscription_id}</p>
                    <p className="text-lg font-semibold text-foreground">{plan.customer_name || 'Customer'}</p>
                    <p className="text-xs text-foreground/60">{plan.paid_count ?? 0}/{plan.total_payments ?? plan.total_installments} paid</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold capitalize bg-foreground/10 text-foreground/80">{plan.status}</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {plan.payments?.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-border/30 bg-background/40 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-foreground/60">#{payment.payment_number} · {payment.due_date}</p>
                          <p className="text-sm font-semibold text-foreground">
                            {payment.amount && typeof payment.amount === 'number' ? `$${payment.amount.toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusTone(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      {(payment.status === 'pending' || payment.status === 'overdue' || payment.status === 'rejected') && (
                        <button
                          className="mt-3 w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black"
                          onClick={() => submitPayment(payment)}
                        >
                          Submit as paid
                        </button>
                      )}
                      {payment.notes && <p className="mt-2 text-xs text-foreground/60">Finance note: {payment.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusTone(status: InstallmentPayment['status']) {
  switch (status) {
    case 'submitted':
      return 'bg-amber-500/10 text-amber-400';
    case 'confirmed':
      return 'bg-emerald-500/10 text-emerald-300';
    case 'overdue':
      return 'bg-rose-500/10 text-rose-300';
    case 'pending':
      return 'bg-border text-foreground/70';
    case 'rejected':
      return 'bg-rose-900/40 text-rose-200';
    default:
      return 'bg-border text-foreground/70';
  }
}
