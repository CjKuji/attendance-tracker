"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, LogOut, UserCircle, CheckCircle, Menu, X } from "lucide-react";
import StudentProfile from "./components/StudentProfile";
import EnrollClass from "./components/EnrollClass";
import AttendanceChatbot from "./components/AttendanceChatbot";

interface StudentSummary {
  student_id: string;
  first_name: string;
  last_name: string;
  total_present: number;
  total_absent: number;
  total_classes: number;
}

interface ClassSummary {
  class_id: string;
  class_name: string;
  present_count: number;
  absent_count: number;
  total_sessions: number;
}

const COLORS = ["#3B82F6", "#EF4444", "#FBBF24"]; // Blue, Red, Yellow
type Tab = "dashboard" | "profile" | "enroll";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth & session
  useEffect(() => {
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setUser(data.session.user);

      authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) router.push("/login");
        else setUser(session.user);
      });
    };

    init();

    return () => {
      if (authSubscription?.data?.subscription) authSubscription.data.subscription.unsubscribe();
    };
  }, [router]);

  // Fetch student summary and classes
  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: summaryData, error: summaryError } = await supabase
          .from("student_attendance_summary")
          .select("*")
          .eq("student_id", user.id)
          .maybeSingle();
        if (summaryError) throw summaryError;
        setStudentSummary(summaryData);

        const { data: classData, error: classError } = await supabase
          .from("student_class_attendance")
          .select("*")
          .eq("student_id", user.id);
        if (classError) throw classError;
        setClassSummaries(classData || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch student data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const chartData = [
    { name: "Present", value: studentSummary?.total_present || 0 },
    { name: "Absent", value: studentSummary?.total_absent || 0 },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <span className="text-lg font-bold text-gray-800">Loading...</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-indigo-600 to-indigo-500 text-white z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative md:translate-x-0 flex-shrink-0`}
      >
        <div className="flex flex-col justify-between h-full p-6">
          <div>
            <h1 className="text-2xl font-extrabold mb-8 text-center tracking-tight drop-shadow-md">GC Attendance</h1>
            <nav className="flex flex-col gap-3">
              {[
                { tab: "dashboard", icon: <BarChart3 className="w-5 h-5" />, label: "Dashboard" },
                { tab: "enroll", icon: <CheckCircle className="w-5 h-5" />, label: "Enroll Class" },
                { tab: "profile", icon: <UserCircle className="w-5 h-5" />, label: "Profile" },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => { setActiveTab(item.tab as Tab); setSidebarOpen(false); }}
                  className={`flex items-center gap-3 p-3 rounded-xl font-semibold hover:bg-indigo-700 transition ${
                    activeTab === item.tab ? "bg-indigo-800 shadow-lg" : ""
                  }`}
                >
                  {item.icon}
                  <span className="text-white text-base">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition flex justify-center items-center gap-2"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Hamburger for mobile */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {sidebarOpen ? <X className="w-6 h-6 text-indigo-600" /> : <Menu className="w-6 h-6 text-indigo-600" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        {error && <div className="mb-4 text-center text-red-600 font-semibold">{error}</div>}

        {activeTab === "dashboard" && studentSummary && (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 text-gray-800">
              Welcome, <span className="text-indigo-600">{user?.email}</span>
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { label: "Present", value: studentSummary.total_present, color: "bg-green-500/80" },
                { label: "Absent", value: studentSummary.total_absent, color: "bg-red-500/80" },
                { label: "Total Classes", value: studentSummary.total_classes, color: "bg-indigo-500/80" },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-3xl p-6 flex flex-col items-center justify-center transform hover:scale-105 transition shadow-md ${card.color}`}
                >
                  <span className="text-white text-3xl font-extrabold">{card.value}</span>
                  <span className="text-white mt-2 font-semibold">{card.label}</span>
                </div>
              ))}
            </div>

            {/* Attendance Chart */}
            <div className="bg-white shadow-md rounded-3xl p-6 mt-8">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Attendance Overview</h3>
              <div className="w-full h-72 sm:h-96">
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
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} records`} />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Class Summaries */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {classSummaries.map(cls => (
                <div
                  key={cls.class_id}
                  className="p-4 rounded-3xl flex flex-col justify-between shadow-md hover:shadow-lg transition bg-gradient-to-r from-indigo-100 to-indigo-50"
                >
                  <h4 className="font-bold text-gray-800 mb-2">{cls.class_name}</h4>
                  <div className="flex justify-between mt-2">
                    <span className="text-green-600 font-semibold">Presents: {cls.present_count}</span>
                    <span className="text-red-500 font-semibold">Absents: {cls.absent_count}</span>
                  </div>
                  <span className="text-indigo-600 text-sm mt-1">Total Sessions: {cls.total_sessions}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "enroll" && <EnrollClass userId={user?.id} />}
        {activeTab === "profile" && <StudentProfile userId={user?.id} />}
        {user && <AttendanceChatbot studentId={user.id} />}
      </main>
    </div>
  );
}
