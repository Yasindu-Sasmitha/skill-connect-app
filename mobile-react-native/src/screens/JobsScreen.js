import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  createJob,
  deleteJob,
  getJobs,
  getMyJobs,
  updateJob,
} from "../services/apiClient";

const JOB_CATEGORIES = [
  "Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning",
  "Gardening", "Masonry", "Welding", "IT Support", "Other",
];

const INITIAL_FORM = {
  jobTitle: "",
  jobDescription: "",
  category: "Plumbing",
  locationAddress: "",
  city: "",
  district: "",
  budgetMin: "",
  budgetMax: "",
  urgencyLevel: "standard",
  estimatedDurationHours: "",
};

export default function JobsScreen({ navigation }) {
  const { token, user, signOut } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "mine"

  const isCustomer = user?.role === "customer";

  function updateField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const loadJobs = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [allList, myList] = await Promise.all([
        getJobs(token),
        isCustomer ? getMyJobs(token) : Promise.resolve([]),
      ]);
      setJobs(allList);
      setMyJobs(myList);
    } catch (e) {
      setError(e.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [token, isCustomer]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function startEdit(job) {
    setForm({
      jobTitle: job.jobTitle || "",
      jobDescription: job.jobDescription || "",
      category: job.category || "Plumbing",
      locationAddress: job.locationAddress || "",
      city: job.city || "",
      district: job.district || "",
      budgetMin: String(job.budgetMin || ""),
      budgetMax: String(job.budgetMax || ""),
      urgencyLevel: job.urgencyLevel || "standard",
      estimatedDurationHours: String(job.estimatedDurationHours || ""),
    });
    setEditingId(job._id);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function handleSubmit() {
    if (!form.jobTitle || !form.jobDescription || !form.category) {
      setFormError("Job title, description and category are required.");
      return;
    }
    try {
      setFormError("");
      setSubmitting(true);
      const payload = {
        ...form,
        budgetMin: parseFloat(form.budgetMin) || 0,
        budgetMax: parseFloat(form.budgetMax) || 0,
        estimatedDurationHours: parseFloat(form.estimatedDurationHours) || undefined,
      };
      if (editingId) {
        await updateJob(token, editingId, payload);
      } else {
        await createJob(token, payload);
      }
      cancelForm();
      await loadJobs();
    } catch (e) {
      setFormError(e.message || "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(jobId) {
    try {
      await deleteJob(token, jobId);
      await loadJobs();
    } catch (e) {
      setError(e.message || "Failed to delete job");
    }
  }

  const displayJobs = activeTab === "mine" ? myJobs : jobs;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayJobs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* ── Top bar ── */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {user?.firstName ? `Hi, ${user.firstName}` : "Jobs"}
              </Text>
              <View style={styles.topActions}>
                <Pressable onPress={() => navigation.navigate("Profile")}>
                  <Text style={styles.link}>Profile</Text>
                </Pressable>
                <Pressable onPress={signOut}>
                  <Text style={[styles.link, { color: "#dc2626" }]}>Logout</Text>
                </Pressable>
              </View>
            </View>

            {/* ── Quick module grid ── */}
            <View style={styles.moduleGrid}>
              <Pressable style={styles.moduleBtn} onPress={() => navigation.navigate("Bookings")}>
                <Text style={styles.moduleTitle}>📋 Bookings</Text>
              </Pressable>
              <Pressable style={styles.moduleBtn} onPress={() => navigation.navigate("Equipment")}>
                <Text style={styles.moduleTitle}>🔧 Equipment</Text>
              </Pressable>
              <Pressable style={styles.moduleBtn} onPress={() => navigation.navigate("Complaints")}>
                <Text style={styles.moduleTitle}>📢 Complaints</Text>
              </Pressable>
              <Pressable style={styles.moduleBtn} onPress={() => navigation.navigate("Reviews")}>
                <Text style={styles.moduleTitle}>⭐ Reviews</Text>
              </Pressable>
            </View>

            {/* ── Post Job button (customers only) ── */}
            {isCustomer && !showForm && (
              <Pressable style={styles.postBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.postBtnText}>＋ Post a Job</Text>
              </Pressable>
            )}

            {/* ── Job form ── */}
            {showForm && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingId ? "Edit Job" : "Post a New Job"}</Text>

                <Text style={styles.label}>Job Title *</Text>
                <TextInput style={styles.input} placeholder="e.g. Fix leaking pipe" value={form.jobTitle} onChangeText={(v) => updateField("jobTitle", v)} />

                <Text style={styles.label}>Description *</Text>
                <TextInput style={[styles.input, styles.multiline]} placeholder="Describe the job in detail..." value={form.jobDescription} onChangeText={(v) => updateField("jobDescription", v)} multiline numberOfLines={4} />

                <Text style={styles.label}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {JOB_CATEGORIES.map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.chip, form.category === c && styles.chipActive]}
                      onPress={() => updateField("category", c)}
                    >
                      <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Urgency</Text>
                <View style={styles.chipRow}>
                  {["scheduled", "standard", "urgent", "emergency"].map((u) => (
                    <Pressable
                      key={u}
                      style={[styles.chip, form.urgencyLevel === u && styles.chipActive]}
                      onPress={() => updateField("urgencyLevel", u)}
                    >
                      <Text style={[styles.chipText, form.urgencyLevel === u && styles.chipTextActive]}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} placeholder="Address" value={form.locationAddress} onChangeText={(v) => updateField("locationAddress", v)} />
                <View style={styles.rowInputs}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="City" value={form.city} onChangeText={(v) => updateField("city", v)} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="District" value={form.district} onChangeText={(v) => updateField("district", v)} />
                </View>

                <Text style={styles.label}>Budget (LKR)</Text>
                <View style={styles.rowInputs}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min" keyboardType="numeric" value={form.budgetMin} onChangeText={(v) => updateField("budgetMin", v)} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max" keyboardType="numeric" value={form.budgetMax} onChangeText={(v) => updateField("budgetMax", v)} />
                </View>

                <Text style={styles.label}>Est. Duration (hours)</Text>
                <TextInput style={styles.input} placeholder="e.g. 3" keyboardType="numeric" value={form.estimatedDurationHours} onChangeText={(v) => updateField("estimatedDurationHours", v)} />

                {formError ? <Text style={styles.error}>{formError}</Text> : null}

                <View style={styles.formActions}>
                  <Pressable style={styles.cancelBtn} onPress={cancelForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingId ? "Update Job" : "Post Job"}</Text>}
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Tabs ── */}
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, activeTab === "browse" && styles.tabActive]}
                onPress={() => setActiveTab("browse")}
              >
                <Text style={[styles.tabText, activeTab === "browse" && styles.tabTextActive]}>Browse All</Text>
              </Pressable>
              {isCustomer && (
                <Pressable
                  style={[styles.tab, activeTab === "mine" && styles.tabActive]}
                  onPress={() => setActiveTab("mine")}
                >
                  <Text style={[styles.tabText, activeTab === "mine" && styles.tabTextActive]}>My Jobs</Text>
                </Pressable>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#2d7ef7" /> : null}
            {!loading && displayJobs.length === 0 && (
              <Text style={styles.helper}>
                {activeTab === "mine" ? "You haven't posted any jobs yet." : "No active jobs found."}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.jobTitle}>{item.jobTitle}</Text>
              <View style={[styles.badge, item.urgencyLevel === "urgent" && styles.badgeUrgent]}>
                <Text style={styles.badgeText}>{item.urgencyLevel || "normal"}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{item.category} • {item.district || item.city || "-"}</Text>
            <Text style={styles.body} numberOfLines={3}>{item.jobDescription}</Text>
            <Text style={styles.meta}>Budget: Rs. {item.budgetMin} – Rs. {item.budgetMax}</Text>

            {/* Show Edit/Delete only for the owner's jobs */}
            {activeTab === "mine" && (
              <View style={styles.cardActions}>
                <Pressable style={styles.editBtn} onPress={() => startEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerWrap: { paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  topActions: { flexDirection: "row", gap: 16 },
  link: { color: "#2563eb", fontWeight: "600" },
  moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  moduleBtn: {
    flexBasis: "48%", backgroundColor: "#fff", borderWidth: 1,
    borderColor: "#dbeafe", borderRadius: 12, padding: 12, alignItems: "center",
  },
  moduleTitle: { fontSize: 14, fontWeight: "700", color: "#1e3a8a" },
  postBtn: {
    backgroundColor: "#2d7ef7", borderRadius: 10, alignItems: "center",
    justifyContent: "center", paddingVertical: 14, marginBottom: 14,
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  formCard: {
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
    borderColor: "#dbeafe", padding: 16, marginBottom: 14, gap: 8,
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#1e3a8a", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f9fafb",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: 8 },
  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#2d7ef7", borderColor: "#2d7ef7" },
  chipText: { fontSize: 13, color: "#374151" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1,
    borderColor: "#d1d5db", alignItems: "center",
  },
  cancelBtnText: { color: "#6b7280", fontWeight: "600" },
  submitBtn: {
    flex: 2, backgroundColor: "#2d7ef7", paddingVertical: 12,
    borderRadius: 8, alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700" },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#e2e8f0",
  },
  tabActive: { backgroundColor: "#2d7ef7" },
  tabText: { color: "#475569", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  error: { color: "#dc2626", marginBottom: 8 },
  helper: { color: "#475569", marginTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  jobTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  badge: { backgroundColor: "#e0f2fe", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeUrgent: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#0369a1" },
  meta: { color: "#475569", marginTop: 4, fontSize: 13 },
  body: { color: "#334155", marginTop: 6, marginBottom: 4 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: "#dbeafe", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  editBtnText: { color: "#1d4ed8", fontWeight: "600", fontSize: 13 },
  deleteBtn: { backgroundColor: "#fee2e2", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  deleteBtnText: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
});
