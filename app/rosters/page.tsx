'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Roster {
  id: string;
  name?: string;
  roster_type?: string;
  max_athletes?: number;
  max_per_weight_class?: number;
  created_at: string;
  events?: {
    id: string;
    name: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  };
}

interface Event {
  id: string;
  name: string;
  event_type?: string;
  start_date?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: string;
}

export default function RostersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    event_id: '',
    name: '',
    roster_type: '',
    max_athletes: '',
    max_per_weight_class: '',
  });

  // Check if user can create rosters (Platform Admin or has events)
  const canCreateRoster = user?.platform_role === 'platform_admin' || events.length > 0;

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchRosters();
    fetchEvents();
  }, []);

  const fetchRosters = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/rosters', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setRosters(data.data || []);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load rosters');
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load events');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/rosters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          max_athletes: formData.max_athletes ? parseInt(formData.max_athletes) : null,
          max_per_weight_class: formData.max_per_weight_class ? parseInt(formData.max_per_weight_class) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          event_id: '',
          name: '',
          roster_type: '',
          max_athletes: '',
          max_per_weight_class: '',
        });
        fetchRosters();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create roster');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-wrestling-dark via-wrestling-navy to-wrestling-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Event Rosters</h1>
              <p className="text-gray-200 mt-2">Manage athlete rosters for competitions and events</p>
            </div>
            <div className="flex gap-4">
              {canCreateRoster && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                >
                  + Add Roster
                </button>
              )}
              <Link
                href="/dashboard"
                className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {rosters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Rosters Yet</h3>
            <p className="text-gray-600 mb-6">Create your first event roster</p>
            {canCreateRoster && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright"
              >
                Add Roster
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rosters.map((roster) => (
              <Link
                key={roster.id}
                href={`/rosters/${roster.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {roster.name || 'Unnamed Roster'}
                    </h3>
                    {roster.roster_type && (
                      <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy mb-2">
                        {roster.roster_type}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl">📋</div>
                </div>

                {roster.events && (
                  <div className="mb-3">
                    <div className="text-sm font-bold text-gray-700">{roster.events.name}</div>
                    <div className="text-xs text-gray-500">
                      {roster.events.event_type && <span className="capitalize">{roster.events.event_type}</span>}
                      {roster.events.start_date && (
                        <span> • {formatDate(roster.events.start_date)}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1 text-sm text-gray-600">
                  {roster.max_athletes && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Max Athletes:</span>
                      <span>{roster.max_athletes}</span>
                    </div>
                  )}
                  {roster.max_per_weight_class && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Max Per Weight Class:</span>
                      <span>{roster.max_per_weight_class}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-wrestling-blue font-semibold text-sm">
                    Manage Roster →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Roster</h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Event *
                  </label>
                  <select
                    required
                    value={formData.event_id}
                    onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                  >
                    <option value="">Select event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} {event.start_date && `(${formatDate(event.start_date)})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Roster Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                    placeholder="e.g., Varsity Roster, JV Roster"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Roster Type
                  </label>
                  <select
                    value={formData.roster_type}
                    onChange={(e) => setFormData({ ...formData, roster_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    <option value="varsity">Varsity</option>
                    <option value="junior_varsity">Junior Varsity</option>
                    <option value="freshman">Freshman</option>
                    <option value="combined">Combined</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Max Athletes
                    </label>
                    <input
                      type="number"
                      value={formData.max_athletes}
                      onChange={(e) => setFormData({ ...formData, max_athletes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      placeholder="e.g., 14"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Max Per Weight Class
                    </label>
                    <input
                      type="number"
                      value={formData.max_per_weight_class}
                      onChange={(e) => setFormData({ ...formData, max_per_weight_class: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      placeholder="e.g., 2"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Create Roster
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
