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

export default function AttendanceOverview({ assignedClasses }: AttendanceProps) {
  const [selectedClass, setSelectedClass] = useState<string>(assignedClasses[0]?.id || "");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<
    Record<string, { present: number; absent: number; totalSessions: number }>
  >({});
  const [monthlyChart, setMonthlyChart] = useState<{ month: string; present: number }[]>([]);
  const ATTENDANCE_THRESHOLD = 75; // below this % will be highlighted

  useEffect(() => {
    if (!selectedClass) return;

    const fetchData = async () => {
      // 1️⃣ Fetch students
      const { data: classStudents } = await supabase
        .from("class_enrollment")
        .select("student_id, students(first_name, last_name, email)")
        .eq("class_id", selectedClass);

      const studentList: StudentRecord[] =
        classStudents?.map((cs: any) => ({
          id: cs.student_id,
          first_name: cs.students.first_name,
          last_name: cs.students.last_name,
          email: cs.students.email,
        })) || [];

      setStudents(studentList);

      // 2️⃣ Fetch attendance sessions
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date")
        .eq("class_id", selectedClass);

      const sessionIds = sessions?.map(s => s.id) || [];

      // 3️⃣ Fetch attendance records
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .in("session_id", sessionIds);

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
    };

    fetchData();
  }, [selectedClass, assignedClasses]);

  // Sort students
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Attendance Overview</h2>

      {/* Class selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="font-semibold">Select Class:</label>
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition"
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
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-2 text-gray-700">Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Present Students" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top / Bottom performers */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 p-4 bg-white rounded-xl shadow">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Top Performers
          </h3>
          <ul className="space-y-1">
            {topPerformers.map(s => {
              const perc = attendanceSummary[s.id]?.totalSessions
                ? ((attendanceSummary[s.id].present / attendanceSummary[s.id].totalSessions) * 100).toFixed(2)
                : "0";
              return (
                <li key={s.id} className="text-gray-800">
                  {s.first_name} {s.last_name} - {perc}%
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex-1 p-4 bg-white rounded-xl shadow">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" /> Needs Attention
          </h3>
          <ul className="space-y-1">
            {bottomPerformers.map(s => {
              const perc = attendanceSummary[s.id]?.totalSessions
                ? ((attendanceSummary[s.id].present / attendanceSummary[s.id].totalSessions) * 100).toFixed(2)
                : "0";
              return (
                <li
                  key={s.id}
                  className={parseFloat(perc) < ATTENDANCE_THRESHOLD ? "text-red-600 font-medium" : "text-gray-800"}
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
        <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700">Student</th>
              <th className="px-4 py-2 text-center text-gray-700">Total Sessions</th>
              <th className="px-4 py-2 text-center text-gray-700">Present</th>
              <th className="px-4 py-2 text-center text-gray-700">Absent</th>
              <th className="px-4 py-2 text-center text-gray-700">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const summary = attendanceSummary[s.id] || { present: 0, absent: 0, totalSessions: 0 };
              const percent = summary.totalSessions
                ? ((summary.present / summary.totalSessions) * 100).toFixed(2)
                : "0";
              return (
                <tr
                  key={s.id}
                  className={`border-t transition hover:bg-indigo-50 ${
                    parseFloat(percent) < ATTENDANCE_THRESHOLD
                      ? "bg-red-50"
                      : parseFloat(percent) === 100
                      ? "bg-green-50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-2 text-center">{summary.totalSessions}</td>
                  <td className="px-4 py-2 text-center">{summary.present}</td>
                  <td className="px-4 py-2 text-center">{summary.absent}</td>
                  <td className="px-4 py-2 text-center font-semibold">{percent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
