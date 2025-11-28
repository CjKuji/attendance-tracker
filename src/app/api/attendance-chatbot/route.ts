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
      return new Response(
        JSON.stringify({ error: "Missing teacherId/studentId or question" }),
        { status: 400 }
      );
    }

    let classes: any[] = [];
    let role = "";

    // Fetch classes
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
      if (!classIds.length)
        return new Response(
          JSON.stringify({ answer: "No enrolled classes found." }),
          { status: 200 }
        );

      const { data: clsData, error: clsError } = await supabase
        .from("classes")
        .select("id, class_name")
        .in("id", classIds);
      if (clsError) throw clsError;
      classes = clsData || [];
    }

    if (!classes.length)
      return new Response(
        JSON.stringify({ answer: "No classes found." }),
        { status: 200 }
      );

    // Fetch attendance data per class & session
    const attendanceData: Record<string, any[]> = {};

    for (const cls of classes) {
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_date")
        .eq("class_id", cls.id)
        .order("session_date", { ascending: true });

      if (!sessions?.length) continue;

      attendanceData[cls.class_name] = [];

      for (const session of sessions) {
        const { data: records } = await supabase
          .from("attendance")
          .select("status, students(first_name, last_name)")
          .eq("session_id", session.id)
          .order("students.last_name", { ascending: true });

        const presentStudents =
          records
            ?.filter(r => r.status === "Present")
            .map(r => {
              const student = r.students?.[0];
              return student ? `${student.first_name} ${student.last_name}` : "Unknown";
            }) || [];

        const absentStudents =
          records
            ?.filter(r => r.status === "Absent")
            .map(r => {
              const student = r.students?.[0];
              return student ? `${student.first_name} ${student.last_name}` : "Unknown";
            }) || [];

        attendanceData[cls.class_name].push({
          sessionDate: session.session_date,
          presentStudents,
          absentStudents,
          totalStudents: presentStudents.length + absentStudents.length,
        });
      }
    }

    // AI prompt
    const prompt = `
You are a smart assistant for role: ${role}.
You have attendance data per class as follows:

${JSON.stringify(attendanceData, null, 2)}

Answer the user's question: "${question}".
- If the question is "Who is absent today?", list absent students by class.
- If the question is "Who has the most absences?", compute totals across sessions and rank students.
- Always include class names and session dates when relevant.
`;

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
