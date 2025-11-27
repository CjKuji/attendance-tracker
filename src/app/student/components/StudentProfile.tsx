"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  department_id: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
  course_id?: string | null;
  year_level?: string | null;
}

interface StudentProfileProps {
  userId: string;
}

export default function StudentProfile({ userId }: StudentProfileProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // ---------------------------
  // AUTH CHECK
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
  // FETCH STUDENT PROFILE
  // ---------------------------
  useEffect(() => {
    if (!userId) return;

    const fetchStudent = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        setStudent(data);
      } catch (err: any) {
        console.error("Error fetching student:", err);
        setError(err.message || "Failed to load student profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [userId]);

  // ---------------------------
  // FETCH DEPARTMENTS
  // ---------------------------
  useEffect(() => {
    const fetchDept = async () => {
      try {
        const { data } = await supabase
          .from("departments")
          .select("*")
          .order("name");

        setDepartments(data || []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };

    fetchDept();
  }, []);

  // ---------------------------
  // FETCH COURSES WHEN DEPARTMENT CHANGES
  // ---------------------------
  useEffect(() => {
    if (!student?.department_id) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("department_id", student.department_id)
          .order("name");

        setCourses(data || []);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    fetchCourses();
  }, [student?.department_id]);

  // ---------------------------
  // HANDLE INPUT CHANGE
  // ---------------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!student) return;
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  // ---------------------------
  // SAVE STUDENT PROFILE
  // ---------------------------
  const handleSave = async () => {
    if (!student) return;
    setLoading(true);
    setError(null);

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
      console.error("Error saving profile:", err);
      alert("Error saving profile: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-3xl w-full max-w-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Student Profile</h2>

        {loading && !student ? (
          <p className="text-center">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : student ? (
          <div className="space-y-4">
            {/* FIRST + LAST NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="first_name"
                value={student.first_name}
                onChange={handleChange}
                placeholder="First Name"
                className="p-3 border rounded-xl w-full"
              />
              <input
                name="last_name"
                value={student.last_name}
                onChange={handleChange}
                placeholder="Last Name"
                className="p-3 border rounded-xl w-full"
              />
            </div>

            {/* EMAIL (disabled) */}
            <input
              name="email"
              value={student.email}
              disabled
              className="p-3 border rounded-xl w-full bg-gray-100"
            />

            {/* DEPARTMENT */}
            <select
              name="department_id"
              value={student.department_id || ""}
              onChange={handleChange}
              className="p-3 border rounded-xl w-full"
            >
              <option value="" disabled>Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* COURSE */}
            {courses.length > 0 && (
              <select
                name="course_id"
                value={student.course_id || ""}
                onChange={handleChange}
                className="p-3 border rounded-xl w-full"
              >
                <option value="" disabled>Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            {/* YEAR LEVEL */}
            <select
              name="year_level"
              value={student.year_level || ""}
              onChange={handleChange}
              className="p-3 border rounded-xl w-full"
            >
              <option value="" disabled>Select Year Level</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>

            {/* SAVE BUTTON */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
