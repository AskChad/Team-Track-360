'use client';

import { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
}

interface Sport {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface UploadCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  onSuccess?: () => void;
}

export default function UploadCompetitionModal({
  isOpen,
  onClose,
  organizations,
  onSuccess,
}: UploadCompetitionModalProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOrgId, setUploadOrgId] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [createEvents, setCreateEvents] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [orgSports, setOrgSports] = useState<Sport[]>([]);
  const [orgTeams, setOrgTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Fetch organization sports when uploadOrgId changes
  useEffect(() => {
    if (uploadOrgId) {
      fetchOrgSports(uploadOrgId);
      fetchOrgTeams(uploadOrgId);
    } else {
      setOrgSports([]);
      setSelectedSports([]);
      setOrgTeams([]);
      setSelectedTeamIds([]);
    }
  }, [uploadOrgId]);

  const fetchOrgSports = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/organizations/${organizationId}/sports`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const sports = data.data || [];
        setOrgSports(sports);

        // Auto-select Wrestling if available, otherwise select first sport
        const wrestling = sports.find((s: Sport) => s.name.toLowerCase() === 'wrestling');
        if (wrestling) {
          setSelectedSports([wrestling.id]);
        } else if (sports.length > 0) {
          setSelectedSports([sports[0].id]);
        }
      }
    } catch (err) {
      console.error('Failed to load organization sports');
      setOrgSports([]);
    }
  };

  const fetchOrgTeams = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/teams?organization_id=${organizationId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        const teams = data.data || [];
        setOrgTeams(teams);

        // Auto-select all teams (default checked)
        setSelectedTeamIds(teams.map((t: Team) => t.id));
      }
    } catch (err) {
      console.error('Failed to load organization teams');
      setOrgTeams([]);
      setSelectedTeamIds([]);
    }
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleTeamSelectAll = () => {
    setSelectedTeamIds(orgTeams.map(t => t.id));
  };

  const handleTeamDeselectAll = () => {
    setSelectedTeamIds([]);
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
      formData.append('create_events', createEvents ? 'true' : 'false');

      // If creating events, send selected team IDs (only if teams are selected)
      if (createEvents && selectedTeamIds.length > 0) {
        formData.append('team_ids', JSON.stringify(selectedTeamIds));
      }

      const response = await fetch('/api/ai-import-direct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle non-JSON responses (404, etc.)
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON, use status text
        }
        setUploadResult({ success: false, message: errorMessage });
        setUploadLoading(false);
        return;
      }

      const data = await response.json();
      setUploadResult(data);

      if (data.success) {
        // Wait 2 seconds then close modal and reset
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadResult({
        success: false,
        message: `Upload failed: ${err.message || 'Network error. Please check your connection and try again.'}`
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleClose = () => {
    setUploadFile(null);
    setUploadOrgId('');
    setUploadResult(null);
    setCreateEvents(false);
    setOrgSports([]);
    setSelectedSports([]);
    setOrgTeams([]);
    setSelectedTeamIds([]);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Competitions via AI</h2>
          <p className="text-gray-600 text-sm mb-6">
            Upload an image file containing competition data (schedule, flyer, etc.). Our AI will directly analyze the image and import the data. Duplicates are automatically detected and skipped.
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

            {orgSports.length > 1 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Sports
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                  {orgSports.map((sport) => (
                    <label key={sport.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSports.includes(sport.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSports([...selectedSports, sport.id]);
                          } else {
                            setSelectedSports(selectedSports.filter(id => id !== sport.id));
                          }
                        }}
                        disabled={uploadLoading}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{sport.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select the sports to associate with imported competitions
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                File *
              </label>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                disabled={uploadLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JPG, PNG, GIF, WebP, BMP, TIFF
              </p>
              <p className="text-xs text-amber-600 mt-1">
                <strong>Have a PDF?</strong> Export it as JPG/PNG first. Most PDF viewers have "Export as Image" or "Save as JPG" options.
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

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="createEvents"
                checked={createEvents}
                onChange={(e) => setCreateEvents(e.target.checked)}
                disabled={uploadLoading}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="createEvents" className="flex-1 text-sm">
                <span className="font-bold text-blue-900">Also create events for this organization</span>
                <p className="text-xs text-blue-700 mt-1">
                  Creates calendar events from competition dates. Events will only be visible to users in the selected organization.
                </p>
              </label>
            </div>

            {/* Team selection - only show when createEvents is checked */}
            {createEvents && orgTeams.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-green-900">Select Teams for Events</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTeamSelectAll}
                      className="text-xs text-green-700 hover:text-green-900 font-medium"
                      disabled={uploadLoading}
                    >
                      Select All
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      type="button"
                      onClick={handleTeamDeselectAll}
                      className="text-xs text-green-700 hover:text-green-900 font-medium"
                      disabled={uploadLoading}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  Events will be created for selected teams. Default: all teams selected.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {orgTeams.map(team => (
                    <label
                      key={team.id}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-green-200 hover:bg-green-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(team.id)}
                        onChange={() => handleTeamToggle(team.id)}
                        disabled={uploadLoading}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-900">{team.name}</span>
                    </label>
                  ))}
                </div>
                {selectedTeamIds.length === 0 && (
                  <p className="mt-2 text-xs text-orange-700 font-medium">
                    ⚠️ No teams selected - events will not be created
                  </p>
                )}
              </div>
            )}

            {createEvents && orgTeams.length === 0 && uploadOrgId && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900 font-medium">
                  ⚠️ No teams found in this organization
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Events cannot be created without teams. Please create at least one team first.
                </p>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-bold text-sm text-purple-900 mb-2">Direct AI Vision Processing:</h3>
              <ul className="text-xs text-purple-800 space-y-1">
                <li>✓ Instant OpenAI Vision API processing (no webhooks)</li>
                <li>✓ Automatically creates locations from venue data</li>
                <li>✓ Duplicate detection (skips existing competitions/locations)</li>
                <li>✓ Handles schedules, flyers, and tournament brackets</li>
                <li>✓ Extracts contact information and registration details</li>
              </ul>
            </div>

            {uploadResult && (
              <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-bold text-sm ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {uploadResult.message}
                </p>
                {uploadResult.data && (
                  <div className="mt-2 text-xs text-gray-700">
                    <p>Total records found: {uploadResult.data.total}</p>
                    <p className="text-green-700">✓ Inserted: {uploadResult.data.inserted}</p>
                    {uploadResult.data.skipped > 0 && (
                      <p className="text-blue-700">↷ Skipped (duplicates): {uploadResult.data.skipped}</p>
                    )}
                    {uploadResult.data.locationsCreated > 0 && (
                      <p className="text-purple-700">+ Locations created: {uploadResult.data.locationsCreated}</p>
                    )}
                    {uploadResult.data.eventsCreated > 0 && (
                      <p className="text-green-700">📅 Events created: {uploadResult.data.eventsCreated}</p>
                    )}
                    {uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="font-bold text-red-700">Errors:</p>
                        <ul className="list-disc list-inside text-red-600">
                          {uploadResult.data.errors.map((err: string, idx: number) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
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
                onClick={handleClose}
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
  );
}
