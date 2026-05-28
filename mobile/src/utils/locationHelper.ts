import * as Location from 'expo-location';
import { Alert } from 'react-native';

export async function getSecureLocation(): Promise<Location.LocationObject> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Konum izni verilmedi');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  // Check for mock location
  if (location.mocked) {
    Alert.alert(
      "Güvenlik Uyarısı",
      "Cihazınızda sahte GPS (Mock Location) kullanımı tespit edildi. Lütfen uygulamayı gerçek konumunuzla kullanın."
    );
    throw new Error("FAKE_GPS_DETECTED");
  }

  return location;
}
