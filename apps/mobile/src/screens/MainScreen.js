/**
 * MainScreen — the agent's primary workflow screen
 *
 * Flow:
 *   1. Agent taps "Scan QR" → camera opens → QR code populates
 *   2. Agent optionally fills weight / grade / note
 *   3. Agent taps "Add Hide" → hide is added to the current batch
 *   4. When batch is complete, agent taps "Save Batch (Offline)"
 *   5. Batch goes into AsyncStorage queue
 *   6. "Upload Now" or auto‑flush sends queue to server
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { v4 as uuidv4 } from "uuid";
import { CONFIG } from "../config.js";
import { enqueue, getQueue } from "../lib/queue.js";
import { flushQueue } from "../lib/api.js";

const GRADES = ["A", "B", "C", "reject"];

export default function MainScreen({ navigation, route }) {
  // ── Batch state ───────────────────────────────────────────
  const [hides, setHides] = useState([]);
  const [qrCode, setQrCode] = useState("");
  const [weight, setWeight] = useState("");
  const [grade, setGrade] = useState(null);
  const [note, setNote] = useState("");
  const [species, setSpecies] = useState("");

  // ── Queue / upload state ──────────────────────────────────
  const [queueLen, setQueueLen] = useState(0);
  const [status, setStatus] = useState("idle");
  const [lastMsg, setLastMsg] = useState("");
  const timerRef = useRef(null);

  // ── Receive scanned QR from ScanScreen ────────────────────
  useEffect(() => {
    if (route.params?.scannedQR) {
      setQrCode(route.params.scannedQR);
      navigation.setParams({ scannedQR: undefined });
    }
  }, [route.params?.scannedQR]);

  // ── Refresh queue count ───────────────────────────────────
  const refreshQueue = useCallback(async () => {
    const q = await getQueue();
    setQueueLen(q.length);
  }, []);

  useEffect(() => { refreshQueue(); }, [refreshQueue]);

  // ── Auto‑flush timer ──────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(async () => {
      try {
        const result = await flushQueue();
        if (result.saved > 0) {
          setStatus("success");
          setLastMsg(`Auto-uploaded ${result.saved} batch(es)`);
          refreshQueue();
        }
      } catch {
        // Silently fail — user can manually retry
      }
    }, CONFIG.FLUSH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [refreshQueue]);

  // ── Add a hide ────────────────────────────────────────────
  const addHide = () => {
    if (!qrCode.trim()) {
      Alert.alert("QR Required", "Scan or enter a QR code first.");
      return;
    }
    const hide = {
      qrCode: qrCode.trim(),
      weight: weight ? Number(weight) : undefined,
      grade: grade ?? undefined,
      species: species.trim() || undefined,
      note: note.trim() || undefined,
    };
    setHides((prev) => [...prev, hide]);
    setQrCode("");
    setWeight("");
    setGrade(null);
    setNote("");
    setSpecies("");
  };

  // ── Save batch to offline queue ───────────────────────────
  const saveBatch = async () => {
    if (hides.length === 0) {
      Alert.alert("Empty Batch", "Add at least one hide before saving.");
      return;
    }

    let gps;
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        gps = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {
      // GPS optional
    }

    const batch = {
      id: uuidv4(),
      tenantId: CONFIG.TENANT_ID,
      agentId: CONFIG.AGENT_ID,
      productType: CONFIG.PRODUCT_TYPE,
      hides,
      gps,
      capturedAt: new Date().toISOString(),
    };

    await enqueue(batch);
    setHides([]);
    refreshQueue();
    setLastMsg(`Batch saved offline (${batch.hides.length} hides)`);
    setStatus("idle");
  };

  // ── Manual upload ─────────────────────────────────────────
  const uploadNow = async () => {
    setStatus("uploading");
    setLastMsg("Uploading...");
    try {
      const result = await flushQueue();
      setStatus("success");
      setLastMsg(
        result.flushed
          ? `Uploaded ${result.saved} batch(es)`
          : `Partial: ${result.saved} saved, ${result.errors} failed`
      );
      refreshQueue();
    } catch (err) {
      setStatus("error");
      setLastMsg(err.message || "Upload failed — will retry later");
    }
  };

  const statusColor =
    status === "success" ? "#2E7D32" :
    status === "error"   ? "#C62828" :
    status === "uploading" ? "#F57F17" : "#666";

  return (
    <View style={styles.container}>
      {/* Status banner */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>
          Queue: {queueLen} batch(es)  •  {lastMsg || "Ready"}
        </Text>
      </View>

      {/* QR input row */}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="QR code"
          value={qrCode}
          onChangeText={setQrCode}
        />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate("Scan", { mode: "capture" })}
        >
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Optional fields */}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Weight (kg)"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder="Species"
          value={species}
          onChangeText={setSpecies}
        />
      </View>

      {/* Grade selector */}
      <View style={styles.gradeRow}>
        {GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.gradeBtn, grade === g && styles.gradeSel]}
            onPress={() => setGrade(grade === g ? null : g)}
          >
            <Text style={[styles.gradeText, grade === g && styles.gradeSelText]}>
              {g.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Note (optional)"
        value={note}
        onChangeText={setNote}
      />

      {/* Add hide button */}
      <TouchableOpacity style={styles.addBtn} onPress={addHide}>
        <Text style={styles.addBtnText}>+ Add Hide</Text>
      </TouchableOpacity>

      {/* Current batch preview */}
      <Text style={styles.subheading}>
        Current batch ({hides.length} hide{hides.length !== 1 ? "s" : ""})
      </Text>
      <FlatList
        data={hides}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.hideItem}>
            <Text style={styles.hideQR}>{item.qrCode}</Text>
            {item.grade && <Text style={styles.tag}>{item.grade}</Text>}
            {item.weight && <Text style={styles.tag}>{item.weight} kg</Text>}
            <TouchableOpacity
              onPress={() => setHides((prev) => prev.filter((_, j) => j !== index))}
            >
              <Text style={{ color: "#C62828", fontWeight: "600" }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hides yet — scan a QR tag to start.</Text>
        }
        style={{ maxHeight: 180 }}
      />

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveBatch}>
          <Text style={styles.primaryBtnText}>Save Batch (Offline)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: "#1565C0" }]}
          onPress={uploadNow}
          disabled={status === "uploading"}
        >
          <Text style={styles.primaryBtnText}>Upload Now ({queueLen})</Text>
        </TouchableOpacity>
      </View>

      {/* Lookup shortcut */}
      <TouchableOpacity
        style={styles.lookupBtn}
        onPress={() => navigation.navigate("Scan", { mode: "lookup" })}
      >
        <Text style={styles.lookupBtnText}>Scan QR to Look Up Batch</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", padding: 16, paddingTop: 8 },
  statusBar: { borderRadius: 8, padding: 10, marginBottom: 12 },
  statusText: { color: "#fff", fontSize: 13, fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", marginBottom: 8, gap: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    marginBottom: 4,
  },
  scanBtn: { backgroundColor: "#1B5E20", paddingHorizontal: 20, borderRadius: 8, justifyContent: "center" },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  gradeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  gradeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#CCC", alignItems: "center", backgroundColor: "#fff" },
  gradeSel: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  gradeText: { fontWeight: "600", color: "#555" },
  gradeSelText: { color: "#fff" },
  addBtn: { backgroundColor: "#E8F5E9", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  addBtnText: { color: "#1B5E20", fontWeight: "700", fontSize: 15 },
  subheading: { fontWeight: "600", fontSize: 15, color: "#333", marginBottom: 6 },
  hideItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 10, borderRadius: 8, marginBottom: 6, gap: 8, elevation: 1 },
  hideQR: { flex: 1, fontWeight: "600", color: "#1B5E20" },
  tag: { backgroundColor: "#E8F5E9", color: "#2E7D32", fontSize: 12, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  empty: { color: "#999", textAlign: "center", paddingVertical: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: "#1B5E20", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  lookupBtn: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#1B5E20", alignItems: "center" },
  lookupBtnText: { color: "#1B5E20", fontWeight: "600" },
});
