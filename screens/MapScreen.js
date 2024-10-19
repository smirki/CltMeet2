// /screens/MapScreen.js

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ route }) => {
  const { events } = route.params;

  // Define initial region based on events' locations or a default location
  const initialRegion = {
    latitude: events.length > 0 ? events[0].location.latitude : 37.78825,
    longitude: events.length > 0 ? events[0].location.longitude : -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        accessibilityLabel="Map showing event locations"
        accessible={true}
      >
        {events.map(event => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.location.latitude,
              longitude: event.location.longitude,
            }}
            title={event.title}
            description={event.description}
            accessibilityLabel={`Marker for ${event.title}`}
            accessible={true}
          />
        ))}
      </MapView>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
});
