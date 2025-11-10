'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  full_name?: string;
  platform_role?: string;
  created_at: string;
}

interface AdminRole {
  id: string;
  user_id: string;
  role_type: string;
  organization_id?: string;
  team_id?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
  parent_organizations?: {
    name: string;
  };
  teams?: {
    name: string;
  };
}

interface Stats {
  total_users: number;
  total_organizations: number;
  total_teams: number;
  total_athletes: number;
  total_events: number;
  total_competitions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
    fetchAdminRoles(token);
    fetchUsers(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
      // Fetch counts from various endpoints
      const [orgsRes, teamsRes, athletesRes, eventsRes, compsRes] = await Promise.all([
        fetch('/api/organizations', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/teams', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/athletes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/competitions', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const [orgsData, teamsData, athletesData, eventsData, compsData] = await Promise.all([
        orgsRes.json(),
        teamsRes.json(),
        athletesRes.json(),
        eventsRes.json(),
        compsRes.json(),
      ]);

      setStats({
        total_users: 0, // We'll update this when we fetch users
        total_organizations: orgsData.data?.count || 0,
        total_teams: teamsData.data?.count || 0,
        total_athletes: athletesData.data?.count || 0,
        total_events: eventsData.data?.count || 0,
        total_competitions: compsData.data?.count || 0,
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const fetchAdminRoles = async (token: string) => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAdminRoles(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin roles:', err);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
        if (stats) {
          setStats({ ...stats, total_users: data.data?.length || 0 });
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
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
            <div className="flex space-x-1 px-6">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'users', name: 'Users' },
                { id: 'roles', name: 'Admin Roles' },
                { id: 'settings', name: 'Settings' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                      href="/organizations"
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-wrestling-blue hover:shadow-sm transition-all"
                    >
                      <span className="font-bold text-gray-900">Manage Organizations</span>
                      <span className="text-wrestling-blue">→</span>
                    </Link>

                    <Link
                      href="/teams"
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-wrestling-blue hover:shadow-sm transition-all"
                    >
                      <span className="font-bold text-gray-900">Manage Teams</span>
                      <span className="text-wrestling-blue">→</span>
                    </Link>

                    <Link
                      href="/locations"
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-wrestling-blue hover:shadow-sm transition-all"
                    >
                      <span className="font-bold text-gray-900">Manage Locations</span>
                      <span className="text-wrestling-blue">→</span>
                    </Link>

                    <Link
                      href="/athletes"
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-wrestling-blue hover:shadow-sm transition-all"
                    >
                      <span className="font-bold text-gray-900">Manage Athletes</span>
                      <span className="text-wrestling-blue">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>

                {users.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Platform Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">
                                {user.full_name || 'No name'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                                  user.platform_role === 'platform_admin' || user.platform_role === 'super_admin'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {user.platform_role || 'user'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'roles' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Role Assignments</h2>

                {adminRoles.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <p>No admin roles assigned</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Role Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Scope
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adminRoles.map((role) => (
                          <tr key={role.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">
                                {role.profiles?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-600">{role.profiles?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                                  role.role_type === 'platform_admin' || role.role_type === 'super_admin'
                                    ? 'bg-red-100 text-red-800'
                                    : role.role_type === 'org_admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {role.role_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {role.parent_organizations?.name || role.teams?.name || 'System-wide'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(role.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Settings</h2>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Database Information</h3>
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
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Application Version</h3>
                    <p className="text-sm text-gray-600">Team Track 360 v1.0.0</p>
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
