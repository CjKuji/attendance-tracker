"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  X,
  Eye,
  EyeOff,
  Edit2,
  User,
  Mail,
  Building2,
  Lock,
  IdCard,
} from "lucide-react";

// ---------- Types ----------
type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string | null;
  created_at?: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Course = { name: string };

type ClassRow = {
  id: string;
  class_name: string;
  year_level: string;
  block: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  courses?: { name: string }[] | null; // simplified
};

// ---------- Component ----------
export default function TeacherProfile() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [editing, setEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------- Helpers ----------
  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const durationHours = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      let diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
      if (diff < 0) diff += 1440;
      return diff / 60;
    } catch {
      return 0;
    }
  };

  const validatePassword = (password: string) =>
    /.{8,}/.test(password) &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // ---------- Fetch Data ----------
  useEffect(() => {
    let mounted = true;

    const fetchAll = async () => {
      setLoading(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userErr || !user) {
        setToast({ type: "error", message: "Unable to get current user." });
        setLoading(false);
        return;
      }
      const uid = user.id;

      // --- Fetch teacher profile ---
      const { data: tdata, error: terr } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", uid)
        .single();
      const teacherData = tdata as Teacher | null;

      if (terr) {
        console.error("fetch teacher:", terr);
        if (mounted) setToast({ type: "error", message: "Failed to fetch teacher profile." });
      } else if (mounted && teacherData) {
        setTeacher(teacherData);
        setEditFirstName(teacherData.first_name);
        setEditLastName(teacherData.last_name);
        setEditEmail(teacherData.email);
        setEditDepartmentId(teacherData.department_id || null);
      }

      // --- Fetch departments ---
      const { data: deps, error: dErr } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      const departmentsData = deps as Department[];
      if (!dErr && mounted) setDepartments(departmentsData || []);

      // --- Fetch classes ---
      const { data: classRows, error: cErr } = await supabase
        .from("classes")
        .select("id, class_name, year_level, block, day_of_week, start_time, end_time, courses(name)")
        .eq("teacher_id", uid)
        .order("day_of_week");
      const classesData = classRows as ClassRow[];
      if (!cErr && mounted) setClasses(classesData || []);
      if (cErr) console.error("fetch classes:", cErr);

      setLoading(false);
    };

    fetchAll();
    return () => { mounted = false; };
  }, []);

  const totalClasses = classes.length;
  const teachingDays = Array.from(new Set(classes.map((c) => c.day_of_week))).filter(Boolean);
  const weeklyHours = classes.reduce((a, c) => a + durationHours(c.start_time, c.end_time), 0);

  // ---------- Modal Handlers ----------
  const openEdit = () => {
    if (!teacher) return;
    setEditFirstName(teacher.first_name);
    setEditLastName(teacher.last_name);
    setEditEmail(teacher.email);
    setEditDepartmentId(teacher.department_id || null);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setEditing(true);
  };

  const closeEdit = () => {
    setEditing(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // ---------- Save Logic ----------
  const saveEdit = async () => {
    if (!teacher) return;
    setToast(null);

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setToast({ type: "error", message: "Please fill first name, last name, and email." });
      return;
    }

    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      setToast({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (newPassword && !validatePassword(newPassword)) {
      setToast({
        type: "error",
        message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character.",
      });
      return;
    }

    setSaving(true);

    let authFailed = false;
    const authUpdates: { email?: string; password?: string } = {};
    if (editEmail !== teacher.email) authUpdates.email = editEmail;
    if (newPassword) authUpdates.password = newPassword;

    if (Object.keys(authUpdates).length > 0) {
      try {
        const { error: authErr } = await supabase.auth.updateUser(authUpdates);
        if (authErr) {
          console.error("auth.updateUser", authErr);
          setToast({ type: "error", message: `Auth update failed: ${authErr.message}` });
          authFailed = true;
        }
      } catch (e) {
        console.error("auth update exception", e);
        setToast({ type: "error", message: "Auth update failed." });
        authFailed = true;
      }
    }

    if (!authFailed) {
      const updates: Partial<Teacher> = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
        department_id: editDepartmentId,
      };
      try {
        const { error: dbErr } = await supabase.from("teachers").update(updates).eq("id", teacher.id);
        if (dbErr) {
          console.error("teachers.update", dbErr);
          setToast({ type: "error", message: "Failed to update teacher record." });
        } else {
          setTeacher((prev) => (prev ? { ...prev, ...updates } : prev));
          setToast({ type: "success", message: "Profile updated successfully." });
          setEditing(false);
        }
      } catch (e) {
        console.error("db update exception", e);
        setToast({ type: "error", message: "Failed to update teacher record." });
      }
    }

    setSaving(false);
  };

  // ---------- Render ----------
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {toast && (
        <div
          role="status"
          className={`p-3 rounded-md text-sm ${
            toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4">
        {/* ... profile header & summary ... */}
      </div>

      {/* Classes */}
      <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Assigned Classes</h3>
        {!classes.length ? (
          <div className="text-slate-500">No classes assigned.</div>
        ) : (
          <div className="grid gap-3">
            {classes.map((c) => {
              const courseName = c.courses?.[0]?.name || "Course";
              const formatTime = (t: string) => {
                try {
                  const [h, m] = t.split(":").map(Number);
                  const date = new Date();
                  date.setHours(h, m || 0, 0, 0);
                  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                } catch {
                  return t;
                }
              };
              return (
                <div
                  key={c.id}
                  className="p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {courseName} · {c.year_level} · Block {c.block}
                    </div>
                    <div className="text-sm text-slate-500">
                      {c.day_of_week} • {formatTime(c.start_time)} – {formatTime(c.end_time)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-2xl shadow-2xl rounded-2xl border border-slate-200 p-6 sm:p-8 overflow-y-auto max-h-[95vh]">
            {/* Form content (personal info + password) */}
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-slate-500">Loading…</div>}
    </div>
  );
}
