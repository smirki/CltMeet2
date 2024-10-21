import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, } from 'react-native';
import { Card } from 'react-native-paper'; // Optional, you can use your own Card component


const EventCard = ({ event }) => {
  return (
    <Card style={styles.card}>
      <Image source={{ uri: event.imageUrl }} style={styles.image} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{event.title}</Text>
        <Text>{event.description}</Text>
        <Text>Location: {event.location.name}</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>View Ticket</Text>
        </TouchableOpacity>
   
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250, // Width of each card
    margin: 10,
    height: 290, // Spacing between cards
    backgroundColor: '#FFFFFF',
    
  },
  image: {
    height: 150, // Adjust as necessary
    width: '100%',
  },
  cardContent: {
    padding: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#e63558',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#e63558', // Primary button color
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EventCard;
