"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  class_name: string;
  status?: "Present" | "Absent" | "Missed";
}

const COLORS = ["#16a34a", "#dc2626", "#facc15"]; // green, red, yellow

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [assignedClass, setAssignedClass] = useState<string | null>(null);

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

  // Fetch students
  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("department, class_name, role")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      setAssignedClass(profile.class_name || null);

      let query = supabase.from("profiles").select("*");

      // If admin has a department assigned, filter automatically
      if (profile.role === "admin" && profile.department) {
        query = query.eq("department", profile.department);
      }

      const { data, error } = await query.order("last_name", { ascending: true });

      if (error) console.error("Error fetching students:", error.message);
      else setStudents(data || []);
    };

    fetchStudents();
  }, [user]);

  // Compute stats
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

  const filteredStudents =
    departmentFilter === "All"
      ? students
      : students.filter(s => s.department === departmentFilter);

  const departments = Array.from(new Set(students.map(s => s.department)));

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col justify-between p-6 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-green-700 mb-8 text-center">Admin Panel</h1>
          <nav className="flex flex-col gap-3">
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              📊 <span>Dashboard</span>
            </button>
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              🧑‍🎓 <span>Student Management</span>
            </button>
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              🏫 <span>Department Overview</span>
            </button>
            <button className="flex items-center gap-3 text-gray-700 font-semibold p-3 rounded-xl hover:bg-green-50 transition text-base">
              📈 <span>Reports</span>
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
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold">Welcome, {user?.email}</h2>

        {/* Assigned Class */}
        {assignedClass && (
          <div className="bg-white rounded-2xl shadow p-4 w-max">
            <span className="text-gray-700 font-medium">Your assigned class: </span>
            <span className="font-bold text-green-700">{assignedClass}</span>
          </div>
        )}

        {/* Dashboard Cards */}
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

        {/* Department Filter */}
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Filter by Department:</label>
          <select
            className="border border-gray-300 rounded-xl p-2 text-gray-800 outline-none focus:ring-2 focus:ring-green-400"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="All">All</option>
            {departments.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
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
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} students`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
          <h3 className="text-2xl font-bold mb-4">Students</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700 uppercase text-xs">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-3 py-2 font-medium">{student.first_name} {student.last_name}</td>
                  <td className="px-3 py-2">{student.email}</td>
                  <td className="px-3 py-2">{student.department}</td>
                  <td className="px-3 py-2">{student.class_name || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${
                        student.status === "Present"
                          ? "bg-green-600"
                          : student.status === "Absent"
                          ? "bg-red-600"
                          : student.status === "Missed"
                          ? "bg-yellow-600"
                          : "bg-gray-400"
                      }`}
                    >
                      {student.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500 text-base">
                    No students found for this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
