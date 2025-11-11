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

interface User {
  id: string;
  email: string;
  full_name: string;
  platform_role: string;
}

export default function CompetitionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOrgId, setUploadOrgId] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [formData, setFormData] = useState({
    organization_id: '',
    sport_id: '',
    name: '',
    description: '',
    competition_type: '',
    default_location_id: '',
    is_recurring: false,
    recurrence_rule: '',
  });

  // Check if user can create competitions (Platform Admin or has organizations)
  const canCreateCompetition = (user?.platform_role === 'platform_admin' || user?.platform_role === 'super_admin') || organizations.length > 0;

  useEffect(() => {
    // Load user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchCompetitions();
    fetchOrganizations();
    fetchSports();
    fetchLocations();
  }, []);

  // Set Wrestling as default sport when sports are loaded
  useEffect(() => {
    if (sports.length > 0) {
      const wrestlingSport = sports.find(s => s.name.toLowerCase() === 'wrestling');
      if (wrestlingSport && formData.sport_id === '') {
        setFormData(prev => ({ ...prev, sport_id: wrestlingSport.id }));
      }
    }
  }, [sports]);

  const fetchCompetitions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/competitions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setCompetitions(data.data || []);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load competitions');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/competitions', {
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
          organization_id: '',
          sport_id: '',
          name: '',
          description: '',
          competition_type: '',
          default_location_id: '',
          is_recurring: false,
          recurrence_rule: '',
        });
        fetchCompetitions();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create competition');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
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
        // Wait 2 seconds then refresh competitions list
        setTimeout(() => {
          fetchCompetitions();
          setShowUploadModal(false);
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
              <h1 className="text-3xl font-bold">Competitions</h1>
              <p className="text-gray-200 mt-2">Manage tournaments, meets, and events</p>
            </div>
            <div className="flex gap-4">
              {canCreateCompetition && (
                <>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700"
                  >
                    Upload via AI
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                  >
                    + Add Competition
                  </button>
                </>
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

        {competitions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Competitions Yet</h3>
            <p className="text-gray-600 mb-6">Add your first tournament or meet</p>
            {canCreateCompetition && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright"
              >
                Add Competition
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((competition) => (
              <Link
                key={competition.id}
                href={`/competitions/${competition.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{competition.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {competition.competition_type && (
                        <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-blue bg-opacity-10 text-wrestling-navy">
                          {competition.competition_type}
                        </span>
                      )}
                      {competition.is_recurring && (
                        <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-wrestling-teal bg-opacity-10 text-wrestling-teal">
                          Recurring
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-3xl">🏆</div>
                </div>

                {competition.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {competition.description}
                  </p>
                )}

                <div className="space-y-1 text-sm text-gray-600">
                  {competition.parent_organizations && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Organization:</span>
                      <span>{competition.parent_organizations.name}</span>
                    </div>
                  )}
                  {competition.sports && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Sport:</span>
                      <span>{competition.sports.name}</span>
                    </div>
                  )}
                  {competition.locations && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Location:</span>
                      <span>
                        {competition.locations.name}
                        {competition.locations.city && `, ${competition.locations.city}`}
                      </span>
                    </div>
                  )}
                </div>

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

      {/* Upload via AI Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Competitions via AI</h2>
              <p className="text-gray-600 text-sm mb-6">
                Upload a file containing competition data. AI will automatically parse and import the data.
              </p>

              <form onSubmit={handleUpload} className="space-y-4">
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
                      setShowUploadModal(false);
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Competition</h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      value={formData.organization_id}
                      onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
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
                      value={formData.sport_id}
                      onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
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
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                      value={formData.competition_type}
                      onChange={(e) => setFormData({ ...formData, competition_type: e.target.value })}
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
                      value={formData.default_location_id}
                      onChange={(e) => setFormData({ ...formData, default_location_id: e.target.value })}
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
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="is_recurring" className="text-sm font-bold text-gray-700">
                    This is a recurring competition
                  </label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Recurrence Rule
                    </label>
                    <input
                      type="text"
                      value={formData.recurrence_rule}
                      onChange={(e) => setFormData({ ...formData, recurrence_rule: e.target.value })}
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
