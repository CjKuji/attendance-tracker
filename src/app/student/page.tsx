"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface AttendanceRecord {
  id: string;
  class_name: string;
  date: string;
  status: "Present" | "Absent" | "Missed";
  notes?: string;
  user_id: string;
}

const COLORS = ["#16a34a", "#dc2626", "#facc15"]; // green, red, yellow

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const router = useRouter();

  // Auth check
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setUser(data.session.user);
    };
    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
      else setUser(session.user);
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  // Fetch attendance
  useEffect(() => {
    if (!user) return;
    const fetchRecords = async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) console.error("Error fetching records:", error.message);
      else setRecords(data || []);
    };
    fetchRecords();
  }, [user]);

  const totalPresent = records.filter(r => r.status === "Present").length;
  const totalAbsent = records.filter(r => r.status === "Absent").length;
  const totalMissed = records.filter(r => r.status === "Missed").length;
  const totalClasses = records.length;

  const chartData = [
    { name: "Present", value: totalPresent },
    { name: "Absent", value: totalAbsent },
    { name: "Missed", value: totalMissed },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between p-6 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-green-700 mb-8 text-center">GC Attendance</h1>
          <nav className="flex flex-col gap-3">
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              📊 <span>Dashboard</span>
            </button>
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              📝 <span>Attendance History</span>
            </button>
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              👤 <span>Profile</span>
            </button>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="mt-8 w-full py-3 text-red-700 font-bold rounded-xl hover:bg-red-50 transition text-base flex justify-center items-center gap-2"
        >
          🔓 Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 space-y-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold">Welcome, {user?.email}</h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-tr from-green-50 to-green-100 rounded-2xl p-6 shadow flex flex-col items-center">
            <span className="text-green-700 text-3xl font-extrabold">{totalPresent}</span>
            <span className="text-gray-700 mt-2 text-base font-medium">Present</span>
          </div>
          <div className="bg-gradient-to-tr from-red-50 to-red-100 rounded-2xl p-6 shadow flex flex-col items-center">
            <span className="text-red-700 text-3xl font-extrabold">{totalAbsent}</span>
            <span className="text-gray-700 mt-2 text-base font-medium">Absent</span>
          </div>
          <div className="bg-gradient-to-tr from-yellow-50 to-yellow-100 rounded-2xl p-6 shadow flex flex-col items-center">
            <span className="text-yellow-700 text-3xl font-extrabold">{totalMissed}</span>
            <span className="text-gray-700 mt-2 text-base font-medium">Missed</span>
          </div>
          <div className="bg-gradient-to-tr from-blue-50 to-blue-100 rounded-2xl p-6 shadow flex flex-col items-center">
            <span className="text-blue-700 text-3xl font-extrabold">{totalClasses}</span>
            <span className="text-gray-700 mt-2 text-base font-medium">Total Classes</span>
          </div>
        </div>

        {/* Attendance chart */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-2xl font-bold mb-4">Attendance Overview</h3>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} classes`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent classes */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-2xl font-bold mb-4">Recent Classes</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-base">
              <thead className="bg-gray-50 text-gray-800 uppercase text-sm">
                <tr>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map(record => (
                  <tr key={record.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-2 font-medium">{record.class_name}</td>
                    <td className="px-4 py-2">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${
                          record.status === "Present"
                            ? "bg-green-600"
                            : record.status === "Absent"
                            ? "bg-red-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{record.notes || "-"}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-500 text-base">
                      No attendance records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
