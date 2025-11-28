export default {
  expo: {
    name: "Flick",
    slug: "flick-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "flick",
    userInterfaceStyle: "dark",

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.tullu.flick",
      infoPlist: {
        NSCameraUsageDescription: "Flick uses the camera to capture photos.",
        NSPhotoLibraryUsageDescription: "Flick needs access to your photos to upload images.",
        NSPhotoLibraryAddUsageDescription: "Flick saves edited or captured photos to your gallery."
      }
    },

    android: {
      package: "com.tullu.flick",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FF6B35"
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "VIBRATE"
      ]
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    plugins: [
      "expo-router",
      "expo-font",
      "expo-camera",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#FF6B35"
        }
      ],
      [
        "sentry-expo",
        {
          organization: "flick-app-h3",
          project: "flick-app"
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      sentryDsn: process.env.SENTRY_DSN,
      eas: {
        projectId: "6cedf39b-a00c-4958-b616-398e53d05c80"
      }
    }
  }
};
