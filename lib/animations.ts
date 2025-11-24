// Reusable animation utilities

import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { animations } from './design-tokens';

export const useSlideUp = (duration: number = animations.normal) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { translateY, opacity };
};

export const useFadeIn = (duration: number = animations.normal, delay: number = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return opacity;
};

export const useScale = (
  toValue: number = 1,
  duration: number = animations.fast,
  fromValue: number = 0
) => {
  const scale = useRef(new Animated.Value(fromValue)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  return scale;
};

export const usePulse = () => {
  const scale = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: animations.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: animations.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, pulse };
};

export const createPressAnimation = () => {
  const scale = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
};

export const shimmerAnimation = () => {
  const shimmer = new Animated.Value(0);

  Animated.loop(
    Animated.timing(shimmer, {
      toValue: 1,
      duration: 1500,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return translateX;
};