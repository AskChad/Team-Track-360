'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  team_id: string;
  title: string;
  description?: string;
  event_type_id?: string;
  location_id?: string;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  is_mandatory: boolean;
  max_attendees?: number;
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
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setEvent(data.data);
        setFormData(data.data);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load event');
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
        body: JSON.stringify({
          ...formData,
          max_attendees: formData.max_attendees ? parseInt(formData.max_attendees.toString()) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEvent(data.data);
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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
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
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <div className="flex gap-2 mt-2">
                {event.event_types && (
                  <span
                    className="inline-block px-2 py-1 text-sm font-bold rounded"
                    style={{ backgroundColor: event.event_types.color || '#4B5563' }}
                  >
                    {event.event_types.name}
                  </span>
                )}
                {event.is_mandatory && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-red-500">
                    Mandatory
                  </span>
                )}
                {event.all_day && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-wrestling-teal bg-opacity-50">
                    All Day
                  </span>
                )}
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Date/Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Date/Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time ? new Date(formData.end_time).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Max Attendees</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_attendees || ''}
                  onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="all_day_edit"
                    checked={formData.all_day || false}
                    onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="all_day_edit" className="text-sm font-bold text-gray-700">
                    All-day event
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_mandatory_edit"
                    checked={formData.is_mandatory || false}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="is_mandatory_edit" className="text-sm font-bold text-gray-700">
                    Mandatory attendance
                  </label>
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
                <dt className="text-sm font-bold text-gray-500 mb-1">Start Time</dt>
                <dd className="text-gray-900">
                  {new Date(event.start_time).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>

              {event.end_time && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">End Time</dt>
                  <dd className="text-gray-900">
                    {new Date(event.end_time).toLocaleString('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </dd>
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

              {event.max_attendees && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Max Attendees</dt>
                  <dd className="text-gray-900">{event.max_attendees}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">All Day Event</dt>
                <dd className="text-gray-900">
                  {event.all_day ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Mandatory</dt>
                <dd className="text-gray-900">
                  {event.is_mandatory ? (
                    <span className="text-red-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
