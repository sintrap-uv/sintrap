import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { Text } from 'react-native'

export default function LocationScreen() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado')
        return
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,   // cada 5 segundos
          distanceInterval: 5   // o cada 5 metros
        },
        (loc) => {
          setLocation(loc.coords)
        }
      )
    })()
  }, [])

  if (error) return <Text>{error}</Text>
  if (!location) return <Text>Obteniendo ubicación...</Text>

  return (
    <Text>
      Lat: {location.latitude}{"\n"}
      Lng: {location.longitude}
    </Text>
  )
}