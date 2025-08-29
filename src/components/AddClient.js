import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function AddClient({ profile }) {
  const initialState = {
    name: "",
    location: "",
    timeZone: "",
    whatsappNo: "",
    facebookUrl: "",
    source: "WhatsApp",
    status: "sent",
    followUps: 0,
    addedAt: Date.now(),
    lastFollowUp: null,
  };

  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, `clients_${profile}`), formData);
      setFormData(initialState);
    } catch (err) {
      console.error("Error adding client:", err);
    }
  };

  return (
    <div className="p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-6">Add New Client</h2>
      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-xl shadow-lg space-y-4 border border-indigo-400">
        <input type="text" name="name" placeholder="Client Name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="text" name="location" placeholder="Location" value={formData.location} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="text" name="timeZone" placeholder="Time Zone (e.g. +5)" value={formData.timeZone} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="text" name="whatsappNo" placeholder="Whatsapp No." value={formData.whatsappNo} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="text" name="facebookUrl" placeholder="Facebook URL" value={formData.facebookUrl} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select name="source" value={formData.source} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="WhatsApp">WhatsApp</option>
          <option value="Facebook">Facebook</option>
        </select>
        <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-800 text-white font-semibold rounded-lg transition">Add Client</button>
      </form>
    </div>
  );
}

export default AddClient;
