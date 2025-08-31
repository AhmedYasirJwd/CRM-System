import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

function FollowUp({ profile }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const snapshot = await getDocs(collection(db, `clients_${profile}`));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setClients(data);
      } catch (err) {
        console.error("Error fetching follow-up clients:", err);
      }
    };

    fetchClients();
  }, [profile]);

  const handleFollowUpDone = async (id) => {
    try {
      const clientRef = doc(db, `clients_${profile}`, id);
      await updateDoc(clientRef, { 
        lastFollowUp: Date.now(), 
        followUps: (clients.find(c => c.id === id)?.followUps || 0) + 1 
      });
      setClients(clients.map(c => 
        c.id === id 
          ? { ...c, lastFollowUp: Date.now(), followUps: c.followUps + 1 } 
          : c
      ));
    } catch (err) {
      console.error("Error updating follow-up:", err);
    }
  };

  const ONE_DAY = 24 * 60 * 60 * 1000;

  const followUpClients = clients.filter((client) => {
    const now = Date.now();
    const eligibleSinceAdded = now - client.addedAt >= ONE_DAY;
    const eligibleSinceFollowUp = !client.lastFollowUp || now - client.lastFollowUp >= ONE_DAY;
    return eligibleSinceAdded && eligibleSinceFollowUp;
  });

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-6">Follow Up - {profile}</h2>
      {followUpClients.length === 0 ? (
        <p className="text-gray-400">No follow-ups due.</p>
      ) : (
        <ul className="space-y-3">
          {followUpClients.map((client) => (
            <li 
              key={client.id} 
              className="flex justify-between items-center bg-gray-900 p-4 shadow rounded-lg border border-gray-700 hover:bg-gray-800 transition duration-200"
            >
              <span className="font-medium">
                {client.name} - {client.phone || client.whatsappNo || "N/A"}
              </span>
              <button 
                onClick={() => handleFollowUpDone(client.id)} 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200"
              >
                Follow-up Sent
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FollowUp;
