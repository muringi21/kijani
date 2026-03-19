/**
 * ScanScreen — QR / barcode scanner using expo-camera
 *
 * Two modes:
 *   1. "capture" — agent scans a QR tag on a hide being collected
 *   2. "lookup"  — tannery user scans a QR to view batch provenance
 */
import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScanScreen({ navigation, route }) {
  const mode = route.params?.mode ?? "capture";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lockRef = useRef(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to scan QR tags.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);

    if (mode === "capture") {
      navigation.navigate("Main", { scannedQR: data });
    } else {
      navigation.navigate("BatchDetail", { batchId: data });
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {mode === "capture"
            ? "Scan the QR tag on the hide"
            : "Scan a batch QR to view provenance"}
        </Text>
      </View>
      {scanned && (
        <TouchableOpacity
          style={[styles.btn, { position: "absolute", bottom: 60 }]}
          onPress={() => { lockRef.current = false; setScanned(false); }}
        >
          <Text style={styles.btnText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  overlay:   { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  frame:     { width: 240, height: 240, borderWidth: 2, borderColor: "#4CAF50", borderRadius: 16 },
  hint:      { marginTop: 20, color: "#fff", fontSize: 16, textAlign: "center", paddingHorizontal: 32 },
  permText:  { fontSize: 16, textAlign: "center", marginBottom: 16, color: "#333" },
  btn:       { backgroundColor: "#1B5E20", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8, alignSelf: "center" },
  btnText:   { color: "#fff", fontSize: 16, fontWeight: "600" },
});
