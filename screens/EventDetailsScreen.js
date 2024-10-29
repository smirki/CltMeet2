// screens/EventDetailsScreen.js

import React, { useEffect, useState, useRef, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
} from 'react-native';
import { Button, Icon, ListItem } from 'react-native-elements';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import axiosInstance from '../api/axiosInstance';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const EventDetailsScreen = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params;

  const [event, setEvent] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseEvent, setPurchaseEvent] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const bottomSheetRef = useRef(null);
  const { confirmPayment } = useStripe();

  // Define snap points for the bottom sheet
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  useEffect(() => {
    fetchEventDetails();
    fetchUserProfile();
  }, [eventId, user]);

  const fetchEventDetails = async () => {
    try {
      const response = await axiosInstance.get(`/events/${eventId}`);
      if (response && response.data && response.data.event) {
        setEvent(response.data.event);
      } else {
        Alert.alert('Error', 'Event not found.');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      Alert.alert('Error', 'Failed to fetch event details.');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/getUserProfile');
      if (response && response.data) {
        setUserProfile(response.data);
        setIsRegistered(response.data.registeredEvents && response.data.registeredEvents[eventId]);
      } else {
        Alert.alert('Error', 'User profile not found.');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to fetch user profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axiosInstance.get('/payment-methods');
      setPaymentMethods(response.data.paymentMethods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', 'Failed to fetch payment methods.');
    }
  };

  const handlePurchase = async () => {
    if (!purchaseEvent) return;

    if (!selectedPaymentMethod) {
      Alert.alert('No Payment Method', 'Please select a payment method.');
      return;
    }

    setPaymentLoading(true);

    try {
      // Call backend to purchase ticket
      const response = await axiosInstance.post('/purchaseTicket', {
        eventId: purchaseEvent.id,
        paymentMethodId: selectedPaymentMethod.id,
      });

      if (response.status === 200) {
        Alert.alert('Success', 'Ticket purchased and registered successfully!');
        setModalVisible(false);
        setPurchaseEvent(null);
        setSelectedPaymentMethod(null);
        setIsRegistered(true);
        // Optionally, refresh event details or user profile
        fetchEventDetails();
        fetchUserProfile();
      } else {
        Alert.alert('Error', 'Failed to purchase ticket.');
      }
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      Alert.alert(
        'Purchase Failed',
        error.response?.data?.error ||
          'An error occurred while purchasing the ticket.'
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const navigateToEventChat = () => {
    // Assuming you have a chat screen setup that can handle event-specific chats
    navigation.navigate('Chats', { screen: 'Chat', params: { chatId: `event_${eventId}`, chatName: event.title } });
  };

  const renderPaymentMethod = ({ item }) => (
    <ListItem
      bottomDivider
      onPress={() => setSelectedPaymentMethod(item)}
      accessibilityRole="button"
    >
      <Icon name="credit-card" type="font-awesome" />
      <ListItem.Content>
        <ListItem.Title>Card ending in {item.card.last4}</ListItem.Title>
        <ListItem.Subtitle>
          Expiry: {item.card.exp_month}/{item.card.exp_year}
        </ListItem.Subtitle>
      </ListItem.Content>
      {selectedPaymentMethod && selectedPaymentMethod.id === item.id && (
        <Icon name="check" type="font-awesome" color="#4CAF50" />
      )}
    </ListItem>
  );

  if (loading || authLoading || !event) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Event Image */}
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.eventImage}
          accessibilityLabel={`Image for ${event.title}`}
        />

        {/* Event Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description}</Text>

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Icon name="calendar" type="font-awesome" color="#555555" />
            <Text style={styles.infoText}>
              {new Date(event.date.seconds * 1000).toLocaleDateString()} at{' '}
              {new Date(event.date.seconds * 1000).toLocaleTimeString()}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.infoRow}>
            <Icon name="map-marker" type="font-awesome" color="#555555" />
            <Text style={styles.infoText}>{event.location.name}</Text>
          </View>

          {/* Cost */}
          <View style={styles.infoRow}>
            <Icon name="usd" type="font-awesome" color="#555555" />
            <Text style={styles.infoText}>
              {event.cost > 0 ? `$${event.cost}` : 'Free'}
            </Text>
          </View>

          {/* Slots Left */}
          <View style={styles.infoRow}>
            <Icon name="users" type="font-awesome" color="#555555" />
            <Text style={styles.infoText}>
              Slots Left: {event.totalSlots - event.registeredCount}
            </Text>
          </View>

          {/* Map View */}
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: event.location.latitude,
              longitude: event.location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            accessibilityLabel="Event Location Map"
          >
            <Marker
              coordinate={{
                latitude: event.location.latitude,
                longitude: event.location.longitude,
              }}
              title={event.title}
              description={event.location.name}
              accessibilityLabel={`Marker for ${event.title}`}
            />
          </MapView>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {!isRegistered ? (
            <Button
              title="Purchase Tickets"
              buttonStyle={styles.purchaseButton}
              onPress={() => {
                setPurchaseEvent(event);
                setModalVisible(true);
                fetchPaymentMethods();
              }}
              accessibilityLabel="Purchase Tickets"
              accessibilityHint="Opens modal to purchase tickets for the event"
            />
          ) : (
            <Button
              title="Event Chat"
              buttonStyle={styles.chatButton}
              onPress={navigateToEventChat}
              icon={<Icon name="comments" type="font-awesome" color="#FFFFFF" style={{ marginRight: 10 }} />}
              accessibilityLabel="Open Event Chat"
              accessibilityHint="Navigates to the chat screen for this event"
            />
          )}
        </View>
      </ScrollView>

      {/* Modal for Purchasing Tickets */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setPurchaseEvent(null);
          setSelectedPaymentMethod(null);
        }}
        accessibilityViewIsModal={true}
        accessible={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Purchase Tickets</Text>
              {purchaseEvent && (
                <>
                  <Image
                    source={{ uri: purchaseEvent.imageUrl }}
                    style={styles.modalImage}
                    accessibilityLabel={`Image for ${purchaseEvent.title}`}
                  />
                  <Text style={styles.modalEventTitle}>{purchaseEvent.title}</Text>
                  <Text style={styles.modalEventDescription}>
                    {purchaseEvent.description}
                  </Text>
                  <Text style={styles.modalEventInfo}>
                    Cost: ${purchaseEvent.cost}
                  </Text>
                  <Text style={styles.modalEventInfo}>
                    Slots Left: {purchaseEvent.totalSlots - purchaseEvent.registeredCount}
                  </Text>

                  <Text style={styles.selectPaymentMethodTitle}>
                    Select Payment Method:
                  </Text>
                  {paymentMethods.length > 0 ? (
                    <FlatList
                      data={paymentMethods}
                      keyExtractor={(item) => item.id}
                      renderItem={renderPaymentMethod}
                      accessibilityLabel="Payment Methods List"
                      nestedScrollEnabled={true} // Enables nested scrolling on Android
                    />
                  ) : (
                    <Text style={styles.noPaymentMethodsText}>
                      No saved payment methods. Please add one in your profile.
                    </Text>
                  )}

                  {/* Option to Add New Payment Method */}
                  <Button
                    title="Add New Payment Method"
                    onPress={() => {
                      setModalVisible(false);
                      // Navigate to Payment Methods screen
                      navigation.navigate('Payments', {
                        onPaymentMethodAdded: fetchPaymentMethods, // Refresh payment methods after adding
                      });
                    }}
                    buttonStyle={styles.addPaymentButton}
                    containerStyle={{ marginTop: 10 }}
                    accessibilityLabel="Add New Payment Method"
                    accessibilityHint="Navigates to screen to add a new payment method"
                  />

                  <Button
                    title="Confirm Purchase"
                    buttonStyle={styles.purchaseButton}
                    onPress={handlePurchase}
                    loading={paymentLoading}
                    disabled={!selectedPaymentMethod || paymentLoading}
                    containerStyle={{ marginTop: 20 }}
                    accessibilityLabel="Confirm Purchase"
                    accessibilityHint="Confirms and processes your ticket purchase"
                  />

                  <Button
                    title="Cancel"
                    type="clear"
                    onPress={() => {
                      setModalVisible(false);
                      setPurchaseEvent(null);
                      setSelectedPaymentMethod(null);
                    }}
                    titleStyle={{ color: '#FF5A5F' }}
                    accessibilityLabel="Cancel Purchase"
                    accessibilityHint="Closes the purchase modal without completing the purchase"
                  />
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: width,
    height: height * 0.3,
  },
  detailsContainer: {
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#777777',
    marginLeft: 10,
  },
  map: {
    width: '100%',
    height: 150,
    marginTop: 15,
    borderRadius: 10,
  },
  actionContainer: {
    padding: 15,
    alignItems: 'center',
  },
  purchaseButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    elevation: 5, // For Android
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 2 }, // For iOS
    shadowOpacity: 0.3, // For iOS
    shadowRadius: 5, // For iOS
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333333',
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333333',
  },
  modalEventDescription: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 10,
  },
  modalEventInfo: {
    fontSize: 12,
    color: '#777777',
    marginBottom: 5,
  },
  modalImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectPaymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 10,
    color: '#333333',
  },
  addPaymentButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  noPaymentMethodsText: {
    fontSize: 14,
    color: '#777777',
    marginVertical: 10,
  },
});

export default EventDetailsScreen;
