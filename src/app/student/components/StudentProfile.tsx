"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, User, Lock } from "lucide-react";

interface Department { id: string; name: string; }
interface Course { id: string; name: string; department_id: string; }
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
  course_id?: string | null;
  year_level?: string | null;
}
interface StudentProfileProps { userId: string; }

export default function StudentProfile({ userId }: StudentProfileProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editModal, setEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const router = useRouter();

  // ---------------------------
  // Auth check
  // ---------------------------
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.push("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  // ---------------------------
  // Fetch student profile
  // ---------------------------
  useEffect(() => {
    if (!userId) return;
    const fetchStudent = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from("students").select("*").eq("id", userId).maybeSingle();
        if (error) throw error;
        setStudent(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [userId]);

  // ---------------------------
  // Fetch departments
  // ---------------------------
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await supabase.from("departments").select("*").order("name");
        setDepartments(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepartments();
  }, []);

  // ---------------------------
  // Fetch courses based on department
  // ---------------------------
  useEffect(() => {
    if (!student?.department_id) { setCourses([]); return; }
    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("department_id", student.department_id)
          .order("name");
        setCourses(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCourses();
  }, [student?.department_id]);

  // ---------------------------
  // Handlers
  // ---------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editStudent) return;
    setEditStudent({ ...editStudent, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!editStudent) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          first_name: editStudent.first_name,
          last_name: editStudent.last_name,
          department_id: editStudent.department_id,
          course_id: editStudent.course_id,
          year_level: editStudent.year_level,
        })
        .eq("id", editStudent.id);
      if (error) throw error;
      setStudent(editStudent);
      setEditModal(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error saving profile: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Password updated successfully!");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      alert("Error changing password: " + (err.message || err));
    } finally { setPasswordLoading(false); }
  };

  const openEditModal = () => {
    setEditStudent(student);
    setEditModal(true);
  };
  const closeEditModal = () => setEditModal(false);

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-white flex justify-center py-16 px-6">
      <div className="w-full max-w-3xl space-y-8">
        {loading && !student ? (
          <p className="text-center text-indigo-900 font-medium">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-600 font-medium">{error}</p>
        ) : student ? (
          <>
            {/* ---------- Profile Card ---------- */}
            <div className="bg-white rounded-3xl shadow-xl p-8 space-y-4 border-l-4 border-indigo-600">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl">
                    {student.first_name[0]}{student.last_name[0]}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-indigo-900">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="text-sm text-indigo-900">{student.email}</div>
                    <div className="mt-1 text-sm text-indigo-900">
                      Department: <span className="font-semibold">{departments.find(d => d.id === student.department_id)?.name || "-"}</span>
                    </div>
                    <div className="mt-1 text-sm text-indigo-900">
                      Course: <span className="font-semibold">{courses.find(c => c.id === student.course_id)?.name || "-"}</span>
                    </div>
                    <div className="mt-1 text-sm text-indigo-900">
                      Year Level: <span className="font-semibold">{student.year_level || "-"}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg transition"
                >
                  <User className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            </div>

            {/* ---------- Change Password ---------- */}
            <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6 border-l-4 border-green-600">
              <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" /> Change Password
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-sm font-bold text-green-900">New Password</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-green-500 text-green-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-9 text-green-700 hover:text-green-900"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="text-sm font-bold text-green-900">Confirm Password</label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-green-500 text-green-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-green-700 hover:text-green-900"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* ---------- Edit Modal ---------- */}
        {editModal && editStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEditModal} />
            <div className="relative w-full max-w-xl bg-white rounded-2xl border border-indigo-300 p-6 sm:p-8 overflow-y-auto max-h-[95vh] shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                  <User className="w-6 h-6 text-indigo-600" /> Edit Profile
                </h2>
                <button onClick={closeEditModal} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-indigo-100">
                  <X className="w-5 h-5 text-indigo-700" />
                </button>
              </div>
              <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-indigo-900">First Name</label>
                    <input
                      name="first_name"
                      value={editStudent.first_name || ""}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-indigo-500 text-indigo-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-indigo-900">Last Name</label>
                    <input
                      name="last_name"
                      value={editStudent.last_name || ""}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-indigo-500 text-indigo-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-indigo-900">Department</label>
                  <select
                    name="department_id"
                    value={editStudent.department_id || ""}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-indigo-500 text-indigo-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                {courses.length > 0 && (
                  <div>
                    <label className="text-sm font-bold text-indigo-900">Course</label>
                    <select
                      name="course_id"
                      value={editStudent.course_id || ""}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-indigo-500 text-indigo-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-sm font-bold text-indigo-900">Year Level</label>
                  <select
                    name="year_level"
                    value={editStudent.year_level || ""}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-indigo-500 text-indigo-900 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Select Year Level</option>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
