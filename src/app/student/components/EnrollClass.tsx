"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ----------- INTERFACES -----------
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

  // ------------------------------
  // FETCH STUDENT PROFILE
  // ------------------------------
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
      console.error("Error fetching profile:", err);
      setError("Failed to load student profile.");
    }
  };

  // ------------------------------
  // FETCH CLASSES FOR STUDENT'S COURSE + YEAR LEVEL
  // ------------------------------
  const fetchClasses = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          course_id,
          year_level,
          block,
          day_of_week,
          start_time,
          end_time,
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
      console.error("Error fetching classes:", err);
      setError("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // FETCH ENROLLED CLASSES
  // ------------------------------
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
      console.error("Error fetching enrolled classes:", err);
    }
  };

  // ------------------------------
  // ENROLL FUNCTION
  // ------------------------------
  const handleEnroll = async (classId: string) => {
    if (!userId) return;
    setError(null);

    try {
      const { error } = await supabase.from("class_enrollment").insert([
        { student_id: userId, class_id: classId },
      ]);

      if (error) throw error;

      // Update enrolledClasses locally
      const enrolledClass = classes.find((c) => c.id === classId);
      if (enrolledClass) {
        setEnrolledClasses([...enrolledClasses, enrolledClass]);
      }
    } catch (err: any) {
      console.error("Enroll error:", err);
      setError(
        err?.message?.includes("already enrolled in a class in block")
          ? "You cannot enroll in a class with a different block."
          : "Failed to enroll."
      );
    }
  };

  // ------------------------------
  // INITIAL FETCHES
  // ------------------------------
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) {
      fetchClasses();
      fetchEnrolled();
    }
  }, [profile]);

  // ------------------------------
  // HELPER: Check if a class can be enrolled (must match block of already enrolled)
  // ------------------------------
  const canEnrollInBlock = (clsBlock: string) => {
    if (enrolledClasses.length === 0) return true;
    const enrolledBlock = enrolledClasses[0].block;
    return clsBlock === enrolledBlock;
  };

  // ------------------------------
  // GROUP CLASSES BY BLOCK
  // ------------------------------
  const groupedByBlock = classes.reduce(
    (acc: Record<string, ClassRecord[]>, cls) => {
      if (!acc[cls.block]) acc[cls.block] = [];
      acc[cls.block].push(cls);
      return acc;
    },
    {}
  );

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold">Enroll in Classes</h2>
      {error && <div className="text-red-600 font-medium">{error}</div>}

      {loading ? (
        <p>Loading classes...</p>
      ) : classes.length === 0 ? (
        <p>No classes available for enrollment.</p>
      ) : (
        Object.entries(groupedByBlock).map(([block, blockClasses]) => (
          <div key={block} className="bg-white shadow rounded-2xl p-6 overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Block {block}</h3>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700 uppercase text-xs">
                  <th className="px-3 py-2 text-left">Class Name</th>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-left">Teacher</th>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-left">Day</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {blockClasses.map((cls) => {
                  const enrolled = enrolledClasses.some((e) => e.id === cls.id);
                  const canEnroll = !enrolled && canEnrollInBlock(cls.block);

                  return (
                    <tr key={cls.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-3 py-2 font-medium">{cls.class_name}</td>
                      <td className="px-3 py-2">{cls.course_name}</td>
                      <td className="px-3 py-2">{cls.teacher_name}</td>
                      <td className="px-3 py-2">{cls.year_level}</td>
                      <td className="px-3 py-2">{cls.day_of_week}</td>
                      <td className="px-3 py-2">{cls.start_time} - {cls.end_time}</td>
                      <td className="px-3 py-2">
                        <button
                          disabled={!canEnroll}
                          onClick={() => handleEnroll(cls.id)}
                          className={`px-3 py-1 rounded font-semibold text-white ${
                            !canEnroll
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {enrolled
                            ? "Enrolled"
                            : !canEnroll
                            ? "Block Taken"
                            : "Enroll"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
