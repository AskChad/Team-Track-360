'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Roster {
  id: string;
  name?: string;
  roster_type?: string;
  max_athletes?: number;
  max_per_weight_class?: number;
  created_at: string;
  updated_at: string;
  events?: {
    id: string;
    name: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    locations?: {
      id: string;
      name: string;
      city?: string;
      state?: string;
    };
  };
  members?: RosterMember[];
}

interface RosterMember {
  id: string;
  weight_class: string;
  seed?: number;
  made_weight?: boolean;
  actual_weight?: number;
  status: string;
  wrestling_athlete_profiles?: {
    id: string;
    athlete_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
      profiles?: {
        email: string;
      };
    };
  };
}

interface Athlete {
  id: string;
  athlete_profiles?: {
    first_name: string;
    last_name: string;
  };
}

const WEIGHT_CLASSES = [
  '106', '113', '120', '126', '132', '138', '145', '152',
  '160', '170', '182', '195', '220', '285'
];

export default function RosterDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [roster, setRoster] = useState<Roster | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Roster>>({});
  const [memberFormData, setMemberFormData] = useState({
    athlete_profile_id: '',
    weight_class: '',
    seed: '',
    made_weight: false,
    actual_weight: '',
    status: 'active',
  });

  useEffect(() => {
    fetchRoster();
    fetchAthletes();
  }, [params.id]);

  const fetchRoster = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/rosters/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setRoster(data.data);
        setFormData(data.data);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load roster');
      setLoading(false);
    }
  };

  const fetchAthletes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/athletes', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAthletes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load athletes');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/rosters/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setRoster({ ...roster, ...data.data });
        setIsEditing(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update roster');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this roster?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/rosters/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/rosters');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete roster');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/rosters/${params.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...memberFormData,
          seed: memberFormData.seed ? parseInt(memberFormData.seed) : null,
          actual_weight: memberFormData.actual_weight ? parseFloat(memberFormData.actual_weight) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddMemberModal(false);
        setMemberFormData({
          athlete_profile_id: '',
          weight_class: '',
          seed: '',
          made_weight: false,
          actual_weight: '',
          status: 'active',
        });
        fetchRoster(); // Refresh roster with new member
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add member to roster');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this athlete from the roster?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/rosters/${params.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        fetchRoster(); // Refresh roster
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to remove member from roster');
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

  if (!roster) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Roster Not Found</h2>
          <Link href="/rosters" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Rosters
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
              <Link href="/rosters" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Rosters
              </Link>
              <h1 className="text-3xl font-bold">{roster.name || 'Event Roster'}</h1>
              {roster.events && (
                <p className="text-gray-200 mt-2">{roster.events.name}</p>
              )}
            </div>
            <div className="flex gap-4">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="bg-wrestling-teal text-white px-4 py-2 rounded-lg font-bold hover:opacity-90"
                  >
                    + Add Athlete
                  </button>
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

        {/* Roster Info */}
        {isEditing ? (
          <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Roster</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Roster Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Roster Type</label>
                <select
                  value={formData.roster_type || ''}
                  onChange={(e) => setFormData({ ...formData, roster_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                >
                  <option value="">Select type</option>
                  <option value="varsity">Varsity</option>
                  <option value="junior_varsity">Junior Varsity</option>
                  <option value="freshman">Freshman</option>
                  <option value="combined">Combined</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Athletes</label>
                  <input
                    type="number"
                    value={formData.max_athletes || ''}
                    onChange={(e) => setFormData({ ...formData, max_athletes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Per Weight Class</label>
                  <input
                    type="number"
                    value={formData.max_per_weight_class || ''}
                    onChange={(e) => setFormData({ ...formData, max_per_weight_class: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
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
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Roster Details</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roster.events && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-bold text-gray-500 mb-1">Event</dt>
                  <dd className="text-gray-900">
                    <Link
                      href={`/events/${roster.events.id}`}
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {roster.events.name}
                    </Link>
                    {roster.events.start_date && (
                      <span className="text-gray-500 ml-2">({formatDate(roster.events.start_date)})</span>
                    )}
                  </dd>
                </div>
              )}

              {roster.roster_type && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Roster Type</dt>
                  <dd className="text-gray-900 capitalize">{roster.roster_type.replace('_', ' ')}</dd>
                </div>
              )}

              {roster.max_athletes && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Max Athletes</dt>
                  <dd className="text-gray-900">{roster.max_athletes}</dd>
                </div>
              )}

              {roster.max_per_weight_class && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Max Per Weight Class</dt>
                  <dd className="text-gray-900">{roster.max_per_weight_class}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Current Size</dt>
                <dd className="text-gray-900">{roster.members?.length || 0} athletes</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Roster Members */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Roster Members</h2>

          {(!roster.members || roster.members.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No athletes on this roster yet</p>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-wrestling-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-wrestling-bright"
              >
                Add Athlete
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Athlete
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Weight Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Seed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Made Weight
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roster.members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.wrestling_athlete_profiles?.athlete_profiles?.first_name}{' '}
                        {member.wrestling_athlete_profiles?.athlete_profiles?.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.weight_class} lbs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.seed || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          member.status === 'active' ? 'bg-green-100 text-green-800' :
                          member.status === 'injured' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.made_weight ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-900 font-bold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Athlete to Roster</h2>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Athlete *
                  </label>
                  <select
                    required
                    value={memberFormData.athlete_profile_id}
                    onChange={(e) => setMemberFormData({ ...memberFormData, athlete_profile_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                  >
                    <option value="">Select athlete</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.athlete_profiles?.first_name} {athlete.athlete_profiles?.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Weight Class *
                  </label>
                  <select
                    required
                    value={memberFormData.weight_class}
                    onChange={(e) => setMemberFormData({ ...memberFormData, weight_class: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                  >
                    <option value="">Select weight class</option>
                    {WEIGHT_CLASSES.map((wc) => (
                      <option key={wc} value={wc}>{wc} lbs</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Seed</label>
                    <input
                      type="number"
                      value={memberFormData.seed}
                      onChange={(e) => setMemberFormData({ ...memberFormData, seed: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      placeholder="e.g., 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Actual Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      value={memberFormData.actual_weight}
                      onChange={(e) => setMemberFormData({ ...memberFormData, actual_weight: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                      placeholder="e.g., 125.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={memberFormData.status}
                    onChange={(e) => setMemberFormData({ ...memberFormData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="scratched">Scratched</option>
                    <option value="injured">Injured</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="made_weight"
                    checked={memberFormData.made_weight}
                    onChange={(e) => setMemberFormData({ ...memberFormData, made_weight: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="made_weight" className="text-sm font-bold text-gray-700">
                    Made Weight
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-wrestling-blue text-white py-3 rounded-lg font-bold hover:bg-wrestling-bright"
                  >
                    Add to Roster
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
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
