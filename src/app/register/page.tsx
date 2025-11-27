"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    middle_initial: "",
    department: "",
    course: "",
    year_level: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  // Fetch courses when department changes
  useEffect(() => {
    if (!formData.department) return;

    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name")
        .eq("department_id", formData.department)
        .order("name", { ascending: true });

      if (!error) setCourses(data);
    };
    fetchCourses();
  }, [formData.department]);

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Strong password validation
  const validatePassword = (password: string) => {
    return (
      /.{8,}/.test(password) &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!validatePassword(formData.password)) {
      setError(
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character."
      );
      setLoading(false);
      return;
    }

    try {
      // 1️⃣ Supabase Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Signup failed. Please try again.");

      // 2️⃣ Insert into students table
      const { error: studentError } = await supabase.from("students").insert({
        id: userId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        department_id: formData.department,
        course_id: formData.course,
        year_level: formData.year_level,
      });

      if (studentError) throw studentError;

      alert("Registration successful! Check your email to confirm your account.");

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        middle_initial: "",
        department: "",
        course: "",
        year_level: "",
        email: "",
        password: "",
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900 placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-10">
      <div className="bg-white/80 backdrop-blur-xl shadow-2xl max-w-4xl w-full rounded-3xl overflow-hidden flex flex-col md:flex-row">

        {/* LEFT SIDE */}
        <div className="w-full md:w-1/2 bg-blue-600 p-10 text-white flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Tracker</h1>
            <p className="opacity-90 text-sm mt-2">
              Efficient and accurate attendance monitoring for students and staff.
            </p>
          </div>

          <div className="mt-10">
            <p className="text-lg font-medium">Digital Attendance System</p>
            <p className="text-sm opacity-80 mt-1 leading-relaxed">
              Create an account and start using our smart attendance monitoring platform.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full md:w-1/2 p-10">
          <h2 className="text-2xl font-semibold text-center text-blue-700 mb-6">
            Create Your Account
          </h2>

          {error && (
            <p className="text-red-600 text-sm mb-4 text-center bg-red-100 py-2 rounded-lg">
              {error}
            </p>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            {/* NAME FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="first_name"
                placeholder="First Name"
                className={inputClass}
                value={formData.first_name}
                onChange={handleChange}
                required
              />
              <input
                name="last_name"
                placeholder="Last Name"
                className={inputClass}
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* MIDDLE + DEPARTMENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="middle_initial"
                placeholder="Middle Initial (Optional)"
                className={inputClass}
                value={formData.middle_initial}
                onChange={handleChange}
              />

              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* COURSE */}
            <select
              name="course"
              value={formData.course}
              onChange={handleChange}
              required
              className={inputClass}
              disabled={!formData.department}
            >
              <option value="" disabled>Select Course</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* YEAR LEVEL */}
            <select
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="" disabled>Select Year Level</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>

            {/* EMAIL */}
            <input
              name="email"
              type="email"
              placeholder="Email"
              className={inputClass}
              value={formData.email}
              onChange={handleChange}
              required
            />

            {/* PASSWORD */}
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={inputClass}
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition transform hover:scale-[1.02]"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
