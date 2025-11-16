// Win Room v2.0 - Installment Plan Builder (shared by queue/claim modals)
'use client';

import { useMemo, useState } from 'react';

interface InstallmentPlanBuilderProps {
  subscriptionId: number;
  claimId?: number;
  token?: string | null;
  defaultCustomerName?: string;
  defaultCustomerEmail?: string;
  endpoint?: string;
  onPlanCreated?: (payload: { planId: number; installmentCount: number }) => void;
}

interface ScheduleRow {
  payment_number: number;
  due_date: string;
  amount?: number;
  notes?: string;
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export function InstallmentPlanBuilder({
  subscriptionId,
  claimId,
  token,
  defaultCustomerName,
  defaultCustomerEmail,
  endpoint = '/api/admin/installments',
  onPlanCreated,
}: InstallmentPlanBuilderProps) {
  const [totalInstallments, setTotalInstallments] = useState(3);
  const [intervalDays, setIntervalDays] = useState(30);
  const [firstDueDate, setFirstDueDate] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const amountPerInstallment = useMemo(() => {
    if (!totalAmount || !totalInstallments) return 0;
    const parsed = parseFloat(totalAmount);
    return Number.isFinite(parsed) ? parsed / totalInstallments : 0;
  }, [totalAmount, totalInstallments]);

  const handleGenerateSchedule = () => {
    if (!firstDueDate) {
      alert('İlk vade tarihini girin');
      return;
    }

    setIsGenerating(true);
    const baseDate = new Date(firstDueDate);
    const newSchedule: ScheduleRow[] = Array.from({ length: totalInstallments }).map((_, idx) => {
      const date = new Date(baseDate);
      if (idx > 0) {
        date.setDate(date.getDate() + intervalDays * idx);
      }

      return {
        payment_number: idx + 1,
        due_date: formatDate(date),
        amount: amountPerInstallment ? parseFloat(amountPerInstallment.toFixed(2)) : undefined,
      };
    });

    setSchedule(newSchedule);
    setIsGenerating(false);
  };

  const updateScheduleRow = (index: number, field: keyof ScheduleRow, value: string) => {
    setSchedule((prev) => {
      const clone = [...prev];
      const row = { ...clone[index] };
      if (field === 'amount') {
        const parsed = parseFloat(value);
        row.amount = Number.isFinite(parsed) ? parsed : undefined;
      } else if (field === 'due_date') {
        row.due_date = value;
      } else if (field === 'notes') {
        row.notes = value;
      }
      clone[index] = row;
      return clone;
    });
  };

  const handleCreatePlan = async () => {
    if (!token) {
      alert('Auth token missing');
      return;
    }

    if (!schedule.length) {
      alert('Lütfen taksit planını oluşturun');
      return;
    }

    // Validate total amount
    if (totalAmount) {
      const parsed = parseFloat(totalAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        alert('Lütfen geçerli bir toplam tutar girin (pozitif sayı)');
        return;
      }
    }

    // Validate each payment amount
    for (const payment of schedule) {
      if (payment.amount !== undefined && (payment.amount <= 0 || !Number.isFinite(payment.amount))) {
        alert(`Taksit #${payment.payment_number}: Lütfen geçerli bir tutar girin`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          claim_id: claimId,
          total_installments: totalInstallments,
          total_amount: totalAmount ? parseFloat(totalAmount) : undefined,
          currency,
          default_interval_days: intervalDays,
          payments: schedule,
          customer_name: defaultCustomerName,
          customer_email: defaultCustomerEmail,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Plan oluşturulamadı');
        return;
      }

      onPlanCreated?.({ planId: data.plan_id, installmentCount: totalInstallments });
      alert('Taksit planı oluşturuldu');
    } catch (error) {
      console.error('Installment plan create error:', error);
      alert('Plan oluşturulamadı');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-surface/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Taksit Planı</p>
          <p className="text-xs text-foreground/60">Installment status seçildiğinde plan oluşturmak gerekli</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-background"
          onClick={handleGenerateSchedule}
          disabled={!totalInstallments || !firstDueDate || isGenerating}
        >
          {isGenerating ? 'Oluşturuluyor...' : 'Planı Oluştur'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-foreground/70">
          Toplam Taksit
          <input
            type="number"
            min={2}
            max={36}
            value={totalInstallments}
            onChange={(e) => setTotalInstallments(parseInt(e.target.value || '0'))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          İlk Vade Tarihi
          <input
            type="date"
            value={firstDueDate}
            onChange={(e) => setFirstDueDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          Vade Aralığı (gün)
          <input
            type="number"
            min={7}
            max={120}
            value={intervalDays}
            onChange={(e) => setIntervalDays(parseInt(e.target.value || '0'))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-foreground/70">
          Toplam Tutar
          <input
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/70">
          Para Birimi
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <div className="text-xs text-foreground/60">
          <p>Takribi taksit tutarı:</p>
          <p className="font-semibold text-foreground">{amountPerInstallment ? `${amountPerInstallment.toFixed(2)} ${currency}` : '—'}</p>
        </div>
      </div>

      <label className="text-xs font-semibold text-foreground/70">
        Plan Notu
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
      </label>

      {!!schedule.length && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground/70">Taksit Takvimi</p>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border/50">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-surface/60 text-foreground/60">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Vade</th>
                  <th className="px-3 py-2">Tutar</th>
                  <th className="px-3 py-2">Not</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, idx) => (
                  <tr key={row.payment_number} className="border-t border-border/30">
                    <td className="px-3 py-2">{row.payment_number}</td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.due_date}
                        onChange={(e) => updateScheduleRow(idx, 'due_date', e.target.value)}
                        className="w-full rounded border border-border/60 bg-background px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.amount ?? ''}
                        onChange={(e) => updateScheduleRow(idx, 'amount', e.target.value)}
                        className="w-full rounded border border-border/60 bg-background px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.notes ?? ''}
                        onChange={(e) => updateScheduleRow(idx, 'notes', e.target.value)}
                        className="w-full rounded border border-border/60 bg-background px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        type="button"
        className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!schedule.length || isSaving}
        onClick={handleCreatePlan}
      >
        {isSaving ? 'Kaydediliyor...' : 'Planı Kaydet'}
      </button>
    </div>
  );
}
