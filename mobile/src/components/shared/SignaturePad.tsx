import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect } from '@react-navigation/native';

interface SignaturePadProps {
  onOK: (signature: string) => void;
  onEmpty?: () => void;
  onClear?: () => void;
  descriptionText?: string;
  landscapeOnly?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onOK,
  onEmpty,
  onClear,
  descriptionText = 'Lütfen bu alana imzanızı atın',
  landscapeOnly = true,
}) => {
  const { colors } = useTheme();
  const signatureRef = useRef<SignatureViewRef>(null);

  // Auto-rotate to landscape if requested
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const lockLandscape = async () => {
        if (landscapeOnly && isMounted) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
      };

      lockLandscape();

      return () => {
        isMounted = false;
        if (landscapeOnly) {
          ScreenOrientation.unlockAsync(); // Revert back to app's default orientation
        }
      };
    }, [landscapeOnly])
  );

  const handleOK = (signature: string) => {
    onOK(signature);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    if (onClear) onClear();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  // Customizing the HTML canvas for the webview inside SignatureScreen
  const style = `
    .m-signature-pad {
      box-shadow: none; 
      border-color: ${colors.border};
      border-radius: ${radius.md}px;
    }
    .m-signature-pad--footer {
      display: none; 
    }
    body,html {
      width: 100%; height: 100%; margin: 0; padding: 0;
    }
  `;

  return (
    <View style={styles.container}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{descriptionText}</Text>
      
      <View style={[styles.canvasContainer, { borderColor: colors.border }]}>
        <SignatureScreen
          ref={signatureRef}
          onOK={handleOK}
          onEmpty={onEmpty}
          webStyle={style}
          autoClear={false}
          descriptionText=""
          clearText="Temizle"
          confirmText="Kaydet"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.clearButton, { borderColor: colors.border }]} 
          onPress={handleClear}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Temizle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]} 
          onPress={handleConfirm}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Onayla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  description: {
    ...typography.body2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  canvasContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#ffffff', // Canvas must be white
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  confirmButton: {
    marginLeft: spacing.sm,
  },
  buttonText: {
    ...typography.subtitle2,
  },
});

export default SignaturePad;
