import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

function FollowUp({ profile }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMarkSentModal, setShowMarkSentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("");

  useEffect(() => {
    if (!profile) return;

    // Query clients with status "sent" (need follow-up)
    const clientsRef = collection(db, `clients_${profile}`);
    const sentQuery = query(clientsRef, where("status", "==", "sent"));

    const unsubscribe = onSnapshot(sentQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(data);
      setLoading(false);
    });

    return () => unsubscribe();
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
    } else {
      // No more follow-ups, max attempts reached
      updates.nextFollowUpPlatform = null;
      updates.nextFollowUpDate = null;
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

  const openMarkSentModal = (client) => {
    setSelectedClient(client);
    setShowMarkSentModal(true);
    
    // Pre-select suggested platform
    if (client.nextFollowUpPlatform) {
      setSelectedPlatform(client.nextFollowUpPlatform);
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

  const getSizeBadgeColor = (size) => {
    switch (size) {
      case "High": return "bg-purple-500";
      case "Mid": return "bg-blue-500";
      case "Low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date < new Date();
  };

  const isDueToday = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getTimeDifference = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours <= 0) {
        return "Due now";
      }
      return `Due in ${diffHours} hours`;
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  // Categorize clients
  const overdue = clients.filter(c => c.nextFollowUpDate && isOverdue(c.nextFollowUpDate));
  const dueToday = clients.filter(c => c.nextFollowUpDate && isDueToday(c.nextFollowUpDate));
  const upcoming = clients.filter(c => c.nextFollowUpDate && !isOverdue(c.nextFollowUpDate) && !isDueToday(c.nextFollowUpDate));
  const noDate = clients.filter(c => !c.nextFollowUpDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading follow-ups...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-100">Follow-Up Dashboard</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
          <div className="text-red-400 text-sm font-semibold">🔴 OVERDUE</div>
          <div className="text-3xl font-bold text-gray-100">{overdue.length}</div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
          <div className="text-yellow-400 text-sm font-semibold">🟡 DUE TODAY</div>
          <div className="text-3xl font-bold text-gray-100">{dueToday.length}</div>
        </div>
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
          <div className="text-blue-400 text-sm font-semibold">🟢 UPCOMING</div>
          <div className="text-3xl font-bold text-gray-100">{upcoming.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Active</div>
          <div className="text-3xl font-bold text-gray-100">{clients.length}</div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center">
            🔴 Overdue Follow-ups ({overdue.length})
          </h2>
          
          <div className="grid gap-4">
            {overdue.map(client => (
              <div key={client.id} className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-100">{client.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                      {client.size}
                    </span>
                    <span className="text-sm text-red-400 font-semibold">
                      {getTimeDifference(client.nextFollowUpDate)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openMarkSentModal(client)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold"
                    >
                      Mark Sent Now
                    </button>
                    <button
                      onClick={() => handleMoveToInConvo(client.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                    >
                      They Replied
                    </button>
                    <button
                      onClick={() => handleMoveToDeclined(client.id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
                    >
                      Declined
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Next Platform:</div>
                    <div className="text-lg">
                      {getPlatformIcon(client.nextFollowUpPlatform)} <strong>{client.nextFollowUpPlatform}</strong>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Was due: {formatDate(client.nextFollowUpDate)} at {formatTime(client.nextFollowUpDate)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Outreach History:</div>
                    <div className="flex flex-wrap gap-2">
                      {client.outreachHistory?.map((entry, idx) => (
                        <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
                          Day {entry.dayNumber}: {getPlatformIcon(entry.platform)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {client.location && (
                  <div className="mt-2 text-sm text-gray-400">📍 {client.location}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Due Today Section */}
      {dueToday.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center">
            🟡 Due Today ({dueToday.length})
          </h2>
          
          <div className="grid gap-4">
            {dueToday.map(client => (
              <div key={client.id} className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-100">{client.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                      {client.size}
                    </span>
                    <span className="text-sm text-yellow-400 font-semibold">
                      {getTimeDifference(client.nextFollowUpDate)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openMarkSentModal(client)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold"
                    >
                      Mark Sent
                    </button>
                    <button
                      onClick={() => handleMoveToInConvo(client.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                    >
                      Replied
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Next Platform:</div>
                    <div className="text-lg">
                      {getPlatformIcon(client.nextFollowUpPlatform)} <strong>{client.nextFollowUpPlatform}</strong>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Due at: {formatTime(client.nextFollowUpDate)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Previous Messages:</div>
                    <div className="flex flex-wrap gap-2">
                      {client.outreachHistory?.map((entry, idx) => (
                        <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
                          Day {entry.dayNumber}: {getPlatformIcon(entry.platform)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center">
            🟢 Upcoming Follow-ups ({upcoming.length})
          </h2>
          
          <div className="grid gap-4">
            {upcoming.map(client => (
              <div key={client.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">{client.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeColor(client.size)}`}>
                        {client.size}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Next: {getPlatformIcon(client.nextFollowUpPlatform)} {client.nextFollowUpPlatform}</div>
                        <div className="text-sm text-blue-400">{formatDate(client.nextFollowUpDate)} - {getTimeDifference(client.nextFollowUpDate)}</div>
                      </div>
                      
                      <div className="flex gap-1">
                        {client.outreachHistory?.map((entry, idx) => (
                          <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-xs">
                            {getPlatformIcon(entry.platform)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openMarkSentModal(client)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Mark Sent Early
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No Scheduled Follow-ups */}
      {noDate.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 text-gray-400">
            Max Attempts Reached ({noDate.length})
          </h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">
              These clients have reached the maximum number of follow-up attempts (5 days).
              Consider moving them to "Declined" or reaching out one final time.
            </p>
            <div className="grid gap-2 mt-3">
              {noDate.map(client => (
                <div key={client.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">{client.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveToInConvo(client.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      They Replied
                    </button>
                    <button
                      onClick={() => handleMoveToDeclined(client.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Move to Declined
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-100 mb-2">All Caught Up!</h3>
          <p className="text-gray-400">No follow-ups needed right now. Great work!</p>
        </div>
      )}

      {/* Mark as Sent Modal */}
      {showMarkSentModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-100">Mark Follow-up as Sent</h3>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">Client: <strong>{selectedClient.name}</strong></p>
              <p className="text-sm text-blue-400 mb-2">
                Suggested: {getPlatformIcon(selectedClient.nextFollowUpPlatform)} {selectedClient.nextFollowUpPlatform}
              </p>
              <p className="text-sm text-gray-400">
                Day {(selectedClient.outreachHistory?.length || 0) + 1} of follow-up sequence
              </p>
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
                Confirm Sent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FollowUp;
