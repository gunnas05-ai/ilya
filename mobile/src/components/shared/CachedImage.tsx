import React from 'react';
import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CachedImageProps {
  uri?: string | null;
  style?: any;
  size?: number;
  placeholder?: string;
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export default function CachedImage({ uri, style, size = 48, placeholder = '📷' }: CachedImageProps) {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <View style={[{ width: size, height: size, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, style]}>
        <Text style={{ fontSize: size * 0.5 }}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: 8 }, style]}
      placeholder={{ blurhash }}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
    />
  );
}
