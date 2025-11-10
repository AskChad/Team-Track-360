'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

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

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  state?: string;
  team_count?: number;
  sports?: Array<{ id: string; name: string }>;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  sport_name?: string;
  organization_name?: string;
  city?: string;
  state?: string;
}

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
  team_name?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  venue_type?: string;
  capacity?: number;
}

interface Competition {
  id: string;
  name: string;
  competition_type?: string;
  start_date?: string;
  end_date?: string;
  location_name?: string;
}

interface Roster {
  id: string;
  event_id: string;
  event_name?: string;
  team_name?: string;
  member_count?: number;
  created_at: string;
}

interface Sport {
  id: string;
  name: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Entity states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);

  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Form states
  const [orgFormData, setOrgFormData] = useState({
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

  const [locationFormData, setLocationFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    venue_type: '',
    capacity: '',
    phone: '',
    website_url: '',
  });

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
    fetchSports(token);
  }, []);

  const fetchStats = async (token: string) => {
    try {
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

      // Store data for tabs
      setOrganizations(orgsData.data?.organizations || []);
      setTeams(teamsData.data?.teams || []);
      setAthletes(athletesData.data?.athletes || []);
      setLocations(locsData.data || []);
      setCompetitions(compsData.data?.competitions || []);
      setRosters(rostersData.data?.rosters || []);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const fetchSports = async (token: string) => {
    try {
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orgFormData),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to create organization');
        return;
      }

      // Reset form and refresh
      setOrgFormData({
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
      setShowOrgModal(false);
      if (token) fetchStats(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...locationFormData,
          capacity: locationFormData.capacity ? parseInt(locationFormData.capacity) : null,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to create location');
        return;
      }

      // Reset form and refresh
      setLocationFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        venue_type: '',
        capacity: '',
        phone: '',
        website_url: '',
      });
      setShowLocationModal(false);
      if (token) fetchStats(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const toggleSport = (sportId: string) => {
    setOrgFormData(prev => ({
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
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-r from-wrestling-dark via-wrestling-navy to-wrestling-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">System Administration</h1>
              <p className="text-gray-200 mt-1">Platform management and configuration</p>
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
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Overview</h2>
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

            {/* Organizations Tab */}
            {activeTab === 'organizations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Organizations</h2>
                  <button
                    onClick={() => setShowOrgModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600"
                  >
                    + Create Organization
                  </button>
                </div>

                {organizations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Organizations</h3>
                    <p className="text-gray-600">Create your first organization to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations.map((org) => (
                      <Link
                        key={org.id}
                        href={`/organizations/${org.id}`}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{org.name}</h3>
                            {org.slug && (
                              <p className="text-xs text-gray-500 font-mono mb-2">/{org.slug}</p>
                            )}
                          </div>
                          <div className="text-3xl">🏛️</div>
                        </div>

                        {org.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{org.description}</p>
                        )}

                        {org.sports && org.sports.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
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
                          <p className="text-sm text-gray-600 mb-2">
                            📍 {org.city}{org.city && org.state && ', '}{org.state}
                          </p>
                        )}

                        {org.team_count !== undefined && (
                          <p className="text-sm text-gray-600">
                            <span className="font-bold">Teams:</span> {org.team_count}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <span className="text-wrestling-blue font-semibold text-sm">
                            View Details →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Teams</h2>
                  <Link
                    href="/teams"
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    View All Teams
                  </Link>
                </div>

                {teams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Teams</h3>
                    <p className="text-gray-600">Teams will appear here once created</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                      <Link
                        key={team.id}
                        href={`/teams/${team.id}`}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{team.name}</h3>
                            {team.sport_name && (
                              <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800">
                                {team.sport_name}
                              </span>
                            )}
                          </div>
                          <div className="text-3xl">👥</div>
                        </div>

                        {team.organization_name && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-bold">Organization:</span> {team.organization_name}
                          </p>
                        )}

                        {(team.city || team.state) && (
                          <p className="text-sm text-gray-600">
                            📍 {team.city}{team.city && team.state && ', '}{team.state}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <span className="text-wrestling-blue font-semibold text-sm">
                            View Details →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Athletes Tab */}
            {activeTab === 'athletes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Athletes</h2>
                  <Link
                    href="/athletes"
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    View All Athletes
                  </Link>
                </div>

                {athletes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤼</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Athletes</h3>
                    <p className="text-gray-600">Athlete profiles will appear here once created</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">DOB</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {athletes.map((athlete) => (
                          <tr key={athlete.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {athlete.first_name} {athlete.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{athlete.email || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{athlete.team_name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {athlete.date_of_birth ? new Date(athlete.date_of_birth).toLocaleDateString() : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link
                                href={`/athletes/${athlete.id}`}
                                className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === 'locations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Locations</h2>
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                  >
                    + Add Location
                  </button>
                </div>

                {locations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📍</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Locations</h3>
                    <p className="text-gray-600">Add your first competition venue</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locations.map((location) => (
                      <Link
                        key={location.id}
                        href={`/locations/${location.id}`}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{location.name}</h3>
                            {location.venue_type && (
                              <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy mb-2">
                                {location.venue_type}
                              </span>
                            )}
                          </div>
                          <div className="text-3xl">📍</div>
                        </div>

                        {location.address && (
                          <p className="text-sm text-gray-600 mb-1">{location.address}</p>
                        )}

                        {(location.city || location.state) && (
                          <p className="text-sm text-gray-600 mb-1">
                            {location.city}{location.city && location.state && ', '}{location.state}
                          </p>
                        )}

                        {location.capacity && (
                          <p className="text-sm text-gray-500 mt-2">
                            Capacity: {location.capacity.toLocaleString()}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <span className="text-wrestling-blue font-semibold text-sm">
                            View Details →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Competitions Tab */}
            {activeTab === 'competitions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Competitions</h2>
                  <Link
                    href="/competitions"
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    View All Competitions
                  </Link>
                </div>

                {competitions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Competitions</h3>
                    <p className="text-gray-600">Competitions will appear here once created</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {competitions.map((comp) => (
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{comp.name}</h3>
                            {comp.competition_type && (
                              <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800">
                                {comp.competition_type}
                              </span>
                            )}
                          </div>
                          <div className="text-3xl">🏆</div>
                        </div>

                        {comp.start_date && (
                          <p className="text-sm text-gray-600 mb-2">
                            📅 {new Date(comp.start_date).toLocaleDateString()}
                            {comp.end_date && ` - ${new Date(comp.end_date).toLocaleDateString()}`}
                          </p>
                        )}

                        {comp.location_name && (
                          <p className="text-sm text-gray-600">
                            📍 {comp.location_name}
                          </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <span className="text-wrestling-blue font-semibold text-sm">
                            View Details →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rosters Tab */}
            {activeTab === 'rosters' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Event Rosters</h2>
                  <Link
                    href="/rosters"
                    className="bg-wrestling-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    View All Rosters
                  </Link>
                </div>

                {rosters.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Rosters</h3>
                    <p className="text-gray-600">Event rosters will appear here once created</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Event</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Members</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rosters.map((roster) => (
                          <tr key={roster.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{roster.event_name || roster.event_id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">{roster.team_name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{roster.member_count || 0}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {new Date(roster.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link
                                href={`/rosters/${roster.id}`}
                                className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                              >
                                View →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
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

      {/* Create Organization Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Organization</h2>
                <button
                  onClick={() => setShowOrgModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateOrganization}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orgFormData.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setOrgFormData({
                            ...orgFormData,
                            name,
                            slug: generateSlug(name),
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="e.g., North County Wrestling League"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Slug (URL-friendly name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={orgFormData.slug}
                        onChange={(e) => setOrgFormData({ ...orgFormData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        placeholder="north-county-wrestling"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                      <textarea
                        value={orgFormData.description}
                        onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        rows={3}
                        placeholder="Brief description..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={orgFormData.address}
                        onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={orgFormData.city}
                        onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={orgFormData.state}
                        onChange={(e) => setOrgFormData({ ...orgFormData, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">ZIP</label>
                      <input
                        type="text"
                        value={orgFormData.zip}
                        onChange={(e) => setOrgFormData({ ...orgFormData, zip: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={orgFormData.phone_number}
                        onChange={(e) => setOrgFormData({ ...orgFormData, phone_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={orgFormData.email}
                        onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={orgFormData.website_url}
                        onChange={(e) => setOrgFormData({ ...orgFormData, website_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Sports</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {sports.map((sport) => (
                          <label
                            key={sport.id}
                            className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={orgFormData.sport_ids.includes(sport.id)}
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

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrgModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-wrestling-blue text-white rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Create Organization
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Location</h2>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateLocation} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={locationFormData.name}
                    onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    placeholder="e.g., Lincoln High School Gymnasium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Venue Type</label>
                    <input
                      type="text"
                      value={locationFormData.venue_type}
                      onChange={(e) => setLocationFormData({ ...locationFormData, venue_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      value={locationFormData.capacity}
                      onChange={(e) => setLocationFormData({ ...locationFormData, capacity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={locationFormData.address}
                    onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={locationFormData.city}
                      onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={locationFormData.state}
                      onChange={(e) => setLocationFormData({ ...locationFormData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={locationFormData.zip}
                      onChange={(e) => setLocationFormData({ ...locationFormData, zip: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={locationFormData.phone}
                      onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={locationFormData.website_url}
                      onChange={(e) => setLocationFormData({ ...locationFormData, website_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Create Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(false)}
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
