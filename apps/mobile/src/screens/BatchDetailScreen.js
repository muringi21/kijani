/**
 * BatchDetailScreen — shows full provenance for a batch (QR lookup result).
 */
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { fetchBatchById } from "../lib/api.js";

export default function BatchDetailScreen({ route }) {
  const { batchId } = route.params;
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatchById(batchId)
      .then(setBatch)
      .catch((err) => setError(err.response?.data?.error ?? "Network error"))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Batch Provenance</Text>
      <View style={styles.card}>
        <Row label="Batch ID" value={batch.id} />
        <Row label="Agent" value={batch.agent_id} />
        <Row label="Captured" value={new Date(batch.captured_at).toLocaleString()} />
        <Row label="Uploaded" value={new Date(batch.uploaded_at).toLocaleString()} />
        {batch.gps_lat != null && (
          <Row label="GPS" value={`${batch.gps_lat.toFixed(5)}, ${batch.gps_lng.toFixed(5)}`} />
        )}
      </View>
      <Text style={styles.subheading}>Hides ({batch.hides?.length ?? 0})</Text>
      <FlatList
        data={batch.hides ?? []}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.hideRow}>
            <Text style={styles.qr}>{item.qr_code}</Text>
            {item.grade && <Text style={styles.tag}>Grade {item.grade}</Text>}
            {item.weight && <Text style={styles.tag}>{item.weight} kg</Text>}
            {item.species && <Text style={styles.detail}>{item.species}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hides recorded.</Text>}
      />
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FAFAFA" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  heading:   { fontSize: 22, fontWeight: "700", color: "#1B5E20", marginBottom: 12 },
  subheading:{ fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 8, color: "#333" },
  card:      { backgroundColor: "#fff", borderRadius: 10, padding: 14, elevation: 2 },
  row:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  label:     { color: "#666", fontSize: 14 },
  value:     { color: "#222", fontSize: 14, fontWeight: "500", flexShrink: 1, textAlign: "right" },
  hideRow:   { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, elevation: 1 },
  qr:        { fontWeight: "600", fontSize: 14, color: "#1B5E20", flex: 1 },
  tag:       { backgroundColor: "#E8F5E9", color: "#2E7D32", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: "600", overflow: "hidden" },
  detail:    { color: "#888", fontSize: 12 },
  empty:     { color: "#999", textAlign: "center", marginTop: 16 },
  errorText: { color: "#D32F2F", fontSize: 16 },
});
