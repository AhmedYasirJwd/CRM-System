import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function BulkImport({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [filter, setFilter] = useState('all'); // all, success, warning, error

  useEffect(() => {
    console.log('BulkImport component mounted');
    
    // Listen for data from Chrome extension bridge via window.postMessage
    const handleWindowMessage = (event) => {
      console.log('Received window message:', event.data);
      
      if (event.data.type === 'BULK_IMPORT_DATA' && event.data.profiles) {
        console.log('Processing bulk import data:', event.data.profiles);
        processProfiles(event.data.profiles);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    
    // Listen for data from Chrome extension via chrome.runtime
    const setupChromeListener = () => {
      // eslint-disable-next-line no-undef
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        // eslint-disable-next-line no-undef
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === 'bulkImportData' && request.profiles) {
            console.log('Received bulk data from extension:', request.profiles);
            processProfiles(request.profiles);
            sendResponse({ success: true });
          }
          return true;
        });
      }
    };

    setupChromeListener();
    
    // Also check localStorage for bulk results (fallback method)
    const checkStorage = async () => {
      try {
        console.log('Checking chrome.storage for bulk results...');
        // eslint-disable-next-line no-undef
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // eslint-disable-next-line no-undef
          const result = await chrome.storage.local.get(['bulkResults']);
          console.log('Chrome storage result:', result);
          
          if (result.bulkResults && result.bulkResults.length > 0) {
            console.log('Found bulk results in storage:', result.bulkResults.length);
            processProfiles(result.bulkResults);
            
            // Clear storage
            // eslint-disable-next-line no-undef
            chrome.storage.local.remove(['bulkResults']);
          }
        } else {
          console.log('Chrome API not available');
        }
      } catch (e) {
        console.log('Error checking storage or not in extension context:', e);
      }
    };
    
    checkStorage();
    
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  const processProfiles = (rawProfiles) => {
    const profilesData = rawProfiles.map((p, index) => {
      // Determine scrape status
      let scrapeStatus = 'success';
      let statusMessage = '';
      
      // Check if it's an error
      if (p.error || !p.instagram || !p.instagram.name) {
        scrapeStatus = 'error';
        statusMessage = p.error || 'Failed to scrape profile data';
      }
      // Check if it's a warning (partial data)
      else if (!p.instagram.followerCount || p.instagram.followerCount === 0) {
        scrapeStatus = 'warning';
        statusMessage = 'Partial data - missing follower count';
      }
      else if (!p.linkedin?.items?.length && !p.facebook?.items?.length && 
               !p.instagram.linkedinUrl && !p.instagram.facebookUrl) {
        scrapeStatus = 'warning';
        statusMessage = 'Instagram only - no LinkedIn/Facebook found';
      }

      const profileData = {
        id: `temp_${index}`,
        name: p.instagram?.name || 'Unknown',
        instagramUrl: p.instagram?.instagramUrl || p.url || '',
        bio: p.instagram?.bio || '',
        followerCount: p.instagram?.followerCount || 0,
        size: p.instagram?.size || 'Mid',
        location: p.instagram?.location || '',
        email: p.instagram?.email || '',
        linkedinUrl: p.linkedin?.items?.[0]?.link || p.instagram?.linkedinUrl || '',
        facebookUrl: p.facebook?.items?.[0]?.link || p.instagram?.facebookUrl || '',
        websiteUrl: p.instagram?.websiteUrl || '',
        platforms: p.instagram?.platforms || ['Instagram'],
        otherUrls: p.instagram?.otherUrls || [],
        notes: '',
        status: 'not-sent',
        outreachHistory: [],
        addedAt: Date.now(),
        lastUpdated: Date.now(),
        addedVia: 'bulk',
        scrapeStatus,
        statusMessage,
        // Store full data for reference
        _linkedinOptions: p.linkedin?.items || [],
        _facebookOptions: p.facebook?.items || []
      };

      return profileData;
    });
    
    setProfiles(profilesData);
    // Only auto-select success and warning profiles, not errors
    setSelected(profilesData.filter(p => p.scrapeStatus !== 'error').map(p => p.id));
  };

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(sid => sid !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Initialize editing data if not exists
      if (!editingData[id]) {
        const prof = profiles.find(p => p.id === id);
        setEditingData({
          ...editingData,
          [id]: { ...prof }
        });
      }
    }
  };

  const updateField = (id, field, value) => {
    setEditingData({
      ...editingData,
      [id]: {
        ...editingData[id],
        [field]: value
      }
    });
  };

  const saveChanges = (id) => {
    const updatedProfiles = profiles.map(p => 
      p.id === id ? { ...p, ...editingData[id] } : p
    );
    setProfiles(updatedProfiles);
    setExpandedId(null);
  };

  const handleImportAll = async () => {
    if (selected.length === 0) {
      alert('Please select at least one profile to import');
      return;
    }

    setImporting(true);
    
    try {
      const selectedProfiles = profiles.filter(p => selected.includes(p.id));
      let successCount = 0;
      
      for (const profileData of selectedProfiles) {
        try {
          // Remove temporary fields before saving
          const { id, scrapeStatus, statusMessage, _linkedinOptions, _facebookOptions, ...dataToSave } = profileData;
          
          await addDoc(collection(db, `clients_${profile}`), dataToSave);
          successCount++;
        } catch (error) {
          console.error('Error importing profile:', profileData.name, error);
        }
      }
      
      alert(`✅ Successfully imported ${successCount}/${selectedProfiles.length} clients!`);
      setProfiles([]);
      setSelected([]);
      setExpandedId(null);
      setEditingData({});
    } catch (error) {
      console.error('Error importing:', error);
      alert('❌ Error importing clients. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const getSizeColor = (size) => {
    switch (size) {
      case "High": return "bg-purple-500";
      case "Mid": return "bg-blue-500";
      case "Low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded-full border border-green-500">✅ Success</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-yellow-900 text-yellow-200 text-xs rounded-full border border-yellow-500">⚠️ Warning</span>;
      case 'error':
        return <span className="px-2 py-1 bg-red-900 text-red-200 text-xs rounded-full border border-red-500">❌ Error</span>;
      default:
        return null;
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-gray-700';
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (filter === 'all') return true;
    return p.scrapeStatus === filter;
  });

  const stats = {
    total: profiles.length,
    success: profiles.filter(p => p.scrapeStatus === 'success').length,
    warning: profiles.filter(p => p.scrapeStatus === 'warning').length,
    error: profiles.filter(p => p.scrapeStatus === 'error').length
  };

  if (profiles.length === 0) {
    return (
      <div className="p-6 text-gray-100">
        <h2 className="text-2xl font-bold mb-6">📦 Bulk Import</h2>
        <div className="bg-gray-800 p-8 rounded-xl border border-indigo-400 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h3 className="text-xl font-semibold mb-2">Waiting for data from extension...</h3>
          <p className="text-gray-400">
            Make sure you're using the Chrome extension's Bulk Mode to send data here.
          </p>
          <div className="mt-6 text-sm text-gray-500">
            <p>If you came here directly, please:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Open Chrome extension</li>
              <li>Click "Bulk Mode"</li>
              <li>Open 10-20 Instagram profiles</li>
              <li>Click "Process All Tabs"</li>
              <li>Extension will redirect here automatically</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📦 Bulk Import ({profiles.length} profiles)</h2>
        <div className="text-sm text-gray-400">
          Selected: {selected.length}/{profiles.length}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-700">
          <div className="text-gray-400 text-sm">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border-2 border-green-500">
          <div className="text-green-400 text-sm">✅ Success</div>
          <div className="text-2xl font-bold text-green-300">{stats.success}</div>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 border-2 border-yellow-500">
          <div className="text-yellow-400 text-sm">⚠️ Warning</div>
          <div className="text-2xl font-bold text-yellow-300">{stats.warning}</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border-2 border-red-500">
          <div className="text-red-400 text-sm">❌ Error</div>
          <div className="text-2xl font-bold text-red-300">{stats.error}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded transition ${
            filter === 'all' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`px-4 py-2 rounded transition ${
            filter === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Success ({stats.success})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded transition ${
            filter === 'warning' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Warning ({stats.warning})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-4 py-2 rounded transition ${
            filter === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Error ({stats.error})
        </button>
      </div>

      {/* Profiles List */}
      <div className="space-y-4 mb-6">
        {filteredProfiles.map((prof) => {
          const isExpanded = expandedId === prof.id;
          const editData = editingData[prof.id] || prof;

          return (
            <div
              key={prof.id}
              className={`bg-gray-800 rounded-lg border-2 transition ${
                selected.includes(prof.id) 
                  ? `${getStatusBorder(prof.scrapeStatus)} bg-gray-800` 
                  : 'border-gray-700 opacity-60'
              }`}
            >
              {/* Collapsed View */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.includes(prof.id)}
                    onChange={() => toggleSelect(prof.id)}
                    disabled={prof.scrapeStatus === 'error'}
                    className="mt-1 w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-30"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{prof.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeColor(prof.size)}`}>
                        {prof.size}
                      </span>
                      {getStatusBadge(prof.scrapeStatus)}
                      {prof.followerCount > 0 && (
                        <span className="text-sm text-gray-400">
                          {(prof.followerCount / 1000).toFixed(1)}K followers
                        </span>
                      )}
                    </div>

                    {prof.statusMessage && (
                      <div className="text-sm text-gray-400 mb-2 italic">
                        {prof.statusMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Location:</span>{' '}
                        <span>{prof.location || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Platforms:</span>{' '}
                        <span>{prof.platforms?.join(', ') || 'Instagram'}</span>
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className="flex gap-2 mt-2 text-xs flex-wrap">
                      {prof.instagramUrl && (
                        <a
                          href={prof.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-pink-900 text-pink-200 rounded hover:bg-pink-800"
                        >
                          📸 Instagram
                        </a>
                      )}
                      {prof.linkedinUrl && (
                        <a
                          href={prof.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-blue-900 text-blue-200 rounded hover:bg-blue-800"
                        >
                          💼 LinkedIn
                        </a>
                      )}
                      {prof.facebookUrl && (
                        <a
                          href={prof.facebookUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-indigo-900 text-indigo-200 rounded hover:bg-indigo-800"
                        >
                          📘 Facebook
                        </a>
                      )}
                      {prof.email && (
                        <span className="px-2 py-1 bg-green-900 text-green-200 rounded">
                          📧 {prof.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleExpand(prof.id)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition text-sm"
                  >
                    {isExpanded ? '▲ Collapse' : '▼ Expand & Edit'}
                  </button>
                </div>
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                  <h4 className="font-semibold mb-4 text-indigo-400">Edit Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => updateField(prof.id, 'name', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Location</label>
                      <input
                        type="text"
                        value={editData.location}
                        onChange={(e) => updateField(prof.id, 'location', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        placeholder="City, State"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => updateField(prof.id, 'email', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        placeholder="email@example.com"
                      />
                    </div>

                    {/* Size */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Size</label>
                      <select
                        value={editData.size}
                        onChange={(e) => updateField(prof.id, 'size', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                      >
                        <option value="Low">Low (&lt;10K)</option>
                        <option value="Mid">Mid (10K-100K)</option>
                        <option value="High">High (100K+)</option>
                      </select>
                    </div>

                    {/* LinkedIn URL */}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">LinkedIn URL</label>
                      {prof._linkedinOptions && prof._linkedinOptions.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            value={editData.linkedinUrl}
                            onChange={(e) => updateField(prof.id, 'linkedinUrl', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                          >
                            <option value="">-- Select LinkedIn Profile --</option>
                            {prof._linkedinOptions.map((option, idx) => (
                              <option key={idx} value={option.link}>
                                {option.title} ({option.confidence}% match)
                              </option>
                            ))}
                          </select>
                          <input
                            type="url"
                            value={editData.linkedinUrl}
                            onChange={(e) => updateField(prof.id, 'linkedinUrl', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                            placeholder="Or paste custom URL"
                          />
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={editData.linkedinUrl}
                          onChange={(e) => updateField(prof.id, 'linkedinUrl', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                          placeholder="https://linkedin.com/in/..."
                        />
                      )}
                    </div>

                    {/* Facebook URL */}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Facebook URL</label>
                      {prof._facebookOptions && prof._facebookOptions.length > 0 ? (
                        <div className="space-y-2">
                          <select
                            value={editData.facebookUrl}
                            onChange={(e) => updateField(prof.id, 'facebookUrl', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                          >
                            <option value="">-- Select Facebook Profile --</option>
                            {prof._facebookOptions.map((option, idx) => (
                              <option key={idx} value={option.link}>
                                {option.title} ({option.confidence}% match)
                              </option>
                            ))}
                          </select>
                          <input
                            type="url"
                            value={editData.facebookUrl}
                            onChange={(e) => updateField(prof.id, 'facebookUrl', e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                            placeholder="Or paste custom URL"
                          />
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={editData.facebookUrl}
                          onChange={(e) => updateField(prof.id, 'facebookUrl', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                          placeholder="https://facebook.com/..."
                        />
                      )}
                    </div>

                    {/* Website URL */}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={editData.websiteUrl}
                        onChange={(e) => updateField(prof.id, 'websiteUrl', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Bio */}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Bio</label>
                      <textarea
                        value={editData.bio}
                        onChange={(e) => updateField(prof.id, 'bio', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        rows="3"
                        placeholder="Instagram bio..."
                      />
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Notes (Optional)</label>
                      <textarea
                        value={editData.notes}
                        onChange={(e) => updateField(prof.id, 'notes', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100"
                        rows="2"
                        placeholder="Add any notes about this lead..."
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => saveChanges(prof.id)}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Import Button */}
      <div className="sticky bottom-0 bg-gray-900 p-4 border-t border-gray-700 flex gap-4">
        <button
          onClick={() => setSelected(profiles.filter(p => p.scrapeStatus !== 'error').map(p => p.id))}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          Select All Valid
        </button>
        <button
          onClick={() => setSelected([])}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          Deselect All
        </button>
        <button
          onClick={handleImportAll}
          disabled={importing || selected.length === 0}
          className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? '⏳ Importing...' : `Import ${selected.length} Selected Clients`}
        </button>
      </div>
    </div>
  );
}

export default BulkImport;
