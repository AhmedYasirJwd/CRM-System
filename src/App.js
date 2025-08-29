import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import AddClient from "./components/AddClient";
import ClientList from "./components/ClientList";
import FollowUp from "./components/FollowUp";
import Dashboard from "./components/Dashboard";

function App() {
  const [profile, setProfile] = useState(localStorage.getItem("profile") || "Trainers");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleProfileChange = (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem("profile", newProfile);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 flex flex-col overflow-x-hidden">
        {/* Navbar */}
        <nav className="bg-gray-800 text-gray-200 p-4 flex justify-between items-center shadow-md">
          <div className="text-white font-bold text-lg">Dashboard</div>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-4">
            <Link to="/" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Home
            </Link>
            <Link to="/addClient" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Add Client
            </Link>
            <Link to="/clients" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Client List
            </Link>
            <Link to="/followup" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Follow Up
            </Link>
          </div>

          {/* Profile Switcher */}
          <div className="hidden md:block">
            <select
              value={profile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none"
            >
              <option value="Trainers">Trainers</option>
              <option value="Event-Planners">Event Planners</option>
            </select>
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-200 focus:outline-none"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-gray-800 text-gray-200 flex flex-col space-y-2 p-4">
            <Link to="/" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Home
            </Link>
            <Link to="/addClient" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Add Client
            </Link>
            <Link to="/clients" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Client List
            </Link>
            <Link to="/followup" className="bg-indigo-600 hover:bg-indigo-800 text-white px-3 py-2 rounded-md transition">
              Follow Up
            </Link>

            <select
              value={profile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none mt-2"
            >
              <option value="Trainers">Trainers</option>
              <option value="Event-Planners">Event Planners</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard profile={profile} />} />
            <Route path="/addClient" element={<AddClient profile={profile} />} />
            <Route path="/clients" element={<ClientList profile={profile} />} />
            <Route path="/followup" element={<FollowUp profile={profile} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
