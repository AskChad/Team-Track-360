'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  venue_type?: string;
  capacity?: number;
  facilities?: any;
  phone?: string;
  website_url?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export default function LocationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Location>>({});

  useEffect(() => {
    fetchLocation();
  }, [params.id]);

  const fetchLocation = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/locations/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setLocation(data.data);
        setFormData(data.data);
      } else {
        setError(data.error);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load location');
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/locations/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setLocation(data.data);
        setIsEditing(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update location');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/locations/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        router.push('/locations');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete location');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wrestling-blue"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Location Not Found</h2>
          <Link href="/locations" className="text-wrestling-blue hover:text-wrestling-navy">
            ← Back to Locations
          </Link>
        </div>
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
              <Link href="/locations" className="text-gray-200 hover:text-white mb-2 inline-block">
                ← Back to Locations
              </Link>
              <h1 className="text-3xl font-bold">{location.name}</h1>
              {location.venue_type && (
                <p className="text-gray-200 mt-2">{location.venue_type}</p>
              )}
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

        {isEditing ? (
          <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Location</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Location Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Venue Type</label>
                  <input
                    type="text"
                    value={formData.venue_type || ''}
                    onChange={(e) => setFormData({ ...formData, venue_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={formData.zip || ''}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wrestling-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website_url || ''}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Location Details</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-bold text-gray-500 mb-1">Address</dt>
                <dd className="text-gray-900">
                  {location.address && <div>{location.address}</div>}
                  {(location.city || location.state) && (
                    <div>{location.city}{location.city && location.state && ', '}{location.state} {location.zip}</div>
                  )}
                  {location.country && <div>{location.country}</div>}
                  {!location.address && !location.city && <div className="text-gray-400">Not specified</div>}
                </dd>
              </div>

              {location.venue_type && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Venue Type</dt>
                  <dd className="text-gray-900">{location.venue_type}</dd>
                </div>
              )}

              {location.capacity && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Capacity</dt>
                  <dd className="text-gray-900">{location.capacity.toLocaleString()} people</dd>
                </div>
              )}

              {location.phone && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Phone</dt>
                  <dd className="text-gray-900">
                    <a href={`tel:${location.phone}`} className="text-wrestling-blue hover:text-wrestling-navy">
                      {location.phone}
                    </a>
                  </dd>
                </div>
              )}

              {location.website_url && (
                <div>
                  <dt className="text-sm font-bold text-gray-500 mb-1">Website</dt>
                  <dd className="text-gray-900">
                    <a
                      href={location.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-wrestling-blue hover:text-wrestling-navy"
                    >
                      {location.website_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
