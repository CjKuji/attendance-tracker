// app/components/StudentDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, CalendarDays, LogOut, UserCircle, CheckCircle } from "lucide-react";
import StudentProfile from "./components/StudentProfile";
import EnrollClass from "./components/EnrollClass";
import AttendanceHistory from "./components/AttendanceHistory";

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

const COLORS = ["#16a34a", "#dc2626"];
type Tab = "dashboard" | "attendance" | "profile" | "enroll";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------
  // Auth & session handling
  // ---------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.push("/login");
          return;
        }
        setUser(data.session.user);

        // Subscribe to auth changes
        const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) router.push("/login");
          else setUser(session.user);
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error("Session error:", err);
        router.push("/login");
      }
    };
    init();
  }, [router]);

  // ---------------------------
  // Fetch student summary & classes
  // ---------------------------
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Student summary
        const { data: summaryData, error: summaryError } = await supabase
          .from("student_attendance_summary")
          .select("*")
          .eq("student_id", user.id)
          .single(); // Use single() instead of maybeSingle()

        if (summaryError) throw summaryError;
        if (!summaryData) {
          setError("Student summary not found.");
          setLoading(false);
          return;
        }
        setStudentSummary(summaryData);

        // Per-class attendance summary
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

  // ---------------------------
  // Derived chart data
  // ---------------------------
  const chartData = [
    { name: "Present", value: studentSummary?.total_present || 0 },
    { name: "Absent", value: studentSummary?.total_absent || 0 },
  ];

  // ---------------------------
  // Logout
  // ---------------------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ---------------------------
  // UI
  // ---------------------------
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <span className="text-gray-500">Loading...</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between p-6 shrink-0 border-r border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-green-700 mb-8 text-center tracking-tight">
            GC Attendance
          </h1>

          <nav className="flex flex-col gap-2">
            {[
              { tab: "dashboard", icon: <BarChart3 className="w-5 h-5 text-green-600" />, label: "Dashboard" },
              { tab: "enroll", icon: <CheckCircle className="w-5 h-5 text-green-600" />, label: "Enroll Class" },
              { tab: "attendance", icon: <CalendarDays className="w-5 h-5 text-green-600" />, label: "Attendance History" },
              { tab: "profile", icon: <UserCircle className="w-5 h-5 text-green-600" />, label: "Profile" },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab as Tab)}
                aria-current={activeTab === item.tab ? "page" : undefined}
                className={`flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition ${activeTab === item.tab ? "bg-green-50" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 w-full py-3 text-red-700 font-bold rounded-xl hover:bg-red-50 transition flex justify-center items-center gap-2"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {error && <div className="mb-4 text-center text-red-600 font-medium">{error}</div>}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && studentSummary && (
          <>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome, <span className="text-green-700">{user?.email}</span>
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              <div className="bg-green-50 rounded-2xl p-6 shadow text-center">
                <span className="text-green-700 text-3xl font-extrabold">{studentSummary.total_present}</span>
                <span className="text-gray-700 mt-2 font-medium block">Present</span>
              </div>
              <div className="bg-red-50 rounded-2xl p-6 shadow text-center">
                <span className="text-red-700 text-3xl font-extrabold">{studentSummary.total_absent}</span>
                <span className="text-gray-700 mt-2 font-medium block">Absent</span>
              </div>
              <div className="bg-blue-50 rounded-2xl p-6 shadow text-center">
                <span className="text-blue-700 text-3xl font-extrabold">{studentSummary.total_classes}</span>
                <span className="text-gray-700 mt-2 font-medium block">Total Classes</span>
              </div>
            </div>

            {/* Attendance Chart */}
            <div className="bg-white rounded-2xl shadow p-6 mt-6">
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
                      outerRadius={95}
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
            <div className="space-y-3 mt-6">
              {classSummaries.map(cls => (
                <div key={cls.class_id} className="bg-white rounded-2xl shadow p-4 flex justify-between items-center">
                  <span className="font-bold text-gray-700">{cls.class_name}</span>
                  <div className="flex gap-4">
                    <span className="text-green-700 font-semibold">Presents: {cls.present_count}</span>
                    <span className="text-red-700 font-semibold">Absents: {cls.absent_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Other Tabs */}
        {activeTab === "enroll" && <EnrollClass userId={user?.id} />}
        {activeTab === "profile" && <StudentProfile userId={user?.id} />}
        {activeTab === "attendance" && <AttendanceHistory userId={user?.id} />}
      </main>
    </div>
  );
}
