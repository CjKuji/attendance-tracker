"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TeacherClasses from "./components/TeacherClasses";
import ClassReport from "./components/ClassReport";
import StudentAttendance from "./components/StudentAttendance";
import TeacherProfile from "./components/TeacherProfile";
import AttendanceChatbot from "./components/AttendanceChatbot";
import { 
  HomeIcon, ClipboardDocumentCheckIcon, UserGroupIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, PlusCircleIcon,
  Bars3Icon, XMarkIcon
} from "@heroicons/react/24/outline";

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  course: string;
  status?: "Present";
}

interface ClassRecord {
  id: string;
  class_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  year_level: string;
  block: string;
}

type Tab = "Dashboard" | "Reports" | "Attendance" | "Profile";

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [assignedClasses, setAssignedClasses] = useState<ClassRecord[]>([]);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentRecord[]>>({});
  const [activeAttendanceClass, setActiveAttendanceClass] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [finishedClasses, setFinishedClasses] = useState<string[]>([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // --------------------------
  // AUTH CHECK
  // --------------------------
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setUser(data.session.user);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // --------------------------
  // FETCH FINISHED CLASSES FOR TODAY
  // --------------------------
  useEffect(() => {
    if (!user) return;
    const fetchFinishedClasses = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("class_id")
        .eq("session_date", today)
        .eq("status", "Ended");

      if (!error && data) {
        setFinishedClasses(data.map(d => d.class_id));
      }
    };
    fetchFinishedClasses();
  }, [user]);

  // --------------------------
  // FETCH TEACHER CLASSES
  // --------------------------
  const fetchClasses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("classes")
      .select("id, class_name, day_of_week, start_time, end_time, year_level, block")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setAssignedClasses(data);
  };

  useEffect(() => {
    fetchClasses();
    if (!user) return;

    const channel = supabase
      .channel('teacher-classes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'classes', filter: `teacher_id=eq.${user.id}` }, 
        () => fetchClasses()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // --------------------------
  // FETCH STUDENTS PER CLASS
  // --------------------------
  useEffect(() => {
    if (!assignedClasses.length) return;

    const fetchStudents = async () => {
      const result: Record<string, StudentRecord[]> = {};
      for (const cls of assignedClasses) {
        const { data } = await supabase
          .from("class_enrollment")
          .select(`
            student_id,
            students!inner (
              id,
              first_name,
              last_name,
              email,
              departments:department_id(name),
              courses:course_id(name)
            )
          `)
          .eq("class_id", cls.id);

        result[cls.id] =
          (data || []).map((s: any) => ({
            id: s.student_id,
            first_name: s.students.first_name,
            last_name: s.students.last_name,
            email: s.students.email,
            department: s.students.departments?.name ?? "",
            course: s.students.courses?.name ?? "",
            status: undefined,
          })) ?? [];
      }
      setStudentsByClass(result);
    };

    fetchStudents();
  }, [assignedClasses]);

  // --------------------------
  // MARK PRESENT
  // --------------------------
  const markPresent = (classId: string, studentId: string) => {
    setStudentsByClass(prev => ({
      ...prev,
      [classId]: prev[classId].map(s =>
        s.id === studentId ? { ...s, status: s.status === "Present" ? undefined : "Present" } : s
      ),
    }));
  };

  // --------------------------
  // START ATTENDANCE SESSION
  // --------------------------
  const startAttendance = async (classId: string) => {
    const today = new Date().toISOString().split("T")[0];

    const { data: session, error: fetchError } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("session_date", today)
      .maybeSingle();

    if (fetchError) return console.error("Error fetching session:", fetchError);

    if (session) {
      if (session.status === "Ended") {
        alert("Today's session already ended.");
        return;
      }
      setActiveAttendanceClass(classId);
      setActiveSessionId(session.id);
      return;
    }

    const { data: newSession, error: insertError } = await supabase
      .from("attendance_sessions")
      .insert([{
        class_id: classId,
        session_date: today,
        created_by: user.id,
        started_at: new Date().toISOString(),
        status: "Ongoing",
      }])
      .select()
      .maybeSingle();

    if (insertError) return console.error("Error starting session:", insertError);

    if (newSession) {
      setActiveAttendanceClass(classId);
      setActiveSessionId(newSession.id);
    }
  };

  // --------------------------
  // END ATTENDANCE SESSION
  // --------------------------
  const endAttendance = async (classId: string) => {
    if (!activeSessionId) return;

    const students = studentsByClass[classId];
    const payload = students.map(s => ({
      session_id: activeSessionId,
      class_id: classId,
      student_id: s.id,
      status: s.status === "Present" ? "Present" : "Absent",
    }));

    await supabase.from("attendance").upsert(payload, { onConflict: ["student_id", "class_id", "session_id"] });

    await supabase
      .from("attendance_sessions")
      .update({ ended_at: new Date().toISOString(), status: "Ended" })
      .eq("id", activeSessionId);

    setFinishedClasses(prev => [...prev, classId]);
    setActiveAttendanceClass(null);
    setActiveSessionId(null);
  };

  // --------------------------
  // LOGOUT
  // --------------------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold">Loading...</div>;

  // --------------------------
  // NAV ITEMS
  // --------------------------
  const navItems: { name: Tab; icon: JSX.Element }[] = [
    { name: "Dashboard", icon: <HomeIcon className="w-5 h-5" /> },
    { name: "Reports", icon: <ClipboardDocumentCheckIcon className="w-5 h-5" /> },
    { name: "Attendance", icon: <UserGroupIcon className="w-5 h-5" /> },
    { name: "Profile", icon: <UserCircleIcon className="w-5 h-5" /> },
  ];

  const formatTime12Hour = (time: string) => {
    const [hourStr, minStr] = time.split(":");
    let hour = Number(hourStr);
    const minute = Number(minStr);
    const ampm = hour >= 12 ? "pm" : "am";
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  };

  const getClassStatus = (cls: ClassRecord) => {
    const todayDay = new Date().toLocaleString("en-US", { weekday: "long" });
    if (finishedClasses.includes(cls.id)) return "Done";
    if (cls.day_of_week === todayDay) return "Ongoing";
    return "Upcoming";
  };

  const isButtonDisabled = (cls: ClassRecord) => {
    const now = new Date();
    const todayDay = now.toLocaleString("en-US", { weekday: "long" });
    if (finishedClasses.includes(cls.id)) return true;
    if (cls.day_of_week.toLowerCase() !== todayDay.toLowerCase()) return true;

    const [startHour, startMinute] = cls.start_time.split(":").map(Number);
    const [endHour, endMinute] = cls.end_time.split(":").map(Number);
    const classStart = new Date(now);
    classStart.setHours(startHour, startMinute, 0, 0);
    const classEnd = new Date(now);
    classEnd.setHours(endHour, endMinute, 0, 0);
    if (classEnd <= classStart) classEnd.setDate(classEnd.getDate() + 1);

    const bufferMs = 5 * 60 * 1000;
    return now.getTime() < classStart.getTime() - bufferMs || now.getTime() > classEnd.getTime();
  };

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-blue-700 text-white z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative md:translate-x-0 flex-shrink-0`}>
        <div className="flex flex-col justify-between h-full p-6">
          <div>
            <h1 className="text-3xl font-extrabold text-center mb-8">Teacher Panel</h1>
            <nav className="flex flex-col gap-3">
              {navItems.map(tab => (
                <button
                  key={tab.name}
                  onClick={() => { setActiveTab(tab.name); setSidebarOpen(false); }}
                  className={`p-3 flex items-center gap-3 rounded-xl font-medium transition ${activeTab === tab.name ? "bg-blue-900" : "hover:bg-blue-600"}`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </nav>
          </div>
          <button onClick={handleLogout} className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 font-bold">
            <ArrowLeftOnRectangleIcon className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          {sidebarOpen ? <XMarkIcon className="w-6 h-6 text-blue-700" /> : <Bars3Icon className="w-6 h-6 text-blue-700" />}
        </button>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === "Dashboard" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-blue-900">Welcome, {user?.email}</h2>
              <button
                onClick={() => setShowAddClassModal(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" /> Add Class
              </button>
            </div>

            {showAddClassModal && (
              <TeacherClasses
                teacherId={user.id}
                onClose={() => setShowAddClassModal(false)}
                onClassAdded={(newClass: ClassRecord) => setAssignedClasses(prev => [newClass, ...prev])}
              />
            )}

            <p className="text-blue-800 mb-6 font-medium">Manage today's attendance.</p>

            {!activeAttendanceClass ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {assignedClasses.map(cls => {
                  const students = studentsByClass[cls.id] || [];
                  const finished = finishedClasses.includes(cls.id);
                  const status = getClassStatus(cls);
                  const disabled = isButtonDisabled(cls);

                  return (
                    <div
                      key={cls.id}
                      className={`relative p-6 rounded-2xl shadow transition ${finished ? "opacity-80 pointer-events-none" : "hover:shadow-lg"} bg-white`}
                    >
                      {/* Finished Badge */}
                      {finished && (
                        <div className="absolute top-0 right-0 transform rotate-45 translate-x-1/4 -translate-y-1/4 bg-red-500 text-white font-bold text-xs px-4 py-1 shadow-lg">
                          ✔ Finished
                        </div>
                      )}

                      <h3 className="text-xl font-bold text-blue-900">{cls.class_name}</h3>
                      <p className="text-blue-800">{cls.block} • {cls.day_of_week} • {formatTime12Hour(cls.start_time)} - {formatTime12Hour(cls.end_time)}</p>

                      {status === "Ongoing" && <p className="mt-4 text-blue-900 font-medium">Students: {students.length}</p>}

                      <button
                        onClick={() => startAttendance(cls.id)}
                        disabled={disabled || finished}
                        className={`mt-4 w-full px-4 py-2 rounded-xl font-bold transition ${disabled || finished ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        Start Attendance
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow">
                <button onClick={() => setActiveAttendanceClass(null)} className="mb-4 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1">
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" /> Back
                </button>
                <h3 className="text-2xl font-bold mb-4 text-blue-900">Attendance – {assignedClasses.find(c => c.id === activeAttendanceClass)?.class_name}</h3>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="border px-4 py-2 text-left">Student</th>
                      <th className="border px-4 py-2 text-left">Department</th>
                      <th className="border px-4 py-2 text-left">Course</th>
                      <th className="border px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsByClass[activeAttendanceClass]?.map(student => (
                      <tr key={student.id}>
                        <td className="border px-4 py-2 text-blue-900">{student.first_name} {student.last_name}</td>
                        <td className="border px-4 py-2 text-blue-800">{student.department}</td>
                        <td className="border px-4 py-2 text-blue-800">{student.course}</td>
                        <td className="border px-4 py-2">
                          <button
                            onClick={() => markPresent(activeAttendanceClass, student.id)}
                            className={`px-3 py-1 rounded text-white ${student.status === "Present" ? "bg-yellow-500 shadow-md" : "bg-blue-500 hover:bg-blue-600"}`}
                          >
                            {student.status === "Present" ? "Present" : "Mark Present"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => endAttendance(activeAttendanceClass)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">End Attendance</button>
              </div>
            )}
          </>
        )}

        {activeTab === "Reports" && <ClassReport assignedClasses={assignedClasses} />}
        {activeTab === "Attendance" && <StudentAttendance assignedClasses={assignedClasses} />}
        {activeTab === "Profile" && <TeacherProfile />}
        {user && <AttendanceChatbot teacherId={user.id} />}
      </main>
    </div>
  );
}
