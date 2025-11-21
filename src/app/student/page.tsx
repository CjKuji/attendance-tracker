"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  BarChart3,
  CalendarDays,
  LogOut,
  UserCircle,
  Clock,
  CheckCircle,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  class_name: string;
  date: string;
  status: "Present" | "Absent" | "Missed";
  notes?: string;
  user_id: string;
}

interface Department {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  middle_initial?: string;
  email: string;
  department_id?: string;
  course_id?: string;
}

const COLORS = ["#16a34a", "#dc2626", "#facc15"]; // green, red, yellow

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "attendance" | "profile">("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) console.error("Error fetching profile:", error.message);
      else setProfile(data);
    };
    fetchProfile();
  }, [user]);

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

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (!error) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  // Fetch courses based on department
  useEffect(() => {
    if (!profile?.department_id) return;
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", profile.department_id)
        .order("name");
      if (!error) setCourses(data);
    };
    fetchCourses();
  }, [profile?.department_id]);

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        middle_initial: profile.middle_initial,
        department_id: profile.department_id,
        course_id: profile.course_id,
      })
      .eq("id", profile.id);

    if (error) alert("Error updating profile: " + error.message);
    else alert("Profile updated successfully!");
    setLoading(false);
  };

  const fullName = profile
    ? `${profile.last_name}, ${profile.first_name} ${profile.middle_initial || ""}`
    : user?.email;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between p-6 shrink-0 border-r border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-green-700 mb-8 text-center tracking-tight">
            GC Attendance
          </h1>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition"
            >
              <BarChart3 className="w-5 h-5 text-green-600" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("attendance")}
              className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition"
            >
              <CalendarDays className="w-5 h-5 text-green-600" />
              <span>Attendance History</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition"
            >
              <UserCircle className="w-5 h-5 text-green-600" />
              <span>Profile</span>
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 w-full py-3 text-red-700 font-bold rounded-xl hover:bg-red-50 transition flex justify-center items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "dashboard" && (
          <>
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome, <span className="text-green-700">{fullName}</span>
              </h2>
              <button className="mt-4 sm:mt-0 flex items-center gap-2 bg-green-600 hover:bg-green-700 transition text-white font-semibold px-6 py-3 rounded-xl shadow">
                <Clock className="w-5 h-5" />
                Check In
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 shadow hover:shadow-lg transition flex flex-col items-center">
                <CheckCircle className="w-8 h-8 text-green-700 mb-2" />
                <span className="text-green-700 text-3xl font-extrabold">{totalPresent}</span>
                <span className="text-gray-700 mt-2 font-medium">Present</span>
              </div>
              <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-6 shadow hover:shadow-lg transition flex flex-col items-center">
                <Clock className="w-8 h-8 text-red-700 mb-2" />
                <span className="text-red-700 text-3xl font-extrabold">{totalAbsent}</span>
                <span className="text-gray-700 mt-2 font-medium">Absent</span>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl p-6 shadow hover:shadow-lg transition flex flex-col items-center">
                <Clock className="w-8 h-8 text-yellow-700 mb-2" />
                <span className="text-yellow-700 text-3xl font-extrabold">{totalMissed}</span>
                <span className="text-gray-700 mt-2 font-medium">Missed</span>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 shadow hover:shadow-lg transition flex flex-col items-center">
                <CalendarDays className="w-8 h-8 text-blue-700 mb-2" />
                <span className="text-blue-700 text-3xl font-extrabold">{totalClasses}</span>
                <span className="text-gray-700 mt-2 font-medium">Total Classes</span>
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
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} classes`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Classes */}
            <div className="bg-white rounded-2xl shadow p-6 mt-6">
              <h3 className="text-2xl font-bold mb-4">Recent Classes</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-base">
                  <thead className="bg-gray-50 text-gray-800 uppercase text-sm">
                    <tr>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 5).map(record => (
                      <tr key={record.id} className="border-t hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium">{record.class_name}</td>
                        <td className="px-4 py-3">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "px-3 py-1 rounded-full text-white text-sm font-semibold " +
                              (record.status === "Present"
                                ? "bg-green-600"
                                : record.status === "Absent"
                                ? "bg-red-600"
                                : "bg-yellow-600")
                            }
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{record.notes || "-"}</td>
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
          </>
        )}

        {activeTab === "profile" && profile && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Student Profile</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleProfileChange}
                  placeholder="First Name"
                  className="p-3 border rounded-xl w-full"
                />
                <input
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleProfileChange}
                  placeholder="Last Name"
                  className="p-3 border rounded-xl w-full"
                />
              </div>

              <input
                name="middle_initial"
                value={profile.middle_initial || ""}
                onChange={handleProfileChange}
                placeholder="Middle Initial"
                className="p-3 border rounded-xl w-full"
              />

              <input
                name="email"
                value={profile.email}
                disabled
                className="p-3 border rounded-xl w-full bg-gray-100"
              />

              <select
                name="department_id"
                value={profile.department_id || ""}
                onChange={handleProfileChange}
                className="p-3 border rounded-xl w-full"
              >
                <option value="" disabled>
                  Select Department
                </option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {courses.length > 0 && (
                <select
                  name="course_id"
                  value={profile.course_id || ""}
                  onChange={handleProfileChange}
                  className="p-3 border rounded-xl w-full"
                >
                  <option value="" disabled>
                    Select Course
                  </option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                {loading ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Attendance History</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-base">
                <thead className="bg-gray-50 text-gray-800 uppercase text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{record.class_name}</td>
                      <td className="px-4 py-3">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "px-3 py-1 rounded-full text-white text-sm font-semibold " +
                            (record.status === "Present"
                              ? "bg-green-600"
                              : record.status === "Absent"
                              ? "bg-red-600"
                              : "bg-yellow-600")
                          }
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{record.notes || "-"}</td>
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
        )}
      </main>
    </div>
  );
}
