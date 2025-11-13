'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  status: string;
  event_types?: {
    name: string;
    color: string;
    icon: string;
  };
  locations?: {
    name: string;
    city: string;
    state: string;
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
  color: string;
  icon: string;
  sport_id?: string;
}

interface Location {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    team_id: '',
    name: '',
    description: '',
    event_type_id: '',
    location_id: '',
    event_date: '',
    start_time: '',
    end_time: '',
    weigh_in_time: '',
    check_in_time: '',
  });

  // Check if user can create events (Platform Admin or has teams)
  const canCreateEvent = (user?.platform_role === 'platform_admin' || user?.platform_role === 'super_admin') || teams.length > 0;

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchTeams(token);
    fetchEventTypes(token);
    fetchLocations(token);
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetchEvents(token, selectedTeam);
      }
    }
  }, [selectedTeam]);

  const fetchTeams = async (token: string) => {
    try {
      const response = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success && data.data.teams.length > 0) {
        setTeams(data.data.teams);
        setSelectedTeam(data.data.teams[0].id);
        setFormData(prev => ({ ...prev, team_id: data.data.teams[0].id }));
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setLoading(false);
    }
  };

  const fetchEvents = async (token: string, teamId: string) => {
    try {
      const response = await fetch(`/api/events?team_id=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setEvents(data.data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchEventTypes = async (token: string) => {
    try {
      const response = await fetch('/api/event-types', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setEventTypes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch event types:', err);
    }
  };

  const fetchLocations = async (token: string) => {
    try {
      const response = await fetch('/api/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          team_id: selectedTeam,
          name: '',
          description: '',
          event_type_id: '',
          location_id: '',
          event_date: '',
          start_time: '',
          end_time: '',
          weigh_in_time: '',
          check_in_time: '',
        });
        if (selectedTeam) {
          fetchEvents(token!, selectedTeam);
        }
      } else {
        setError(data.error || 'Failed to create event');
      }
    } catch (err) {
      setError('Failed to create event');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">Manage team practices, competitions, and meetings</p>
          </div>
          {canCreateEvent && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + Create Event
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        {teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === 'list'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === 'calendar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events List */}
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Scheduled</h3>
            <p className="text-gray-600 mb-4">Create your first event to get started</p>
            {canCreateEvent && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                + Create Event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {event.event_types && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: event.event_types.color + '20',
                            color: event.event_types.color,
                          }}
                        >
                          {event.event_types.icon} {event.event_types.name}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {event.name}
                    </h3>

                    {event.description && (
                      <p className="text-gray-600 mb-3">{event.description}</p>
                    )}

                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.event_date)}
                      </span>

                      {event.start_time && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </span>
                      )}

                      {event.locations && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.locations.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Team *
                  </label>
                  <select
                    required
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Team Practice, Match vs. Lincoln"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Event Type *
                    </label>
                    <select
                      required
                      value={formData.event_type_id}
                      onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      {eventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={formData.location_id}
                      onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Weigh-in Time
                    </label>
                    <input
                      type="time"
                      value={formData.weigh_in_time}
                      onChange={(e) => setFormData({ ...formData, weigh_in_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={formData.check_in_time}
                      onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
                  >
                    Create Event
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
