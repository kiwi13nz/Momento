import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Heart, Trophy, Flame, Award, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@has_seen_onboarding';

type SlideData = {
  icon: any;
  title: string;
  subtitle: string;
  animation: 'photos' | 'reactions' | 'leaderboard';
};

const slides: SlideData[] = [
  {
    icon: Camera,
    title: 'Turn Events Into Games',
    subtitle: 'Create photo challenges for any occasion - parties, festivals, team outings',
    animation: 'photos',
  },
  {
    icon: Heart,
    title: 'Upload Photos, Get Reactions',
    subtitle: 'Complete challenges and watch friends react with ❤️ 🔥 💯',
    animation: 'reactions',
  },
  {
    icon: Trophy,
    title: 'Most Reactions Wins',
    subtitle: 'Real-time leaderboard. Best photos rise to the top. Winner takes glory!',
    animation: 'leaderboard',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleNext = async () => {
    if (currentSlide < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentSlide(currentSlide + 1);
        // Fade in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]).start();
      });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      console.log('✅ Onboarding completed and saved');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
      // Still navigate even if save fails
      router.replace('/');
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundLight]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          {slide.animation === 'photos' && (
            <PhotosAnimation />
          )}
          {slide.animation === 'reactions' && (
            <ReactionsAnimation />
          )}
          {slide.animation === 'leaderboard' && (
            <LeaderboardAnimation />
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <Button
          onPress={handleNext}
          fullWidth
          size="large"
          variant={isLastSlide ? 'gradient' : 'primary'}
        >
          {isLastSlide ? "Let's Go! 🚀" : 'Next'}
        </Button>
      </View>
    </LinearGradient>
  );
}

// Animation Components
function PhotosAnimation() {
  const [animations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  React.useEffect(() => {
    const animate = () => {
      Animated.stagger(150, [
        Animated.spring(animations[0], {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(animations[1], {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(animations[2], {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start(() => {
        setTimeout(() => {
          animations.forEach(anim => anim.setValue(0));
          animate();
        }, 2000);
      });
    };
    animate();
  }, []);

  // Use as const to create proper tuple types
  const gradients = [
    ['#FF6B6B', '#FFE66D'] as const,
    ['#4ECDC4', '#44A08D'] as const,
    ['#A8EDEA', '#FED6E3'] as const,
  ];

  return (
    <View style={styles.animationContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.photoBox,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
                {
                  rotateZ: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-5deg', '0deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={gradients[index]}
            style={styles.photoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Camera size={28} color="#fff" strokeWidth={2} />
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );
}

function ReactionsAnimation() {
  const [animations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);
  const [floatAnims] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  React.useEffect(() => {
    const animate = () => {
      // Pop in sequence
      Animated.stagger(200, [
        Animated.spring(animations[0], {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.spring(animations[1], {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.spring(animations[2], {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
      ]).start(() => {
        setTimeout(() => {
          animations.forEach(anim => anim.setValue(0));
          animate();
        }, 1500);
      });
    };

    // Floating animation
    floatAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -10,
            duration: 1000 + index * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1000 + index * 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    animate();
  }, []);

  const reactions = [
    { icon: Heart, color: colors.reactionHeart, fill: true },
    { icon: Flame, color: colors.reactionFire, fill: true },
    { icon: null, emoji: '💯', color: colors.reactionHundred },
  ];

  return (
    <View style={styles.animationContainer}>
      <View style={styles.reactionBox}>
        {reactions.map((reaction, index) => {
          const Icon = reaction.icon;
          return (
            <Animated.View
              key={index}
              style={{
                opacity: animations[index],
                transform: [
                  { scale: animations[index] },
                  { translateY: floatAnims[index] },
                ],
              }}
            >
              {Icon ? (
                <View style={styles.reactionIconContainer}>
                  <Icon 
                    size={48} 
                    color={reaction.color} 
                    fill={reaction.fill ? reaction.color : 'transparent'}
                    strokeWidth={2}
                  />
                </View>
              ) : (
                <Text style={styles.emojiReactionBig}>{reaction.emoji}</Text>
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function LeaderboardAnimation() {
  const [animations] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  React.useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(animations[0], {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(animations[1], {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(animations[2], {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  const podiumData = [
    { height: 140, icon: Trophy, color: '#FFD700', label: '1st', gradient: ['#FFD700', '#FFA500'] as const },
    { height: 110, icon: Award, color: '#C0C0C0', label: '2nd', gradient: ['#E8E8E8', '#C0C0C0'] as const },
    { height: 80, icon: Award, color: '#CD7F32', label: '3rd', gradient: ['#CD7F32', '#8B4513'] as const },
  ];

  return (
    <View style={styles.animationContainer}>
      {podiumData.map((item, index) => {
        const Icon = item.icon;
        return (
          <Animated.View
            key={index}
            style={[
              {
                opacity: animations[index],
                transform: [
                  { scale: animations[index] },
                  {
                    translateY: animations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={item.gradient}
              style={[styles.podiumBar, { height: item.height }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Icon size={32} color="#fff" strokeWidth={2.5} />
              <Text style={styles.podiumTextBig}>{item.label}</Text>
            </LinearGradient>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: width * 0.7,
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  animationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.m,
  },
  photoBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.m,
    overflow: 'hidden',
    ...shadows.medium,
  },
  photoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionBox: {
    flexDirection: 'row',
    gap: spacing.l,
  },
  reactionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  emojiReactionBig: {
    fontSize: 48,
  },
  podiumBar: {
    width: 70,
    borderRadius: borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.m,
    ...shadows.medium,
  },
  podiumTextBig: {
    ...typography.bodyBold,
    color: '#fff',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textContent: {
    alignItems: 'center',
    gap: spacing.m,
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  actions: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: spacing.m,
  },
  skipText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
});

// Export function to check onboarding status
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    console.log('📖 Checking onboarding status:', value);
    return value === 'true';
  } catch (error) {
    console.error('Failed to check onboarding:', error);
    return false;
  }
}

// Export function to reset onboarding (for testing)
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    console.log('🗑️ Onboarding reset');
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
  }
}