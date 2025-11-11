'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone_number?: string;
  email?: string;
  website_url?: string;
  logo_url?: string;
  team_count?: number;
  sport_ids?: string[];
  sports?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  created_at: string;
}

interface Sport {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  team_type?: string;
  sports?: {
    id: string;
    name: string;
  };
}

export default function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [formData, setFormData] = useState<Partial<Organization>>({});

  useEffect(() => {
    fetchOrganization();
    fetchTeams();
    fetchSports();
  }, [params.id]);

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch organization details
      const response = await fetch(`/api/organizations/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const org = data.data.organization;
        setOrganization(org);
        // Prepare form data with sport IDs
        setFormData({
          ...org,
          sport_ids: org.sports?.map((s: any) => s.id) || [],
        });
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load organization');
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/teams?organization_id=${params.id}`, {
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        setError('');
        fetchOrganization(); // Refresh data
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update organization');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/organizations');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete organization');
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

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h2>
          <Link href="/organizations" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Organizations
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
              <Link href="/organizations" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Organizations
              </Link>
              <div className="flex items-center gap-4">
                {organization.logo_url && (
                  <img
                    src={organization.logo_url}
                    alt={`${organization.name} logo`}
                    className="w-16 h-16 rounded bg-white p-1"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold">{organization.name}</h1>
                  {organization.slug && (
                    <p className="text-gray-200 mt-1 font-mono text-sm">/{organization.slug}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
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
                  onClick={() => { setIsEditing(false); setError(''); }}
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Organization</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    placeholder="organization-name"
                  />
                </div>
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Sports</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-4">
                  {sports.map((sport) => (
                    <label key={sport.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.sport_ids?.includes(sport.id) || false}
                        onChange={(e) => {
                          const currentIds = formData.sport_ids || [];
                          const newIds = e.target.checked
                            ? [...currentIds, sport.id]
                            : currentIds.filter(id => id !== sport.id);
                          setFormData({ ...formData, sport_ids: newIds });
                        }}
                        className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                      />
                      <span className="text-sm text-gray-700">{sport.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone_number || ''}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.website_url || ''}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    maxLength={2}
                    placeholder="CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip || ''}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    placeholder="12345"
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
                  onClick={() => { setIsEditing(false); setError(''); }}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              {organization.description ? (
                <p className="text-gray-700">{organization.description}</p>
              ) : (
                <p className="text-gray-400 italic">No description provided</p>
              )}
            </div>

            {/* Sports */}
            {organization.sports && organization.sports.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sports</h2>
                <div className="flex flex-wrap gap-2">
                  {organization.sports.map((sport) => (
                    <span
                      key={sport.id}
                      className="inline-block px-4 py-2 text-sm font-bold rounded-lg bg-wrestling-blue bg-opacity-10 text-wrestling-navy"
                    >
                      {sport.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Teams ({teams.length})
                </h2>
                <Link
                  href={`/teams?organization_id=${params.id}&create=true`}
                  className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 text-sm"
                >
                  + Create Team
                </Link>
              </div>

              {teams.length === 0 ? (
                <p className="text-gray-600">No teams found for this organization</p>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="block p-4 rounded-lg border border-gray-200 hover:border-wrestling-blue hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{team.name}</h3>
                          {team.sports && (
                            <p className="text-sm text-gray-600">{team.sports.name}</p>
                          )}
                        </div>
                        <span className="text-wrestling-blue font-semibold text-sm">
                          View →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>

              <dl className="space-y-3">
                {organization.email && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${organization.email}`}
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        {organization.email}
                      </a>
                    </dd>
                  </div>
                )}

                {organization.phone_number && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${organization.phone_number}`}
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        {organization.phone_number}
                      </a>
                    </dd>
                  </div>
                )}

                {organization.website_url && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Website</dt>
                    <dd>
                      <a
                        href={organization.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        Visit Website →
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Location */}
            {(organization.address || organization.city) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>

                <div className="text-gray-700">
                  {organization.address && <div>{organization.address}</div>}
                  {organization.city && (
                    <div>
                      {organization.city}{organization.state && `, ${organization.state}`} {organization.zip}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Stats</h2>

              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Teams</dt>
                  <dd className="text-2xl font-bold text-wrestling-navy">{teams.length}</dd>
                </div>

                {organization.created_at && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Member Since</dt>
                    <dd className="text-gray-700">{formatDate(organization.created_at)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
