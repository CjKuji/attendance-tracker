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
import { User, CalendarDays, CheckCircle, Clock, XCircle } from "lucide-react";

interface ClassRecord {
  id: string;
  class_name: string;
  block: string;
}

interface AttendanceRecord {
  student_id: string;
  status: "Present" | "Absent";
  session_id: string;
}

interface ClassReportProps {
  assignedClasses: ClassRecord[];
}

export default function ClassReport({ assignedClasses }: ClassReportProps) {
  const [attendanceData, setAttendanceData] = useState<Record<string, {
    total: number;
    present: number;
    absent: number;
    sessions: number;
    chart: { date: string; present: number; absent: number }[];
  }>>({});

  const [summary, setSummary] = useState<{
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
    monthlyChart: { month: string; present: number; absent: number }[];
  }>({
    totalStudents: 0,
    totalSessions: 0,
    totalPresent: 0,
    totalAbsent: 0,
    monthlyChart: [],
  });

  useEffect(() => {
    if (!assignedClasses.length) return;

    const fetchReports = async () => {
      const data: Record<string, any> = {};
      let overallStudents = 0;
      let overallSessions = 0;
      let overallPresent = 0;
      let overallAbsent = 0;
      const monthlyMap: Record<string, { present: number; absent: number }> = {};

      for (const cls of assignedClasses) {
        const { data: sessions } = await supabase
          .from("attendance_sessions")
          .select("*")
          .eq("class_id", cls.id);

        if (!sessions || !sessions.length) continue;

        let totalStudents = 0;
        let classPresent = 0;
        let classAbsent = 0;
        const chartData: { date: string; present: number; absent: number }[] = [];

        for (const session of sessions) {
          const { data: attendance } = await supabase
            .from("attendance")
            .select("*")
            .eq("session_id", session.id);

          const presentCount = attendance?.filter((a: AttendanceRecord) => a.status === "Present").length ?? 0;
          const absentCount = attendance?.filter((a: AttendanceRecord) => a.status === "Absent").length ?? 0;
          totalStudents = attendance?.length ?? totalStudents;

          chartData.push({ date: session.session_date, present: presentCount, absent: absentCount });

          const month = new Date(session.session_date).toLocaleString("default", { month: "short", year: "numeric" });
          if (!monthlyMap[month]) monthlyMap[month] = { present: 0, absent: 0 };
          monthlyMap[month].present += presentCount;
          monthlyMap[month].absent += absentCount;

          classPresent += presentCount;
          classAbsent += absentCount;
        }

        data[cls.id] = {
          total: totalStudents,
          present: classPresent,
          absent: classAbsent,
          sessions: sessions.length,
          chart: chartData,
        };

        overallStudents += totalStudents;
        overallSessions += sessions.length;
        overallPresent += classPresent;
        overallAbsent += classAbsent;
      }

      const monthlyChart = Object.entries(monthlyMap)
        .map(([month, val]) => ({ month, present: val.present, absent: val.absent }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setAttendanceData(data);
      setSummary({
        totalStudents: overallStudents,
        totalSessions: overallSessions,
        totalPresent: overallPresent,
        totalAbsent: overallAbsent,
        monthlyChart,
      });
    };

    fetchReports();
  }, [assignedClasses]);

  const overallAttendancePercent =
    summary.totalStudents && summary.totalSessions
      ? ((summary.totalPresent / (summary.totalStudents * summary.totalSessions)) * 100).toFixed(2)
      : "0";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <h2 className="text-3xl font-bold text-slate-800">Class Reports</h2>

      {/* ---------------- Summary Section ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {[
          { label: "Total Students", icon: User, value: summary.totalStudents, color: "green" },
          { label: "Total Sessions", icon: CalendarDays, value: summary.totalSessions, color: "blue" },
          { label: "Total Present", icon: CheckCircle, value: summary.totalPresent, color: "green" },
          { label: "Total Absent", icon: XCircle, value: summary.totalAbsent, color: "red" },
          { label: "Average Attendance", icon: Clock, value: `${overallAttendancePercent}%`, color: "purple" },
        ].map(({ label, icon: Icon, value, color }, idx) => (
          <div key={idx} className="p-6 bg-white rounded-3xl shadow-lg hover:shadow-xl transition">
            <div className="flex items-center gap-3">
              <Icon className={`w-6 h-6 text-${color}-500`} />
              <p className="font-semibold text-slate-700">{label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          </div>
        ))}
      </div>

      {/* ---------------- Monthly Chart ---------------- */}
      {summary.monthlyChart.length > 0 && (
        <div className="p-6 bg-white rounded-3xl shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-slate-800">Monthly Attendance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyChart} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" name="Present" fill="#22c55e" radius={[8,8,0,0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---------------- Per-Class Reports ---------------- */}
      {assignedClasses.length === 0 ? (
        <p className="text-slate-500">No classes assigned.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedClasses.map(cls => {
            const report = attendanceData[cls.id];
            const attendancePercent = report ? ((report.present / (report.total * report.sessions)) * 100).toFixed(2) : "0";

            return (
              <div key={cls.id} className="p-6 bg-white rounded-3xl shadow-lg hover:shadow-xl transition space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">{cls.class_name} - {cls.block}</h3>
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-semibold">
                    {attendancePercent}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-slate-600 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-400" /> Total Students: {report?.total ?? "-"}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-slate-400" /> Sessions Held: {report?.sessions ?? "-"}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" /> Present: {report?.present ?? "-"}
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" /> Absent: {report?.absent ?? "-"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" /> Average Attendance: {attendancePercent}%
                  </div>
                </div>

                {report?.chart?.length ? (
                  <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.chart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" name="Present" fill="#22c55e" radius={[8,8,0,0]} />
                        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[8,8,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-slate-400 mt-2">No attendance data yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
