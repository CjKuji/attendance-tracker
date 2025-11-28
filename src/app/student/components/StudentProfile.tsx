"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  // Fetch courses
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!student) return;
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!student) return;
    setLoading(true); setError(null);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          first_name: student.first_name,
          last_name: student.last_name,
          department_id: student.department_id,
          course_id: student.course_id,
          year_level: student.year_level,
        })
        .eq("id", student.id);
      if (error) throw error;
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error saving profile: " + (err.message || err));
    } finally { setLoading(false); }
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

  return (
    <div className="min-h-screen bg-white flex justify-center py-16 px-6">
      <div className="w-full max-w-2xl bg-blue-50 shadow-2xl rounded-3xl p-12 space-y-12">
        <h2 className="text-3xl font-extrabold text-center text-blue-900">Student Profile</h2>

        {loading && !student ? (
          <p className="text-center text-blue-900 font-medium">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-700 font-medium">{error}</p>
        ) : student ? (
          <>
            <div className="space-y-6">

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-blue-700 font-medium mb-1">First Name</label>
                  <input
                    name="first_name"
                    value={student.first_name || ""}
                    onChange={handleChange}
                    className="w-full p-4 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-blue-700 font-medium mb-1">Last Name</label>
                  <input
                    name="last_name"
                    value={student.last_name || ""}
                    onChange={handleChange}
                    className="w-full p-4 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-900 font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-blue-700 font-medium mb-1">Email</label>
                <input
                  name="email"
                  value={student.email}
                  disabled
                  className="w-full p-4 border border-blue-300 rounded-xl bg-blue-100 text-blue-900 cursor-not-allowed font-medium"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-blue-700 font-medium mb-1">Department</label>
                <select
                  name="department_id"
                  value={student.department_id || ""}
                  onChange={handleChange}
                  className="w-full p-4 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-900 font-medium"
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>

              {/* Course */}
              {courses.length > 0 && (
                <div>
                  <label className="block text-blue-700 font-medium mb-1">Course</label>
                  <select
                    name="course_id"
                    value={student.course_id || ""}
                    onChange={handleChange}
                    className="w-full p-4 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-900 font-medium"
                  >
                    <option value="" disabled>Select Course</option>
                    {courses.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              )}

              {/* Year Level */}
              <div>
                <label className="block text-blue-700 font-medium mb-1">Year Level</label>
                <select
                  name="year_level"
                  value={student.year_level || ""}
                  onChange={handleChange}
                  className="w-full p-4 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-blue-900 font-medium"
                >
                  <option value="" disabled>Select Year Level</option>
                  {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-700 text-white py-4 rounded-2xl font-bold hover:bg-blue-800 transition"
              >
                {loading ? "Saving..." : "Save Profile"}
              </button>
            </div>

            {/* Change Password Section */}
            <div className="mt-12 space-y-6 border-t border-blue-300 pt-8">
              <h3 className="text-2xl font-bold text-center text-green-900">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-green-700 font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 text-green-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-green-700 font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-4 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 text-green-900 font-medium"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold hover:bg-green-800 transition"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
