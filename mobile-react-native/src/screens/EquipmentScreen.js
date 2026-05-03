import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
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
  createEquipment,
  deleteEquipment,
  getEquipment,
  updateEquipment,
} from "../services/apiClient";

const INITIAL_FORM = {
  equipmentName: "",
  equipmentDescription: "",
  category: "Power Tools",
  equipmentCondition: "good",
  rentalPricePerDay: "",
  depositAmount: "",
  quantityAvailable: "1",
  quantityTotal: "1",
  isAvailable: true,
  location: "",
  imagePath: "",
};

function getSupplierId(item) {
  return item?.supplier?._id || item?.supplier;
}

export default function EquipmentScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const supplierMode = user?.role === "supplier";

  const loadData = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const equipment = await getEquipment(token);
      setItems(equipment);
    } catch (e) {
      setError(e.message || "Failed to load equipment");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ownedSet = useMemo(() => {
    const set = new Set();
    for (const item of items) {
      if (getSupplierId(item) === user?.userId) {
        set.add(item._id);
      }
    }
    return set;
  }, [items, user?.userId]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setEditingId("");
  }

  function startEdit(item) {
    setEditingId(item._id);
    setActionError("");
    setForm({
      equipmentName: item.equipmentName || item.name || "",
      equipmentDescription: item.equipmentDescription || item.description || "",
      category: item.category || "Power Tools",
      equipmentCondition: item.equipmentCondition || "good",
      rentalPricePerDay: String(item.rentalPricePerDay || item.dailyRate || ""),
      depositAmount: String(item.depositAmount || ""),
      quantityAvailable: String(item.quantityAvailable ?? 1),
      quantityTotal: String(item.quantityTotal ?? 1),
      isAvailable: item.isAvailable !== false,
      location: item.location || "",
      imagePath: item.imagePath || "",
    });
  }

  async function submitEquipment() {
    if (!supplierMode) {
      setActionError("Only supplier accounts can manage equipment");
      return;
    }

    if (!form.equipmentName || !form.category || !form.rentalPricePerDay || !form.depositAmount) {
      setActionError("Name, category, daily rate and deposit are required");
      return;
    }

    try {
      setActionError("");
      setSubmitting(true);

      const payload = {
        ...form,
        rentalPricePerDay: Number(form.rentalPricePerDay),
        depositAmount: Number(form.depositAmount),
        quantityAvailable: Number(form.quantityAvailable || 1),
        quantityTotal: Number(form.quantityTotal || 1),
      };

      if (editingId) {
        await updateEquipment(token, editingId, payload);
      } else {
        await createEquipment(token, payload);
      }

      resetForm();
      await loadData();
    } catch (e) {
      setActionError(e.message || (editingId ? "Failed to update equipment" : "Failed to create equipment"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(itemId) {
    try {
      setActionError("");
      await deleteEquipment(token, itemId);
      if (editingId === itemId) {
        resetForm();
      }
      await loadData();
    } catch (e) {
      setActionError(e.message || "Failed to delete equipment");
    }
  }

  async function handleRent(item) {
    if (supplierMode) {
      setActionError("Suppliers cannot rent equipment");
      return;
    }

    try {
      setActionError("");
      setSubmitting(true);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const payload = {
        equipment: item._id,
        scheduledDate: tomorrow.toISOString(),
        scheduledTime: "09:00",
        notes: `Rental request for ${item.equipmentName}`,
      };

      await createBooking(token, payload);
      alert("Rental request sent successfully! You can view it in your bookings.");
      await loadData();
    } catch (e) {
      setActionError(e.message || "Failed to request rental");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ScrollView style={styles.headerWrap}>
            <View style={styles.topRow}>
              <Text style={styles.title}>Equipment</Text>
              <Pressable style={styles.refreshBtn} onPress={loadData}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>

            {supplierMode ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{editingId ? "Edit Equipment" : "Create Equipment"}</Text>

                <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Heavy Duty Drill"
                value={form.equipmentName}
                onChangeText={(value) => updateForm("equipmentName", value)}
              />

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="Power Tools"
                value={form.category}
                onChangeText={(value) => updateForm("category", value)}
              />

              <Text style={styles.label}>Condition</Text>
              <TextInput
                style={styles.input}
                placeholder="good"
                value={form.equipmentCondition}
                onChangeText={(value) => updateForm("equipmentCondition", value)}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Equipment details"
                value={form.equipmentDescription}
                onChangeText={(value) => updateForm("equipmentDescription", value)}
                multiline
              />

              <Text style={styles.label}>Daily Rate (LKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="1500"
                keyboardType="numeric"
                value={form.rentalPricePerDay}
                onChangeText={(value) => updateForm("rentalPricePerDay", value)}
              />

              <Text style={styles.label}>Deposit Amount (LKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                keyboardType="numeric"
                value={form.depositAmount}
                onChangeText={(value) => updateForm("depositAmount", value)}
              />

              <Text style={styles.label}>Quantity Available</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={form.quantityAvailable}
                onChangeText={(value) => updateForm("quantityAvailable", value)}
              />

              <Text style={styles.label}>Quantity Total</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={form.quantityTotal}
                onChangeText={(value) => updateForm("quantityTotal", value)}
              />

              <Text style={styles.label}>Location (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Colombo"
                value={form.location}
                onChangeText={(value) => updateForm("location", value)}
              />

              <Text style={styles.label}>Image URL (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                value={form.imagePath}
                onChangeText={(value) => updateForm("imagePath", value)}
              />

              <View style={styles.toggleRow}>
                <Text style={styles.label}>Available</Text>
                <Pressable
                  style={[styles.toggleBtn, form.isAvailable && styles.toggleBtnActive]}
                  onPress={() => updateForm("isAvailable", !form.isAvailable)}
                >
                  <Text style={[styles.toggleText, form.isAvailable && styles.toggleTextActive]}>
                    {form.isAvailable ? "Yes" : "No"}
                  </Text>
                </Pressable>
              </View>

              <Pressable style={styles.primaryBtn} onPress={submitEquipment} disabled={submitting || !supplierMode}>
                <Text style={styles.primaryBtnText}>
                  {submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Equipment" : "Create Equipment")}
                </Text>
              </Pressable>

              {editingId ? (
                <Pressable style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelBtnText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {loading ? <Text style={styles.helper}>Loading equipment...</Text> : null}
          </ScrollView>
        }
        ListEmptyComponent={!loading ? <Text style={styles.helper}>No equipment found.</Text> : null}
        renderItem={({ item }) => {
          const supplierName = item.supplier?.firstName
            ? `${item.supplier.firstName} ${item.supplier.lastName || ""}`.trim()
            : "Supplier";
          const canManage = supplierMode && ownedSet.has(item._id);

          return (
            <View style={styles.card}>
              {item.imagePath ? (
                <Image source={{ uri: item.imagePath }} style={styles.itemImage} resizeMode="cover" />
              ) : null}
              <Text style={styles.itemTitle}>{item.equipmentName || item.name || "Equipment"}</Text>
              <Text style={styles.meta}>Category: {item.category || "-"}</Text>
              <Text style={styles.meta}>Condition: {item.equipmentCondition || "-"}</Text>
              <Text style={styles.meta}>Rate/day: LKR {item.rentalPricePerDay || item.dailyRate || "-"}</Text>
              <Text style={styles.meta}>Available: {String(item.isAvailable)}</Text>
              <Text style={styles.meta}>Supplier: {supplierName}</Text>
              <Text style={styles.meta}>Qty: {item.quantityAvailable || 0}/{item.quantityTotal || 0}</Text>

              {canManage ? (
                <View style={styles.actionRow}>
                  <Pressable style={styles.smallBtn} onPress={() => startEdit(item)}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.smallBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
                    <Text style={styles.smallBtnText}>Delete</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.primaryBtn} onPress={() => handleRent(item)} disabled={submitting}>
                  <Text style={styles.primaryBtnText}>{submitting ? "Processing..." : "Rent Equipment"}</Text>
                </Pressable>
              )}
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  toggleBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#1d4ed8",
  },
  toggleText: {
    color: "#334155",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#1e3a8a",
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
  cancelBtn: {
    marginTop: 8,
    borderRadius: 10,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelBtnText: {
    color: "#334155",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
  },
  smallBtnText: {
    color: "#1e3a8a",
    fontWeight: "600",
    fontSize: 12,
  },
  meta: {
    color: "#334155",
    marginBottom: 4,
  },
  helper: {
    color: "#475569",
    marginBottom: 10,
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  itemImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#e2e8f0",
  },
});
