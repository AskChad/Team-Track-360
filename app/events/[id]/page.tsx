'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  competition_id?: string;
  team_id: string;
  season_id: string;
  name: string;
  description?: string;
  event_type_id?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  arrival_time?: string;        // New: When participants should arrive
  start_datetime?: string;      // New: Full start date/time
  end_datetime?: string;        // New: Full end date/time (for multi-day events)
  location_id?: string;
  status: string;
  weigh_in_time?: string;
  check_in_time?: string;
  registration_deadline?: string;
  is_public: boolean;
  show_results_public: boolean;
  created_at: string;
  updated_at: string;
  teams?: {
    id: string;
    name: string;
  };
  event_types?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  locations?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
  };
  competitions?: {
    id: string;
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
}

interface EventType {
  id: string;
  name: string;
  color?: string;
}

interface Location {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Event>>({});

  useEffect(() => {
    fetchEvent();
    fetchTeams();
    fetchEventTypes();
    fetchLocations();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/events/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      });

      if (!response.ok) {
        // Handle 401 - redirect to login
        if (response.status === 401) {
          console.log('401 Unauthorized - redirecting to login');
          localStorage.removeItem('auth_token'); // Clear invalid token
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
          return;
        }

        const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        setError(data.error || `Failed to load event (${response.status})`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Event data received:', data);

      if (data.success && data.data && data.data.event) {
        setEvent(data.data.event);
        setFormData(data.data.event);
      } else {
        console.error('Invalid response structure:', data);
        setError(data.error || 'Event not found');
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Fetch event error:', err);
      setError(`Failed to load event: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setTeams(data.data.teams || []);
      }
    } catch (err) {
      console.error('Failed to load teams');
    }
  };

  const fetchEventTypes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/event-types', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEventTypes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load event types');
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/locations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load locations');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setEvent(data.data.event);
        setIsEditing(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update event');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/events');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <Link href="/events" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Events
          </Link>
        </div>
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
              <Link href="/events" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Events
              </Link>
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <div className="flex gap-2 mt-2">
                {event.event_types && (
                  <span
                    className="inline-block px-2 py-1 text-sm font-bold rounded"
                    style={{ backgroundColor: event.event_types.color || '#4B5563' }}
                  >
                    {event.event_types.name}
                  </span>
                )}
                <span className={`inline-block px-2 py-1 text-sm font-bold rounded ${
                  event.status === 'scheduled' ? 'bg-blue-500' :
                  event.status === 'in_progress' ? 'bg-green-500' :
                  event.status === 'completed' ? 'bg-gray-500' :
                  event.status === 'cancelled' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
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

        {isEditing ? (
          <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Event</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Team *</label>
                <select
                  required
                  value={formData.team_id || ''}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Type</label>
                  <select
                    value={formData.event_type_id || ''}
                    onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  >
                    <option value="">Select type</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <select
                    value={formData.location_id || ''}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.city && `- ${location.city}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.event_date || ''}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time || ''}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time || ''}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Weigh-in Time</label>
                  <input
                    type="time"
                    value={formData.weigh_in_time || ''}
                    onChange={(e) => setFormData({ ...formData, weigh_in_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Check-in Time</label>
                  <input
                    type="time"
                    value={formData.check_in_time || ''}
                    onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Event Details</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {event.description && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-bold text-gray-500 mb-1">Description</dt>
                  <dd className="text-gray-900">{event.description}</dd>
                </div>
              )}

              {event.teams && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Team</dt>
                  <dd className="text-gray-900">
                    <Link
                      href={`/teams/${event.teams.id}`}
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {event.teams.name}
                    </Link>
                  </dd>
                </div>
              )}

              {event.event_types && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Event Type</dt>
                  <dd className="text-gray-900">{event.event_types.name}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Event Date</dt>
                <dd className="text-gray-900">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    dateStyle: 'full',
                  })}
                </dd>
              </div>

              {event.start_time && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Start Time</dt>
                  <dd className="text-gray-900">{event.start_time}</dd>
                </div>
              )}

              {event.end_time && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">End Time</dt>
                  <dd className="text-gray-900">{event.end_time}</dd>
                </div>
              )}

              {event.locations && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Location</dt>
                  <dd className="text-gray-900">
                    <Link
                      href={`/locations/${event.locations.id}`}
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {event.locations.name}
                      {event.locations.city && `, ${event.locations.city}`}
                      {event.locations.state && `, ${event.locations.state}`}
                    </Link>
                  </dd>
                </div>
              )}

              {event.competitions && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Competition</dt>
                  <dd className="text-gray-900">
                    <Link
                      href={`/competitions/${event.competitions.id}`}
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {event.competitions.name}
                    </Link>
                  </dd>
                </div>
              )}

              {event.weigh_in_time && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Weigh-in Time</dt>
                  <dd className="text-gray-900">{event.weigh_in_time}</dd>
                </div>
              )}

              {event.check_in_time && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Check-in Time</dt>
                  <dd className="text-gray-900">{event.check_in_time}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Status</dt>
                <dd className="text-gray-900">
                  <span className={`inline-block px-2 py-1 text-sm font-bold rounded ${
                    event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    event.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                    event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
