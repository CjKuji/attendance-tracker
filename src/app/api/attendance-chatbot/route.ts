import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function POST(req: Request) {
  try {
    const { teacherId, studentId, question } = await req.json();

    if ((!teacherId && !studentId) || !question) {
      return new Response(JSON.stringify({ error: "Missing teacherId/studentId or question" }), { status: 400 });
    }

    let classes: any[] = [];
    let role = "";

    if (teacherId) {
      role = "teacher";
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name")
        .eq("teacher_id", teacherId);
      if (error) throw error;
      classes = data || [];
    } else if (studentId) {
      role = "student";
      const { data: enrollmentData, error: enrollError } = await supabase
        .from("class_enrollment")
        .select("class_id")
        .eq("student_id", studentId);
      if (enrollError) throw enrollError;

      const classIds = enrollmentData?.map((e: any) => e.class_id) || [];
      if (!classIds.length) return new Response(JSON.stringify({ answer: "No enrolled classes found." }), { status: 200 });

      const { data: clsData, error: clsError } = await supabase
        .from("classes")
        .select("id, class_name")
        .in("id", classIds);
      if (clsError) throw clsError;
      classes = clsData || [];
    }

    if (!classes.length) return new Response(JSON.stringify({ answer: "No classes found." }), { status: 200 });

    const attendanceData: Record<string, any> = {};

    for (const cls of classes) {
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date")
        .eq("class_id", cls.id);

      if (!sessions?.length) continue;

      attendanceData[cls.class_name] = {};

      for (const session of sessions) {
        const { data: records } = await supabase
          .from("attendance")
          .select("status, student_id")
          .eq("session_id", session.id);

        const present = records?.filter((r: any) => r.status === "Present").length || 0;
        const absent = records?.filter((r: any) => r.status === "Absent").length || 0;

        attendanceData[cls.class_name][session.session_date] = { totalStudents: present + absent, present, absent };
      }
    }

    const prompt = `You are an AI assistant for role: ${role}.
Attendance data: ${JSON.stringify(attendanceData)}.
Answer the question: "${question}" clearly.`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    });

    const answer = response.choices?.[0]?.message?.content || "No response";
    return new Response(JSON.stringify({ answer }), { status: 200 });
  } catch (err: any) {
    console.error("Attendance Chatbot Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
