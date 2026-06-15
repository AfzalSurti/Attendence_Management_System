import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { getMyProjectsAPI, checkInAPI, checkOutAPI, getTodayAttendanceAPI } from '../../services/api';

export default function AttendanceScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    requestLocationOnLoad();
  }, []);

  const requestLocationOnLoad = async () => {
    await Location.requestForegroundPermissionsAsync();
  };

  const loadInitialData = async () => {
    try {
      const [projRes, attendRes] = await Promise.all([
        getMyProjectsAPI(),
        getTodayAttendanceAPI().catch(() => ({ data: null }))
      ]);
      setProjects(projRes.data);
      setTodayAttendance(attendRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const getCoordinates = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for attendance');
        return null;
      }
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return loc.coords;
  };

  const takeSelfie = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
    setSelfieUri(photo.uri);
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    const isCheckIn = !todayAttendance?.checkin_time;
    const isCheckOut = todayAttendance?.checkin_time && !todayAttendance?.checkout_time;

    if (isCheckIn && !selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    if (!selfieUri) {
      Alert.alert('Error', 'Please take a selfie');
      return;
    }

    setGettingLocation(true);
    try {
      const coords = await getCoordinates();
      if (!coords) return;

      setGettingLocation(false);
      setLoading(true);

      const selfie_url = selfieUri;

      if (isCheckIn) {
        await checkInAPI({
          project_id: selectedProject.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          selfie_url: selfie_url,
        });
        Alert.alert('Success', 'Check-in marked successfully!');
      } else if (isCheckOut) {
        await checkOutAPI({
          latitude: coords.latitude,
          longitude: coords.longitude,
          selfie_url: selfie_url,
        });
        Alert.alert('Success', 'Check-out marked successfully!');
      }

      navigation.replace('Dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong';
      Alert.alert('Error', msg);
    } finally {
      setGettingLocation(false);
      setLoading(false);
    }
  };

  const isCheckIn = !todayAttendance?.checkin_time;
  const isCheckOut = todayAttendance?.checkin_time && !todayAttendance?.checkout_time;
  const isDone = todayAttendance?.checkout_time;

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="front"
          ref={cameraRef}
          onCameraReady={() => setCameraReady(true)}
        />
        <TouchableOpacity
          style={styles.captureBtn}
          onPress={takeSelfie}
          disabled={!cameraReady}
        >
          <Text style={styles.captureBtnText}>📸 Take Selfie</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setShowCamera(false)}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isCheckIn ? 'Mark Check-in' : isCheckOut ? 'Mark Check-out' : 'Attendance Done'}
        </Text>
      </View>

      {isDone ? (
        <View style={styles.doneCard}>
          <Text style={styles.doneText}>✅ You have completed attendance for today!</Text>
        </View>
      ) : (
        <>
          {/* Project Selection - only for check in */}
          {isCheckIn && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Project</Text>
              {projects.map((proj) => (
                <TouchableOpacity
                  key={proj.id}
                  style={[
                    styles.projectItem,
                    selectedProject?.id === proj.id && styles.projectItemSelected
                  ]}
                  onPress={() => setSelectedProject(proj)}
                >
                  <Text style={[
                    styles.projectText,
                    selectedProject?.id === proj.id && styles.projectTextSelected
                  ]}>
                    {proj.project_number} — {proj.project_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selfie */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Take Selfie</Text>
            {selfieUri ? (
              <>
                <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => { setSelfieUri(null); setShowCamera(true); }}
                >
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => setShowCamera(true)}
              >
                <Text style={styles.cameraBtnText}>📸 Open Camera</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading || gettingLocation}
          >
            {gettingLocation ? (
              <Text style={styles.submitBtnText}>Getting your location...</Text>
            ) : loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isCheckIn ? 'Submit Check-in' : 'Submit Check-out'}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2ff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { marginTop: 50, marginBottom: 24 },
  back: { color: '#1a237e', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a237e' },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16, elevation: 3
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a237e', marginBottom: 12 },
  projectItem: {
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 8
  },
  projectItemSelected: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  projectText: { fontSize: 14, color: '#333' },
  projectTextSelected: { color: '#fff', fontWeight: 'bold' },
  cameraBtn: {
    backgroundColor: '#1a237e', padding: 14,
    borderRadius: 10, alignItems: 'center'
  },
  cameraBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  selfiePreview: { width: '100%', height: 250, borderRadius: 10, marginBottom: 10 },
  retakeBtn: { alignItems: 'center', padding: 8 },
  retakeBtnText: { color: '#1a237e', fontWeight: 'bold' },
  submitBtn: {
    backgroundColor: '#2e7d32', padding: 16,
    borderRadius: 12, alignItems: 'center', marginBottom: 30
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  doneCard: {
    backgroundColor: '#e8f5e9', borderRadius: 16,
    padding: 24, alignItems: 'center', marginTop: 20
  },
  doneText: { fontSize: 16, color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  captureBtn: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: '#1a237e', padding: 16, borderRadius: 50
  },
  captureBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: '#c62828', padding: 12, borderRadius: 50
  },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' },
  permText: { fontSize: 16, color: '#333', marginBottom: 16 },
  permBtn: { backgroundColor: '#1a237e', padding: 14, borderRadius: 10 },
  permBtnText: { color: '#fff', fontWeight: 'bold' },
});