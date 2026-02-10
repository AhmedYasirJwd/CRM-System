import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

function ClientList({ profile }) {
  const [clients, setClients] = useState({
    notSent: [],
    sent: [],
    inConvo: [],
    declined: []
  });
  const [loading, setLoading] = useState(true);
  const [showMarkSentModal, setShowMarkSentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [showDeclined, setShowDeclined] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const clientsRef = collection(db, `clients_${profile}`);

    // Subscribe to each status category
    const unsubscribers = [];

    // Not Sent
    const notSentQuery = query(clientsRef, where("status", "==", "not-sent"));
    unsubscribers.push(
      onSnapshot(notSentQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(prev => ({ ...prev, notSent: data }));
        setLoading(false);
      })
    );

    // Sent - Need Follow-up
    const sentQuery = query(clientsRef, where("status", "==", "sent"));
    unsubscribers.push(
      onSnapshot(sentQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(prev => ({ ...prev, sent: data }));
      })
    );

    // In Conversation
    const inConvoQuery = query(clientsRef, where("status", "==", "in-convo"));
    unsubscribers.push(
      onSnapshot(inConvoQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(prev => ({ ...prev, inConvo: data }));
      })
    );

    // Declined
    const declinedQuery = query(clientsRef, where("status", "==", "declined"));
    unsubscribers.push(
      onSnapshot(declinedQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(prev => ({ ...prev, declined: data }));
      })
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [profile]);

  const handleMarkAsSent = async (client, platform) => {
    if (!platform) return;

    const clientRef = doc(db, `clients_${profile}`, client.id);
    const now = Timestamp.now();

    const outreachEntry = {
      platform,
      sentAt: now,
      status: "sent",
      dayNumber: (client.outreachHistory?.length || 0) + 1
    };

    const updates = {
      status: "sent",
      reachedOutOn: client.reachedOutOn || platform,
      outreachHistory: [...(client.outreachHistory || []), outreachEntry],
      totalFollowUps: (client.totalFollowUps || 0) + 1,
      lastContactDate: now,
      lastUpdated: now
    };

    // Calculate next follow-up
    const { nextPlatform, nextDate } = calculateNextFollowUp(client, platform);
    if (nextPlatform) {
      updates.nextFollowUpPlatform = nextPlatform;
      updates.nextFollowUpDate = Timestamp.fromMillis(nextDate);
    }

    await updateDoc(clientRef, updates);
    setShowMarkSentModal(false);
    setSelectedClient(null);
    setSelectedPlatform("");
  };

  const handleMoveToInConvo = async (clientId) => {
    const clientRef = doc(db, `clients_${profile}`, clientId);
    await updateDoc(clientRef, {
      status: "in-convo",
      lastUpdated: Timestamp.now()
    });
  };

  const handleMoveToDeclined = async (clientId) => {
    const clientRef = doc(db, `clients_${profile}`, clientId);
    await updateDoc(clientRef, {
      status: "declined",
      lastUpdated: Timestamp.now()
    });
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to permanently delete this client?")) return;
    
    const clientRef = doc(db, `clients_${profile}`, clientId);
    await updateDoc(clientRef, {
      status: "deleted",
      deletedAt: Timestamp.now()
    });
  };

  const calculateNextFollowUp = (client, currentPlatform) => {
    const sequence = ["Instagram", "LinkedIn", "Facebook", "Email", "Instagram"];
    const dayNumber = (client.outreachHistory?.length || 0) + 1;

    if (dayNumber >= 5) {
      return { nextPlatform: null, nextDate: null }; // Max attempts reached
    }

    // Find next available platform
    for (let i = dayNumber; i < sequence.length; i++) {
      const platform = sequence[i];
      if (client.platforms?.includes(platform)) {
        // Next day at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return { nextPlatform: platform, nextDate: tomorrow.getTime() };
      }
    }

    return { nextPlatform: null, nextDate: null };
  };

  const openMarkSentModal = (client, isFirstContact = false) => {
    setSelectedClient(client);
    setShowMarkSentModal(true);
    
    // Pre-select platform if it's a follow-up
    if (!isFirstContact && client.nextFollowUpPlatform) {
      setSelectedPlatform(client.nextFollowUpPlatform);
    }
  };

  const getSizeBadgeColor = (size) => {
    switch (size) {
      case "High": return "bg-purple-500";
      case "Mid": return "bg-blue-500";
      case "Low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      Instagram: "📸",
      LinkedIn: "💼",
      Facebook: "📘",
      Email: "📧"
    };
    return icons[platform] || "🔗";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const isOverdue = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Client Management</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Not Contacted</div>
          <div className="text-2xl font-bold text-gray-100">{clients.notSent.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Need Follow-up</div>
          <div className="text-2xl font-bold text-blue-400">{clients.sent.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">In Conversation</div>
          <div className="text-2xl font-bold text-green-400">{clients.inConvo.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Declined</div>
          <div className="text-2xl font-bold text-red-400">{clients.declined.length}</div>
        </div>
      </div>

      {/* Section 1: Not Sent */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
          <span className="bg-yellow-500 w-3 h-3 rounded-full mr-2"></span>
          Not Contacted Yet ({clients.notSent.length})
        </h2>
        
        {clients.notSent.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            No new leads to contact
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.notSent.map(client => (
              <div key={client.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">{client.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                        {client.size}
                      </span>
                      {client.followerCount > 0 && (
                        <span className="text-sm text-gray-400">
                          {client.followerCount.toLocaleString()} followers
                        </span>
                      )}
                    </div>
                    
                    {client.location && (
                      <p className="text-sm text-gray-400 mb-2">📍 {client.location}</p>
                    )}
                    
                    <div className="flex gap-2 mb-2">
                      {client.platforms?.map(platform => (
                        <span key={platform} className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {getPlatformIcon(platform)} {platform}
                        </span>
                      ))}
                    </div>

                    {client.notes && (
                      <p className="text-sm text-gray-400 italic">{client.notes}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => openMarkSentModal(client, true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold"
                  >
                    Mark as Sent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Sent - Need Follow-up */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
          <span className="bg-blue-500 w-3 h-3 rounded-full mr-2"></span>
          Sent - Need Follow-up ({clients.sent.length})
        </h2>
        
        {clients.sent.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            No clients awaiting follow-up
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.sent.map(client => (
              <div key={client.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-100">{client.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                      {client.size}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToInConvo(client.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      They Replied ✓
                    </button>
                    <button
                      onClick={() => handleMoveToDeclined(client.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Declined ✗
                    </button>
                  </div>
                </div>

                {/* Outreach Timeline */}
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-2">Outreach History:</div>
                  <div className="flex gap-2 items-center">
                    {client.outreachHistory?.map((entry, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="bg-green-500 px-2 py-1 rounded text-xs">
                          Day {entry.dayNumber}: {getPlatformIcon(entry.platform)} {entry.platform} ✓
                        </div>
                        {idx < client.outreachHistory.length - 1 && (
                          <div className="text-gray-600 mx-1">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Follow-up */}
                {client.nextFollowUpPlatform && (
                  <div className={`mb-3 p-3 rounded ${isOverdue(client.nextFollowUpDate) ? 'bg-red-900/30 border border-red-500' : 'bg-blue-900/30 border border-blue-500'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-100">
                          {isOverdue(client.nextFollowUpDate) ? '🔴 OVERDUE' : '📅 Next Follow-up'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {getPlatformIcon(client.nextFollowUpPlatform)} {client.nextFollowUpPlatform} - {formatDate(client.nextFollowUpDate)}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => openMarkSentModal(client, false)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold"
                      >
                        Mark Sent
                      </button>
                    </div>
                  </div>
                )}

                {client.notes && (
                  <p className="text-sm text-gray-400 italic">{client.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: In Conversation */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center">
          <span className="bg-green-500 w-3 h-3 rounded-full mr-2"></span>
          In Conversation ({clients.inConvo.length})
        </h2>
        
        {clients.inConvo.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            No active conversations
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.inConvo.map(client => (
              <div key={client.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-100">{client.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                      {client.size}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleMoveToDeclined(client.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Mark as Declined
                  </button>
                </div>

                {client.lastContactDate && (
                  <p className="text-sm text-gray-400 mb-2">
                    Last contact: {formatDate(client.lastContactDate)}
                  </p>
                )}

                {/* Outreach History */}
                {client.outreachHistory && client.outreachHistory.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Contact history:</div>
                    <div className="flex gap-2">
                      {client.outreachHistory.map((entry, idx) => (
                        <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                          {getPlatformIcon(entry.platform)} Day {entry.dayNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {client.notes && (
                  <p className="text-sm text-gray-400 italic">{client.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Declined */}
      <section>
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setShowDeclined(!showDeclined)}
        >
          <h2 className="text-xl font-bold text-gray-100 flex items-center">
            <span className="bg-red-500 w-3 h-3 rounded-full mr-2"></span>
            Declined ({clients.declined.length})
          </h2>
          <button className="text-gray-400 hover:text-gray-200">
            {showDeclined ? '▼ Hide' : '▶ Show'}
          </button>
        </div>
        
        {showDeclined && (
          <div className="grid gap-4">
            {clients.declined.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                No declined leads
              </div>
            ) : (
              clients.declined.map(client => (
                <div key={client.id} className="bg-gray-800 rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">{client.name}</h3>
                      {client.location && (
                        <p className="text-sm text-gray-400">📍 {client.location}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Mark as Sent Modal */}
      {showMarkSentModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-100">Mark Message as Sent</h3>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">Client: <strong>{selectedClient.name}</strong></p>
              {selectedClient.nextFollowUpPlatform && (
                <p className="text-sm text-blue-400 mb-2">
                  Suggested: {getPlatformIcon(selectedClient.nextFollowUpPlatform)} {selectedClient.nextFollowUpPlatform}
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Select Platform:</label>
              <div className="grid grid-cols-2 gap-2">
                {selectedClient.platforms?.map(platform => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`p-3 rounded border-2 transition ${
                      selectedPlatform === platform
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{getPlatformIcon(platform)}</div>
                    <div className="text-sm text-gray-300">{platform}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMarkSentModal(false);
                  setSelectedClient(null);
                  setSelectedPlatform("");
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAsSent(selectedClient, selectedPlatform)}
                disabled={!selectedPlatform}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientList;
