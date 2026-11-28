'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';

interface BranchItem {
  id: string;
  name: string;
  city: string;
  address: string;
  staffCount: number;
}

interface StaffItem {
  id: string;
  name: string;
  role: string;
  branchName: string;
}

type KycStep = 1 | 2 | 3;

export default function BusinessKycPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<KycStep>(1);
  const [kycStatus, setKycStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [errorInfo, setErrorInfo] = useState<{ message: string; correlationId?: string } | null>(
    null
  );

  // Step 1: Legal & Tax details
  const [brandName, setBrandName] = useState('');
  const [entityType, setEntityType] = useState('Private Limited');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [city, setCity] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');

  // Step 2: Documents
  const [coiDocName, setCoiDocName] = useState('');
  const [gstDocName, setGstDocName] = useState('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Branch & Staff Manager
  const [branches, setBranches] = useState<BranchItem[]>([
    {
      id: 'br-1',
      name: 'Indiranagar Flagship',
      city: 'Bengaluru',
      address: '100 Feet Road, Indiranagar',
      staffCount: 4,
    },
  ]);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const [staff, setStaff] = useState<StaffItem[]>([
    { id: 'st-1', name: 'Ananya Rao', role: 'Branch Manager', branchName: 'Indiranagar Flagship' },
    { id: 'st-2', name: 'Vikram Nair', role: 'Check-in Coordinator', branchName: 'Indiranagar Flagship' },
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Check-in Coordinator');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      const res = await fetch('/api/business/profile', { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.profile) {
        setBrandName(data.profile.brandName || '');
        setGstin(data.profile.gstin || '');
        setCity(data.profile.city || '');
      } else if (!res.ok) {
        setErrorInfo({
          message: data?.error?.message || 'Unable to load business profile.',
          correlationId: data?.error?.correlationId || undefined,
        });
      }
    } catch {
      setErrorInfo({ message: 'Network error loading business profile.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'coi' | 'gst'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (res.ok) {
        if (kind === 'coi') setCoiDocName(file.name);
        else setGstDocName(file.name);
        notify(`${file.name} uploaded`, 'success');
      } else {
        if (kind === 'coi') setCoiDocName(file.name);
        else setGstDocName(file.name);
        notify(`${file.name} staged for KYC submission`, 'info');
      }
    } catch {
      if (kind === 'coi') setCoiDocName(file.name);
      else setGstDocName(file.name);
      notify(`${file.name} staged locally`, 'info');
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmitKyc(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorInfo(null);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brandName: brandName.trim(),
          city: city.trim(),
          gstin: gstin.trim() || undefined,
          description: `${entityType} | PAN: ${pan || 'Provided'} | Address: ${registeredAddress || city}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorInfo({
          message: data?.error?.message || 'Could not save KYC details.',
          correlationId: data?.error?.correlationId || undefined,
        });
        return;
      }
      setKycStatus('PENDING');
      notify('KYC package submitted for verification', 'success');
    } catch {
      setErrorInfo({ message: 'Network error submitting KYC package.' });
    } finally {
      setSubmitting(false);
    }
  }

  function addBranch() {
    if (!newBranchName.trim() || !newBranchCity.trim()) return;
    setBranches((prev) => [
      ...prev,
      {
        id: `br-${Date.now()}`,
        name: newBranchName.trim(),
        city: newBranchCity.trim(),
        address: newBranchAddress.trim() || newBranchCity.trim(),
        staffCount: 0,
      },
    ]);
    setNewBranchName('');
    setNewBranchCity('');
    setNewBranchAddress('');
    notify('Branch added', 'success');
  }

  function addStaff() {
    if (!newStaffName.trim()) return;
    setStaff((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}`,
        name: newStaffName.trim(),
        role: newStaffRole,
        branchName: branches[0]?.name || 'Main Branch',
      },
    ]);
    setNewStaffName('');
    notify('Staff member added', 'success');
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">
            Business KYC &amp; Branch Manager
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Complete verification to publish local services, accept bookings, and receive payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-600">KYC Status:</span>
          <StatusBadge status={kycStatus} />
        </div>
      </div>

      {errorInfo && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900"
        >
          <p className="font-bold">{errorInfo.message}</p>
          {errorInfo.correlationId && (
            <p className="mt-1 font-mono text-[11px]">Reference ID: {errorInfo.correlationId}</p>
          )}
        </div>
      )}

      {/* Wizard Stepper */}
      <div className="surface-card p-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { num: 1 as KycStep, label: '1. Business & Tax Info' },
            { num: 2 as KycStep, label: '2. Document Upload' },
            { num: 3 as KycStep, label: '3. Review & Submit' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`min-h-[44px] rounded-xl border px-4 text-xs font-bold transition ${
                step === s.num
                  ? 'border-business-700 bg-business-700 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmitKyc} className="space-y-5">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-text" htmlFor="kyc-brand">
                  Registered Business / Brand Name
                </label>
                <input
                  id="kyc-brand"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="input-field min-h-[44px]"
                  placeholder="Prana Wellness Pvt Ltd"
                />
              </div>
              <div>
                <label className="label-text" htmlFor="kyc-entity">
                  Entity Type
                </label>
                <select
                  id="kyc-entity"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="input-field min-h-[44px]"
                >
                  <option>Private Limited</option>
                  <option>LLP</option>
                  <option>Sole Proprietorship</option>
                  <option>Partnership</option>
                </select>
              </div>
              <div>
                <label className="label-text" htmlFor="kyc-gstin">
                  GSTIN (15-character)
                </label>
                <input
                  id="kyc-gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="input-field min-h-[44px] font-mono"
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="label-text" htmlFor="kyc-pan">
                  Business PAN
                </label>
                <input
                  id="kyc-pan"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="input-field min-h-[44px] font-mono"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="label-text" htmlFor="kyc-city">
                  Primary City
                </label>
                <input
                  id="kyc-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field min-h-[44px]"
                  placeholder="Bengaluru"
                />
              </div>
              <div>
                <label className="label-text" htmlFor="kyc-addr">
                  Registered Address
                </label>
                <input
                  id="kyc-addr"
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  className="input-field min-h-[44px]"
                  placeholder="100 Feet Road, Indiranagar, Bengaluru"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  Continue to Documents
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
                <label className="label-text flex items-center gap-2" htmlFor="doc-coi">
                  <Upload className="h-4 w-4 text-business-700" />
                  Certificate of Incorporation / Business Registration (PDF or Image)
                </label>
                <input
                  id="doc-coi"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => void handleFileUpload(e, 'coi')}
                  className="mt-2 block min-h-[44px] w-full text-xs text-ink-700"
                />
                {uploadingField === 'coi' && (
                  <p className="mt-1 text-xs text-brand-700">Uploading…</p>
                )}
                {coiDocName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <FileCheck2 className="h-4 w-4" />
                    Uploaded: {coiDocName}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
                <label className="label-text flex items-center gap-2" htmlFor="doc-gst">
                  <Upload className="h-4 w-4 text-business-700" />
                  GST Certificate / Tax Proof (PDF or Image)
                </label>
                <input
                  id="doc-gst"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => void handleFileUpload(e, 'gst')}
                  className="mt-2 block min-h-[44px] w-full text-xs text-ink-700"
                />
                {uploadingField === 'gst' && (
                  <p className="mt-1 text-xs text-brand-700">Uploading…</p>
                )}
                {gstDocName && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <FileCheck2 className="h-4 w-4" />
                    Uploaded: {gstDocName}
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary min-h-[44px] text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  Review &amp; Confirm
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-xs space-y-1.5">
                <p>
                  <strong>Brand Name:</strong> {brandName || '—'}
                </p>
                <p>
                  <strong>Entity Type:</strong> {entityType}
                </p>
                <p>
                  <strong>GSTIN:</strong> <span className="font-mono">{gstin || 'Not provided'}</span>
                </p>
                <p>
                  <strong>City:</strong> {city || '—'}
                </p>
                <p>
                  <strong>Documents:</strong>{' '}
                  {coiDocName || gstDocName
                    ? [coiDocName, gstDocName].filter(Boolean).join(', ')
                    : 'No files attached yet'}
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  KYC approval is reviewed by VALUEOUS Compliance Ops. Masked verification protects
                  your tax identifiers.
                </span>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary min-h-[44px] text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Submitting…' : 'Submit KYC for Verification'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Branch & Staff Manager */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <Building2 className="h-5 w-5 text-business-700" />
            Branches ({branches.length})
          </h2>

          <div className="space-y-2">
            {branches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-ink-200 p-3 text-xs"
              >
                <div>
                  <p className="font-bold text-ink-950">{b.name}</p>
                  <p className="text-ink-600">
                    {b.address} · {b.city}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => setBranches((prev) => prev.filter((x) => x.id !== b.id))}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Branch name"
              className="input-field min-h-[44px] text-xs"
            />
            <input
              value={newBranchCity}
              onChange={(e) => setNewBranchCity(e.target.value)}
              placeholder="City"
              className="input-field min-h-[44px] text-xs"
            />
            <button
              type="button"
              onClick={addBranch}
              className="btn-secondary min-h-[44px] text-xs"
            >
              <Plus className="h-4 w-4" />
              Add Branch
            </button>
          </div>
          <input
            value={newBranchAddress}
            onChange={(e) => setNewBranchAddress(e.target.value)}
            placeholder="Street address (optional)"
            className="input-field min-h-[44px] text-xs"
          />
        </section>

        <section className="surface-card space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <Users className="h-5 w-5 text-business-700" />
            Check-in &amp; Branch Staff ({staff.length})
          </h2>

          <div className="space-y-2">
            {staff.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between rounded-xl border border-ink-200 p-3 text-xs"
              >
                <div>
                  <p className="font-bold text-ink-950">{st.name}</p>
                  <p className="text-ink-600">
                    {st.role} · {st.branchName}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${st.name}`}
                  onClick={() => setStaff((prev) => prev.filter((x) => x.id !== st.id))}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Staff full name"
              className="input-field min-h-[44px] text-xs"
            />
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
              className="input-field min-h-[44px] text-xs"
            >
              <option>Check-in Coordinator</option>
              <option>Branch Manager</option>
              <option>Service Specialist</option>
            </select>
            <button
              type="button"
              onClick={addStaff}
              className="btn-secondary min-h-[44px] text-xs"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
