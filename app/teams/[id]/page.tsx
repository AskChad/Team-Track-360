'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Team {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  sports?: {
    name: string;
    icon_url?: string;
  };
  parent_organizations?: {
    name: string;
  };
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  jersey_number?: number;
  position?: string;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchTeamDetails(token);
    fetchTeamMembers(token);
  }, [teamId]);

  const fetchTeamDetails = async (token: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch team');
        setLoading(false);
        return;
      }

      setTeam(data.data.team);
      setLoading(false);
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (token: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setMembers(data.data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Team not found'}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'roster', name: 'Roster', icon: '👥' },
    { id: 'events', name: 'Events', icon: '📅' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div
            className="h-32 flex items-center justify-center"
            style={{ backgroundColor: team.primary_color || '#3B82F6' }}
          >
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="h-20 w-20 object-contain" />
            ) : (
              <div className="text-white text-4xl font-bold">
                {team.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{team.name}</h1>
                {team.description && (
                  <p className="text-gray-600 mb-4">{team.description}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {team.sports && (
                    <span className="flex items-center">
                      <span className="mr-2">🏅</span>
                      {team.sports.name}
                    </span>
                  )}
                  {team.parent_organizations && (
                    <span className="flex items-center">
                      <span className="mr-2">🏢</span>
                      {team.parent_organizations.name}
                    </span>
                  )}
                  <span className="flex items-center">
                    <span className="mr-2">👥</span>
                    {members.length} members
                  </span>
                </div>
              </div>

              <button className="btn-primary">
                + Add Member
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200">
            <div className="flex space-x-1 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Total Members</p>
                  <p className="text-3xl font-bold text-gray-900">{members.length}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Active Athletes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {members.filter((m) => m.role === 'athlete' && m.status === 'active').length}
                  </p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-600 mb-1">Upcoming Events</p>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Team created and ready for action! Add members, schedule events, and start tracking performance.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Team Roster</h2>
                <button className="btn-primary">+ Add Member</button>
              </div>

              {members.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Yet</h3>
                  <p className="text-gray-600 mb-4">Add your first team member to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jersey #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium mr-3">
                                {member.profiles.avatar_url ? (
                                  <img
                                    src={member.profiles.avatar_url}
                                    alt={member.profiles.full_name}
                                    className="w-full h-full rounded-full"
                                  />
                                ) : (
                                  member.profiles.full_name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {member.profiles.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.profiles.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="badge-blue">{member.role}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.jersey_number || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.position || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={member.status === 'active' ? 'badge-green' : 'badge-gray'}>
                              {member.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Team Events</h2>
                <button className="btn-primary">+ Create Event</button>
              </div>

              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Scheduled</h3>
                <p className="text-gray-600 mb-4">Create your first event to get started</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Settings</h2>
              <p className="text-gray-600">Team settings will be available here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
