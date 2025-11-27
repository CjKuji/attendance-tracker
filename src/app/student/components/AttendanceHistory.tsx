"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Summary {
  total_present: number;
  total_absent: number;
  total_classes: number;
}

interface ClassAttendance {
  class_id: string;
  class_name: string;
  present_count: number;
  absent_count: number;
  total_sessions: number;
}

export default function AttendanceHistory() {
  const [summary, setSummary] = useState<Summary>({
    total_present: 0,
    total_absent: 0,
    total_classes: 0,
  });

  const [classAttendance, setClassAttendance] = useState<ClassAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const studentId = supabase.auth.user()?.id; // assuming user is logged in

  useEffect(() => {
    if (!studentId) return;

    const fetchAttendance = async () => {
      setLoading(true);

      try {
        // Fetch student summary
        const { data: summaryData } = await supabase
          .from("student_attendance_summary")
          .select("*")
          .eq("student_id", studentId)
          .single();

        if (summaryData) setSummary(summaryData);

        // Fetch class-by-class attendance
        const { data: classData } = await supabase
          .from("student_class_attendance")
          .select("*")
          .eq("student_id", studentId);

        if (classData) setClassAttendance(classData);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold mb-4 text-center">Attendance History</h2>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">Total Classes</p>
              <p className="text-2xl font-bold">{summary.total_classes}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">Total Present</p>
              <p className="text-2xl font-bold text-green-600">{summary.total_present}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow text-center">
              <p className="text-gray-500">Total Absent</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_absent}</p>
            </div>
          </div>

          {/* Class Attendance Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2">Present</th>
                  <th className="px-4 py-2">Absent</th>
                  <th className="px-4 py-2">Total Sessions</th>
                </tr>
              </thead>
              <tbody>
                {classAttendance.map((cls) => (
                  <tr key={cls.class_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{cls.class_name}</td>
                    <td className="px-4 py-2 text-green-600 font-semibold">{cls.present_count}</td>
                    <td className="px-4 py-2 text-red-600 font-semibold">{cls.absent_count}</td>
                    <td className="px-4 py-2">{cls.total_sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Attendance Trend Chart */}
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4 text-center">Attendance Trend per Class</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classAttendance}>
                <XAxis dataKey="class_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present_count" fill="#16a34a" name="Present" />
                <Bar dataKey="absent_count" fill="#dc2626" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
