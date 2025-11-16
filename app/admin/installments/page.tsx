// Win Room v2.0 - Admin Installments Console
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { InstallmentPlan, InstallmentPayment } from '@/lib/types';

const FILTERS = [
  { label: 'Review Needed', value: 'review_needed' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Active', value: 'active' },
  { label: 'Tolerance', value: 'tolerance' },
  { label: 'Frozen', value: 'frozen' },
  { label: 'Completed', value: 'completed' },
];

type ActionType = 'confirm' | 'reject' | 'tolerance' | 'note';

interface InstallmentSummary {
  total_active: number;
  total_frozen: number;
  total_completed: number;
  review_needed: number;
  overdue: number;
  tolerance_active: number;
}

type PaymentActionBody = {
  action: ActionType;
  paid_amount?: number;
  payment_channel?: string;
  reason?: string;
  tolerance_until?: string;
  tolerance_reason?: string;
  note?: string;
};

export default function InstallmentsPage() {
  return (
    <Suspense fallback={<InstallmentsPageFallback />}>
      <InstallmentsPageContent />
    </Suspense>
  );
}

function InstallmentsPageFallback() {
  return (
    <div className="p-6 text-sm text-foreground/60">Installments yükleniyor...</div>
  );
}

function InstallmentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [summary, setSummary] = useState<InstallmentSummary | null>(null);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0].value);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ payment: InstallmentPayment; type: ActionType } | null>(null);
  const [actionPayload, setActionPayload] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && !['admin', 'finance', 'sales_lead'].includes(user.role)) {
      router.push('/');
    }
  }, [isMounted, isAuthenticated, user, router]);

  // preselect plan via ?plan=
  const authHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!token) return undefined;
    return {
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/installments/dashboard', {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { summary: InstallmentSummary };
      setSummary(data.summary);
    } catch (error) {
      console.error('Summary fetch error', error);
    }
  }, [authHeaders]);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const params = new URLSearchParams();
      if (selectedFilter) params.set('status', selectedFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/installments?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Planlar yüklenemedi');
        setPlans([]);
        return;
      }
      const data = (await res.json()) as { plans?: InstallmentPlan[] };
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Plan fetch error', error);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedFilter, search, authHeaders]);

  const openPlanDrawer = useCallback(
    async (planId: number) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/admin/installments/${planId}`, {
          headers: authHeaders,
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Plan alınamadı');
          return;
        }
        setSelectedPlan(data.plan);
        setDrawerOpen(true);
      } catch (error) {
        console.error('Plan fetch error', error);
      }
    },
    [authHeaders, token]
  );

  const refreshSelectedPlan = useCallback(async () => {
    if (!selectedPlan) return;
    await openPlanDrawer(selectedPlan.id);
    await fetchPlans();
    await fetchSummary();
  }, [selectedPlan, openPlanDrawer, fetchPlans, fetchSummary]);

  const handlePaymentAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const body: PaymentActionBody = { action: actionModal.type };
      if (actionModal.type === 'confirm') {
        body.paid_amount = actionPayload.paid_amount ? Number(actionPayload.paid_amount) : undefined;
        body.payment_channel = actionPayload.payment_channel || undefined;
      }
      if (actionModal.type === 'reject') {
        body.reason = actionPayload.reason || '';
      }
      if (actionModal.type === 'tolerance') {
        body.tolerance_until = actionPayload.tolerance_until;
        body.tolerance_reason = actionPayload.tolerance_reason || '';
      }
      if (actionModal.type === 'note') {
        body.note = actionPayload.note || '';
      }

      const res = await fetch(`/api/admin/installments/payments/${actionModal.payment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'İşlem başarısız');
        return;
      }
      setActionModal(null);
      setActionPayload({});
      await refreshSelectedPlan();
    } catch (error) {
      console.error('Payment action error', error);
      alert('İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusAction = async (action: 'freeze' | 'unfreeze' | 'cancel', reason?: string) => {
    if (!selectedPlan) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/admin/installments/${selectedPlan.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Status güncellenemedi');
        return;
      }
      setSelectedPlan(data.plan);
      await fetchPlans();
      await fetchSummary();
    } catch (error) {
      console.error('Status action error', error);
      alert('Status güncellenemedi');
    } finally {
      setStatusLoading(false);
    }
  };

  const filterPlans = (value: string) => setSelectedFilter(value);

  useEffect(() => {
    if (!token) return;
    fetchSummary();
  }, [token, fetchSummary]);

  useEffect(() => {
    if (!token) return;
    fetchPlans();
  }, [token, fetchPlans]);

  // Auto-switch to first non-empty filter if current filter returns empty
  useEffect(() => {
    if (!summary || plans.length > 0 || loadingPlans) return;

    // Try switching to the first filter with data
    if (selectedFilter === 'review_needed' && summary.review_needed === 0) {
      if (summary.overdue > 0) {
        setSelectedFilter('overdue');
      } else if (summary.total_active > 0) {
        setSelectedFilter('active');
      } else if (summary.tolerance_active > 0) {
        setSelectedFilter('tolerance');
      } else if (summary.total_frozen > 0) {
        setSelectedFilter('frozen');
      } else if (summary.total_completed > 0) {
        setSelectedFilter('completed');
      }
    }
  }, [summary, plans.length, loadingPlans, selectedFilter]);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && token) {
      openPlanDrawer(Number(planParam));
    }
  }, [searchParams, token, openPlanDrawer]);

  const renderSummaryCards = () => (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <SummaryCard title="Aktif" value={summary?.total_active || 0} accent="text-foreground" />
      <SummaryCard title="Bekleyen Onay" value={summary?.review_needed || 0} accent="text-amber-400" />
      <SummaryCard title="Geciken" value={summary?.overdue || 0} accent="text-rose-400" />
      <SummaryCard title="Tolerans" value={summary?.tolerance_active || 0} accent="text-sky-300" />
      <SummaryCard title="Dondurulmuş" value={summary?.total_frozen || 0} accent="text-indigo-300" />
      <SummaryCard title="Tamamlanan" value={summary?.total_completed || 0} accent="text-emerald-300" />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Installments</h1>
          <p className="text-sm text-foreground/60">Finance ve admin ekipleri için taksit vadesi takibi</p>
        </div>
        <button
          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground/80 hover:bg-surface"
          onClick={() => fetchPlans()}
          disabled={loadingPlans}
        >
          Yenile
        </button>
      </div>

      {summary && renderSummaryCards()}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => filterPlans(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                selectedFilter === filter.value
                  ? 'bg-accent text-black'
                  : 'bg-surface text-foreground/60 hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Ara (müşteri / subscription)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border bg-background/70 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/40 bg-surface/40">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/80 text-foreground/60">
            <tr>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Müşteri</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Ödendi</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Gecikme</th>
              <th className="px-4 py-3 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && !loadingPlans && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-foreground/60">
                  Kayıt bulunamadı
                </td>
              </tr>
            )}
            {loadingPlans && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-foreground/60">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} className="border-t border-border/30">
                <td className="px-4 py-3 font-mono text-xs text-foreground/80">#{plan.subscription_id}</td>
                <td className="px-4 py-3 text-sm text-foreground">{plan.customer_name || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={plan.status} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">{plan.paid_count ?? 0}</span>
                  <span className="text-foreground/50"> / {plan.total_payments ?? plan.total_installments}</span>
                </td>
                <td className="px-4 py-3 text-sm text-amber-400">{plan.submitted_count || 0}</td>
                <td className="px-4 py-3 text-sm text-rose-400">{plan.overdue_count || 0}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80 hover:bg-foreground/10"
                    onClick={() => openPlanDrawer(plan.id)}
                  >
                    Görüntüle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && selectedPlan && (
        <PlanDrawer
          plan={selectedPlan}
          onClose={() => setDrawerOpen(false)}
          onStatusAction={handleStatusAction}
          openActionModal={(payment, type) => {
            setActionPayload({
              paid_amount: payment.amount?.toString() || '',
              payment_channel: payment.payment_channel || '',
              tolerance_until: payment.due_date,
            });
            setActionModal({ payment, type });
          }}
          statusLoading={statusLoading}
        />
      )}

      {actionModal && (
        <ActionModal
          payment={actionModal.payment}
          type={actionModal.type}
          payload={actionPayload}
          onChange={setActionPayload}
          onClose={() => {
            setActionModal(null);
            setActionPayload({});
          }}
          onSubmit={handlePaymentAction}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function SummaryCard({ title, value, accent }: { title: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
      <p className="text-xs uppercase tracking-widest text-foreground/60">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: InstallmentPlan['status'] }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-foreground/10 text-foreground',
    frozen: 'bg-indigo-500/10 text-indigo-300',
    cancelled: 'bg-rose-500/10 text-rose-400',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[status] || 'bg-border text-foreground/70'}`}>
      {status}
    </span>
  );
}

interface PlanDrawerProps {
  plan: InstallmentPlan;
  onClose: () => void;
  onStatusAction: (action: 'freeze' | 'unfreeze' | 'cancel', reason?: string) => void;
  openActionModal: (payment: InstallmentPayment, type: ActionType) => void;
  statusLoading: boolean;
}

function PlanDrawer({ plan, onClose, onStatusAction, openActionModal, statusLoading }: PlanDrawerProps) {
  const nextActionLabel = plan.status === 'frozen' ? 'Unfreeze' : 'Freeze';
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 backdrop-blur">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-border/40 bg-background p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/50">Subscription #{plan.subscription_id}</p>
            <h2 className="text-2xl font-semibold text-foreground">{plan.customer_name || 'Müşteri'}</h2>
            <p className="text-sm text-foreground/60">{plan.total_installments} taksit • {plan.currency}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-1 text-sm text-foreground/60">Kapat</button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground/80 hover:bg-foreground/10"
            onClick={() => onStatusAction(plan.status === 'frozen' ? 'unfreeze' : 'freeze')}
            disabled={statusLoading}
          >
            {statusLoading ? '...' : nextActionLabel}
          </button>
          <button
            className="rounded-lg border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
            onClick={() => {
              const reason = window.prompt('İptal sebebi?');
              if (reason) onStatusAction('cancel', reason);
            }}
          >
            Cancel Plan
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {plan.payments?.map((payment) => (
            <div
              key={payment.id}
              className={`rounded-2xl border p-4 transition-colors ${getPaymentRowClass(payment)}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-foreground/60">Taksit #{payment.payment_number}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {payment.amount ? `$${Number(payment.amount).toFixed(2)}` : '—'}
                  </p>
                  <p className="text-xs text-foreground/50">Vade: {payment.due_date}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(payment.status)}`}>
                    {payment.status}
                  </span>
                  {payment.tolerance_until && (
                    <p className="text-[10px] text-sky-300">Tolerans: {payment.tolerance_until}</p>
                  )}
                </div>
              </div>
              {payment.notes && <p className="mt-2 text-xs text-foreground/70">Not: {payment.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-300"
                  onClick={() => openActionModal(payment, 'confirm')}
                >
                  Onayla
                </button>
                <button
                  className="rounded-lg border border-rose-400 px-3 py-1 text-xs font-semibold text-rose-300"
                  onClick={() => openActionModal(payment, 'reject')}
                >
                  Reddet
                </button>
                <button
                  className="rounded-lg border border-sky-400 px-3 py-1 text-xs font-semibold text-sky-300"
                  onClick={() => openActionModal(payment, 'tolerance')}
                >
                  Tolerans
                </button>
                <button
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground/70"
                  onClick={() => openActionModal(payment, 'note')}
                >
                  Not Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusTone(status: InstallmentPayment['status']) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500/10 text-emerald-300';
    case 'submitted':
      return 'bg-amber-500/10 text-amber-300';
    case 'overdue':
      return 'bg-rose-500/10 text-rose-300';
    case 'pending':
      return 'bg-border text-foreground/70';
    case 'rejected':
      return 'bg-rose-900/40 text-rose-200';
    case 'waived':
      return 'bg-foreground/10 text-foreground/70';
    default:
      return 'bg-border text-foreground/70';
  }
}

/**
 * Returns CSS classes for payment row based on overdue status
 * Requirements: 2+ days = yellow, 5+ days = red
 */
function getPaymentRowClass(payment: InstallmentPayment): string {
  // Paid/waived payments - success styling
  if (['confirmed', 'waived'].includes(payment.status)) {
    return 'border-emerald-500/20 bg-emerald-500/5';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use tolerance_until if set, otherwise due_date
  const effectiveDueDate = payment.tolerance_until
    ? new Date(payment.tolerance_until)
    : new Date(payment.due_date);
  effectiveDueDate.setHours(0, 0, 0, 0);

  // Not yet due
  if (effectiveDueDate >= today) {
    return 'border-border/40 bg-surface/30';
  }

  // Calculate overdue days
  const diffTime = today.getTime() - effectiveDueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 5+ days overdue - RED
  if (diffDays >= 5) {
    return 'border-rose-500 bg-rose-500/10';
  }

  // 2-4 days overdue - YELLOW
  if (diffDays >= 2) {
    return 'border-amber-500 bg-amber-500/10';
  }

  // 1 day overdue - subtle warning
  return 'border-amber-300/50 bg-amber-500/5';
}

interface ActionModalProps {
  payment: InstallmentPayment;
  type: ActionType;
  payload: Record<string, string>;
  onChange: (payload: Record<string, string>) => void;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
  loading: boolean;
}

function ActionModal({ payment, type, payload, onChange, onClose, onSubmit, loading }: ActionModalProps) {
  const titleMap: Record<ActionType, string> = {
    confirm: 'Ödemeyi Onayla',
    reject: 'Ödemeyi Reddet',
    tolerance: 'Tolerans Ver',
    note: 'Not Ekle',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-background p-6">
        <h3 className="text-xl font-semibold text-foreground">{titleMap[type]}</h3>
        <p className="mt-1 text-sm text-foreground/60">Taksit #{payment.payment_number} · {payment.due_date}</p>

        <div className="mt-4 space-y-3">
          {type === 'confirm' && (
            <>
              <label className="text-xs text-foreground/60">
                Ödenen Tutar
                <input
                  type="number"
                  step="0.01"
                  value={payload.paid_amount || ''}
                  onChange={(e) => onChange({ ...payload, paid_amount: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-foreground/60">
                Kanal
                <input
                  type="text"
                  value={payload.payment_channel || ''}
                  onChange={(e) => onChange({ ...payload, payment_channel: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          {type === 'reject' && (
            <label className="text-xs text-foreground/60">
              Sebep
              <textarea
                value={payload.reason || ''}
                onChange={(e) => onChange({ ...payload, reason: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          )}

          {type === 'tolerance' && (
            <>
              <label className="text-xs text-foreground/60">
                Yeni Son Tarih
                <input
                  type="date"
                  value={payload.tolerance_until || ''}
                  onChange={(e) => onChange({ ...payload, tolerance_until: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-foreground/60">
                Açıklama
                <textarea
                  rows={2}
                  value={payload.tolerance_reason || ''}
                  onChange={(e) => onChange({ ...payload, tolerance_reason: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          {type === 'note' && (
            <label className="text-xs text-foreground/60">
              Not
              <textarea
                rows={3}
                value={payload.note || ''}
                onChange={(e) => onChange({ ...payload, note: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-foreground/80"
            onClick={onClose}
          >
            İptal
          </button>
          <button
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? 'Gönderiliyor...' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  );
}
