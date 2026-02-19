import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Dashboard = ({ profile }) => {
  const [tdayClients, setTdayClients] = useState([]);
  const [tmonthClients, setTmonthClients] = useState([]);
  const [last7Days, setLast7Days] = useState([]);

  const MONTHLY_TARGET = 4500;
  const DAILY_TARGET = Math.round(MONTHLY_TARGET / 30);

  useEffect(() => {
    const calculateTarget = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `clients_${profile}`));
        const today = new Date();
        const todayClients = [];
        const monthClients = [];

        // Prepare last 7 days array
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          last7.push({ date: d, count: 0 });
        }

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.addedAt) return;

          const addedAtDate = data.addedAt.toDate ? data.addedAt.toDate() : new Date(data.addedAt);

          // Today
          if (
            addedAtDate.getDate() === today.getDate() &&
            addedAtDate.getMonth() === today.getMonth() &&
            addedAtDate.getFullYear() === today.getFullYear()
          ) {
            todayClients.push({ id: docSnap.id, ...data });
          }

          // This month
          if (
            addedAtDate.getMonth() === today.getMonth() &&
            addedAtDate.getFullYear() === today.getFullYear()
          ) {
            monthClients.push({ id: docSnap.id, ...data });
          }

          // Last 7 days
          last7.forEach((day) => {
            if (
              addedAtDate.getDate() === day.date.getDate() &&
              addedAtDate.getMonth() === day.date.getMonth() &&
              addedAtDate.getFullYear() === day.date.getFullYear()
            ) {
              day.count += 1;
            }
          });
        });

        setTdayClients(todayClients);
        setTmonthClients(monthClients);
        setLast7Days(last7);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    calculateTarget();
  }, [profile]);

  const dayPercent = Math.min(Math.round((tdayClients.length / DAILY_TARGET) * 100), 100);
  const monthPercent = Math.min(Math.round((tmonthClients.length / MONTHLY_TARGET) * 100), 100);

  const Circle = ({ percent, label, value, target }) => {
    const radius = 60;
    const stroke = 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div className="flex flex-col items-center space-y-2 bg-gray-800 p-6 rounded-2xl shadow-lg">
        <svg width="150" height="150">
          <circle cx="75" cy="75" r={radius} stroke="#374151" strokeWidth={stroke} fill="none" />
          <circle
            cx="75"
            cy="75"
            r={radius}
            stroke="#6366f1"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="50%" y="50%" textAnchor="middle" dy="0.3em" className="text-lg font-bold fill-indigo-400">
            {percent}%
          </text>
        </svg>
        <p className="font-semibold text-gray-100">{label}</p>
        <p className="text-sm text-gray-400">
          {value}/{target}
        </p>
      </div>
    );
  };

  const ProgressBar = ({ percent, label }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md space-y-2">
      <p className="font-semibold text-gray-100">{label}</p>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-400">{percent}%</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 space-y-6">
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-200">📊 Dashboard Progress - {profile}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Circle percent={dayPercent} label="Today's Progress" value={tdayClients.length} target={DAILY_TARGET} />
        <Circle percent={monthPercent} label="Monthly Progress" value={tmonthClients.length} target={MONTHLY_TARGET} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressBar
          percent={Math.round((tdayClients.filter(c => c.status === 'in-convo' || c.status === 'declined').length / tdayClients.length) * 100) || 0}
          label="Replies Today"
        />
        <ProgressBar
          percent={Math.round((tmonthClients.filter(c => c.status === 'in-convo' || c.status === 'declined').length / tmonthClients.length) * 100) || 0}
          label="Replies This Month"
        />
      </div>

      {/* Last 7 days progress */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
        <h3 className="text-lg font-bold text-gray-100">Last 7 Days Progress</h3>
        {last7Days.map((day) => {
          const percent = Math.min(Math.round((day.count / DAILY_TARGET) * 100), 100);
          const label = day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return <ProgressBar key={day.date} percent={percent} label={`${label}`} />;
        })}
      </div>
    </div>
  );
};

export default Dashboard;
