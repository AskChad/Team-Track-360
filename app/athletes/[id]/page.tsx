'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Athlete {
  id: string;
  user_id: string;
  team_id: string;
  current_weight_class?: string;
  preferred_weight_class?: string;
  wrestling_style?: string;
  grade_level?: string;
  years_experience?: number;
  medical_clearance_date?: string;
  medical_clearance_expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    date_of_birth?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    avatar_url?: string;
    bio?: string;
  };
  teams?: {
    id: string;
    name: string;
    parent_organizations?: {
      id: string;
      name: string;
    };
  };
}

interface Team {
  id: string;
  name: string;
}

const WEIGHT_CLASSES = ['106', '113', '120', '126', '132', '138', '145', '152', '160', '170', '182', '195', '220', '285'];

export default function AthleteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchAthlete();
    fetchTeams();
  }, [params.id]);

  const fetchAthlete = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/athletes/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAthlete(data.data);
        setFormData({
          email: data.data.profiles?.email || '',
          first_name: data.data.profiles?.first_name || '',
          last_name: data.data.profiles?.last_name || '',
          date_of_birth: data.data.profiles?.date_of_birth || '',
          phone: data.data.profiles?.phone || '',
          address: data.data.profiles?.address || '',
          city: data.data.profiles?.city || '',
          state: data.data.profiles?.state || '',
          zip: data.data.profiles?.zip || '',
          bio: data.data.profiles?.bio || '',
          team_id: data.data.team_id || '',
          current_weight_class: data.data.current_weight_class || '',
          preferred_weight_class: data.data.preferred_weight_class || '',
          wrestling_style: data.data.wrestling_style || '',
          grade_level: data.data.grade_level || '',
          years_experience: data.data.years_experience || '',
          medical_clearance_date: data.data.medical_clearance_date || '',
          medical_clearance_expires_at: data.data.medical_clearance_expires_at || '',
          is_active: data.data.is_active,
        });
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load athlete');
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setTeams(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load teams');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/athletes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAthlete(data.data);
        setIsEditing(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update athlete');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this athlete profile?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/athletes/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/athletes');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete athlete');
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const isMedicalClearanceExpired = () => {
    if (!athlete?.medical_clearance_expires_at) return false;
    return new Date(athlete.medical_clearance_expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Athlete Not Found</h2>
          <Link href="/athletes" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Athletes
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
              <Link href="/athletes" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Athletes
              </Link>
              <h1 className="text-3xl font-bold">
                {athlete.profiles?.first_name} {athlete.profiles?.last_name}
              </h1>
              <div className="flex gap-2 mt-2">
                {athlete.current_weight_class && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-white bg-opacity-20">
                    {athlete.current_weight_class} lbs
                  </span>
                )}
                {athlete.wrestling_style && (
                  <span className="inline-block px-2 py-1 text-sm font-bold rounded bg-white bg-opacity-20 capitalize">
                    {athlete.wrestling_style}
                  </span>
                )}
                <span className={`inline-block px-2 py-1 text-sm font-bold rounded ${
                  athlete.is_active ? 'bg-green-500 bg-opacity-50' : 'bg-gray-500 bg-opacity-50'
                }`}>
                  {athlete.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
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

        {/* Medical Clearance Warning */}
        {isMedicalClearanceExpired() && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            ⚠️ Medical clearance has expired! Please update medical clearance information.
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Wrestling Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Wrestling Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Team</label>
                  <select
                    value={formData.team_id}
                    onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Current Weight Class</label>
                    <select
                      value={formData.current_weight_class}
                      onChange={(e) => setFormData({ ...formData, current_weight_class: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select</option>
                      {WEIGHT_CLASSES.map((wc) => (
                        <option key={wc} value={wc}>{wc} lbs</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Preferred Weight Class</label>
                    <select
                      value={formData.preferred_weight_class}
                      onChange={(e) => setFormData({ ...formData, preferred_weight_class: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select</option>
                      {WEIGHT_CLASSES.map((wc) => (
                        <option key={wc} value={wc}>{wc} lbs</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Wrestling Style</label>
                    <select
                      value={formData.wrestling_style}
                      onChange={(e) => setFormData({ ...formData, wrestling_style: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select</option>
                      <option value="folkstyle">Folkstyle</option>
                      <option value="freestyle">Freestyle</option>
                      <option value="greco-roman">Greco-Roman</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Grade Level</label>
                    <select
                      value={formData.grade_level}
                      onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    >
                      <option value="">Select</option>
                      <option value="9">9th Grade</option>
                      <option value="10">10th Grade</option>
                      <option value="11">11th Grade</option>
                      <option value="12">12th Grade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Years Experience</label>
                    <input
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Medical Clearance Date</label>
                    <input
                      type="date"
                      value={formData.medical_clearance_date}
                      onChange={(e) => setFormData({ ...formData, medical_clearance_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Medical Clearance Expires</label>
                    <input
                      type="date"
                      value={formData.medical_clearance_expires_at}
                      onChange={(e) => setFormData({ ...formData, medical_clearance_expires_at: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-wrestling-blue rounded focus:ring-wrestling-blue"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-gray-700">
                    Active Athlete
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
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
          </form>
        ) : (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Email</dt>
                  <dd className="text-gray-900">{athlete.profiles?.email || 'Not specified'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Phone</dt>
                  <dd className="text-gray-900">{athlete.profiles?.phone || 'Not specified'}</dd>
                </div>

                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Date of Birth</dt>
                  <dd className="text-gray-900">
                    {athlete.profiles?.date_of_birth ? (
                      <>
                        {formatDate(athlete.profiles.date_of_birth)}
                        <span className="text-gray-500 ml-2">
                          (Age {calculateAge(athlete.profiles.date_of_birth)})
                        </span>
                      </>
                    ) : (
                      'Not specified'
                    )}
                  </dd>
                </div>

                {(athlete.profiles?.address || athlete.profiles?.city) && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-bold text-gray-500 mb-1">Address</dt>
                    <dd className="text-gray-900">
                      {athlete.profiles.address && <div>{athlete.profiles.address}</div>}
                      {athlete.profiles.city && (
                        <div>
                          {athlete.profiles.city}{athlete.profiles.state && `, ${athlete.profiles.state}`} {athlete.profiles.zip}
                        </div>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Wrestling Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Wrestling Information</h2>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {athlete.teams && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Team</dt>
                    <dd className="text-gray-900">
                      <Link
                        href={`/teams/${athlete.teams.id}`}
                        className="text-wrestling-blue hover:text-wrestling-navy"
                      >
                        {athlete.teams.name}
                      </Link>
                    </dd>
                  </div>
                )}

                {athlete.current_weight_class && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Current Weight Class</dt>
                    <dd className="text-gray-900">{athlete.current_weight_class} lbs</dd>
                  </div>
                )}

                {athlete.preferred_weight_class && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Preferred Weight Class</dt>
                    <dd className="text-gray-900">{athlete.preferred_weight_class} lbs</dd>
                  </div>
                )}

                {athlete.wrestling_style && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Wrestling Style</dt>
                    <dd className="text-gray-900 capitalize">{athlete.wrestling_style}</dd>
                  </div>
                )}

                {athlete.grade_level && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Grade Level</dt>
                    <dd className="text-gray-900">{athlete.grade_level}th Grade</dd>
                  </div>
                )}

                {athlete.years_experience !== null && athlete.years_experience !== undefined && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Years Experience</dt>
                    <dd className="text-gray-900">{athlete.years_experience} years</dd>
                  </div>
                )}

                {athlete.medical_clearance_date && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Medical Clearance</dt>
                    <dd className="text-gray-900">{formatDate(athlete.medical_clearance_date)}</dd>
                  </div>
                )}

                {athlete.medical_clearance_expires_at && (
                  <div>
                    <dt className="text-sm font-bold text-gray-500 mb-1">Clearance Expires</dt>
                    <dd className={isMedicalClearanceExpired() ? 'text-red-600 font-bold' : 'text-gray-900'}>
                      {formatDate(athlete.medical_clearance_expires_at)}
                      {isMedicalClearanceExpired() && ' (EXPIRED)'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
