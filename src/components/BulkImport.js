import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function BulkImport({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    console.log('BulkImport component mounted');
    
    // Listen for data from Chrome extension bridge via window.postMessage
    const handleWindowMessage = (event) => {
      console.log('Received window message:', event.data);
      
      if (event.data.type === 'BULK_IMPORT_DATA' && event.data.profiles) {
        console.log('Processing bulk import data:', event.data.profiles);
        
        const profilesData = event.data.profiles.map((p, index) => ({
          id: `temp_${index}`,
          ...p.instagram,
          linkedinUrl: p.linkedin?.items?.[0]?.link || p.instagram?.linkedinUrl || "",
          facebookUrl: p.facebook?.items?.[0]?.link || p.instagram?.facebookUrl || "",
          platforms: p.instagram?.platforms || ["Instagram"],
          otherUrls: p.instagram?.otherUrls || [],
          status: "not-sent",
          outreachHistory: [],
          addedAt: Date.now(),
          lastUpdated: Date.now(),
          addedVia: "bulk"
        }));
        
        setProfiles(profilesData);
        setSelected(profilesData.map(p => p.id)); // Select all by default
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
            
            const profilesData = request.profiles.map((p, index) => ({
              id: `temp_${index}`,
              ...p.instagram,
              linkedinUrl: p.linkedin?.items?.[0]?.link || p.instagram?.linkedinUrl || "",
              facebookUrl: p.facebook?.items?.[0]?.link || p.instagram?.facebookUrl || "",
              platforms: p.instagram?.platforms || ["Instagram"],
              otherUrls: p.instagram?.otherUrls || [],
              status: "not-sent",
              outreachHistory: [],
              addedAt: Date.now(),
              lastUpdated: Date.now(),
              addedVia: "bulk"
            }));
            
            setProfiles(profilesData);
            setSelected(profilesData.map(p => p.id)); // Select all by default
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
        // Check if chrome API is available
        // eslint-disable-next-line no-undef
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // eslint-disable-next-line no-undef
          const result = await chrome.storage.local.get(['bulkResults']);
          console.log('Chrome storage result:', result);
          
          if (result.bulkResults && result.bulkResults.length > 0) {
            console.log('Found bulk results in storage:', result.bulkResults.length);
            const profilesData = result.bulkResults.map((p, index) => ({
              id: `temp_${index}`,
              ...p.instagram,
              linkedinUrl: p.linkedin?.items?.[0]?.link || "",
              facebookUrl: p.facebook?.items?.[0]?.link || "",
              platforms: p.instagram?.platforms || ["Instagram"],
              otherUrls: p.instagram?.otherUrls || [],
              status: "not-sent",
              outreachHistory: [],
              addedAt: Date.now(),
              lastUpdated: Date.now(),
              addedVia: "bulk"
            }));
            
            setProfiles(profilesData);
            setSelected(profilesData.map(p => p.id));
            
            // Clear storage
            // eslint-disable-next-line no-undef
            chrome.storage.local.remove(['bulkResults']);
          }
        } else {
          console.log('Chrome API not available');
        }
      } catch (e) {
        // Chrome API not available (not in extension context)
        console.log('Error checking storage or not in extension context:', e);
      }
    };
    
    checkStorage();
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(sid => sid !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleImportAll = async () => {
    if (selected.length === 0) {
      alert('Please select at least one profile to import');
      return;
    }

    setImporting(true);
    
    try {
      const selectedProfiles = profiles.filter(p => selected.includes(p.id));
      
      for (const profileData of selectedProfiles) {
        // Remove temporary ID before saving
        const { id, ...dataToSave } = profileData;
        
        await addDoc(collection(db, `clients_${profile}`), dataToSave);
      }
      
      alert(`✅ Successfully imported ${selectedProfiles.length} clients!`);
      setProfiles([]);
      setSelected([]);
    } catch (error) {
      console.error('Error importing:', error);
      alert('❌ Error importing clients. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const getSizeEmoji = (size) => {
    switch (size) {
      case "Low": return "🔵";
      case "Mid": return "🟡";
      case "High": return "🔴";
      default: return "⚪";
    }
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📦 Bulk Import ({profiles.length} profiles)</h2>
        <div className="text-sm text-gray-400">
          Selected: {selected.length}/{profiles.length}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {profiles.map((prof) => (
          <div
            key={prof.id}
            className={`bg-gray-800 p-4 rounded-lg border-2 transition ${
              selected.includes(prof.id) 
                ? 'border-indigo-500 bg-gray-800' 
                : 'border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.includes(prof.id)}
                onChange={() => toggleSelect(prof.id)}
                className="mt-1 w-5 h-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
              />

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{prof.name}</h3>
                  <span className="text-sm">
                    {getSizeEmoji(prof.size)} {prof.size}
                  </span>
                  <span className="text-sm text-gray-400">
                    {prof.followerCount ? `${(prof.followerCount / 1000).toFixed(1)}K followers` : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Location:</span>{' '}
                    <span>{prof.location || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Platforms:</span>{' '}
                    <span>{prof.platforms?.join(', ') || 'Instagram'}</span>
                  </div>
                  {prof.email && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Email:</span>{' '}
                      <span>{prof.email}</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex gap-2 mt-2 text-xs">
                  {prof.instagramUrl && (
                    <a
                      href={prof.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-pink-900 text-pink-200 rounded hover:bg-pink-800"
                    >
                      📷 Instagram
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
                  {prof.websiteUrl && (
                    <a
                      href={prof.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-green-900 text-green-200 rounded hover:bg-green-800"
                    >
                      🌐 Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Import Button */}
      <div className="sticky bottom-0 bg-gray-900 p-4 border-t border-gray-700 flex gap-4">
        <button
          onClick={() => setSelected(profiles.map(p => p.id))}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
        >
          Select All
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
