'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone_number: '',
    email: '',
    website_url: '',
    sport_ids: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  // Only platform admins can create organizations
  const canCreateOrganization = user?.platform_role === 'platform_admin' || user?.platform_role === 'super_admin';

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchOrganizations();
    fetchSports();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data.organizations || []);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load organizations');
      setLoading(false);
    }
  };

  const fetchSports = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/sports', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setSports(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sports:', err);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create organization');
        setCreating(false);
        return;
      }

      // Reset form and close modal
      setFormData({
        name: '',
        slug: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone_number: '',
        email: '',
        website_url: '',
        sport_ids: [],
      });
      setShowCreateModal(false);
      setCreating(false);

      // Refresh organizations list
      fetchOrganizations();
    } catch (err: any) {
      setError('Network error. Please try again.');
      setCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const toggleSport = (sportId: string) => {
    setFormData(prev => ({
      ...prev,
      sport_ids: prev.sport_ids.includes(sportId)
        ? prev.sport_ids.filter(id => id !== sportId)
        : [...prev.sport_ids, sportId]
    }));
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
              <h1 className="text-3xl font-bold">Organizations</h1>
              <p className="text-gray-200 mt-2">View and manage wrestling organizations</p>
            </div>
            <div className="flex gap-3">
              {canCreateOrganization && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                >
                  + Create Organization
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

        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Organizations Found</h3>
            <p className="text-gray-600 mb-6">You don't have access to any organizations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{org.name}</h3>
                    {org.slug && (
                      <p className="text-xs text-gray-500 font-mono mb-2">/{org.slug}</p>
                    )}
                  </div>
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={`${org.name} logo`}
                      className="w-12 h-12 rounded"
                    />
                  ) : (
                    <div className="text-3xl">🏛️</div>
                  )}
                </div>

                {org.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {org.description}
                  </p>
                )}

                <div className="space-y-2 mb-3">
                  {org.sports && org.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {org.sports.map((sport) => (
                        <span
                          key={sport.id}
                          className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy"
                        >
                          {sport.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {(org.city || org.state) && (
                    <p className="text-sm text-gray-600">
                      📍 {org.city}{org.city && org.state && ', '}{org.state}
                    </p>
                  )}

                  {org.team_count !== undefined && (
                    <p className="text-sm text-gray-600">
                      <span className="font-bold">Teams:</span> {org.team_count}
                    </p>
                  )}

                  {org.email && (
                    <p className="text-sm text-gray-600">
                      📧 {org.email}
                    </p>
                  )}

                  {org.phone_number && (
                    <p className="text-sm text-gray-600">
                      📞 {org.phone_number}
                    </p>
                  )}

                  {org.website_url && (
                    <p className="text-sm">
                      <a
                        href={org.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        🌐 Visit Website →
                      </a>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/organizations/${org.id}`}
                    className="text-wrestling-blue font-semibold text-sm hover:text-wrestling-navy"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Organization</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateOrganization}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Organization Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setFormData({
                            ...formData,
                            name,
                            slug: generateSlug(name),
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="e.g., North County Wrestling League"
                      />
                    </div>

                    {/* Slug */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Slug (URL-friendly name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="north-county-wrestling"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but you can edit it</p>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        rows={3}
                        placeholder="Brief description of the organization..."
                      />
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="123 Main Street"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="San Diego"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="CA"
                        maxLength={2}
                      />
                    </div>

                    {/* ZIP */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="92101"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="(619) 555-1234"
                      />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="info@organization.com"
                      />
                    </div>

                    {/* Website */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="https://www.organization.com"
                      />
                    </div>

                    {/* Sports */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Sports (select multiple)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sports.map((sport) => (
                          <label
                            key={sport.id}
                            className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={formData.sport_ids.includes(sport.id)}
                              onChange={() => toggleSport(sport.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{sport.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-wrestling-blue text-white rounded-lg font-bold hover:bg-wrestling-bright transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Organization'}
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
