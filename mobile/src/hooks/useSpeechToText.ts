import { useState, useCallback, useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

let NativeSpeechRecognition: any = null;

try {
  const { requireNativeModule } = require('expo');
  NativeSpeechRecognition = requireNativeModule('ExpoSpeechRecognition');
} catch {
  NativeSpeechRecognition = null;
}

const isAvailable = !!NativeSpeechRecognition;

export function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSetupListeners = useRef(false);

  useEffect(() => {
    if (!NativeSpeechRecognition || hasSetupListeners.current) return;
    hasSetupListeners.current = true;

    const emitter = new NativeEventEmitter(NativeSpeechRecognition);

    const resultSub = emitter.addListener('onSpeechRecognitionResult', (event: any) => {
      if (event.results?.[0]?.transcript) {
        setTranscript(event.results[0].transcript);
      }
    });

    const errorSub = emitter.addListener('onSpeechRecognitionError', (event: any) => {
      setError(event.message);
      setIsListening(false);
    });

    const endSub = emitter.addListener('onSpeechRecognitionEnd', () => {
      setIsListening(false);
    });

    return () => {
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
      hasSetupListeners.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');

    if (!NativeSpeechRecognition) {
      setError(
        Platform.OS === 'ios'
          ? 'Sesli komut için development build gerekli. "npx expo run:ios" ile derleyin.'
          : 'Sesli komut için development build gerekli. "npx expo run:android" ile derleyin.'
      );
      return;
    }

    try {
      const perm = await NativeSpeechRecognition.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Mikrofon izni gerekli');
        return;
      }
      setIsListening(true);
      NativeSpeechRecognition.start({
        lang: 'tr-TR',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (e: any) {
      setError(e.message || 'Ses tanıma başlatılamadı');
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (NativeSpeechRecognition) {
      NativeSpeechRecognition.stop();
    }
    setIsListening(false);
  }, []);

  const abort = useCallback(() => {
    if (NativeSpeechRecognition) {
      NativeSpeechRecognition.abort();
    }
    setIsListening(false);
  }, []);

  return { transcript, isListening, error, start, stop, abort, isAvailable };
}
