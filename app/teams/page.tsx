'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  sport_id: string;
  organization_id: string;
  season: string;
  age_group?: string;
  description?: string;
  team_logo_url?: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
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

export default function TeamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    organization_id: '',
    sport_id: '',
    team_type: 'team',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  // Check if user can create teams (Platform Admin or has access to orgs)
  const canCreateTeam = user?.platform_role === 'platform_admin' || organizations.length > 0;

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchTeams();
    fetchOrganizations();
    fetchSports();
  }, []);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load teams');
        setLoading(false);
        return;
      }

      setTeams(data.data.teams || []);
      setLoading(false);
    } catch (err: any) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create team');
        setCreating(false);
        return;
      }

      // Reset form and close modal
      setFormData({
        name: '',
        slug: '',
        organization_id: '',
        sport_id: '',
        team_type: 'team',
        description: '',
      });
      setShowCreateModal(false);
      setCreating(false);

      // Refresh teams list
      fetchTeams();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
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
              <h1 className="text-3xl font-bold">Teams</h1>
              <p className="text-gray-200 mt-2">Manage your sports teams</p>
            </div>
            <div className="flex gap-3">
              {canCreateTeam && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                >
                  + Create Team
                </button>
              )}
              <Link
                href="/dashboard"
                className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                Back to Dashboard
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

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Teams Yet</h3>
            <p className="text-gray-600 mb-6">Create your first team to get started</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Team Logo */}
                {team.team_logo_url ? (
                  <div className="w-16 h-16 mb-4 rounded-full bg-wrestling-blue bg-opacity-10 flex items-center justify-center">
                    <img
                      src={team.team_logo_url}
                      alt={team.name}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 mb-4 rounded-full bg-wrestling-blue bg-opacity-10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-wrestling-navy">
                      {team.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Team Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h3>

                {team.age_group && (
                  <p className="text-sm text-gray-600 mb-2">Age Group: {team.age_group}</p>
                )}

                {team.season && (
                  <p className="text-sm text-gray-600 mb-2">Season: {team.season}</p>
                )}

                {team.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {team.description}
                  </p>
                )}

                {/* View Team Button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-wrestling-blue font-semibold text-sm hover:text-wrestling-navy">
                    View Team →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Team</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTeam}>
                <div className="space-y-4">
                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Team Name *
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
                      placeholder="e.g., Varsity Wrestling"
                    />
                  </div>

                  {/* Slug (auto-generated) */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Slug (URL-friendly name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="varsity-wrestling"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but you can edit it</p>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Organization *
                    </label>
                    <select
                      required
                      value={formData.organization_id}
                      onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sport */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Sport *
                    </label>
                    <select
                      required
                      value={formData.sport_id}
                      onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Team Type *
                    </label>
                    <select
                      required
                      value={formData.team_type}
                      onChange={(e) => setFormData({ ...formData, team_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="team">Team (School)</option>
                      <option value="club">Club (Non-School)</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      rows={3}
                      placeholder="Brief description of the team..."
                    />
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
                    {creating ? 'Creating...' : 'Create Team'}
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
