'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface SlotRecord {
  id: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
  confirmed: number;
}

function buildInitialSlots(): SlotRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return [
    {
      id: 'slot-1',
      serviceId: 'default',
      date: today,
      startTime: '10:00',
      endTime: '11:00',
      capacity: 6,
      reserved: 1,
      confirmed: 3,
    },
    {
      id: 'slot-2',
      serviceId: 'default',
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      capacity: 4,
      reserved: 0,
      confirmed: 2,
    },
    {
      id: 'slot-3',
      serviceId: 'default',
      date: tomorrow,
      startTime: '17:30',
      endTime: '18:30',
      capacity: 5,
      reserved: 0,
      confirmed: 1,
    },
  ];
}

export default function BusinessAvailabilityPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('default');
  const [slots, setSlots] = useState<SlotRecord[]>(buildInitialSlots);

  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newStart, setNewStart] = useState('11:30');
  const [newEnd, setNewEnd] = useState('12:30');
  const [newCap, setNewCap] = useState('4');

  useEffect(() => {
    fetch('/api/business/products', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = (data?.products || []).map((p: Record<string, unknown>) => ({
          id: String(p.id),
          title: String(p.title || p.name || 'Service'),
        }));
        if (list.length > 0) {
          setServices(list);
          setSelectedServiceId(list[0].id);
        } else {
          setServices([{ id: 'default', title: 'Primary Service Package' }]);
        }
      })
      .catch(() => {
        setServices([{ id: 'default', title: 'Primary Service Package' }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleSlots = useMemo(
    () =>
      slots.filter(
        (s) => s.serviceId === selectedServiceId || s.serviceId === 'default'
      ),
    [slots, selectedServiceId]
  );

  function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (newEnd <= newStart) {
      notify('End time must be after start time.', 'error');
      return;
    }
    const overlap = visibleSlots.some(
      (s) =>
        s.date === newDate &&
        ((newStart >= s.startTime && newStart < s.endTime) ||
          (newEnd > s.startTime && newEnd <= s.endTime))
    );
    if (overlap) {
      notify('Overlapping slot detected for this date and service.', 'error');
      return;
    }

    const cap = Math.max(1, Number(newCap) || 1);
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}`,
        serviceId: selectedServiceId,
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        capacity: cap,
        reserved: 0,
        confirmed: 0,
      },
    ]);
    notify('Availability slot added', 'success');
  }

  function handleDeleteSlot(slot: SlotRecord) {
    if (slot.reserved + slot.confirmed > 0) {
      notify('Cannot delete a slot with active holds or confirmed bookings.', 'error');
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    notify('Slot removed', 'info');
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">
            Availability Calendar &amp; Slots
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Manage bookable time windows (IST). Overlaps and over-capacity bookings are blocked.
          </p>
        </div>

        <select
          aria-label="Select service"
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="input-field min-h-[44px] max-w-xs text-xs"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Add Slot Form */}
      <form onSubmit={handleAddSlot} className="surface-card grid gap-3 p-5 sm:grid-cols-5">
        <div>
          <label className="label-text" htmlFor="slot-date">
            Date
          </label>
          <input
            id="slot-date"
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="input-field min-h-[44px] text-xs"
          />
        </div>
        <div>
          <label className="label-text" htmlFor="slot-start">
            Start (IST)
          </label>
          <input
            id="slot-start"
            type="time"
            required
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="input-field min-h-[44px] text-xs"
          />
        </div>
        <div>
          <label className="label-text" htmlFor="slot-end">
            End (IST)
          </label>
          <input
            id="slot-end"
            type="time"
            required
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="input-field min-h-[44px] text-xs"
          />
        </div>
        <div>
          <label className="label-text" htmlFor="slot-cap">
            Capacity
          </label>
          <input
            id="slot-cap"
            type="number"
            min={1}
            required
            value={newCap}
            onChange={(e) => setNewCap(e.target.value)}
            className="input-field min-h-[44px] text-xs"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary min-h-[44px] w-full text-xs">
            <Plus className="h-4 w-4" />
            Add Slot
          </button>
        </div>
      </form>

      {/* Calendar Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {visibleSlots.map((slot) => {
          const used = slot.reserved + slot.confirmed;
          const remaining = Math.max(0, slot.capacity - used);
          return (
            <div key={slot.id} className="surface-card space-y-2 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-950">
                  <Calendar className="h-4 w-4 text-business-700" />
                  {slot.date}
                </span>
                <button
                  type="button"
                  aria-label="Delete slot"
                  onClick={() => handleDeleteSlot(slot)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-brand-700">
                <Clock className="h-4 w-4" />
                {slot.startTime} – {slot.endTime} IST
              </p>
              <div className="flex items-center justify-between text-xs text-ink-600">
                <span>Confirmed: {slot.confirmed}</span>
                <span>Held: {slot.reserved}</span>
                <span className="font-bold text-emerald-700">Open: {remaining}/{slot.capacity}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
