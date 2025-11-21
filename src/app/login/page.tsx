"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Sign in user
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      if (!authData.user) throw new Error("User not found");

      // Fetch role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Redirect based on role
      if (profile?.role === "teacher") router.push("/teacher");
      else router.push("/student");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-10">
      <div className="bg-white/80 backdrop-blur-xl shadow-2xl max-w-4xl w-full rounded-3xl overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT SECTION */}
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
              Login now and access your attendance portal with a clean and intuitive interface.
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full md:w-1/2 p-10">
          <h2 className="text-2xl font-semibold text-center text-blue-700 mb-6">
            Welcome Back
          </h2>

          {error && (
            <p className="text-red-600 text-sm mb-4 text-center bg-red-100 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={inputClass + " pr-12"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition transform hover:scale-[1.02]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Don’t have an account?{" "}
              <Link href="/register" className="text-blue-600 font-medium hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
