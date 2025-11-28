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

type ClassRow = {
  id: string;
  class_name: string;
  year_level: string;
  block: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  courses?: { name: string }[] | null;
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
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const shortId = (id?: string) => (id ? id.slice(0, 8) : "-");

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

      // Fetch teacher profile
      const { data: tdata, error: terr } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", uid)
        .single();

      if (!terr && mounted && tdata) {
        setTeacher(tdata);
        setEditFirstName(tdata.first_name);
        setEditLastName(tdata.last_name);
        setEditEmail(tdata.email);
        setEditDepartmentId(tdata.department_id || null);
      }

      // Fetch departments
      const { data: deps } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (mounted) setDepartments(deps || []);

      // Fetch classes
      const { data: classRows, error: cErr } = await supabase
        .from("classes")
        .select("id, class_name, year_level, block, day_of_week, start_time, end_time, courses(name)")
        .eq("teacher_id", uid)
        .order("day_of_week");

      if (!cErr && mounted) setClasses(classRows || []);

      setLoading(false);
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  const totalClasses = classes.length;
  const teachingDays = Array.from(new Set(classes.map((c) => c.day_of_week))).filter(Boolean);
  const weeklyHours = classes.reduce((a, c) => a + durationHours(c.start_time, c.end_time), 0);

  // ---------- Modal ----------
  const openEdit = () => {
    if (!teacher) return;
    setEditFirstName(teacher.first_name);
    setEditLastName(teacher.last_name);
    setEditEmail(teacher.email);
    setEditDepartmentId(teacher.department_id || null);
    setNewPassword("");
    setConfirmPassword("");
    setEditing(true);
  };

  const closeEdit = () => {
    setEditing(false);
  };

  // ---------- Save Logic ----------
  const saveEdit = async () => {
    if (!teacher) return;
    setToast(null);

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setToast({ type: "error", message: "Please fill out all fields." });
      return;
    }

    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      setToast({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (newPassword && !validatePassword(newPassword)) {
      setToast({
        type: "error",
        message: "Password must be 8+ characters, with uppercase, lowercase, number, and special character.",
      });
      return;
    }

    setSaving(true);

    // Auth updates (email/password)
    const authUpdates: { email?: string; password?: string } = {};
    if (editEmail !== teacher.email) authUpdates.email = editEmail;
    if (newPassword) authUpdates.password = newPassword;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await supabase.auth.updateUser(authUpdates);
      if (authErr) {
        setToast({ type: "error", message: authErr.message });
        setSaving(false);
        return;
      }
    }

    // Update teacher table
    const updates = {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      email: editEmail.trim(),
      department_id: editDepartmentId,
    };

    const { error: dbErr } = await supabase
      .from("teachers")
      .update(updates)
      .eq("id", teacher.id);

    if (dbErr) {
      setToast({ type: "error", message: "Failed to update teacher record." });
    } else {
      setTeacher((prev) => (prev ? { ...prev, ...updates } : prev));
      setToast({ type: "success", message: "Profile updated successfully." });
      setEditing(false);
    }

    setSaving(false);
  };

  // ---------- Render ----------
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {toast && (
        <div
          role="alert"
          className={`p-3 rounded-md text-sm ${
            toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* --- Profile Card --- */}
      <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xl">
              {teacher ? `${teacher.first_name[0]}${teacher.last_name[0]}`.toUpperCase() : "T"}
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {teacher ? `${teacher.first_name} ${teacher.last_name}` : "—"}
              </div>
              <div className="text-sm text-slate-500">{teacher?.email || "—"}</div>
              <div className="mt-2 text-sm text-slate-600">
                Department:{" "}
                <span className="font-medium">
                  {departments.find((d) => d.id === teacher?.department_id)?.name || "—"}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Joined: {formatDate(teacher?.created_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500 text-right">
              <div>ID</div>
              <div className="font-mono font-semibold text-slate-700">{shortId(teacher?.id)}</div>
            </div>
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-xs text-slate-500">Total Classes</div>
            <div className="text-xl font-semibold text-slate-800">{totalClasses}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-xs text-slate-500">Teaching Days</div>
            <div className="text-lg text-slate-800">
              {teachingDays.length ? teachingDays.join(", ") : "—"}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-xs text-slate-500">Weekly Hours</div>
            <div className="text-xl font-semibold text-slate-800">{weeklyHours.toFixed(1)} hrs</div>
          </div>
        </div>
      </div>

      {/* --- Classes List --- */}
      <div className="bg-white rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Assigned Classes</h3>
        {!classes.length ? (
          <div className="text-slate-500">No classes assigned.</div>
        ) : (
          <div className="grid gap-3">
            {classes.map((c) => {
              const courseName = c.courses?.[0]?.name || "Course";
              const formatTime = (t: string) => {
                const [h, m] = t.split(":").map(Number);
                const date = new Date();
                date.setHours(h, m, 0, 0);
                return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

      {/* --- Edit Modal --- */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-2xl shadow-2xl rounded-2xl border border-slate-200 p-6 sm:p-8 overflow-y-auto max-h-[95vh]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-6 h-6 text-indigo-600" />
                  Edit Profile
                </h2>
                <p className="text-sm text-slate-500 mt-1">Update your personal information and password.</p>
              </div>
              <button
                onClick={closeEdit}
                className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit();
              }}
              className="space-y-7"
            >
              {/* Personal */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-indigo-600" /> Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600">First Name</label>
                    <input
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Last Name</label>
                    <input
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1 w-full pl-10 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Department</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <select
                      value={editDepartmentId || ""}
                      onChange={(e) => setEditDepartmentId(e.target.value)}
                      className="mt-1 w-full pl-10 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" /> Change Password
                </h3>

                <div className="relative">
                  <label className="text-xs font-medium text-slate-600">New Password</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border pr-12 border-slate-300 bg-white px-4 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-8 text-slate-500"
                  >
                    {showNewPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                <div className="relative">
                  <label className="text-xs font-medium text-slate-600">Confirm Password</label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border pr-12 border-slate-300 bg-white px-4 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-slate-500"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
