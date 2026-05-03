import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../services/apiClient";

export default function ProfileScreen({ navigation }) {
  const { token, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProfile(token);
        setProfile(data);
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
          district: data.district || "",
          city: data.city || "",
          bio: data.bio || "",
          companyName: data.companyName || "",
          hourlyRate: data.hourlyRate ? String(data.hourlyRate) : "",
          experience: data.experience ? String(data.experience) : "",
        });
      } catch (e) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function updateField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function cancelEdit() {
    // reset form to current profile values
    setForm({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      district: profile?.district || "",
      city: profile?.city || "",
      bio: profile?.bio || "",
      companyName: profile?.companyName || "",
      hourlyRate: profile?.hourlyRate ? String(profile.hourlyRate) : "",
      experience: profile?.experience ? String(profile.experience) : "",
    });
    setSaveError("");
    setSaveSuccess(false);
    setEditing(false);
  }

  async function handleSave() {
    if (!form.firstName) {
      setSaveError("First name is required.");
      return;
    }
    try {
      setSaveError("");
      setSaveSuccess(false);
      setSubmitting(true);
      const payload = {
        ...form,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        experience: form.experience ? parseInt(form.experience) : undefined,
      };
      const updated = await updateProfile(token, payload);
      setProfile(updated);
      setSaveSuccess(true);
      setEditing(false);
    } catch (e) {
      setSaveError(e.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2d7ef7" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>My Profile</Text>
          {!editing && (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          )}
          {editing && <View style={{ width: 40 }} />}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── Avatar + Name strip ── */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.firstName?.[0] || "?").toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text>
            <Text style={styles.roleTag}>{profile?.role || "user"}</Text>
          </View>
        </View>

        {/* ── View mode ── */}
        {!editing && profile && (
          <View style={styles.infoCard}>
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="District" value={profile.district} />
            <InfoRow label="City" value={profile.city} />
            {profile.bio ? <InfoRow label="Bio" value={profile.bio} /> : null}
            {profile.companyName ? <InfoRow label="Company" value={profile.companyName} /> : null}
            {profile.hourlyRate ? <InfoRow label="Hourly Rate" value={`Rs. ${profile.hourlyRate}`} /> : null}
            {profile.experience ? <InfoRow label="Experience" value={`${profile.experience} years`} /> : null}
          </View>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Edit Profile</Text>

            <Text style={styles.label}>First Name *</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => updateField("firstName", v)} placeholder="First name" />

            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => updateField("lastName", v)} placeholder="Last name" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={(v) => updateField("phone", v)} placeholder="07XXXXXXXX" keyboardType="phone-pad" />

            <Text style={styles.label}>District</Text>
            <TextInput style={styles.input} value={form.district} onChangeText={(v) => updateField("district", v)} placeholder="e.g. Colombo" />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(v) => updateField("city", v)} placeholder="e.g. Nugegoda" />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.bio}
              onChangeText={(v) => updateField("bio", v)}
              placeholder="Tell customers about yourself..."
              multiline
              numberOfLines={3}
            />

            {profile?.role === "supplier" && (
              <>
                <Text style={styles.label}>Company Name</Text>
                <TextInput style={styles.input} value={form.companyName} onChangeText={(v) => updateField("companyName", v)} placeholder="Your company" />
              </>
            )}

            {profile?.role === "worker" && (
              <>
                <Text style={styles.label}>Hourly Rate (LKR)</Text>
                <TextInput style={styles.input} value={form.hourlyRate} onChangeText={(v) => updateField("hourlyRate", v)} placeholder="e.g. 1500" keyboardType="numeric" />

                <Text style={styles.label}>Years of Experience</Text>
                <TextInput style={styles.input} value={form.experience} onChangeText={(v) => updateField("experience", v)} placeholder="e.g. 5" keyboardType="numeric" />
              </>
            )}

            {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
            {saveSuccess ? <Text style={styles.success}>Profile updated successfully!</Text> : null}

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {saveSuccess && !editing && (
          <Text style={styles.success}>✓ Profile updated successfully</Text>
        )}

        <Pressable style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  label: { color: "#6b7280", fontSize: 14, fontWeight: "500" },
  value: { color: "#111827", fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  link: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  error: { color: "#dc2626", fontSize: 13 },
  success: { color: "#16a34a", fontSize: 13, fontWeight: "600" },
  avatarCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: "#2d7ef7", alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: "#111827" },
  roleTag: {
    marginTop: 2, paddingHorizontal: 10, paddingVertical: 2,
    backgroundColor: "#dbeafe", borderRadius: 10,
    color: "#1d4ed8", fontSize: 12, fontWeight: "600",
    alignSelf: "flex-start",
  },
  infoCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  formCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#dbeafe", gap: 8,
  },
  formTitle: { fontSize: 15, fontWeight: "700", color: "#1e3a8a", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f9fafb",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: "#d1d5db", alignItems: "center",
  },
  cancelBtnText: { color: "#6b7280", fontWeight: "600" },
  saveBtn: {
    flex: 2, backgroundColor: "#2d7ef7", paddingVertical: 12,
    borderRadius: 8, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  logoutButton: {
    marginTop: 8, backgroundColor: "#dc2626", borderRadius: 10,
    alignItems: "center", justifyContent: "center", minHeight: 44,
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});
