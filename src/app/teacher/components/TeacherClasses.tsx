"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  XMarkIcon,
  PlusCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { User, BookOpen, Check } from "lucide-react";

// ---------- Types ----------
interface ClassRecord {
  id: string;
  class_name: string;
  course_id: string;
  course_name: string;
  year_level: string;
  block: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
}

interface TeacherClassesProps {
  teacherId: string;
  onClose: () => void;
  onClassAdded: (newClass: ClassRecord) => void;
}

// ---------- Component ----------
export default function TeacherClasses({
  teacherId,
  onClose,
  onClassAdded,
}: TeacherClassesProps) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherDeptId, setTeacherDeptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newClass, setNewClass] = useState({
    class_name: "",
    course_id: "",
    year_level: "",
    block: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
  });

  // ---------- Fetch Data ----------
  const fetchTeacherDepartment = async () => {
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("department_id")
        .eq("id", teacherId)
        .maybeSingle();
      if (error) throw error;
      setTeacherDeptId(data?.department_id || null);
    } catch (err) {
      console.error("Error fetching teacher department:", err);
    }
  };

  const fetchCourses = async () => {
    if (!teacherDeptId) return;
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("department_id", teacherDeptId);
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(
          `id, class_name, course_id, year_level, block, day_of_week, start_time, end_time, created_at, courses(name)`
        )
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

  useEffect(() => {
    fetchTeacherDepartment();
  }, [teacherId]);

  useEffect(() => {
    if (!teacherDeptId) return;
    fetchCourses();
    fetchClasses();
  }, [teacherDeptId]);

  // ---------- Handlers ----------
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setNewClass({ ...newClass, [e.target.name]: e.target.value });
  };

  const handleCreateClass = async () => {
    setError(null);
    const { class_name, course_id, year_level, block, day_of_week, start_time, end_time } = newClass;

    if (!class_name || !course_id || !year_level || !block || !day_of_week || !start_time || !end_time) {
      setError("All fields are required.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("classes")
        .insert([{ teacher_id: teacherId, class_name, course_id, year_level, block, day_of_week, start_time, end_time }])
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const courseName = courses.find(c => c.id === data.course_id)?.name || "";
        const addedClass: ClassRecord = { ...data, course_name: courseName };
        onClassAdded(addedClass);
        setNewClass({ class_name: "", course_id: "", year_level: "", block: "", day_of_week: "", start_time: "", end_time: "" });
        fetchClasses();
      }
    } catch (err) {
      console.error("Error creating class:", err);
      setError("Failed to create class.");
    }
  };

  const dayColors: Record<string, string> = {
    Monday: "bg-red-100 text-red-700",
    Tuesday: "bg-orange-100 text-orange-700",
    Wednesday: "bg-yellow-100 text-yellow-700",
    Thursday: "bg-green-100 text-green-700",
    Friday: "bg-blue-100 text-blue-700",
    Saturday: "bg-indigo-100 text-indigo-700",
    Sunday: "bg-purple-100 text-purple-700",
  };

  // ---------- Render ----------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn bg-black/50">
      <div className="relative w-full max-w-6xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[95vh]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition shadow-md"
        >
          <XMarkIcon className="w-6 h-6 text-gray-700" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" /> My Classes
          </h2>
          <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm px-4 py-2 rounded-full font-semibold mt-3 sm:mt-0">
            {classes.length} Total <Check className="w-4 h-4" />
          </span>
        </div>

        {/* Add Class Form */}
        <div className="bg-gray-50 p-6 rounded-2xl shadow-lg space-y-5 mb-8">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <PlusCircleIcon className="w-6 h-6 text-green-600" /> Add New Class
          </h3>
          {error && <div className="text-red-600 font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
            <div className="relative">
              <User className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="class_name"
                placeholder="Class Name"
                value={newClass.class_name}
                onChange={handleInputChange}
                className="pl-10 border rounded-xl px-3 py-3 w-full focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="relative">
              <TagIcon className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <select
                name="course_id"
                value={newClass.course_id}
                onChange={handleInputChange}
                className="pl-10 border rounded-xl px-3 py-3 w-full focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <select
              name="year_level"
              value={newClass.year_level}
              onChange={handleInputChange}
              className="border rounded-xl px-3 py-3"
            >
              <option value="">Select Year Level</option>
              {["1st Year","2nd Year","3rd Year","4th Year"].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              name="block"
              value={newClass.block}
              onChange={handleInputChange}
              className="border rounded-xl px-3 py-3"
            >
              <option value="">Select Block</option>
              {["A","B","C","D"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select
              name="day_of_week"
              value={newClass.day_of_week}
              onChange={handleInputChange}
              className="border rounded-xl px-3 py-3"
            >
              <option value="">Select Day</option>
              {Object.keys(dayColors).map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <div className="relative">
              <ClockIcon className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                type="time"
                name="start_time"
                value={newClass.start_time}
                onChange={handleInputChange}
                className="pl-10 border rounded-xl px-3 py-3 w-full"
              />
            </div>

            <div className="relative">
              <ClockIcon className="absolute top-3 left-3 w-5 h-5 text-gray-400" />
              <input
                type="time"
                name="end_time"
                value={newClass.end_time}
                onChange={handleInputChange}
                className="pl-10 border rounded-xl px-3 py-3 w-full"
              />
            </div>
          </div>

          <button
            onClick={handleCreateClass}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            Add Class
          </button>
        </div>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading
            ? <div className="text-gray-500 col-span-full">Loading…</div>
            : classes.length === 0
              ? <div className="text-gray-500 col-span-full">No classes assigned.</div>
              : classes.map(c => (
                <div key={c.id} className="border rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:shadow-lg hover:bg-indigo-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-800">{c.class_name}</div>
                    <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-full font-semibold">{c.course_name}</span>
                  </div>
                  <div className="flex flex-wrap items-center text-gray-500 text-sm gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${dayColors[c.day_of_week]}`}>
                      <CalendarDaysIcon className="w-3 h-3" /> {c.day_of_week}
                    </span>
                    <span className="inline-flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {c.start_time} – {c.end_time}</span>
                    <span className="inline-flex items-center gap-1"><TagIcon className="w-3 h-3" /> Block {c.block}</span>
                    <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {c.year_level}</span>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
