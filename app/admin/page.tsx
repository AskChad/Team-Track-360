'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  total_users: number;
  total_organizations: number;
  total_teams: number;
  total_athletes: number;
  total_events: number;
  total_competitions: number;
  total_locations: number;
  total_rosters: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(userStr);
    setUser(userData);

    // Check if user is platform admin
    if (userData.platform_role !== 'platform_admin' && userData.platform_role !== 'super_admin') {
      router.push('/');
      return;
    }

    fetchStats(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
      // Fetch counts from various endpoints
      const [orgsRes, teamsRes, athletesRes, eventsRes, compsRes, locsRes, rostersRes, usersRes] = await Promise.all([
        fetch('/api/organizations', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/teams', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/athletes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/competitions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/locations', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/rosters', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const [orgsData, teamsData, athletesData, eventsData, compsData, locsData, rostersData, usersData] = await Promise.all([
        orgsRes.json(),
        teamsRes.json(),
        athletesRes.json(),
        eventsRes.json(),
        compsRes.json(),
        locsRes.json(),
        rostersRes.json(),
        usersRes.json(),
      ]);

      setStats({
        total_users: usersData.data?.length || 0,
        total_organizations: orgsData.data?.count || 0,
        total_teams: teamsData.data?.count || 0,
        total_athletes: athletesData.data?.count || 0,
        total_events: eventsData.data?.count || 0,
        total_competitions: compsData.data?.count || 0,
        total_locations: locsData.data?.length || 0,
        total_rosters: rostersData.data?.count || 0,
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
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
              <h1 className="text-3xl font-bold">System Administration</h1>
              <p className="text-gray-200 mt-1">Platform management and configuration</p>
            </div>
            <Link
              href="/"
              className="bg-white text-wrestling-navy px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
            >
              Back to Dashboard
            </Link>
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 px-6 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'organizations', name: 'Organizations' },
                { id: 'teams', name: 'Teams' },
                { id: 'athletes', name: 'Athletes' },
                { id: 'locations', name: 'Locations' },
                { id: 'competitions', name: 'Competitions' },
                { id: 'rosters', name: 'Rosters' },
                { id: 'settings', name: 'Settings' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-wrestling-blue text-wrestling-navy'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && stats && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Overview</h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Total Users</p>
                    <p className="text-4xl font-bold">{stats.total_users}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Organizations</p>
                    <p className="text-4xl font-bold">{stats.total_organizations}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Teams</p>
                    <p className="text-4xl font-bold">{stats.total_teams}</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Athletes</p>
                    <p className="text-4xl font-bold">{stats.total_athletes}</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Events</p>
                    <p className="text-4xl font-bold">{stats.total_events}</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Competitions</p>
                    <p className="text-4xl font-bold">{stats.total_competitions}</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Locations</p>
                    <p className="text-4xl font-bold">{stats.total_locations}</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
                    <p className="text-sm font-bold opacity-90 mb-1">Rosters</p>
                    <p className="text-4xl font-bold">{stats.total_rosters}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'organizations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Organizations</h2>
                  <button
                    onClick={() => handleNavigate('/organizations')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Organizations
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all organizations in the system
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full organizations management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Teams</h2>
                  <button
                    onClick={() => handleNavigate('/teams')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Teams
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all teams across all organizations
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full teams management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'athletes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Athletes</h2>
                  <button
                    onClick={() => handleNavigate('/athletes')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Athletes
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all athlete profiles in the system
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full athletes management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'locations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Locations</h2>
                  <button
                    onClick={() => handleNavigate('/locations')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Locations
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all venue locations
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full locations management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'competitions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Competitions</h2>
                  <button
                    onClick={() => handleNavigate('/competitions')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Competitions
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all competitions
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full competitions management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'rosters' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Rosters</h2>
                  <button
                    onClick={() => handleNavigate('/rosters')}
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Go to Rosters
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    View and manage all event rosters
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the button above to access the full rosters management page
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Settings</h2>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Database Information</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-bold text-gray-600">Environment</dt>
                        <dd className="text-sm text-gray-900">Production</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-bold text-gray-600">Database Type</dt>
                        <dd className="text-sm text-gray-900">Supabase PostgreSQL</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Application Version</h3>
                    <p className="text-sm text-gray-600 mb-4">Team Track 360 v1.0.0</p>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 mt-6">Role Hierarchy</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li><span className="font-bold text-red-600">Platform Admin:</span> Full system access</li>
                      <li><span className="font-bold text-purple-600">Organization Admin:</span> Manage organization and all teams below</li>
                      <li><span className="font-bold text-blue-600">Team Admin:</span> Manage specific team only</li>
                      <li><span className="font-bold text-gray-600">User:</span> View-only access</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
