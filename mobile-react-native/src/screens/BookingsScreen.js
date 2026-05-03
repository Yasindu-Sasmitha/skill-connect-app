import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  createBooking,
  deleteBooking,
  getMyBookings,
  getMyJobs,
  getWorkers,
  updateBookingStatus,
} from "../services/apiClient";

const STATUS_ACTIONS = {
  requested: ["accepted", "rejected"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export default function BookingsScreen() {
  const { token, user } = useAuth();
  const [roleView, setRoleView] = useState(user?.role === "worker" ? "worker" : "customer");
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [form, setForm] = useState({
    worker: "",
    job: "",
    scheduledDate: "",
    scheduledTime: "09:00",
    estimatedDurationHours: "2",
    notes: "",
  });
  const [createBusy, setCreateBusy] = useState(false);

  const customerMode = user?.role !== "worker";

  const loadData = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [bookingsData, workersData, jobsData] = await Promise.all([
        getMyBookings(token, roleView),
        getWorkers(token),
        customerMode ? getMyJobs(token) : Promise.resolve([]),
      ]);
      setBookings(bookingsData);
      setWorkers(workersData);
      setJobs(jobsData);
    } catch (e) {
      setError(e.message || "Failed to load bookings data");
    } finally {
      setLoading(false);
    }
  }, [token, roleView, customerMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const workerNameMap = useMemo(() => {
    const map = new Map();
    for (const worker of workers) {
      map.set(worker._id, `${worker.firstName || ""} ${worker.lastName || ""}`.trim());
    }
    return map;
  }, [workers]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitBooking() {
    if (!form.worker || !form.scheduledDate || !form.scheduledTime) {
      setActionError("Worker, date and time are required");
      return;
    }

    try {
      setActionError("");
      setCreateBusy(true);
      await createBooking(token, {
        worker: form.worker,
        job: form.job || undefined,
        scheduledDate: new Date(form.scheduledDate).toISOString(),
        scheduledTime: form.scheduledTime,
        estimatedDurationHours: Number(form.estimatedDurationHours || 2),
        notes: form.notes,
      });

      setForm({
        worker: "",
        job: "",
        scheduledDate: "",
        scheduledTime: "09:00",
        estimatedDurationHours: "2",
        notes: "",
      });
      await loadData();
    } catch (e) {
      setActionError(e.message || "Failed to create booking");
    } finally {
      setCreateBusy(false);
    }
  }

  async function onStatusChange(bookingId, nextStatus) {
    try {
      setActionError("");
      await updateBookingStatus(token, bookingId, nextStatus);
      await loadData();
    } catch (e) {
      setActionError(e.message || "Failed to update booking status");
    }
  }

  async function onDelete(bookingId) {
    try {
      setActionError("");
      await deleteBooking(token, bookingId);
      await loadData();
    } catch (e) {
      setActionError(e.message || "Failed to delete booking");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <ScrollView style={styles.headerWrap}>
            <Text style={styles.title}>Bookings</Text>

            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentBtn, roleView === "customer" && styles.segmentBtnActive]}
                onPress={() => setRoleView("customer")}
              >
                <Text style={[styles.segmentText, roleView === "customer" && styles.segmentTextActive]}>
                  As Customer
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, roleView === "worker" && styles.segmentBtnActive]}
                onPress={() => setRoleView("worker")}
              >
                <Text style={[styles.segmentText, roleView === "worker" && styles.segmentTextActive]}>
                  As Worker
                </Text>
              </Pressable>
              <Pressable style={styles.refreshBtn} onPress={loadData}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>

            {customerMode ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Create Booking</Text>

                <Text style={styles.label}>Worker</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste worker ID or select below"
                  value={form.worker}
                  onChangeText={(value) => updateForm("worker", value)}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                  {workers.slice(0, 12).map((worker) => {
                    const workerName = `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
                    return (
                      <Pressable
                        key={worker._id}
                        style={[styles.pill, form.worker === worker._id && styles.pillActive]}
                        onPress={() => updateForm("worker", worker._id)}
                      >
                        <Text style={[styles.pillText, form.worker === worker._id && styles.pillTextActive]}>
                          {workerName || worker._id.slice(-6)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.label}>Job (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste job ID or select below"
                  value={form.job}
                  onChangeText={(value) => updateForm("job", value)}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                  {jobs.slice(0, 12).map((job) => (
                    <Pressable
                      key={job._id}
                      style={[styles.pill, form.job === job._id && styles.pillActive]}
                      onPress={() => updateForm("job", job._id)}
                    >
                      <Text style={[styles.pillText, form.job === job._id && styles.pillTextActive]}>
                        {job.jobTitle || job._id.slice(-6)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Scheduled Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-05-10"
                  value={form.scheduledDate}
                  onChangeText={(value) => updateForm("scheduledDate", value)}
                />

                <Text style={styles.label}>Scheduled Time (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00"
                  value={form.scheduledTime}
                  onChangeText={(value) => updateForm("scheduledTime", value)}
                />

                <Text style={styles.label}>Estimated Duration Hours</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  keyboardType="numeric"
                  value={form.estimatedDurationHours}
                  onChangeText={(value) => updateForm("estimatedDurationHours", value)}
                />

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Booking notes"
                  multiline
                  value={form.notes}
                  onChangeText={(value) => updateForm("notes", value)}
                />

                <Pressable style={styles.primaryBtn} onPress={submitBooking} disabled={createBusy}>
                  <Text style={styles.primaryBtnText}>{createBusy ? "Creating..." : "Create Booking"}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.helper}>Worker accounts cannot create bookings. Switch to customer for create flow.</Text>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {loading ? <Text style={styles.helper}>Loading bookings...</Text> : null}
          </ScrollView>
        }
        data={bookings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.helper}>No bookings found.</Text> : null}
        renderItem={({ item }) => {
          const workerName = item.worker?.firstName
            ? `${item.worker.firstName} ${item.worker.lastName || ""}`.trim()
            : workerNameMap.get(item.worker?._id) || "Unknown";
          const customerName = item.customer?.firstName
            ? `${item.customer.firstName} ${item.customer.lastName || ""}`.trim()
            : "Unknown";

          return (
            <View style={styles.card}>
              <Text style={styles.itemTitle}>{item.job?.jobTitle || "Booking"}</Text>
              <Text style={styles.meta}>Status: {item.bookingStatus}</Text>
              <Text style={styles.meta}>Date: {formatDate(item.scheduledDate)} {item.scheduledTime || ""}</Text>
              <Text style={styles.meta}>Worker: {workerName}</Text>
              <Text style={styles.meta}>Customer: {customerName}</Text>

              <View style={styles.actionRow}>
                {(STATUS_ACTIONS[item.bookingStatus] || []).map((status) => (
                  <Pressable
                    key={status}
                    style={styles.smallBtn}
                    onPress={() => onStatusChange(item._id, status)}
                  >
                    <Text style={styles.smallBtnText}>{status}</Text>
                  </Pressable>
                ))}
                <Pressable style={[styles.smallBtn, styles.deleteBtn]} onPress={() => onDelete(item._id)}>
                  <Text style={styles.smallBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  segmentBtnActive: {
    backgroundColor: "#1d4ed8",
  },
  segmentText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#fff",
  },
  refreshBtn: {
    marginLeft: "auto",
    backgroundColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  meta: {
    color: "#334155",
    marginBottom: 4,
  },
  label: {
    color: "#334155",
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pillRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  pillText: {
    color: "#1f2937",
    fontSize: 12,
  },
  pillTextActive: {
    color: "#fff",
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  helper: {
    color: "#475569",
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: {
    color: "#1e3a8a",
    fontWeight: "600",
    fontSize: 12,
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
  },
});
