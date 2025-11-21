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
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  middle_initial?: string;
  email: string;
  department_id?: string;
  course_id?: string;
}

export default function StudentProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auth check
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/login");
      else setUser(data.session.user);
    };
    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
      else setUser(session.user);
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) console.error(error.message);
      else setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (!error) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  // Fetch courses when department changes
  useEffect(() => {
    if (!profile?.department_id) return;
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("department_id", profile.department_id)
        .order("name");

      if (!error) setCourses(data);
    };
    fetchCourses();
  }, [profile?.department_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!profile) return;
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        middle_initial: profile.middle_initial,
        department_id: profile.department_id,
        course_id: profile.course_id,
      })
      .eq("id", profile.id);

    if (error) alert("Error saving profile: " + error.message);
    else alert("Profile updated successfully!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-3xl w-full max-w-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Student Profile</h2>

        {!profile ? (
          <p className="text-center">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="first_name"
                value={profile.first_name}
                onChange={handleChange}
                placeholder="First Name"
                className="p-3 border rounded-xl w-full"
              />
              <input
                name="last_name"
                value={profile.last_name}
                onChange={handleChange}
                placeholder="Last Name"
                className="p-3 border rounded-xl w-full"
              />
            </div>

            <input
              name="middle_initial"
              value={profile.middle_initial || ""}
              onChange={handleChange}
              placeholder="Middle Initial"
              className="p-3 border rounded-xl w-full"
            />

            <input
              name="email"
              value={profile.email}
              disabled
              className="p-3 border rounded-xl w-full bg-gray-100"
            />

            <select
              name="department_id"
              value={profile.department_id || ""}
              onChange={handleChange}
              className="p-3 border rounded-xl w-full"
            >
              <option value="" disabled>Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {courses.length > 0 && (
              <select
                name="course_id"
                value={profile.course_id || ""}
                onChange={handleChange}
                className="p-3 border rounded-xl w-full"
              >
                <option value="" disabled>Select Course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
