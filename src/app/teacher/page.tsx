"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TeacherClasses from "./components/TeacherClasses"; // Your future component
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  class_name: string;
  status?: "Present" | "Absent" | "Missed";
  role?: string;
}

const COLORS = ["#16a34a", "#dc2626", "#facc15"]; // green, red, yellow

type Tab = "Dashboard" | "Classes" | "Reports" | "Attendance" | "Profile";

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | "Present" | "Absent" | "Missed">("All");
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

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

  // Fetch students in assigned class
  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("class_name, first_name, last_name, department")
          .eq("id", user.id)
          .single();

        const className = profileData?.class_name || null;
        setAssignedClass(className);

        if (!className) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, status, role, class_name")
          .eq("class_name", className)
          .order("last_name", { ascending: true });

        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };

    fetchStudents();
  }, [user]);

  const totalPresent = students.filter(s => s.status === "Present").length;
  const totalAbsent = students.filter(s => s.status === "Absent").length;
  const totalMissed = students.filter(s => s.status === "Missed").length;
  const totalStudents = students.length;

  const chartData = [
    { name: "Present", value: totalPresent },
    { name: "Absent", value: totalAbsent },
    { name: "Missed", value: totalMissed },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredStudents = students.filter(student =>
    filterStatus === "All" ? true : student.status === filterStatus
  );

  // Sidebar nav items
  const navItems: Tab[] = ["Dashboard", "Classes", "Reports", "Attendance", "Profile"];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between p-6 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-green-700 mb-8 text-center">Teacher Panel</h1>
          <nav className="flex flex-col gap-3">
            {navItems.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl transition text-base ${
                  activeTab === tab ? "bg-green-50" : "hover:bg-green-50"
                }`}
              >
                {tab === "Dashboard" && "📊 Dashboard"}
                {tab === "Classes" && "🏫 Classes"}
                {tab === "Reports" && "📈 Reports"}
                {tab === "Attendance" && "🧑‍🎓 Attendance"}
                {tab === "Profile" && "👤 Profile"}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 w-full py-3 text-red-700 font-bold rounded-xl hover:bg-red-50 transition text-base flex justify-center items-center gap-2"
        >
          🔓 Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === "Dashboard" && (
          <>
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold">Welcome, {user?.email}</h2>
            </div>

            {/* Assigned Class */}
            {assignedClass && (
              <div className="bg-white rounded-2xl shadow p-4 w-max">
                <span className="text-gray-700 font-medium">Assigned Class: </span>
                <span className="font-bold text-green-700">{assignedClass}</span>
              </div>
            )}

            {/* Attendance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-xl p-6 shadow text-center">
                <h3 className="text-gray-700">Present Today</h3>
                <span className="text-3xl font-bold text-green-700">{totalPresent}</span>
              </div>
              <div className="bg-red-50 rounded-xl p-6 shadow text-center">
                <h3 className="text-gray-700">Absent Today</h3>
                <span className="text-3xl font-bold text-red-700">{totalAbsent}</span>
              </div>
              <div className="bg-yellow-50 rounded-xl p-6 shadow text-center">
                <h3 className="text-gray-700">Missed Classes</h3>
                <span className="text-3xl font-bold text-yellow-700">{totalMissed}</span>
              </div>
              <div className="bg-blue-50 rounded-xl p-6 shadow text-center">
                <h3 className="text-gray-700">Total Students</h3>
                <span className="text-3xl font-bold text-blue-700">{totalStudents}</span>
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-2xl font-bold mb-4">Attendance Distribution</h3>
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
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} students`} />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === "Classes" && <TeacherClasses teacherId={user?.id} />}
        {activeTab === "Reports" && <div>Reports Page Coming Soon...</div>}
        {activeTab === "Attendance" && <div>Attendance Page Coming Soon...</div>}
        {activeTab === "Profile" && <div>Profile Page Coming Soon...</div>}
      </main>
    </div>
  );
}
