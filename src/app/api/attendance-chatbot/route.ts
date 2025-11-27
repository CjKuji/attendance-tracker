// app/api/attendance-chatbot/route.ts
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

// Gemini (OpenAI-compatible) client
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

interface AttendanceRecord {
  totalStudents: number;
  present: number;
  absent: number;
}

export async function POST(req: Request) {
  try {
    const { teacherId, question } = await req.json();

    if (!teacherId || !question) {
      return new Response(JSON.stringify({ error: "Missing teacherId or question" }), {
        status: 400,
      });
    }

    // 1️⃣ Fetch teacher's classes
    const { data: classes, error: classError } = await supabase
      .from("classes")
      .select("id, class_name, course_id, year_level, block")
      .eq("teacher_id", teacherId);

    if (classError) throw classError;
    if (!classes || classes.length === 0) {
      return new Response(JSON.stringify({ answer: "No classes found for this teacher." }), {
        status: 200,
      });
    }

    // 2️⃣ Build attendance dataset
    const attendanceData: Record<string, Record<string, AttendanceRecord>> = {};

    for (const cls of classes) {
      // Fetch sessions
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date")
        .eq("class_id", cls.id);

      if (!sessions || sessions.length === 0) continue;

      attendanceData[cls.class_name] = {};

      for (const session of sessions) {
        const { data: records } = await supabase
          .from("attendance")
          .select("status, student_id")
          .eq("session_id", session.id);

        const present = records?.filter((r: any) => r.status === "Present").length || 0;
        const absent = records?.filter((r: any) => r.status === "Absent").length || 0;

        attendanceData[cls.class_name][session.session_date] = {
          totalStudents: present + absent,
          present,
          absent,
        };
      }
    }

    // 3️⃣ Prepare structured prompt for Gemini
    const prompt = `
You are a helpful assistant for a teacher.
The teacher has the following classes and attendance data:

${JSON.stringify(attendanceData, null, 2)}

Answer the question clearly and accurately: "${question}"
Provide totals, counts, or lists as needed. 
Do not fabricate data; if data is missing, state "No data available".
`;

    console.log("Prompt sent to Gemini:", prompt);

    // 4️⃣ Request answer from Gemini
    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    });

    const answer = response.choices?.[0]?.message?.content || "No response from AI";
    console.log("Gemini answer:", answer);

    return new Response(JSON.stringify({ answer }), { status: 200 });
  } catch (err: any) {
    console.error("Error in attendance-chatbot route:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
