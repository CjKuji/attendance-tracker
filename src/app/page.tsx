"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          router.push("/login");
          return;
        }

        const userId = session.user.id;

        // Fetch role from teachers table
        const { data: teacher, error: teacherError } = await supabase
          .from("teachers")
          .select("id") // or any field needed
          .eq("id", userId)
          .maybeSingle(); // safer than .single()

        if (teacherError) throw teacherError;

        if (teacher) {
          router.push("/teacher"); // redirect to teacher dashboard
        } else {
          // optionally check students table
          const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (studentError) throw studentError;

          if (student) router.push("/student");
          else router.push("/login"); // fallback
        }

      } catch (err: any) {
        console.error("Error checking session:", err.message || err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        Checking authentication...
      </div>
    );
  }

  return null;
}
