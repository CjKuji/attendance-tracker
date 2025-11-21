"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ClassRecord {
  id: string;
  class_name: string;
  course_id: string;
  course_name: string;
  year: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
}

export default function TeacherClasses({ teacherId }: { teacherId: string }) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newClass, setNewClass] = useState({
    class_name: "",
    course_id: "",
    year: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [teacherDeptId, setTeacherDeptId] = useState<string | null>(null);

  // Fetch teacher's department
  const fetchTeacherDepartment = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", teacherId)
        .single();
      if (error) throw error;
      setTeacherDeptId(data?.department_id || null);
    } catch (err) {
      console.error("Error fetching teacher department:", err);
    }
  };

  // Fetch teacher's classes
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          course_id,
          year,
          day_of_week,
          start_time,
          end_time,
          created_at,
          courses(name)
        `)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data?.map((c: any) => ({
        ...c,
        course_name: c.courses?.name || "",
      }));
      setClasses(formatted || []);
    } catch (err) {
      console.error("Error fetching classes:", err);
    }
    setLoading(false);
  };

  // Fetch courses in teacher's department
  const fetchCourses = async () => {
    if (!teacherDeptId) return;

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", teacherDeptId);
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  useEffect(() => {
    fetchTeacherDepartment();
  }, [teacherId]);

  useEffect(() => {
    if (!teacherDeptId) return;
    fetchCourses();
    fetchClasses();
  }, [teacherDeptId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewClass({ ...newClass, [e.target.name]: e.target.value });
  };

  const handleCreateClass = async () => {
    setError(null);
    const { class_name, course_id, year, day_of_week, start_time, end_time } = newClass;
    if (!class_name || !course_id || !year || !day_of_week || !start_time || !end_time) {
      setError("All fields are required.");
      return;
    }

    try {
      const { error } = await supabase.from("classes").insert([
        {
          teacher_id: teacherId,
          class_name,
          course_id,
          year,
          day_of_week,
          start_time,
          end_time,
        },
      ]);

      if (error) throw error;

      setNewClass({
        class_name: "",
        course_id: "",
        year: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
      });

      fetchClasses();
    } catch (err) {
      console.error("Error creating class:", err);
      setError("Failed to create class.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold">My Classes</h2>

      {/* Create Class Form */}
      <div className="bg-white shadow rounded-2xl p-6 space-y-4">
        <h3 className="text-xl font-semibold">Add New Class</h3>
        {error && <div className="text-red-600 font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="class_name"
            placeholder="Class Name"
            value={newClass.class_name}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          />

          <select
            name="course_id"
            value={newClass.course_id}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          >
            <option value="">Select Course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          <select
            name="year"
            value={newClass.year}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          >
            <option value="">Select Year</option>
            <option value="4th Year">4th Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="1st Year">1st Year</option>
          </select>

          <select
            name="day_of_week"
            value={newClass.day_of_week}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          >
            <option value="">Select Day</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
          </select>

          <input
            type="time"
            name="start_time"
            value={newClass.start_time}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          />

          <input
            type="time"
            name="end_time"
            value={newClass.end_time}
            onChange={handleInputChange}
            className="border rounded-xl px-3 py-2 w-full"
          />
        </div>

        <button
          onClick={handleCreateClass}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow font-semibold"
        >
          Add Class
        </button>
      </div>

      {/* Classes Table */}
      <div className="bg-white shadow rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-xl font-semibold mb-4">All Classes</h3>
        {loading ? (
          <p>Loading classes...</p>
        ) : classes.length === 0 ? (
          <p>No classes found.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700 uppercase text-xs">
                <th className="px-3 py-2 text-left">Class Name</th>
                <th className="px-3 py-2 text-left">Course</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">Day</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-3 py-2 font-medium">{cls.class_name}</td>
                  <td className="px-3 py-2">{cls.course_name}</td>
                  <td className="px-3 py-2">{cls.year}</td>
                  <td className="px-3 py-2">{cls.day_of_week}</td>
                  <td className="px-3 py-2">
                    {cls.start_time} - {cls.end_time}
                  </td>
                  <td className="px-3 py-2">{new Date(cls.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
