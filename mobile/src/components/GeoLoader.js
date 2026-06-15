import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const RotatingGlobe = () => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.globeWrap}>
      <Animated.View style={[styles.globeSpin, { transform: [{ rotate }] }]}>
        <View style={styles.globe}>
          <View style={styles.land1} />
          <View style={styles.land2} />
          <View style={styles.land3} />
          <View style={styles.equator} />
          <View style={styles.meridian} />
        </View>
      </Animated.View>
      <View style={styles.orbitRing} />
    </View>
  );
};

export default function GeoLoader({ message = 'Loading application...' }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.brandGeo}>GEO</Text>
        <Text style={styles.brandSub}>Designs & Research</Text>
      </View>

      <RotatingGlobe />

      <Text style={styles.appTitle}>Attendance System</Text>

      <Animated.Text style={[styles.message, { opacity: pulse }]}>
        {message}
      </Animated.Text>

      <Text style={styles.hint}>
        Server may take a moment on first launch
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandGeo: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 6,
  },
  brandSub: {
    fontSize: 13,
    color: '#90caf9',
    letterSpacing: 2,
    marginTop: 4,
    fontWeight: '600',
  },
  globeWrap: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  globeSpin: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globe: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1565c0',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#64b5f6',
    shadowColor: '#42a5f5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  land1: {
    position: 'absolute',
    top: 22,
    left: 18,
    width: 36,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2e7d32',
    opacity: 0.9,
  },
  land2: {
    position: 'absolute',
    top: 48,
    right: 14,
    width: 30,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#388e3c',
    opacity: 0.85,
  },
  land3: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    width: 40,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#43a047',
    opacity: 0.8,
  },
  equator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: -0.5,
  },
  meridian: {
    position: 'absolute',
    left: '50%',
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: -0.5,
  },
  orbitRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(100,181,246,0.35)',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e3f2fd',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    color: '#90caf9',
    textAlign: 'center',
    fontWeight: '600',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    fontSize: 11,
    color: 'rgba(144,202,249,0.55)',
    textAlign: 'center',
  },
});
