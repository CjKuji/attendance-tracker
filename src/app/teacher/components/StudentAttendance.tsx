"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { User, TrendingUp, TrendingDown } from "lucide-react";

// ---------- Types ----------
interface ClassRecord {
  id: string;
  class_name: string;
  block: string;
}

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AttendanceRecord {
  student_id: string;
  status: "Present" | "Absent";
  session_id: string;
  session_date: string;
}

interface AttendanceProps {
  assignedClasses: ClassRecord[];
}

// ---------- Component ----------
export default function AttendanceOverview({ assignedClasses }: AttendanceProps) {
  const [selectedClass, setSelectedClass] = useState<string>(assignedClasses[0]?.id || "");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<
    Record<string, { present: number; absent: number; totalSessions: number }>
  >({});
  const [monthlyChart, setMonthlyChart] = useState<{ month: string; present: number }[]>([]);
  const ATTENDANCE_THRESHOLD = 75; // % below this will be highlighted

  // ---------- Fetch Data ----------
  useEffect(() => {
    if (!selectedClass) return;

    const fetchData = async () => {
      try {
        // 1️⃣ Fetch students
        const { data: classStudents, error: studentError } = await supabase
          .from("class_enrollment")
          .select("student_id, students(first_name, last_name, email)")
          .eq("class_id", selectedClass);

        if (studentError) throw studentError;

        const studentList: StudentRecord[] =
          classStudents?.map((cs: any) => ({
            id: cs.student_id,
            first_name: cs.students.first_name,
            last_name: cs.students.last_name,
            email: cs.students.email,
          })) || [];

        setStudents(studentList);

        if (!studentList.length) {
          setAttendanceSummary({});
          setMonthlyChart([]);
          return;
        }

        // 2️⃣ Fetch attendance sessions
        const { data: sessions, error: sessionError } = await supabase
          .from("attendance_sessions")
          .select("id, session_date")
          .eq("class_id", selectedClass);

        if (sessionError) throw sessionError;

        const sessionIds = sessions?.map(s => s.id) || [];
        if (!sessionIds.length) {
          setAttendanceSummary({});
          setMonthlyChart([]);
          return;
        }

        // 3️⃣ Fetch attendance records
        const { data: attendance, error: attendanceError } = await supabase
          .from("attendance")
          .select("*")
          .in("session_id", sessionIds);

        if (attendanceError) throw attendanceError;

        // 4️⃣ Aggregate per student
        const summary: Record<string, { present: number; absent: number; totalSessions: number }> = {};
        studentList.forEach(s => {
          summary[s.id] = { present: 0, absent: 0, totalSessions: sessionIds.length };
        });

        // 5️⃣ Aggregate monthly attendance
        const monthlyMap: Record<string, number> = {};
        attendance?.forEach((a: AttendanceRecord) => {
          if (!summary[a.student_id]) return;

          if (a.status === "Present") summary[a.student_id].present += 1;
          else summary[a.student_id].absent += 1;

          const month = new Date(a.session_date).toLocaleString("default", { month: "short", year: "numeric" });
          if (a.status === "Present") monthlyMap[month] = (monthlyMap[month] || 0) + 1;
        });

        const monthlyChartData = Object.entries(monthlyMap)
          .map(([month, present]) => ({ month, present }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setAttendanceSummary(summary);
        setMonthlyChart(monthlyChartData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [selectedClass, assignedClasses]);

  // ---------- Sort Students ----------
  const sortedStudents = [...students].sort((a, b) => {
    const percA = attendanceSummary[a.id]?.totalSessions
      ? (attendanceSummary[a.id].present / attendanceSummary[a.id].totalSessions) * 100
      : 0;
    const percB = attendanceSummary[b.id]?.totalSessions
      ? (attendanceSummary[b.id].present / attendanceSummary[b.id].totalSessions) * 100
      : 0;
    return percB - percA;
  });

  const topPerformers = sortedStudents.slice(0, 3);
  const bottomPerformers = sortedStudents.slice(-3);

  // ---------- Render ----------
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      <h2 className="text-3xl font-bold text-slate-800">Attendance Overview</h2>

      {/* Class selector */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="font-semibold text-slate-700">Select Class:</label>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition w-full sm:w-auto"
        >
          {assignedClasses.map(c => (
            <option key={c.id} value={c.id}>
              {c.class_name} - {c.block}
            </option>
          ))}
        </select>
      </div>

      {/* Monthly attendance chart */}
      {monthlyChart.length > 0 && (
        <div className="bg-white p-6 rounded-3xl shadow-lg">
          <h3 className="font-semibold mb-4 text-slate-700">Monthly Attendance Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Present Students" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top / Bottom performers */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Top */}
        <div className="flex-1 p-6 bg-white rounded-3xl shadow-lg">
          <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" /> Top Performers
          </h3>
          <ul className="space-y-1 text-slate-800">
            {topPerformers.map(s => {
              const perc =
                attendanceSummary[s.id]?.totalSessions && attendanceSummary[s.id].totalSessions > 0
                  ? ((attendanceSummary[s.id].present / attendanceSummary[s.id].totalSessions) * 100).toFixed(2)
                  : "-";
              return (
                <li key={s.id}>
                  {s.first_name} {s.last_name} - {perc}%
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom */}
        <div className="flex-1 p-6 bg-white rounded-3xl shadow-lg">
          <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
            <TrendingDown className="w-5 h-5 text-red-600" /> Needs Attention
          </h3>
          <ul className="space-y-1">
            {bottomPerformers.map(s => {
              const perc =
                attendanceSummary[s.id]?.totalSessions && attendanceSummary[s.id].totalSessions > 0
                  ? ((attendanceSummary[s.id].present / attendanceSummary[s.id].totalSessions) * 100).toFixed(2)
                  : "-";
              return (
                <li
                  key={s.id}
                  className={
                    perc !== "-" && parseFloat(perc) < ATTENDANCE_THRESHOLD
                      ? "text-red-600 font-medium"
                      : "text-slate-800"
                  }
                >
                  {s.first_name} {s.last_name} - {perc}%
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Attendance table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-3xl overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-slate-700">Student</th>
              <th className="px-4 py-3 text-center text-slate-700">Total Sessions</th>
              <th className="px-4 py-3 text-center text-slate-700">Present</th>
              <th className="px-4 py-3 text-center text-slate-700">Absent</th>
              <th className="px-4 py-3 text-center text-slate-700">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const summary = attendanceSummary[s.id] || { present: 0, absent: 0, totalSessions: 0 };
              const percent =
                summary.totalSessions && summary.totalSessions > 0
                  ? ((summary.present / summary.totalSessions) * 100).toFixed(2)
                  : "-";
              return (
                <tr
                  key={s.id}
                  className={`border-t transition hover:bg-indigo-50 ${
                    percent !== "-" && parseFloat(percent) < ATTENDANCE_THRESHOLD
                      ? "bg-red-50"
                      : percent === "100"
                      ? "bg-green-50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-2 text-center">{summary.totalSessions}</td>
                  <td className="px-4 py-2 text-center">{summary.present}</td>
                  <td className="px-4 py-2 text-center">{summary.absent}</td>
                  <td className="px-4 py-2 text-center font-semibold">{percent !== "-" ? `${percent}%` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
