import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function AddClient({ profile }) {
  const initialState = {
    name: "",
    location: "",
    instagramUrl: "",
    linkedinUrl: "",
    facebookUrl: "",
    email: "",
    websiteUrl: "",
    otherUrls: [""], // Start with one empty field
    reachedOutOn: "Instagram",
    foundOn: "Instagram",
    platforms: ["Instagram"],
    size: "Mid",
    notes: "",
    status: "not-sent", // New default status
    outreachHistory: [],
    nextFollowUpPlatform: null,
    nextFollowUpDate: null,
    totalFollowUps: 0,
    lastContactDate: null,
    addedAt: Date.now(),
    lastUpdated: Date.now(),
    addedVia: "single"
  };

  const [formData, setFormData] = useState(initialState);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Auto-fill from URL parameters (from Chrome extension)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('name') && params.get('source') === 'extension') {
      const autoFillData = {
        name: params.get('name') || "",
        location: params.get('location') || "",
        instagramUrl: params.get('instagramUrl') || "",
        linkedinUrl: params.get('linkedinUrl') || "",
        facebookUrl: params.get('facebookUrl') || "",
        email: params.get('email') || "",
        websiteUrl: params.get('websiteUrl') || "",
        size: params.get('size') || "Mid",
        foundOn: params.get('foundOn') || "Instagram",
        platforms: params.get('platforms') ? JSON.parse(params.get('platforms')) : ["Instagram"],
        otherUrls: params.get('otherUrls') ? JSON.parse(params.get('otherUrls')) : [""],
        addedVia: "single"
      };
      
      // Ensure otherUrls always has at least one empty field
      if (autoFillData.otherUrls.length === 0) {
        autoFillData.otherUrls = [""];
      }
      
      setFormData(prev => ({ ...prev, ...autoFillData }));
      setIsAutoFilled(true);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlatformToggle = (platform) => {
    const currentPlatforms = formData.platforms || [];
    if (currentPlatforms.includes(platform)) {
      setFormData({
        ...formData,
        platforms: currentPlatforms.filter((p) => p !== platform),
      });
    } else {
      setFormData({
        ...formData,
        platforms: [...currentPlatforms, platform],
      });
    }
  };

  const handleOtherUrlChange = (index, value) => {
    const newUrls = [...formData.otherUrls];
    newUrls[index] = value;
    setFormData({ ...formData, otherUrls: newUrls });
  };

  const addOtherUrl = () => {
    setFormData({ ...formData, otherUrls: [...formData.otherUrls, ""] });
  };

  const removeOtherUrl = (index) => {
    if (formData.otherUrls.length === 1) return; // Keep at least one
    const newUrls = formData.otherUrls.filter((_, i) => i !== index);
    setFormData({ ...formData, otherUrls: newUrls });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Filter out empty other URLs
      const cleanedData = {
        ...formData,
        otherUrls: formData.otherUrls.filter(url => url.trim() !== ""),
        lastUpdated: Date.now()
      };
      
      await addDoc(collection(db, `clients_${profile}`), cleanedData);
      setFormData(initialState);
      setIsAutoFilled(false);
      alert("✅ Client added successfully!");
    } catch (err) {
      console.error("Error adding client:", err);
      alert("❌ Error adding client. Please try again.");
    }
  };

  return (
    <div className="p-6 text-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Add New Client</h2>
        {isAutoFilled && (
          <span className="px-3 py-1 bg-green-900 text-green-200 rounded-lg text-sm font-semibold">
            ✨ Auto-filled from extension
          </span>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-xl shadow-lg space-y-4 border border-indigo-400 max-w-3xl">
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            name="name" 
            placeholder="Client Name *" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          
          <input 
            type="text" 
            name="location" 
            placeholder="Location *" 
            value={formData.location} 
            onChange={handleChange} 
            required 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
        </div>

        {/* Size */}
        <div>
          <label className="text-sm font-semibold text-indigo-400 block mb-2">Size</label>
          <select 
            name="size" 
            value={formData.size} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Low">🔵 Low (&lt;10k followers)</option>
            <option value="Mid">🟡 Mid (10k-100k followers)</option>
            <option value="High">🔴 High (100k+ followers)</option>
          </select>
        </div>

        {/* Social Media Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-indigo-400">Social Media & Contact</h3>
          
          <input 
            type="text" 
            name="instagramUrl" 
            placeholder="Instagram URL" 
            value={formData.instagramUrl} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          
          <input 
            type="text" 
            name="linkedinUrl" 
            placeholder="LinkedIn URL" 
            value={formData.linkedinUrl} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          
          <input 
            type="text" 
            name="facebookUrl" 
            placeholder="Facebook URL" 
            value={formData.facebookUrl} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          
          <input 
            type="email" 
            name="email" 
            placeholder="Email Address" 
            value={formData.email} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
          
          <input 
            type="text" 
            name="websiteUrl" 
            placeholder="Website URL (if any)" 
            value={formData.websiteUrl} 
            onChange={handleChange} 
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          />
        </div>

        {/* Other URLs */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-indigo-400">➕ Other URLs (Twitter, TikTok, YouTube, etc.)</label>
          {formData.otherUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input 
                type="text"
                placeholder="https://twitter.com/..."
                value={url}
                onChange={(e) => handleOtherUrlChange(index, e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formData.otherUrls.length > 1 && (
                <button 
                  type="button"
                  onClick={() => removeOtherUrl(index)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button 
            type="button"
            onClick={addOtherUrl}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition text-sm"
          >
            + Add Another URL
          </button>
        </div>

        {/* Platforms Multi-select */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-indigo-400">Platforms They're On</label>
          <div className="flex flex-wrap gap-3">
            {["Instagram", "LinkedIn", "Facebook", "Email", "WhatsApp"].map((platform) => (
              <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(formData.platforms || []).includes(platform)}
                  onChange={() => handlePlatformToggle(platform)}
                  className="w-4 h-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-200">{platform}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Where Found & Reached Out */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-indigo-400 block mb-2">Where Found</label>
            <select 
              name="foundOn" 
              value={formData.foundOn} 
              onChange={handleChange} 
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Facebook">Facebook</option>
              <option value="Google">Google Search</option>
              <option value="Referral">Referral</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-semibold text-indigo-400 block mb-2">First Reached Out On</label>
            <select 
              name="reachedOutOn" 
              value={formData.reachedOutOn} 
              onChange={handleChange} 
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Instagram">Instagram</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Facebook">Facebook</option>
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-semibold text-indigo-400 block mb-2">Notes (Optional)</label>
          <textarea 
            name="notes" 
            placeholder="Any extra notes about this lead..." 
            value={formData.notes} 
            onChange={handleChange} 
            rows="3"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
          />
        </div>

        <button 
          type="submit" 
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-800 text-white font-semibold rounded-lg transition duration-200"
        >
          Add Client
        </button>
      </form>
    </div>
  );
}

export default AddClient;
