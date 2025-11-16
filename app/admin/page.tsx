// Win Room v2.0 - Admin Panel
'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatUSD, formatPercent } from '@/lib/helpers/format';
import { AdminStatsPanel } from '@/components/stats/AdminStatsPanel';
import { SellerManager } from '@/components/admin/SellerManager';
import { EditQueueItemModal } from '@/components/admin/EditQueueItemModal';
import { QueueFinanceModal } from '@/components/admin/QueueFinanceModal';
import { ClaimFinanceModal } from '@/components/admin/ClaimFinanceModal';
import { InstallmentPlanBuilder } from '@/components/installments/InstallmentPlanBuilder';
import { ManualQueueEntryModal } from '@/components/queue/ManualQueueEntryModal';
import {
  ClaimDetailsModal,
  type ClaimAdjustmentDetail,
  type ClaimDetailsRecord,
} from '@/components/admin/ClaimDetailsModal';
import { ClaimShareModal } from '@/components/admin/ClaimShareModal';

type ClaimRecord = ClaimDetailsRecord;

// Risky payment channels that require finance attention
const RISKY_PAYMENT_CHANNELS = [
  'iyzico',
  'admin',
  'craftgate',
  'admin-extra',
  'company',
  'free-setcard',
  'free-craftgate',
  'setcard'
];

export default function AdminPanel() {
  const router = useRouter();
  const { token, user, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'objections' | 'users' | 'goals' | 'claims' | 'queue' | 'installments' | 'performance' | 'promotions'
  >('objections');

  // Mark as mounted after client-side hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isMounted) return; // Wait for hydration

    if (!isAuthenticated) {
      router.push('/login');
    } else if (user && !['admin', 'finance', 'sales_lead'].includes(user.role)) {
      router.push('/');
    }
  }, [isMounted, isAuthenticated, user, router]);

  // Objections state
  const [objections, setObjections] = useState<any[]>([]);
  const [objectionsFilter, setObjectionsFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');

  // Users state
  const [sellers, setSellers] = useState<any[]>([]); // Paginated sellers for Users tab
  const [allSellers, setAllSellers] = useState<any[]>([]); // All sellers for dropdowns
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    seller_id: '',
    display_name: '',
    email: '',
    password: '',
    role: 'sales' as 'sales' | 'sales_lead' | 'admin' | 'finance',
    pipedrive_owner_id: '',
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<any>({});
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [usersFilter, setUsersFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [usersPagination, setUsersPagination] = useState<{
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);

  // Goals state
  const [globalGoals, setGlobalGoals] = useState<any[]>([]);
  const [personalGoals, setPersonalGoals] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [globalGoalForm, setGlobalGoalForm] = useState({
    period_type: 'day',
    period_start: '',
    period_end: '',
    target_type: 'count',
    target_value: '',
    visibility_scope: 'sales_percent_only',
  });
  const [personalGoalForm, setPersonalGoalForm] = useState({
    seller_id: '',
    period_type: 'day',
    period_start: '',
    period_end: '',
    target_type: 'count',
    target_value: '',
    visibility_scope: 'owner_only',
  });

  // Claims state
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsPerPage] = useState(100);
  const [claimsPagination, setClaimsPagination] = useState<{
    limit: number;
    offset: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<number | null>(null);
  const [editClaimData, setEditClaimData] = useState<Partial<ClaimRecord>>({});
  const [editingInstallmentReady, setEditingInstallmentReady] = useState(false);
  const [claimDetail, setClaimDetail] = useState<ClaimDetailsRecord | null>(null);
  const [claimDetailAdjustments, setClaimDetailAdjustments] = useState<ClaimAdjustmentDetail[]>([]);
  const [claimDetailOpen, setClaimDetailOpen] = useState(false);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);
  const [claimDetailError, setClaimDetailError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareClaim, setShareClaim] = useState<ClaimRecord | null>(null);

  // Queue state
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const [queuePerPage] = useState(100);
  const [queuePagination, setQueuePagination] = useState<{
    limit: number;
    offset: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);
  const [claimingQueueId, setClaimingQueueId] = useState<number | null>(null);
  const [manualQueueModalOpen, setManualQueueModalOpen] = useState(false);
  const [manualClaimData, setManualClaimData] = useState({
    seller_id: '',
    claim_type: 'first_sales' as 'first_sales' | 'remarketing' | 'upgrade' | 'installment',
  });
  const [editQueueItem, setEditQueueItem] = useState<any | null>(null);
  const [editQueueModalOpen, setEditQueueModalOpen] = useState(false);
  const [financeQueueItem, setFinanceQueueItem] = useState<any | null>(null);
  const [financeQueueModalOpen, setFinanceQueueModalOpen] = useState(false);
  const [financeClaim, setFinanceClaim] = useState<any | null>(null);
  const [financeClaimModalOpen, setFinanceClaimModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchObjections();
  }, [token, objectionsFilter]);

useEffect(() => {
  if (!token) return;

  if (activeTab === 'users') {
    fetchSellers();
  } else if (['claims', 'queue', 'goals'].includes(activeTab)) {
    fetchAllSellers();
  }
}, [token, activeTab, usersPage, usersFilter]);

  useEffect(() => {
    if (!token || activeTab !== 'goals') return;
    refreshGoals();
  }, [token, activeTab]);

  useEffect(() => {
    if (!token || activeTab !== 'claims') return;
    fetchClaims();
  }, [token, activeTab, claimsSearch, claimsPage]);

  useEffect(() => {
    if (!token || activeTab !== 'queue') return;
    fetchQueue();
  }, [token, activeTab, queuePage]);

  const fetchObjections = async () => {
    try {
      const res = await fetch(`/api/admin/objections?status=${objectionsFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setObjections(data);
      }
    } catch (error) {
      console.error('Failed to fetch objections:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: usersPerPage.toString(),
        filter: usersFilter,
      });
      const res = await fetch(`/api/admin/sellers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers);
        setUsersPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
    }
  };

  const fetchAllSellers = async () => {
    try {
      // Fetch all sellers for dropdowns (no pagination)
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // High limit to get all
        filter: 'all',
      });
      const res = await fetch(`/api/admin/sellers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllSellers(data.sellers);
      }
    } catch (error) {
      console.error('Failed to fetch all sellers:', error);
    }
  };

  const fetchGlobalGoals = async () => {
    try {
      const res = await fetch('/api/admin/goals?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch global goals:', error);
    }
  };

  const fetchPersonalGoals = async () => {
    try {
      const res = await fetch('/api/admin/personal-goals?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPersonalGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch personal goals:', error);
    }
  };

  const refreshGoals = async () => {
    if (!token) return;
    setGoalsLoading(true);
    try {
      await Promise.all([fetchGlobalGoals(), fetchPersonalGoals()]);
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleResolveObjection = async (
    objectionId: number,
    status: 'accepted' | 'rejected',
    options: { action?: 'exclude' | 'reassign' | 'refund'; reassignTo?: string } = {}
  ) => {
    const adminNote = prompt('Admin note (optional):');

    try {
      const res = await fetch(`/api/admin/objections/${objectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          admin_note: adminNote,
          action: options.action,
          reassign_to: options.reassignTo,
        }),
      });

      if (res.ok) {
        alert('Objection resolved successfully');
        fetchObjections();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to resolve objection');
      }
    } catch (error) {
      console.error('Resolve objection error:', error);
      alert('Failed to resolve objection');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    const pipedriveOwnerNumeric = Number(createForm.pipedrive_owner_id);
    if (!Number.isFinite(pipedriveOwnerNumeric) || pipedriveOwnerNumeric <= 0) {
      setCreateError('Pipedrive Owner ID is required and must be a positive number.');
      setCreateLoading(false);
      return;
    }

    const payload = {
      seller_id: createForm.seller_id,
      display_name: createForm.display_name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
      pipedrive_owner_id: pipedriveOwnerNumeric,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('User created successfully!');
        setCreateForm({
          seller_id: '',
          display_name: '',
          email: '',
          password: '',
          role: 'sales',
          pipedrive_owner_id: '',
        });
        setShowCreateForm(false);
        fetchSellers();
      } else {
        const error = await res.json();
        setCreateError(error.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      setCreateError('An error occurred while creating the user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = (seller: any) => {
    setEditingUserId(seller.seller_id);
    setEditUserData({
      display_name: seller.display_name,
      email: seller.email,
      role: seller.role,
      is_active: seller.is_active,
      pipedrive_owner_id: seller.pipedrive_owner_id ? String(seller.pipedrive_owner_id) : '',
    });
  };

  const handleSaveUser = async (sellerId: string) => {
    let payload: any = { ...editUserData };

    if (payload.pipedrive_owner_id !== undefined) {
      const numeric = Number(payload.pipedrive_owner_id);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        alert('Pipedrive Owner ID is required and must be a positive number.');
        return;
      }
      payload = { ...payload, pipedrive_owner_id: numeric };
    }

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('User updated successfully!');
        setEditingUserId(null);
        setEditUserData({});
        await fetchSellers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      alert('Failed to update user');
    }
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setEditUserData({});
  };

  const handleDeleteUser = async (sellerId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete user "${displayName}" (${sellerId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('User deleted successfully!');
        await fetchSellers();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete user');
    }
  };

  const handleCreateGlobalGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const payload = {
      ...globalGoalForm,
      target_value: Number(globalGoalForm.target_value || 0),
    };

    if (!payload.period_start || !payload.period_end) {
      alert('Please provide period start and end');
      return;
    }

    try {
      const res = await fetch('/api/admin/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setGlobalGoalForm({
          period_type: 'day',
          period_start: '',
          period_end: '',
          target_type: 'count',
          target_value: '',
          visibility_scope: 'sales_percent_only',
        });
        await refreshGoals();
        alert('Global goal created');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create goal');
      }
    } catch (error) {
      console.error('Create global goal error:', error);
      alert('Failed to create goal');
    }
  };

  const handleCreatePersonalGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!personalGoalForm.seller_id) {
      alert('Seller ID is required');
      return;
    }

    if (!personalGoalForm.period_start || !personalGoalForm.period_end) {
      alert('Please provide period start and end');
      return;
    }

    const payload = {
      ...personalGoalForm,
      target_value: Number(personalGoalForm.target_value || 0),
    };

    try {
      const res = await fetch('/api/admin/personal-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPersonalGoalForm({
          seller_id: '',
          period_type: 'day',
          period_start: '',
          period_end: '',
          target_type: 'count',
          target_value: '',
          visibility_scope: 'owner_only',
        });
        await refreshGoals();
        alert('Personal goal created');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create personal goal');
      }
    } catch (error) {
      console.error('Create personal goal error:', error);
      alert('Failed to create personal goal');
    }
  };

  const handleEditGlobalGoal = async (goal: any) => {
    const newValue = prompt('New target value', goal.target_value);
    if (newValue === null) return;
    const numeric = Number(newValue);
    if (!Number.isFinite(numeric)) {
      alert('Invalid value');
      return;
    }

    try {
      const res = await fetch(`/api/admin/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_value: numeric }),
      });
      if (res.ok) {
        await refreshGoals();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Update global goal error:', error);
      alert('Failed to update goal');
    }
  };

  const handleEditPersonalGoal = async (goal: any) => {
    const newValue = prompt('New target value', goal.target_value);
    if (newValue === null) return;
    const numeric = Number(newValue);
    if (!Number.isFinite(numeric)) {
      alert('Invalid value');
      return;
    }

    try {
      const res = await fetch(`/api/admin/personal-goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_value: numeric }),
      });
      if (res.ok) {
        await refreshGoals();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update personal goal');
      }
    } catch (error) {
      console.error('Update personal goal error:', error);
      alert('Failed to update personal goal');
    }
  };

  const handleDeleteGlobalGoal = async (goalId: number) => {
    if (!confirm('Delete this global goal?')) return;
    try {
      const res = await fetch(`/api/admin/goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await refreshGoals();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Delete global goal error:', error);
      alert('Failed to delete goal');
    }
  };

  const handleDeletePersonalGoal = async (goalId: number) => {
    if (!confirm('Delete this personal goal?')) return;
    try {
      const res = await fetch(`/api/admin/personal-goals/${goalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await refreshGoals();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete personal goal');
      }
    } catch (error) {
      console.error('Delete personal goal error:', error);
      alert('Failed to delete personal goal');
    }
  };

  const fetchClaims = async () => {
    if (!token) return;
    try {
      setClaimsLoading(true);
      const offset = (claimsPage - 1) * claimsPerPage;
      const params = new URLSearchParams({
        search: claimsSearch,
        limit: claimsPerPage.toString(),
        offset: offset.toString(),
      });
      const res = await fetch(`/api/admin/claims?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims);
        setClaimsPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleViewClaimDetails = async (claim: ClaimRecord) => {
    if (!token) return;

    setClaimDetailOpen(true);
    setClaimDetail(claim);
    setClaimDetailAdjustments([]);
    setClaimDetailLoading(true);
    setClaimDetailError(null);

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        setClaimDetailError(errorBody.error || 'Failed to load claim details');
        return;
      }

      const data = await res.json();
      setClaimDetail(data.claim);
      setClaimDetailAdjustments(data.adjustments || []);
    } catch (error) {
      console.error('Claim detail fetch error:', error);
      setClaimDetailError('Failed to load claim details');
    } finally {
      setClaimDetailLoading(false);
    }
  };

  const handleCloseClaimDetail = () => {
    setClaimDetailOpen(false);
    setClaimDetail(null);
    setClaimDetailAdjustments([]);
    setClaimDetailLoading(false);
    setClaimDetailError(null);
  };

  const handleOpenShareModal = (claim: ClaimRecord) => {
    setShareClaim(claim);
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setShareClaim(null);
  };

  const handleEditClaim = (claim: ClaimRecord) => {
    setEditingClaimId(claim.id);
    setEditClaimData({
      claimed_by: claim.claimed_by,
      claim_type: claim.claim_type,
      closer_seller_id: claim.closer_seller_id,
      assisted_seller_id: claim.assisted_seller_id,
      closer_share_percent: claim.closer_share_percent ?? 1,
      assisted_share_percent: claim.assisted_share_percent ?? 0,
    });
    setEditingInstallmentReady(Boolean(claim.installment_plan_id));
  };

  const handleSaveClaim = async (claimId: number) => {
    if (editClaimData.claim_type === 'installment' && !editingInstallmentReady) {
      alert('Create the installment plan before saving this claim.');
      return;
    }
    try {
      const payload: any = { ...editClaimData };

      const effectiveAssisted =
        payload.assisted_seller_id !== undefined
          ? (payload.assisted_seller_id || null)
          : claims.find((c) => c.id === claimId)?.assisted_seller_id || null;

      if (!effectiveAssisted) {
        payload.assisted_share_percent = 0;
        payload.closer_share_percent = 1;
      } else {
        if (payload.closer_share_percent !== undefined) {
          payload.closer_share_percent = Number(Number(payload.closer_share_percent).toFixed(4));
        }
        if (payload.assisted_share_percent !== undefined) {
          payload.assisted_share_percent = Number(Number(payload.assisted_share_percent).toFixed(4));
        }
      }

      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchClaims();
        setEditingClaimId(null);
        setEditClaimData({});
        setEditingInstallmentReady(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update claim');
      }
    } catch (error) {
      console.error('Failed to update claim:', error);
      alert('Failed to update claim');
    }
  };

  const handleDeleteClaim = async (claimId: number) => {
    if (!confirm('Are you sure you want to delete this claim? This will revert the queue item to pending.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchClaims();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete claim');
      }
    } catch (error) {
      console.error('Failed to delete claim:', error);
      alert('Failed to delete claim');
    }
  };

  const handleCancelClaimEdit = () => {
    setEditingClaimId(null);
    setEditClaimData({});
    setEditingInstallmentReady(false);
  };

  const fetchQueue = async () => {
    if (!token) return;
    try {
      setQueueLoading(true);
      const offset = (queuePage - 1) * queuePerPage;
      const params = new URLSearchParams({
        limit: queuePerPage.toString(),
        offset: offset.toString(),
      });
      const res = await fetch(`/api/admin/queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data.items);
        setQueuePagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('⚠️ ARE YOU SURE? This will permanently delete ALL pending queue items. This action CANNOT be undone!')) {
      return;
    }

    if (!confirm('Final confirmation: Clear entire queue?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/queue', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchQueue();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to clear queue');
      }
    } catch (error) {
      console.error('Clear queue error:', error);
      alert('Failed to clear queue');
    }
  };

  const handleStartManualClaim = (queueId: number) => {
    setClaimingQueueId(queueId);
    setManualClaimData({
      seller_id: '',
      claim_type: 'first_sales',
    });
  };

  const handleManualClaim = async (queueId: number) => {
    if (!manualClaimData.seller_id) {
      alert('Please select a seller');
      return;
    }

    try {
      const res = await fetch(`/api/admin/queue/${queueId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(manualClaimData),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setClaimingQueueId(null);
        await fetchQueue();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to claim item');
      }
    } catch (error) {
      console.error('Manual claim error:', error);
      alert('Failed to claim item');
    }
  };

  const handleCancelManualClaim = () => {
    setClaimingQueueId(null);
    setManualClaimData({
      seller_id: '',
      claim_type: 'first_sales',
    });
  };

  const handleEditQueueItem = (item: any) => {
    setEditQueueItem(item);
    setEditQueueModalOpen(true);
  };

  const handleEditQueueSuccess = () => {
    setEditQueueModalOpen(false);
    setEditQueueItem(null);
    fetchQueue(); // Refresh queue list
  };

  const handleFinanceQueueItem = (item: any) => {
    setFinanceQueueItem(item);
    setFinanceQueueModalOpen(true);
  };

  const handleFinanceQueueSuccess = () => {
    setFinanceQueueModalOpen(false);
    setFinanceQueueItem(null);
    fetchQueue(); // Refresh queue list
  };

  const handleFinanceClaim = (claim: any) => {
    setFinanceClaim(claim);
    setFinanceClaimModalOpen(true);
  };

  const handleFinanceClaimSuccess = () => {
    setFinanceClaimModalOpen(false);
    setFinanceClaim(null);
    fetchClaims(); // Refresh claims list
  };

  const handleExcludeQueueItem = async (queueId: number, subscriptionId: number) => {
    if (!confirm(`Exclude Queue #${queueId} (Subscription #${subscriptionId}) from seller view? It will remain visible in admin panel.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/queue/${queueId}/exclude`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchQueue();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to exclude queue item');
      }
    } catch (error) {
      console.error('Exclude queue item error:', error);
      alert('Failed to exclude queue item');
    }
  };

  const handleDeleteQueueItem = async (queueId: number, subscriptionId: number) => {
    if (!confirm(`Are you sure you want to delete Queue #${queueId} (Subscription #${subscriptionId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/queue/${queueId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchQueue();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete queue item');
      }
    } catch (error) {
      console.error('Delete queue item error:', error);
      alert('Failed to delete queue item');
    }
  };

  // Don't render until after hydration to prevent mismatch
  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated || !user || !['admin', 'finance', 'sales_lead'].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/flalingoLogo.webp"
              alt="Flalingo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Admin Panel</h1>
              <p className="text-sm text-foreground/60">{user.seller_id} • {user.role}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('objections')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'objections'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Objections
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'goals'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'claims'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Claims
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'queue'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => router.push('/admin/installments')}
            className="px-4 py-2 font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            Installments
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-accent border-b-2 border-accent'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Team Performance
          </button>
          <button
            onClick={() => router.push('/admin/promotions')}
            className="px-4 py-2 font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            📢 Promotions
          </button>
        </div>

        {/* Objections Tab */}
        {activeTab === 'objections' && (
          <div>
            {/* Filter */}
            <div className="mb-4 flex gap-2">
              {(['pending', 'accepted', 'rejected', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setObjectionsFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    objectionsFilter === filter
                      ? 'bg-accent text-black'
                      : 'bg-surface border border-border text-foreground hover:bg-background'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Objections List */}
            <div className="space-y-4">
              {objections.length === 0 ? (
                <div className="bg-surface border border-border rounded-lg p-8 text-center text-foreground/40">
                  No objections found
                </div>
              ) : (
                objections.map((obj) => (
                  <div key={obj.id} className="bg-surface border border-border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-medium text-foreground">
                            Subscription #{obj.subscription_id}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            obj.status === 'pending'
                              ? 'bg-warning/20 text-warning'
                              : obj.status === 'accepted'
                              ? 'bg-success/20 text-success'
                              : 'bg-error/20 text-error'
                          }`}>
                            {obj.status}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60">
                          Raised by: {obj.raised_by} • Claimed by: {obj.claimer_display_name || 'N/A'}
                        </p>
                      </div>
                      <span className="text-xs text-foreground/40">
                        {new Date(obj.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-1">Reason:</p>
                      <p className="text-sm text-foreground/70">{obj.reason}</p>
                    </div>

                    {obj.details && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-foreground mb-1">Details:</p>
                        <p className="text-sm text-foreground/70">{obj.details}</p>
                      </div>
                    )}

                    {obj.admin_note && (
                      <div className="mb-4 p-3 bg-background rounded">
                        <p className="text-sm font-medium text-foreground mb-1">Admin Note:</p>
                        <p className="text-sm text-foreground/70">{obj.admin_note}</p>
                      </div>
                    )}

                    {obj.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveObjection(obj.id, 'accepted', { action: 'exclude' })}
                          className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors text-sm"
                        >
                          Accept & Exclude
                        </button>
                        <button
                          onClick={() => {
                            const target = prompt('Enter seller_id to reassign to:');
                            if (!target) return;
                            handleResolveObjection(obj.id, 'accepted', {
                              action: 'reassign',
                              reassignTo: target.trim(),
                            });
                          }}
                          className="px-4 py-2 bg-accent text-black rounded-lg hover:bg-accent-hover transition-colors text-sm"
                        >
                          Accept & Reassign
                        </button>
                        <button
                          onClick={() => handleResolveObjection(obj.id, 'rejected')}
                          className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filter and Create User Button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(['all', 'active', 'inactive'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setUsersFilter(filter);
                      setUsersPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      usersFilter === filter
                        ? 'bg-accent text-black'
                        : 'bg-surface border border-border text-foreground hover:bg-background'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-2 bg-accent text-black rounded-lg hover:bg-accent-hover transition-colors font-medium"
                >
                  + Create New User
                </button>
              )}
            </div>

            {/* Create User Form */}
            {showCreateForm && (
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Create New User</h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError('');
                    }}
                    className="text-foreground/60 hover:text-foreground text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 p-4 bg-error/20 border border-error/50 text-error rounded-lg text-sm">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Seller ID */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Seller ID *
                      </label>
                      <input
                        type="text"
                        value={createForm.seller_id}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, seller_id: e.target.value })
                        }
                        placeholder="merve"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.display_name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, display_name: e.target.value })
                        }
                        placeholder="Merve Yilmaz"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, email: e.target.value })
                        }
                        placeholder="merve@company.com"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, password: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Role *
                      </label>
                      <select
                        value={createForm.role}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            role: e.target.value as 'sales' | 'sales_lead' | 'admin' | 'finance',
                          })
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                      >
                        <option value="sales">Sales</option>
                        <option value="sales_lead">Sales Lead</option>
                        <option value="finance">Finance</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Pipedrive Owner ID */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Pipedrive Owner ID *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={createForm.pipedrive_owner_id}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, pipedrive_owner_id: e.target.value })
                        }
                        placeholder="123456"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent"
                        required
                      />
                      <p className="mt-1 text-xs text-foreground/50">
                        Must match the owner_id in the pipedrive_users table exactly.
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="px-6 py-2 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {createLoading ? 'Creating...' : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setCreateError('');
                      }}
                      className="px-6 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full">
                <thead className="border-b border-border bg-background/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Seller ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Pipedrive ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Sales</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Conversion</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Margin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(() => {
                    if (sellers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={12} className="px-4 py-12 text-center text-foreground/60">
                            No sellers found
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {sellers.map((seller) => (
                          <tr key={seller.seller_id} className={`hover:bg-background/30 ${
                            !seller.is_active ? 'opacity-60' : ''
                          }`}>
                            {/* Name */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {editingUserId === seller.seller_id ? (
                                <input
                                  type="text"
                                  value={editUserData.display_name || ''}
                                  onChange={(e) => setEditUserData({ ...editUserData, display_name: e.target.value })}
                                  className="w-full px-3 py-1 bg-background border border-border rounded text-foreground text-sm"
                                  placeholder="Display Name"
                                />
                              ) : (
                                <div className="font-medium max-w-[150px] truncate" title={seller.display_name}>
                                  {seller.display_name}
                                </div>
                              )}
                            </td>

                            {/* Seller ID */}
                            <td className="px-4 py-3 text-sm text-foreground/70 font-mono">
                              {seller.seller_id}
                            </td>

                            {/* Email */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {editingUserId === seller.seller_id ? (
                                <input
                                  type="email"
                                  value={editUserData.email || ''}
                                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                                  className="w-full px-3 py-1 bg-background border border-border rounded text-foreground text-sm font-mono"
                                  placeholder="email@example.com"
                                />
                              ) : (
                                <div className="max-w-[180px] truncate font-mono text-xs" title={seller.email}>
                                  {seller.email || 'N/A'}
                                </div>
                              )}
                            </td>

                            {/* Pipedrive Owner ID */}
                            <td className="px-4 py-3 text-sm text-foreground">
                              {editingUserId === seller.seller_id ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={editUserData.pipedrive_owner_id || ''}
                                  onChange={(e) => setEditUserData({ ...editUserData, pipedrive_owner_id: e.target.value })}
                                  className="w-24 px-3 py-1 bg-background border border-border rounded text-foreground text-sm font-mono"
                                  placeholder="123456"
                                  required
                                />
                              ) : (
                                <div className="font-mono text-xs">
                                  {seller.pipedrive_owner_id || '—'}
                                </div>
                              )}
                            </td>

                            {/* Role */}
                            <td className="px-4 py-3 text-sm">
                              {editingUserId === seller.seller_id ? (
                                <select
                                  value={editUserData.role || ''}
                                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                                  className="px-2 py-1 bg-background border border-border rounded text-xs"
                                >
                                  <option value="sales">Sales</option>
                                  <option value="sales_lead">Sales Lead</option>
                                  <option value="finance">Finance</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize font-medium">
                                  {seller.role}
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-sm">
                              {editingUserId === seller.seller_id ? (
                                <select
                                  value={editUserData.is_active ? 'true' : 'false'}
                                  onChange={(e) => setEditUserData({ ...editUserData, is_active: e.target.value === 'true' })}
                                  className="px-2 py-1 bg-background border border-border rounded text-xs"
                                >
                                  <option value="true">Active</option>
                                  <option value="false">Inactive</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-1 text-xs rounded font-medium ${
                                  seller.is_active
                                    ? 'bg-success/20 text-success'
                                    : 'bg-error/20 text-error'
                                }`}>
                                  {seller.is_active ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </td>

                            {/* Total Sales */}
                            <td className="px-4 py-3 text-sm text-foreground font-bold">
                              {seller.total_sales || 0}
                            </td>

                            {/* Revenue */}
                            <td className="px-4 py-3 text-sm text-success font-bold">
                              {formatUSD(seller.total_revenue_usd || 0)}
                            </td>

                            {/* Assigned Leads */}
                            <td className="px-4 py-3 text-sm text-foreground font-semibold">
                              {seller.total_leads || 0}
                            </td>

                            {/* Conversion */}
                            <td className="px-4 py-3 text-sm text-accent font-semibold">
                              {formatPercent((seller.conversion_rate || 0) * 100)}
                            </td>

                            {/* Margin (with tooltip) */}
                            <td className="px-4 py-3 text-sm">
                              <div className="group relative inline-block">
                                <span className="text-accent font-semibold cursor-help">
                                  {formatPercent(seller.avg_margin_percent)}
                                </span>
                                <div className="absolute z-10 invisible group-hover:visible bg-surface border border-border rounded-lg p-3 shadow-lg -left-24 top-6 w-56">
                                  <p className="text-xs font-semibold text-foreground mb-2">Margin Analysis</p>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-foreground/70">Revenue:</span>
                                      <span className="text-foreground font-medium">{formatUSD(seller.total_revenue_usd || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-foreground/70">Cost:</span>
                                      <span className="text-foreground font-medium">{formatUSD(seller.total_cost_usd || 0)}</span>
                                    </div>
                                    <div className="border-t border-border/30 pt-1 flex justify-between">
                                      <span className="text-foreground/70 font-medium">Margin:</span>
                                      <span className={`font-bold ${
                                        (seller.total_margin_usd || 0) > 0 ? 'text-success' : 'text-error'
                                      }`}>
                                        {formatUSD(seller.total_margin_usd || 0)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-sm">
                              {editingUserId === seller.seller_id ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveUser(seller.seller_id)}
                                    className="rounded bg-accent px-3 py-1 text-xs font-semibold text-black hover:bg-accent/90 whitespace-nowrap"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelUserEdit}
                                    className="rounded bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20 whitespace-nowrap"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditUser(seller)}
                                    className="rounded bg-accent/20 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/30 whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(seller.seller_id, seller.display_name)}
                                    className="rounded bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/30 whitespace-nowrap"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {/* Pagination row */}
                        {usersPagination && usersPagination.totalPages > 1 && (
                          <tr>
                            <td colSpan={12} className="px-4 py-4 bg-background/30">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-foreground/60">
                                  Showing {((usersPagination.page - 1) * usersPagination.limit) + 1} to {Math.min(usersPagination.page * usersPagination.limit, usersPagination.totalCount)} of {usersPagination.totalCount} users
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                                    disabled={usersPage === 1}
                                    className="px-3 py-1 rounded bg-surface border border-border text-foreground text-xs font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Previous
                                  </button>
                                  <div className="flex gap-1">
                                    {Array.from({ length: usersPagination.totalPages }, (_, i) => i + 1).map((page) => (
                                      <button
                                        key={page}
                                        onClick={() => setUsersPage(page)}
                                        className={`px-3 py-1 rounded text-xs font-medium ${
                                          page === usersPage
                                            ? 'bg-accent text-black'
                                            : 'bg-surface border border-border text-foreground hover:bg-background'
                                        }`}
                                      >
                                        {page}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => setUsersPage(Math.min(usersPagination.totalPages, usersPage + 1))}
                                    disabled={usersPage === usersPagination.totalPages}
                                    className="px-3 py-1 rounded bg-surface border border-border text-foreground text-xs font-medium hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-foreground">Create Global Goal</h2>
                <p className="text-sm text-foreground/50 mb-4">Visibility: percent-only for sales or admin-only.</p>
                <form onSubmit={handleCreateGlobalGoal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Period</label>
                      <select
                        value={globalGoalForm.period_type}
                        onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, period_type: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      >
                        <option value="day">Daily</option>
                        <option value="15d">15 Days</option>
                        <option value="month">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Target type</label>
                      <select
                        value={globalGoalForm.target_type}
                        onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, target_type: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      >
                        <option value="count">Wins</option>
                        <option value="revenue">Revenue</option>
                        <option value="margin_amount">Margin Amt</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Start</label>
                      <input
                        type="date"
                        value={globalGoalForm.period_start}
                        onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, period_start: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">End</label>
                      <input
                        type="date"
                        value={globalGoalForm.period_end}
                        onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, period_end: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                        required
                      />
                    </div>

                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Target value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={globalGoalForm.target_value}
                      onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, target_value: e.target.value })}
                      placeholder="50"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Visibility</label>
                    <select
                      value={globalGoalForm.visibility_scope}
                      onChange={(e) => setGlobalGoalForm({ ...globalGoalForm, visibility_scope: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    >
                      <option value="sales_percent_only">Sales (percent only)</option>
                      <option value="admin_only">Admin only</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-black hover:bg-accent-hover"
                  >
                    Add Global Goal
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold text-foreground">Create Personal Goal</h2>
                <p className="text-sm text-foreground/50 mb-4">Only the selected seller can see this.</p>
                <form onSubmit={handleCreatePersonalGoal} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Seller *</label>
                    <select
                      value={personalGoalForm.seller_id}
                      onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, seller_id: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      required
                    >
                      <option value="">Select seller…</option>
                      {allSellers.filter(s => ['sales', 'sales_lead'].includes(s.role)).map((seller) => (
                        <option key={seller.seller_id} value={seller.seller_id}>
                          {seller.display_name || seller.seller_id} {seller.role === 'sales_lead' ? '(Lead)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Period</label>
                      <select
                        value={personalGoalForm.period_type}
                        onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, period_type: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      >
                        <option value="day">Daily</option>
                        <option value="15d">15 Days</option>
                        <option value="month">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Target type</label>
                      <select
                        value={personalGoalForm.target_type}
                        onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, target_type: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      >
                        <option value="count">Wins</option>
                        <option value="revenue">Revenue</option>
                        <option value="margin_amount">Margin Amt</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Start</label>
                      <input
                        type="date"
                        value={personalGoalForm.period_start}
                        onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, period_start: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">End</label>
                      <input
                        type="date"
                        value={personalGoalForm.period_end}
                        onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, period_end: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Target value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={personalGoalForm.target_value}
                      onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, target_value: e.target.value })}
                      placeholder="10"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-foreground/40 mb-2">Visibility</label>
                    <select
                      value={personalGoalForm.visibility_scope}
                      onChange={(e) => setPersonalGoalForm({ ...personalGoalForm, visibility_scope: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    >
                      <option value="owner_only">Owner only</option>
                      <option value="admin_only">Admin only</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-black hover:bg-accent-hover"
                  >
                    Add Personal Goal
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Global Goals</h3>
                  {goalsLoading && <span className="text-xs text-foreground/50">Refreshing…</span>}
                </div>
                <div className="space-y-3">
                  {globalGoals.length === 0 ? (
                    <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm text-foreground/50">
                      No global goals yet.
                    </div>
                  ) : (
                    globalGoals.map((goal) => (
                      <div key={goal.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {goal.period_type.toUpperCase()} • {goal.target_type}
                            </p>
                            <p className="text-xs text-foreground/60">
                              {goal.period_start} → {goal.period_end}
                            </p>
                            <p className="text-xs text-foreground/50 mt-1">
                              Target: {goal.target_value} • Visibility: {goal.visibility_scope}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditGlobalGoal(goal)}
                              className="rounded-md border border-border px-3 py-1 text-xs text-foreground/70 hover:border-accent hover:text-accent"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteGlobalGoal(goal.id)}
                              className="rounded-md border border-border px-3 py-1 text-xs text-error hover:border-error/60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface/70 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Personal Goals</h3>
                  {goalsLoading && <span className="text-xs text-foreground/50">Refreshing…</span>}
                </div>
                <div className="space-y-3">
                  {personalGoals.length === 0 ? (
                    <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm text-foreground/50">
                      No personal goals yet.
                    </div>
                  ) : (
                    personalGoals.map((goal) => (
                      <div key={goal.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {goal.seller_id} • {goal.period_type.toUpperCase()} • {goal.target_type}
                            </p>
                            <p className="text-xs text-foreground/60">
                              {goal.period_start} → {goal.period_end}
                            </p>
                            <p className="text-xs text-foreground/50 mt-1">
                              Target: {goal.target_value} • Visibility: {goal.visibility_scope}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPersonalGoal(goal)}
                              className="rounded-md border border-border px-3 py-1 text-xs text-foreground/70 hover:border-accent hover:text-accent"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePersonalGoal(goal.id)}
                              className="rounded-md border border-border px-3 py-1 text-xs text-error hover:border-error/60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div>
            {/* Search */}
            <div className="mb-6 flex gap-4">
              <input
                type="text"
                placeholder="Search by Sub ID, customer email/name, or seller..."
                value={claimsSearch}
                onChange={(e) => setClaimsSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchClaims()}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-foreground placeholder:text-foreground/40"
              />
              <button
                onClick={fetchClaims}
                className="rounded-lg bg-accent px-6 py-2 font-semibold text-black hover:bg-accent-hover"
              >
                Search
              </button>
            </div>

            {/* Claims Table */}
            {claimsLoading ? (
              <div className="text-center py-12 text-foreground/60">Loading claims...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full">
                  <thead className="border-b border-border bg-background/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Sub ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Claimed By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Finance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Closer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Assisted</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Margin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Claimed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {claims.map((claim) => (
                      <Fragment key={claim.id}>
                      <tr className="hover:bg-background/30">
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">#{claim.subscription_id}</span>
                              {claim.queue_is_manual && (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                  Manual
                                </span>
                              )}
                            </div>
                            {claim.queue_is_manual && (
                              <span className="text-xs text-foreground/60">
                                Opened by: {claim.queue_created_by || claim.queue_created_by_email || 'Manual'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="max-w-[150px] truncate">{claim.customer_name || claim.customer_email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {editingClaimId === claim.id ? (
                            <select
                              value={editClaimData.claimed_by || ''}
                              onChange={(e) => setEditClaimData({ ...editClaimData, claimed_by: e.target.value })}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                            >
                              <option value="">Select seller...</option>
                              {allSellers.filter(s => ['sales', 'sales_lead'].includes(s.role)).map((seller) => (
                                <option key={seller.seller_id} value={seller.seller_id}>
                                  {seller.display_name || seller.seller_id} {seller.role === 'sales_lead' ? '(Lead)' : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="max-w-[120px] truncate">{claim.claimer_name || claim.claimed_by}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {editingClaimId === claim.id ? (
                            <select
                              value={editClaimData.claim_type || ''}
                              onChange={(e) => setEditClaimData({ ...editClaimData, claim_type: e.target.value })}
                              className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                            >
                              <option value="first_sales">First Sales</option>
                              <option value="remarketing">Remarketing</option>
                              <option value="upgrade">Upgrade</option>
                              <option value="installment">Installment</option>
                            </select>
                          ) : (
                            <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                              {claim.claim_type}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              claim.finance_status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : claim.finance_status === 'problem'
                                ? 'bg-rose-500/20 text-rose-400'
                                : claim.finance_status === 'installment'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {claim.finance_status || 'waiting'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {editingClaimId === claim.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={editClaimData.closer_seller_id ?? claim.closer_seller_id ?? ''}
                                onChange={(e) => setEditClaimData({ ...editClaimData, closer_seller_id: e.target.value })}
                                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                              />
                              <label className="flex items-center gap-2 text-xs text-foreground/60">
                                Share %
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(((editClaimData.closer_share_percent ?? claim.closer_share_percent ?? 1) * 100) * 100) / 100}
                                  onChange={(e) => {
                                    const raw = Number(e.target.value);
                                    const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
                                    const decimal = Number((pct / 100).toFixed(4));
                                    setEditClaimData((prev) => {
                                      const assistedValue =
                                        prev.assisted_seller_id !== undefined
                                          ? prev.assisted_seller_id
                                          : claim.assisted_seller_id;
                                      const hasAssisted = assistedValue && assistedValue !== '';
                                      return {
                                        ...prev,
                                        closer_share_percent: decimal,
                                        assisted_share_percent: hasAssisted ? Number((1 - decimal).toFixed(4)) : 0,
                                      };
                                    });
                                  }}
                                  className="w-24 rounded border border-border bg-background px-2 py-1 text-xs"
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="max-w-[160px] truncate">
                              <div>{claim.closer_name || claim.closer_seller_id || '—'}</div>
                              <div className="text-[11px] text-foreground/50">
                                {((claim.closer_share_percent ?? 1) * 100).toFixed(0)}% share
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {editingClaimId === claim.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={editClaimData.assisted_seller_id ?? claim.assisted_seller_id ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEditClaimData((prev) => {
                                    const hasValue = value !== '' && value !== null;
                                    const baseCloserShare = prev.closer_share_percent ?? claim.closer_share_percent ?? 1;
                                    const nextState: Partial<ClaimRecord> = {
                                      ...prev,
                                      assisted_seller_id: value,
                                    };
                                    if (hasValue) {
                                      const existingAssistedShare = prev.assisted_share_percent ?? claim.assisted_share_percent ?? Number((1 - baseCloserShare).toFixed(4));
                                      nextState.assisted_share_percent = Number(existingAssistedShare.toFixed(4));
                                      nextState.closer_share_percent = Number(baseCloserShare.toFixed(4));
                                    } else {
                                      nextState.assisted_share_percent = 0;
                                      nextState.closer_share_percent = 1;
                                    }
                                    return nextState;
                                  });
                                }}
                                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                              />
                              <label className="flex items-center gap-2 text-xs text-foreground/60">
                                Share %
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  disabled={((editClaimData.assisted_seller_id ?? claim.assisted_seller_id) ?? '') === ''}
                                  value={((editClaimData.assisted_share_percent ?? claim.assisted_share_percent ?? 0) * 100).toFixed(0)}
                                  onChange={(e) => {
                                    const raw = Number(e.target.value);
                                    const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
                                    const decimal = Number((pct / 100).toFixed(4));
                                    setEditClaimData((prev) => ({
                                      ...prev,
                                      assisted_share_percent: decimal,
                                      closer_share_percent: Number((1 - decimal).toFixed(4)),
                                    }));
                                  }}
                                  className="w-24 rounded border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="max-w-[160px] truncate">
                              <div>{claim.assisted_name || claim.assisted_seller_id || '—'}</div>
                              {claim.assisted_seller_id && (
                                <div className="text-[11px] text-foreground/50">
                                  {((claim.assisted_share_percent ?? 0) * 100).toFixed(0)}% share
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {claim.margin_percent ? formatPercent(claim.margin_percent * 100) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {new Date(claim.claimed_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingClaimId === claim.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveClaim(claim.id)}
                                disabled={editClaimData.claim_type === 'installment' && !editingInstallmentReady}
                                className="rounded bg-accent px-3 py-1 text-xs font-semibold text-black hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelClaimEdit}
                                className="rounded bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewClaimDetails(claim)}
                                className="rounded bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20 whitespace-nowrap"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => handleEditClaim(claim)}
                                className="rounded bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20 whitespace-nowrap"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleOpenShareModal(claim)}
                                className="rounded bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 whitespace-nowrap"
                              >
                                Shares
                              </button>
                              <button
                                onClick={() => handleFinanceClaim(claim)}
                                className={`rounded px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                                  claim.payment_channel && RISKY_PAYMENT_CHANNELS.includes(claim.payment_channel)
                                    ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/40 ring-1 ring-amber-400/40'
                                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                }`}
                              >
                                Finance
                              </button>
                              <button
                                onClick={() => handleDeleteClaim(claim.id)}
                                className="rounded bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {editingClaimId === claim.id &&
                        editClaimData.claim_type === 'installment' &&
                        !editingInstallmentReady && (
                          <tr className="bg-background/20">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-3 rounded-xl border border-border/40 bg-surface/40 p-4">
                                <p className="text-sm font-semibold text-foreground">
                                  Installment plan required before saving this claim.
                                </p>
                                <p className="text-xs text-foreground/60">
                                  Enter the number of installments and payment dates. Once the plan is created you can save the claim.
                                </p>
                                <InstallmentPlanBuilder
                                  subscriptionId={claim.subscription_id}
                                  claimId={claim.id}
                                  token={token}
                                  onPlanCreated={async () => {
                                    setEditingInstallmentReady(true);
                                    await fetchClaims();
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {claims.length === 0 && (
                  <div className="py-12 text-center text-foreground/60">
                    No claims found. Try adjusting your search.
                  </div>
                )}
              </div>
            )}

            {/* Claims Pagination */}
            {claimsPagination && claimsPagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-foreground/60">
                  Showing {claimsPagination.offset + 1} - {Math.min(claimsPagination.offset + claimsPagination.limit, claimsPagination.totalCount)} of {claimsPagination.totalCount} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setClaimsPage(Math.max(1, claimsPage - 1))}
                    disabled={claimsPage === 1}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: claimsPagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and pages around current
                        return page === 1 ||
                               page === claimsPagination.totalPages ||
                               Math.abs(page - claimsPage) <= 1;
                      })
                      .map((page, idx, arr) => {
                        // Add ellipsis
                        const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                        return (
                          <Fragment key={page}>
                            {showEllipsisBefore && <span className="px-2 text-foreground/40">...</span>}
                            <button
                              onClick={() => setClaimsPage(page)}
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                page === claimsPage
                                  ? 'bg-accent text-black font-semibold'
                                  : 'bg-surface border border-border text-foreground hover:bg-background'
                              }`}
                            >
                              {page}
                            </button>
                          </Fragment>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setClaimsPage(Math.min(claimsPagination.totalPages, claimsPage + 1))}
                    disabled={claimsPage === claimsPagination.totalPages}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div>
            {/* Header with Clear All Button */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Queue Management</h2>
                <p className="text-sm text-foreground/60 mt-1">
                  {queueItems.length} pending items in queue
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setManualQueueModalOpen(true)}
                  className="rounded-lg bg-accent px-5 py-2 font-semibold text-black hover:bg-accent-hover transition-colors"
                >
                  + Manual Entry
                </button>
                <button
                  onClick={handleClearQueue}
                  className="rounded-lg bg-rose-600 px-6 py-2 font-semibold text-white hover:bg-rose-700 transition-colors"
                >
                  🗑️ Clear All Queue
                </button>
              </div>
            </div>

            {/* Queue Table */}
            {queueLoading ? (
              <div className="text-center py-12 text-foreground/60">Loading queue...</div>
            ) : queueItems.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-12 text-center">
                <p className="text-lg text-foreground/60">Queue is empty</p>
                <p className="text-sm text-foreground/40 mt-2">No pending items</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="w-full">
                  <thead className="border-b border-border bg-background/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Queue ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Sub ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Finance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Campaign</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Margin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-foreground/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {queueItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-background/30 ${
                          item.status === 'excluded'
                            ? 'opacity-50 bg-amber-500/5'
                            : item.is_manual
                            ? 'bg-accent/10 border-l-4 border-accent/80'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">#{item.id}</span>
                              {item.is_manual && (
                                <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                  Manual
                                </span>
                              )}
                            </div>
                            {item.created_by_name || item.created_by_email || item.created_by ? (
                              <span className="text-xs text-foreground/60">
                                Opened by: {item.created_by_name || item.created_by_email || item.created_by}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">#{item.subscription_id}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.status === 'excluded'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {item.status === 'excluded' ? 'Excluded' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              item.finance_status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : item.finance_status === 'problem'
                                ? 'bg-rose-500/20 text-rose-400'
                                : item.finance_status === 'installment'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {item.finance_status || 'waiting'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="max-w-[150px]">
                            {item.customer_name && (
                              <div className="font-medium truncate">{item.customer_name}</div>
                            )}
                            {item.customer_email && (
                              <div className="text-xs text-foreground/60 truncate">{item.customer_email}</div>
                            )}
                            {!item.customer_name && !item.customer_email && '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <div className="max-w-[120px] truncate">{item.campaign_name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground font-semibold">
                          {item.revenue_usd ? formatUSD(item.revenue_usd) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {item.margin_percent ? formatPercent(item.margin_percent * 100) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/60">
                          {new Date(item.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {claimingQueueId === item.id ? (
                            <div className="flex gap-2 items-center">
                              <select
                                value={manualClaimData.seller_id}
                                onChange={(e) => setManualClaimData({ ...manualClaimData, seller_id: e.target.value })}
                                className="rounded border border-border bg-background px-2 py-1 text-xs w-32"
                              >
                                <option value="">Seller...</option>
                                {allSellers.filter(s => ['sales', 'sales_lead'].includes(s.role)).map((seller) => (
                                  <option key={seller.seller_id} value={seller.seller_id}>
                                    {seller.display_name || seller.seller_id} {seller.role === 'sales_lead' ? '(Lead)' : ''}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={manualClaimData.claim_type}
                                onChange={(e) => setManualClaimData({
                                  ...manualClaimData,
                                  claim_type: e.target.value as any
                                })}
                                className="rounded border border-border bg-background px-2 py-1 text-xs w-28"
                              >
                                <option value="first_sales">First Sales</option>
                                <option value="remarketing">Remarketing</option>
                                <option value="upgrade">Upgrade</option>
                                <option value="installment">Installment</option>
                              </select>
                              <button
                                onClick={() => handleManualClaim(item.id)}
                                className="rounded bg-accent px-3 py-1 text-xs font-semibold text-black hover:bg-accent/90 whitespace-nowrap"
                              >
                                Claim
                              </button>
                              <button
                                onClick={handleCancelManualClaim}
                                className="rounded bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-foreground/20"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditQueueItem(item)}
                                className="rounded bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/30 whitespace-nowrap"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleFinanceQueueItem(item)}
                                className={`rounded px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                                  item.payment_channel && RISKY_PAYMENT_CHANNELS.includes(item.payment_channel)
                                    ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/40 ring-1 ring-amber-400/40'
                                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                }`}
                              >
                                Finance
                              </button>
                              <button
                                onClick={() => handleStartManualClaim(item.id)}
                                className="rounded bg-accent/20 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/30 whitespace-nowrap"
                              >
                                Manual Claim
                              </button>
                              <button
                                onClick={() => handleExcludeQueueItem(item.id, item.subscription_id)}
                                className="rounded bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 whitespace-nowrap"
                                disabled={item.status === 'excluded'}
                              >
                                {item.status === 'excluded' ? 'Excluded' : 'Exclude'}
                              </button>
                              <button
                                onClick={() => handleDeleteQueueItem(item.id, item.subscription_id)}
                                className="rounded bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/30 whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Queue Pagination */}
            {queuePagination && queuePagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-foreground/60">
                  Showing {queuePagination.offset + 1} - {Math.min(queuePagination.offset + queuePagination.limit, queuePagination.totalCount)} of {queuePagination.totalCount} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQueuePage(Math.max(1, queuePage - 1))}
                    disabled={queuePage === 1}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: queuePagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and pages around current
                        return page === 1 ||
                               page === queuePagination.totalPages ||
                               Math.abs(page - queuePage) <= 1;
                      })
                      .map((page, idx, arr) => {
                        // Add ellipsis
                        const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                        return (
                          <Fragment key={page}>
                            {showEllipsisBefore && <span className="px-2 text-foreground/40">...</span>}
                            <button
                              onClick={() => setQueuePage(page)}
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                page === queuePage
                                  ? 'bg-accent text-black font-semibold'
                                  : 'bg-surface border border-border text-foreground hover:bg-background'
                              }`}
                            >
                              {page}
                            </button>
                          </Fragment>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setQueuePage(Math.min(queuePagination.totalPages, queuePage + 1))}
                    disabled={queuePage === queuePagination.totalPages}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Edit Queue Item Modal */}
            {editQueueItem && (
              <EditQueueItemModal
                isOpen={editQueueModalOpen}
                onClose={() => {
                  setEditQueueModalOpen(false);
                  setEditQueueItem(null);
                }}
                item={editQueueItem}
                token={token}
                onSuccess={handleEditQueueSuccess}
              />
            )}

            {/* Manual Queue Entry Modal */}
            <ManualQueueEntryModal
              isOpen={manualQueueModalOpen}
              onClose={() => setManualQueueModalOpen(false)}
              token={token}
              onSuccess={fetchQueue}
            />

            {/* Queue Finance Approval Modal */}
            {financeQueueItem && (
              <QueueFinanceModal
                isOpen={financeQueueModalOpen}
                onClose={() => {
                  setFinanceQueueModalOpen(false);
                  setFinanceQueueItem(null);
                }}
                item={financeQueueItem}
                token={token}
                onSuccess={handleFinanceQueueSuccess}
              />
            )}
          </div>
        )}

        {/* Claim Finance Approval Modal */}
        {financeClaim && (
          <ClaimFinanceModal
            isOpen={financeClaimModalOpen}
            onClose={() => {
              setFinanceClaimModalOpen(false);
              setFinanceClaim(null);
            }}
            claim={financeClaim}
            token={token}
            onSuccess={handleFinanceClaimSuccess}
          />
        )}

        <ClaimShareModal
          isOpen={shareModalOpen}
          onClose={handleCloseShareModal}
          claim={shareClaim}
          token={token}
          onSuccess={fetchClaims}
        />

        <ClaimDetailsModal
          isOpen={claimDetailOpen}
          onClose={handleCloseClaimDetail}
          claim={claimDetail}
          adjustments={claimDetailAdjustments}
          loading={claimDetailLoading}
          error={claimDetailError}
        />

        {/* Team Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-8">
            <AdminStatsPanel token={token} />
            <SellerManager token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
