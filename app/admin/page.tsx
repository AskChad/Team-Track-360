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

interface WeightClass {
  id: string;
  sport_id: string;
  name: string;
  weight: number;
  age_group?: string;
  state?: string;
  city?: string;
  expiration_date?: string;
  notes?: string;
  is_active: boolean;
  sports?: { id: string; name: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');

  // Entity states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [weightClasses, setWeightClasses] = useState<WeightClass[]>([]);

  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showCompetitionUploadModal, setShowCompetitionUploadModal] = useState(false);
  const [showWeightClassModal, setShowWeightClassModal] = useState(false);
  const [editingWeightClass, setEditingWeightClass] = useState<WeightClass | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOrgId, setUploadOrgId] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

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

  const [competitionFormData, setCompetitionFormData] = useState({
    organization_id: '',
    sport_id: '',
    name: '',
    description: '',
    competition_type: '',
    default_location_id: '',
    is_recurring: false,
    recurrence_rule: '',
  });

  const [weightClassFormData, setWeightClassFormData] = useState({
    sport_id: '',
    name: '',
    weight: '',
    age_group: '',
    state: '',
    city: '',
    expiration_date: '',
    notes: '',
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
    fetchWeightClasses(token);
  }, []);

  // Set Wrestling as default sport when sports are loaded
  useEffect(() => {
    if (sports.length > 0) {
      const wrestlingSport = sports.find(s => s.name.toLowerCase() === 'wrestling');
      if (wrestlingSport) {
        setOrgFormData(prev => ({ ...prev, sport_ids: prev.sport_ids.length === 0 ? [wrestlingSport.id] : prev.sport_ids }));
        setCompetitionFormData(prev => ({ ...prev, sport_id: prev.sport_id === '' ? wrestlingSport.id : prev.sport_id }));
        setWeightClassFormData(prev => ({ ...prev, sport_id: prev.sport_id === '' ? wrestlingSport.id : prev.sport_id }));
      }
    }
  }, [sports]);

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

  const fetchWeightClasses = async (token: string) => {
    try {
      const response = await fetch('/api/weight-classes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setWeightClasses(data.data?.weight_classes || []);
      }
    } catch (err) {
      console.error('Failed to fetch weight classes:', err);
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

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(competitionFormData),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to create competition');
        return;
      }

      // Reset form and refresh
      setCompetitionFormData({
        organization_id: '',
        sport_id: '',
        name: '',
        description: '',
        competition_type: '',
        default_location_id: '',
        is_recurring: false,
        recurrence_rule: '',
      });
      setShowCompetitionModal(false);
      if (token) fetchStats(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleCreateWeightClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/weight-classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(weightClassFormData),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to create weight class');
        return;
      }

      // Reset form and refresh
      setWeightClassFormData({
        sport_id: '',
        name: '',
        weight: '',
        age_group: '',
        state: '',
        city: '',
        expiration_date: '',
        notes: '',
      });
      setShowWeightClassModal(false);
      setEditingWeightClass(null);
      if (token) fetchWeightClasses(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleEditWeightClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingWeightClass) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/weight-classes/${editingWeightClass.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(weightClassFormData),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to update weight class');
        return;
      }

      // Reset form and refresh
      setWeightClassFormData({
        sport_id: '',
        name: '',
        weight: '',
        age_group: '',
        state: '',
        city: '',
        expiration_date: '',
        notes: '',
      });
      setShowWeightClassModal(false);
      setEditingWeightClass(null);
      if (token) fetchWeightClasses(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleCopyWeightClass = async (weightClass: WeightClass) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/weight-classes/${weightClass.id}/copy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to copy weight class');
        return;
      }

      if (token) fetchWeightClasses(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteWeightClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight class?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/weight-classes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to delete weight class');
        return;
      }

      if (token) fetchWeightClasses(token);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const openEditWeightClassModal = (weightClass: WeightClass) => {
    setEditingWeightClass(weightClass);
    setWeightClassFormData({
      sport_id: weightClass.sport_id,
      name: weightClass.name,
      weight: weightClass.weight.toString(),
      age_group: weightClass.age_group || '',
      state: weightClass.state || '',
      city: weightClass.city || '',
      expiration_date: weightClass.expiration_date || '',
      notes: weightClass.notes || '',
    });
    setShowWeightClassModal(true);
  };

  const handleCompetitionUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile || !uploadOrgId) {
      setUploadResult({ success: false, message: 'Please select a file and organization' });
      return;
    }

    setUploadLoading(true);
    setUploadResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('entity_type', 'competitions');
      formData.append('organization_id', uploadOrgId);

      const response = await fetch('/api/ai-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      setUploadResult(data);

      if (data.success) {
        // Wait 2 seconds then refresh data
        setTimeout(() => {
          if (token) fetchStats(token);
          setShowCompetitionUploadModal(false);
          setUploadFile(null);
          setUploadOrgId('');
          setUploadResult(null);
        }, 2000);
      }
    } catch (err) {
      setUploadResult({ success: false, message: 'Failed to upload file' });
    } finally {
      setUploadLoading(false);
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
                { id: 'organizations', name: 'Organizations' },
                { id: 'teams', name: 'Teams' },
                { id: 'athletes', name: 'Athletes' },
                { id: 'locations', name: 'Locations' },
                { id: 'competitions', name: 'Competitions' },
                { id: 'weight-classes', name: 'Weight Classes' },
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Slug</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sports</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Teams</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {organizations.map((org) => (
                          <tr key={org.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{org.name}</div>
                              {org.description && (
                                <div className="text-xs text-gray-500 line-clamp-1">{org.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-xs text-gray-500 font-mono">{org.slug || '-'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {org.sports && org.sports.length > 0 ? (
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
                              ) : (
                                <div className="text-sm text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {org.city || org.state ? `${org.city || ''}${org.city && org.state ? ', ' : ''}${org.state || ''}` : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{org.team_count || 0}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-3">
                                <Link
                                  href={`/organizations/${org.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/organizations/${org.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sport</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Organization</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teams.map((team) => (
                          <tr key={team.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{team.name}</div>
                              {team.slug && (
                                <div className="text-xs text-gray-500 font-mono">{team.slug}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {team.sport_name ? (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800">
                                  {team.sport_name}
                                </span>
                              ) : (
                                <div className="text-sm text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{team.organization_name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {team.city || team.state ? `${team.city || ''}${team.city && team.state ? ', ' : ''}${team.state || ''}` : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-3">
                                <Link
                                  href={`/teams/${team.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/teams/${team.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                              <div className="flex gap-3">
                                <Link
                                  href={`/athletes/${athlete.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/athletes/${athlete.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Venue Type</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Address</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">City/State</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Capacity</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {locations.map((location) => (
                          <tr key={location.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {location.venue_type ? (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy">
                                  {location.venue_type}
                                </span>
                              ) : (
                                <div className="text-sm text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">{location.address || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {location.city || location.state ? `${location.city || ''}${location.city && location.state ? ', ' : ''}${location.state || ''}` : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {location.capacity ? location.capacity.toLocaleString() : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-3">
                                <Link
                                  href={`/locations/${location.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/locations/${location.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Competitions Tab */}
            {activeTab === 'competitions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Competitions</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCompetitionUploadModal(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700"
                    >
                      Upload via AI
                    </button>
                    <button
                      onClick={() => setShowCompetitionModal(true)}
                      className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                    >
                      + Create Competition
                    </button>
                  </div>
                </div>

                {competitions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Competitions</h3>
                    <p className="text-gray-600">Competitions will appear here once created</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dates</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {competitions.map((comp) => (
                          <tr key={comp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{comp.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {comp.competition_type ? (
                                <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800">
                                  {comp.competition_type}
                                </span>
                              ) : (
                                <div className="text-sm text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {comp.start_date ? new Date(comp.start_date).toLocaleDateString() : '-'}
                                {comp.end_date && ` - ${new Date(comp.end_date).toLocaleDateString()}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{comp.location_name || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-3">
                                <Link
                                  href={`/competitions/${comp.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/competitions/${comp.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Weight Classes Tab */}
            {activeTab === 'weight-classes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Weight Classes</h2>
                  <button
                    onClick={() => {
                      setEditingWeightClass(null);
                      setWeightClassFormData({
                        sport_id: '',
                        name: '',
                        weight: '',
                        age_group: '',
                        state: '',
                        city: '',
                        expiration_date: '',
                        notes: '',
                      });
                      setShowWeightClassModal(true);
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600"
                  >
                    + Create Weight Class
                  </button>
                </div>

                {weightClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">⚖️</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Weight Classes</h3>
                    <p className="text-gray-600">Create weight classes for your sports</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sport</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Weight</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Age Group</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">State</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Expires</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weightClasses.map((wc) => (
                          <tr key={wc.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {wc.sports?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {wc.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {wc.weight} lbs
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {wc.age_group || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {wc.state || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {wc.expiration_date ? new Date(wc.expiration_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                wc.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {wc.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-3">
                                <button
                                  onClick={() => openEditWeightClassModal(wc)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleCopyWeightClass(wc)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Copy
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeleteWeightClass(wc.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                              <div className="flex gap-3">
                                <Link
                                  href={`/rosters/${roster.id}`}
                                  className="text-wrestling-blue hover:text-wrestling-navy font-medium"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/rosters/${roster.id}?edit=true`}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  Edit
                                </Link>
                              </div>
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

      {/* Upload Competition via AI Modal */}
      {showCompetitionUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Competitions via AI</h2>
              <p className="text-gray-600 text-sm mb-6">
                Upload a file containing competition data. AI will automatically parse and import the data.
              </p>

              <form onSubmit={handleCompetitionUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Organization *
                  </label>
                  <select
                    required
                    value={uploadOrgId}
                    onChange={(e) => setUploadOrgId(e.target.value)}
                    disabled={uploadLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The organization must have an OpenAI API key configured
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    File *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".txt,.csv,.json,.pdf,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    disabled={uploadLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: TXT, CSV, JSON, PDF, DOC, DOCX
                  </p>
                </div>

                {uploadFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-gray-900">{uploadFile.name}</p>
                        <p className="text-xs text-gray-600">
                          {(uploadFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-bold text-sm text-purple-900 mb-2">AI Smart Import Features:</h3>
                  <ul className="text-xs text-purple-800 space-y-1">
                    <li>• Automatically creates locations if address data is found</li>
                    <li>• Automatically creates events if date/time data is found</li>
                    <li>• Unmapped data is saved to notes field</li>
                    <li>• Flexible field name matching</li>
                  </ul>
                </div>

                {uploadResult && (
                  <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`font-bold text-sm ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {uploadResult.message}
                    </p>
                    {uploadResult.data && (
                      <div className="mt-2 text-xs text-gray-700">
                        <p>Total records: {uploadResult.data.total}</p>
                        <p className="text-green-700">Successful: {uploadResult.data.successful}</p>
                        {uploadResult.data.failed > 0 && (
                          <>
                            <p className="text-red-700">Failed: {uploadResult.data.failed}</p>
                            {uploadResult.data.errors?.length > 0 && (
                              <div className="mt-2 max-h-32 overflow-y-auto">
                                <p className="font-bold">Errors:</p>
                                <ul className="list-disc list-inside">
                                  {uploadResult.data.errors.map((err: string, idx: number) => (
                                    <li key={idx}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Processing...
                      </span>
                    ) : (
                      'Upload & Import'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompetitionUploadModal(false);
                      setUploadFile(null);
                      setUploadOrgId('');
                      setUploadResult(null);
                    }}
                    disabled={uploadLoading}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Competition Modal */}
      {showCompetitionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Competition</h2>
                <button
                  onClick={() => setShowCompetitionModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateCompetition} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={competitionFormData.name}
                    onChange={(e) => setCompetitionFormData({ ...competitionFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                    placeholder="e.g., State Championship 2025"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Organization *
                    </label>
                    <select
                      required
                      value={competitionFormData.organization_id}
                      onChange={(e) => setCompetitionFormData({ ...competitionFormData, organization_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Sport *
                    </label>
                    <select
                      required
                      value={competitionFormData.sport_id}
                      onChange={(e) => setCompetitionFormData({ ...competitionFormData, sport_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>{sport.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={competitionFormData.description}
                    onChange={(e) => setCompetitionFormData({ ...competitionFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Competition Type
                    </label>
                    <select
                      value={competitionFormData.competition_type}
                      onChange={(e) => setCompetitionFormData({ ...competitionFormData, competition_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
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
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Default Location
                    </label>
                    <select
                      value={competitionFormData.default_location_id}
                      onChange={(e) => setCompetitionFormData({ ...competitionFormData, default_location_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
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
                    id="is_recurring_admin"
                    checked={competitionFormData.is_recurring}
                    onChange={(e) => setCompetitionFormData({ ...competitionFormData, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="is_recurring_admin" className="text-sm font-bold text-gray-700">
                    This is a recurring competition
                  </label>
                </div>

                {competitionFormData.is_recurring && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Recurrence Rule
                    </label>
                    <input
                      type="text"
                      value={competitionFormData.recurrence_rule}
                      onChange={(e) => setCompetitionFormData({ ...competitionFormData, recurrence_rule: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      placeholder="e.g., Weekly on Saturdays"
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Create Competition
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompetitionModal(false)}
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

      {/* Weight Class Modal */}
      {showWeightClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingWeightClass ? 'Edit Weight Class' : 'Create New Weight Class'}
              </h2>

              <form onSubmit={editingWeightClass ? handleEditWeightClass : handleCreateWeightClass} className="space-y-4">
                {/* Sport */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Sport *
                  </label>
                  <select
                    required
                    value={weightClassFormData.sport_id}
                    onChange={(e) => setWeightClassFormData({ ...weightClassFormData, sport_id: e.target.value })}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={weightClassFormData.name}
                      onChange={(e) => setWeightClassFormData({ ...weightClassFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="e.g., 106 lbs, Bantamweight"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Weight (lbs) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={weightClassFormData.weight}
                      onChange={(e) => setWeightClassFormData({ ...weightClassFormData, weight: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="e.g., 106.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Age Group */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Age Group
                    </label>
                    <input
                      type="text"
                      value={weightClassFormData.age_group}
                      onChange={(e) => setWeightClassFormData({ ...weightClassFormData, age_group: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="e.g., U15, High School"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={weightClassFormData.state}
                      onChange={(e) => setWeightClassFormData({ ...weightClassFormData, state: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="e.g., CA, TX"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={weightClassFormData.city}
                      onChange={(e) => setWeightClassFormData({ ...weightClassFormData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                      placeholder="e.g., Los Angeles"
                    />
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={weightClassFormData.expiration_date}
                    onChange={(e) => setWeightClassFormData({ ...weightClassFormData, expiration_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={weightClassFormData.notes}
                    onChange={(e) => setWeightClassFormData({ ...weightClassFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    rows={3}
                    placeholder="Additional information about this weight class..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    {editingWeightClass ? 'Update Weight Class' : 'Create Weight Class'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWeightClassModal(false);
                      setEditingWeightClass(null);
                    }}
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
