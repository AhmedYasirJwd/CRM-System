import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const ClientList = ({ profile }) => {
  const [clients, setClients] = useState({
    inConvo: [],
    declined: [],
    notReplied: [],
  });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  function getTimeFromOffset(offsetHours, currentDate) {
    const utc = currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
    const local = new Date(utc + offsetHours * 3600000);
    return local.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // no seconds
    });
  }

  const fetchClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `clients_${profile}`));
      const inConvo = [],
        declined = [],
        notReplied = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "in-convo")
          inConvo.push({ id: docSnap.id, ...data });
        else if (data.status === "declined")
          declined.push({ id: docSnap.id, ...data });
        else notReplied.push({ id: docSnap.id, ...data });
      });

      setClients({ inConvo, declined, notReplied });
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [profile]);

  const moveClient = async (id, newStatus) => {
    try {
      const clientRef = doc(db, `clients_${profile}`, id);
      await updateDoc(clientRef, { status: newStatus });
      fetchClients();
    } catch (err) {
      console.error("Error updating client:", err);
    }
  };

  const renderTable = (title, data, color, actions = false) => (
    <div className="mb-8">
      <h3 className={`text-lg font-semibold mb-3 ${color}`}>{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400">None</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border border-indigo-400">
          <table className="min-w-full text-gray-100">
            <thead className="bg-gray-800 text-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Local Time</th>
                <th className="px-4 py-2 text-left">WhatsApp</th>
                <th className="px-4 py-2 text-left">Facebook</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Follow Ups</th>
                {actions && <th className="px-4 py-2 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {data.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-gray-800 transition duration-200"
                >
                  <td className="px-4 py-2 font-medium">{client.name}</td>
                  <td className="px-4 py-2">{client.location}</td>
                  <td className="px-4 py-2">
                    {client.timeZone
                      ? getTimeFromOffset(parseInt(client.timeZone), now)
                      : "N/A"}
                  </td>

                  <td className="px-4 py-2">{client.whatsappNo || "None"}</td>
                  <td className="px-4 py-2">
                    {client.facebookUrl && client.facebookUrl !== "none" ? (
                      <a
                        href={client.facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline"
                      >
                        {client.facebookUrl}
                      </a>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td className="px-4 py-2">{client.source}</td>
                  <td className="px-4 py-2">{client.followUps}</td>
                  {actions && (
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => moveClient(client.id, "in-convo")}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-800 text-white rounded"
                      >
                        Move to In-Convo
                      </button>
                      <button
                        onClick={() => moveClient(client.id, "declined")}
                        className="px-3 py-1 bg-red-600 hover:bg-red-800 text-white rounded"
                      >
                        Move to Declined
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-6">Client List - {profile}</h2>
      {renderTable("In-Convo", clients.inConvo, "text-green-400", true)}
      {renderTable("Declined", clients.declined, "text-red-400")}
      {renderTable("Not Replied", clients.notReplied, "text-yellow-400", true)}
    </div>
  );
};

export default ClientList;
