'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Competition {
  id: string;
  name: string;
  description?: string;
  competition_type?: string;
  default_location_id?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
  parent_organizations?: {
    id: string;
    name: string;
  };
  sports?: {
    id: string;
    name: string;
  };
  locations?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
  };
}

interface Organization {
  id: string;
  name: string;
}

interface Sport {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export default function CompetitionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Competition>>({});

  useEffect(() => {
    fetchCompetition();
    fetchOrganizations();
    fetchSports();
    fetchLocations();
  }, [params.id]);

  const fetchCompetition = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/competitions/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setCompetition(data.data);
        setFormData(data.data);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load competition');
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load organizations');
    }
  };

  const fetchSports = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/sports', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSports(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load sports');
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
      const response = await fetch(`/api/competitions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setCompetition(data.data);
        setIsEditing(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update competition');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this competition?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/competitions/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/competitions');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete competition');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Competition Not Found</h2>
          <Link href="/competitions" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Competitions
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
              <Link href="/competitions" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Competitions
              </Link>
              <h1 className="text-3xl font-bold">{competition.name}</h1>
              <div className="flex gap-2 mt-2">
                {competition.competition_type && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-white bg-opacity-20">
                    {competition.competition_type}
                  </span>
                )}
                {competition.is_recurring && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-wrestling-teal bg-opacity-50">
                    Recurring
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Competition</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Competition Name</label>
                <input
                  type="text"
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
                  <label className="block text-sm font-bold text-gray-700 mb-1">Competition Type</label>
                  <select
                    value={formData.competition_type || ''}
                    onChange={(e) => setFormData({ ...formData, competition_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  >
                    <option value="">Select type</option>
                    <option value="tournament">Tournament</option>
                    <option value="dual_meet">Dual Meet</option>
                    <option value="tri_meet">Tri Meet</option>
                    <option value="quad_meet">Quad Meet</option>
                    <option value="invitational">Invitational</option>
                    <option value="championship">Championship</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Default Location</label>
                  <select
                    value={(formData.locations as any)?.id || ''}
                    onChange={(e) => setFormData({ ...formData, default_location_id: e.target.value })}
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring_edit"
                  checked={formData.is_recurring || false}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                />
                <label htmlFor="is_recurring_edit" className="text-sm font-bold text-gray-700">
                  This is a recurring competition
                </label>
              </div>

              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Recurrence Rule</label>
                  <input
                    type="text"
                    value={formData.recurrence_rule || ''}
                    onChange={(e) => setFormData({ ...formData, recurrence_rule: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              )}

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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Competition Details</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {competition.description && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-bold text-gray-500 mb-1">Description</dt>
                  <dd className="text-gray-900">{competition.description}</dd>
                </div>
              )}

              {competition.parent_organizations && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Organization</dt>
                  <dd className="text-gray-900">{competition.parent_organizations.name}</dd>
                </div>
              )}

              {competition.sports && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Sport</dt>
                  <dd className="text-gray-900">{competition.sports.name}</dd>
                </div>
              )}

              {competition.competition_type && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Competition Type</dt>
                  <dd className="text-gray-900 capitalize">{competition.competition_type.replace('_', ' ')}</dd>
                </div>
              )}

              {competition.locations && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Default Location</dt>
                  <dd className="text-gray-900">
                    <Link
                      href={`/locations/${competition.locations.id}`}
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {competition.locations.name}
                      {competition.locations.city && `, ${competition.locations.city}`}
                    </Link>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Recurring</dt>
                <dd className="text-gray-900">
                  {competition.is_recurring ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </dd>
              </div>

              {competition.is_recurring && competition.recurrence_rule && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Recurrence Rule</dt>
                  <dd className="text-gray-900">{competition.recurrence_rule}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
