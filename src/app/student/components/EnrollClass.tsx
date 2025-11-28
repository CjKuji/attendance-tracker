"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  teacher_name?: string;
}

interface StudentProfile {
  id: string;
  course_id: string;
  year_level: string;
}

export default function EnrollClasses({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format time to 12-hour format
  const formatTime12hr = (time24: string) => {
    if (!time24) return "";
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  // Fetch student profile
  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, course_id, year_level")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load student profile.");
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id, class_name, course_id, year_level, block, day_of_week, start_time, end_time,
          courses:course_id(name),
          teacher:teacher_id(first_name,last_name)
        `)
        .eq("course_id", profile.course_id)
        .eq("year_level", profile.year_level)
        .order("block", { ascending: true })
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      const formatted: ClassRecord[] = (data || []).map((cls: any) => ({
        ...cls,
        course_name: cls.courses?.name || "",
        teacher_name: cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : "",
      }));

      setClasses(formatted);
    } catch (err) {
      console.error(err);
      setError("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch enrolled classes
  const fetchEnrolled = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("class_enrollment")
        .select(`
          class_id,
          classes:class_id (
            id, block, class_name, course_id, year_level, day_of_week, start_time, end_time,
            courses:course_id(name),
            teacher:teacher_id(first_name,last_name)
          )
        `)
        .eq("student_id", userId);

      if (error) throw error;

      const enrolled = (data || []).map((e: any) => ({
        ...e.classes,
        course_name: e.classes?.courses?.name || "",
        teacher_name: e.classes?.teacher
          ? `${e.classes.teacher.first_name} ${e.classes.teacher.last_name}`
          : "",
      }));

      setEnrolledClasses(enrolled);
    } catch (err) {
      console.error(err);
    }
  };

  // Enroll in class
  const handleEnroll = async (classId: string) => {
    if (!userId) return;
    setError(null);
    try {
      const { error } = await supabase
        .from("class_enrollment")
        .insert([{ student_id: userId, class_id: classId }]);
      if (error) throw error;

      const enrolledClass = classes.find((c) => c.id === classId);
      if (enrolledClass) setEnrolledClasses([...enrolledClasses, enrolledClass]);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message?.includes("already enrolled in a class in block")
          ? "You cannot enroll in a class with a different block."
          : "Failed to enroll."
      );
    }
  };

  useEffect(() => { fetchProfile(); }, [userId]);
  useEffect(() => { if (profile) { fetchClasses(); fetchEnrolled(); } }, [profile]);

  const canEnrollInBlock = (clsBlock: string) => {
    if (enrolledClasses.length === 0) return true;
    return enrolledClasses[0].block === clsBlock;
  };

  const groupedByBlock = classes.reduce(
    (acc: Record<string, ClassRecord[]>, cls) => {
      if (!acc[cls.block]) acc[cls.block] = [];
      acc[cls.block].push(cls);
      return acc;
    }, {}
  );

  // ------------------------
  // Render
  // ------------------------
  return (
    <div className="p-6 md:p-10 space-y-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Enroll in Classes</h2>
      {error && <div className="text-red-600 font-semibold bg-red-50 p-3 rounded">{error}</div>}

      {loading ? (
        <p className="text-gray-700 font-medium">Loading classes...</p>
      ) : classes.length === 0 ? (
        <p className="text-gray-700 font-medium">No classes available for enrollment.</p>
      ) : (
        Object.entries(groupedByBlock).map(([block, blockClasses]) => (
          <div key={block} className="bg-white shadow-lg rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Block {block}</h3>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full table-auto border-collapse rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-green-100 text-gray-900 uppercase text-sm font-semibold">
                    <th className="px-4 py-3 text-left">Class Name</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Teacher</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Day</th>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockClasses.map((cls) => {
                    const enrolled = enrolledClasses.some((e) => e.id === cls.id);
                    const canEnroll = !enrolled && canEnrollInBlock(cls.block);
                    return (
                      <tr key={cls.id} className="border-b last:border-none hover:bg-green-50 transition">
                        <td className="px-4 py-2 font-medium text-gray-900">{cls.class_name}</td>
                        <td className="px-4 py-2 text-gray-800">{cls.course_name}</td>
                        <td className="px-4 py-2 text-gray-800">{cls.teacher_name}</td>
                        <td className="px-4 py-2 text-gray-800">{cls.year_level}</td>
                        <td className="px-4 py-2 text-gray-800">{cls.day_of_week}</td>
                        <td className="px-4 py-2 text-gray-800">{formatTime12hr(cls.start_time)} - {formatTime12hr(cls.end_time)}</td>
                        <td className="px-4 py-2">
                          <button
                            disabled={!canEnroll}
                            onClick={() => handleEnroll(cls.id)}
                            className={`px-4 py-2 rounded-lg font-semibold text-white transition shadow ${
                              !canEnroll
                                ? "bg-gray-400 cursor-not-allowed"
                                : enrolled
                                ? "bg-blue-500 cursor-default"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {enrolled ? "Enrolled" : !canEnroll ? "Block Taken" : "Enroll"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {blockClasses.map((cls) => {
                const enrolled = enrolledClasses.some((e) => e.id === cls.id);
                const canEnroll = !enrolled && canEnrollInBlock(cls.block);
                return (
                  <div key={cls.id} className="p-5 bg-white rounded-2xl shadow-lg flex flex-col space-y-2">
                    <h4 className="font-bold text-gray-900 text-lg">{cls.class_name}</h4>
                    <p className="text-gray-800"><span className="font-semibold">Course:</span> {cls.course_name}</p>
                    <p className="text-gray-800"><span className="font-semibold">Teacher:</span> {cls.teacher_name}</p>
                    <p className="text-gray-800"><span className="font-semibold">Year:</span> {cls.year_level}</p>
                    <p className="text-gray-800"><span className="font-semibold">Day:</span> {cls.day_of_week}</p>
                    <p className="text-gray-800"><span className="font-semibold">Time:</span> {formatTime12hr(cls.start_time)} - {formatTime12hr(cls.end_time)}</p>
                    <button
                      disabled={!canEnroll}
                      onClick={() => handleEnroll(cls.id)}
                      className={`mt-3 py-2 rounded-lg font-semibold text-white transition shadow ${
                        !canEnroll
                          ? "bg-gray-400 cursor-not-allowed"
                          : enrolled
                          ? "bg-blue-500 cursor-default"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {enrolled ? "Enrolled" : !canEnroll ? "Block Taken" : "Enroll"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
