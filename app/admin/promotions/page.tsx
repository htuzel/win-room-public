// Win Room v2.0 - Admin Promotions Management
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { PromotionBanner } from '@/components/ui/PromotionBanner';

type Variant = 'promo' | 'info' | 'success' | 'warning';

interface PromotionForm {
  title: string;
  message: string;
  variant: Variant;
  icon: string;
  visible: boolean;
}

export default function AdminPromotionsPage() {
  const router = useRouter();
  const { token, user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<PromotionForm>({
    title: '',
    message: '',
    variant: 'promo',
    icon: '🎯',
    visible: true,
  });
  const [saving, setSaving] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!['admin', 'finance', 'sales_lead'].includes(user?.role || '')) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    fetchCurrentPromotion();
  }, [token]);

  const fetchCurrentPromotion = async () => {
    try {
      const res = await fetch('/api/promotions/current');
      const data = await res.json();
      if (data && data.visible) {
        setCurrentPromotion(data);
        setForm({
          title: data.title,
          message: data.message,
          variant: data.variant,
          icon: data.icon,
          visible: data.visible,
        });
      }
    } catch (error) {
      console.error('Fetch current promotion error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: currentPromotion?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          id: currentPromotion?.id,
        }),
      });

      if (res.ok) {
        alert('Promotion saved!');
        fetchCurrentPromotion();
      } else {
        const error = await res.json();
        alert(error.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Save promotion error:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const variantOptions: { value: Variant; label: string; emoji: string }[] = [
    { value: 'promo', label: 'Promo (Purple/Pink)', emoji: '🎀' },
    { value: 'success', label: 'Success (Green)', emoji: '💚' },
    { value: 'info', label: 'Info (Blue)', emoji: '💙' },
    { value: 'warning', label: 'Warning (Orange)', emoji: '🧡' },
  ];

  const popularIcons = ['🎯', '🔥', '✨', '🏆', '💰', '🎉', '🎁', '⚡', '🚀', '⭐', '💪', '👑', '🥇', '🆕', '📢', '💡', '⚠️', '🔧', '⏰', '🎄', '🎅'];

  if (!isAuthenticated || !['admin', 'finance', 'sales_lead'].includes(user?.role || '')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background/60 p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/flalingoLogo.webp"
              alt="Flalingo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">📢 Promotion Banner</h1>
              <p className="text-sm text-foreground/60">Manage campaign and announcement banners from here</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
          >
            Admin Panel
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-bold text-foreground mb-6">Banner Settings</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="E.g: Black Friday Started! 🔥"
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Message *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="E.g: Show time! Special discounts today."
                  rows={3}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  required
                />
              </div>

              {/* Variant */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Theme (Color) *
                </label>
                <select
                  value={form.variant}
                  onChange={(e) => setForm({ ...form, variant: e.target.value as Variant })}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {variantOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Icon (Emoji) *
                </label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="E.g: 🎯"
                  maxLength={10}
                  className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  required
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`rounded-lg border px-3 py-2 text-xl hover:bg-accent/10 hover:border-accent transition-colors ${
                        form.icon === icon ? 'border-accent bg-accent/10' : 'border-border/40 bg-background/30'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visible Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visible"
                  checked={form.visible}
                  onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                  className="h-5 w-5 rounded border-border/60 bg-background/50 text-accent focus:ring-2 focus:ring-accent/20"
                />
                <label htmlFor="visible" className="text-sm font-semibold text-foreground cursor-pointer">
                  Show banner (active)
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-accent px-6 py-3 font-semibold text-black hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save and Publish'}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
            <h2 className="text-xl font-bold text-foreground mb-6">Preview</h2>
            <div className="space-y-4">
              <p className="text-sm text-foreground/60">The banner will look like this:</p>
              <PromotionBanner
                title={form.title || 'Title goes here'}
                message={form.message || 'Message goes here'}
                variant={form.variant}
                icon={form.icon || '🎯'}
                visible={true}
              />
              {!form.visible && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  ⚠️ Banner is currently hidden (inactive). It will not be shown to users.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-border/40 bg-background/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">💡 Tips</h3>
              <ul className="space-y-2 text-xs text-foreground/70">
                <li>• <strong>Title</strong>: Should be short and catchy (max 50 characters)</li>
                <li>• <strong>Message</strong>: Clear and understandable (max 150 characters)</li>
                <li>• <strong>Promo</strong>: For campaigns (purple/pink)</li>
                <li>• <strong>Success</strong>: For achievements (green)</li>
                <li>• <strong>Info</strong>: For announcements (blue)</li>
                <li>• <strong>Warning</strong>: For warnings (orange)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
