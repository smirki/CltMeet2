import React, { useEffect, useState, useRef, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SearchBar, Button, Switch, ListItem, Icon } from 'react-native-elements';
import BottomSheet from '@gorhom/bottom-sheet';
import axiosInstance from '../api/axiosInstance';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const CHARLOTTE_COORDINATES = {
  latitude: 35.2271,
  longitude: -80.8431,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const EventsScreen = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isMapView, setIsMapView] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseEvent, setPurchaseEvent] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  const bottomSheetRef = useRef(null);
  const { confirmPayment } = useStripe();
  const navigation = useNavigation();

  // Define snap points for the bottom sheet
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  // Fetch payment methods when the modal is opened
  useEffect(() => {
    if (modalVisible && user) {
      fetchPaymentMethods();
    }
  }, [modalVisible, user]);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/events');
      setEvents(response.data.events);
      setFilteredEvents(response.data.events);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to fetch events. Please try again later.');
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

  const handleSearch = (text) => {
    setSearch(text);
    if (text === '') {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(
        (event) =>
          event.title.toLowerCase().includes(text.toLowerCase()) ||
          event.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  };

  const handleMarkerPress = (event) => {
    setSelectedEvent(event);
    bottomSheetRef.current?.expand();
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
      const response = await axiosInstance.post(
        '/purchaseTicket',
        {
          eventId: purchaseEvent.id,
          paymentMethodId: selectedPaymentMethod.id,
        }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Ticket purchased and registered successfully!');
        setModalVisible(false);
        setPurchaseEvent(null);
        setSelectedPaymentMethod(null);
        // Update registeredEvents state
        setRegisteredEvents((prev) => [...prev, purchaseEvent.id]);
        // Optionally, refresh events or user profile
        fetchEvents();
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

  const handleJoinEvent = async (event) => {
    try {
      const response = await axiosInstance.post(
        '/registerForEvent',
        { eventId: event.id }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'You have successfully joined the event!');
        bottomSheetRef.current?.close();
        // Update registeredEvents state
        setRegisteredEvents((prev) => [...prev, event.id]);
        // Optionally, refresh events or user profile
        fetchEvents();
      } else {
        Alert.alert('Error', 'Failed to join the event.');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'An error occurred while joining the event.'
      );
    }
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

  const renderEventItem = ({ item }) => {
    const isRegistered = registeredEvents.includes(item.id);

    return (
      <View style={styles.eventItem}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.eventImage}
          accessibilityLabel={`Image for ${item.title}`}
        />
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDescription}>{item.description}</Text>
          <Text style={styles.eventInfo}>
            Date & Time: {new Date(item.date.seconds * 1000).toLocaleString()}
          </Text>
          <Text style={styles.eventInfo}>Location: {item.location.name}</Text>
          <Text style={styles.eventInfo}>
            Cost: {item.cost > 0 ? `$${item.cost}` : 'Free'}
          </Text>
          <Text style={styles.eventInfo}>
            Slots Left: {item.totalSlots - item.registeredCount}
          </Text>
        </View>
        <View style={styles.eventActions}>
          {isRegistered ? (
            <View style={styles.registeredContainer}>
              <Icon
                name="check-circle"
                type="font-awesome"
                color="green"
                size={24}
                accessibilityLabel="Registered Successfully"
              />
              <TouchableOpacity
                onPress={() => navigateToGroupChat(item)}
                style={styles.chatIcon}
                accessibilityLabel="Open Group Chat"
                accessibilityHint={`Opens group chat for ${item.title}`}
              >
                <Icon name="comments" type="font-awesome" color="#4CAF50" size={24} />
              </TouchableOpacity>
            </View>
          ) : item.cost > 0 ? (
            <Button
            title="Purchase Tickets"
            buttonStyle={styles.purchaseButton}
            onPress={async () => {
              // Fetch the latest payment methods
              await fetchPaymentMethods();
              // Then open the modal
              setPurchaseEvent(item);
              setModalVisible(true);
              setIsMapView(false);
            }}
          />
          ) : (
            <Button
              title="Join Event"
              type="outline"
              buttonStyle={styles.joinButton}
              onPress={() => {
                setSelectedEvent(item);
                bottomSheetRef.current?.expand();
              }}
              accessibilityLabel={`Join free event ${item.title}`}
              accessibilityHint={`Registers you for the free event ${item.title}`}
            />
          )}
        </View>
      </View>
    );
  };

  const navigateToGroupChat = (event) => {
    const chatData = {
      chatId: chatId,
      name: chatName,
    };
    navigation.navigate('Chats', { screen: 'Chat', params: { chat: chatData } });
    navigation.navigate('ChatStack', { eventId: event.id, eventTitle: event.title });
  };

  if (loading || authLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <SearchBar
        placeholder="Search Events..."
        onChangeText={handleSearch}
        value={search}
        lightTheme
        round
        containerStyle={styles.searchContainer}
        inputContainerStyle={styles.searchInputContainer}
        accessibilityLabel="Search Events"
        accessibilityHint="Enter text to search for events"
      />

      {/* Toggle Switch */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Map View</Text>
        <Switch
          value={isMapView}
          onValueChange={(value) => setIsMapView(value)}
          color="#FF3B30"
          accessibilityLabel="Toggle between Map and List View"
          accessibilityHint="Switches the view to map or list"
        />
        <Text style={styles.toggleLabel}>List View</Text>
      </View>

      {/* Conditional Rendering Based on Toggle */}
      {isMapView ? (
        // Map View
        <MapView
          style={styles.map}
          initialRegion={CHARLOTTE_COORDINATES}
          showsUserLocation={true}
          accessibilityLabel="Events Map"
        >
          {filteredEvents.map((event) => (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.location.latitude,
                longitude: event.location.longitude,
              }}
              title={event.title}
              description={event.description}
              onPress={() => handleMarkerPress(event)}
              accessibilityLabel={`Marker for ${event.title}`}
            />
          ))}
        </MapView>
      ) : (
        // List View
        <FlatList
          data={filteredEvents}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          accessibilityLabel="Events List"
        />
      )}

      {/* Bottom Sheet for Free Event Details */}
      {isMapView && selectedEvent && (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onClose={() => setSelectedEvent(null)}
          accessibilityLabel="Event Details Bottom Sheet"
        >
          <View style={styles.bottomSheetContent}>
            <Image
              source={{ uri: selectedEvent.imageUrl }}
              style={styles.bottomSheetImage}
              accessibilityLabel={`Image for ${selectedEvent.title}`}
            />
            <Text style={styles.bottomSheetTitle}>{selectedEvent.title}</Text>
            <Text style={styles.bottomSheetDescription}>{selectedEvent.description}</Text>
            <Text style={styles.bottomSheetInfo}>
              Date & Time: {new Date(selectedEvent.date.seconds * 1000).toLocaleString()}
            </Text>
            <Text style={styles.bottomSheetInfo}>Location: {selectedEvent.location.name}</Text>
            <Text style={styles.bottomSheetInfo}>
              Cost: {selectedEvent.cost > 0 ? `$${selectedEvent.cost}` : 'Free'}
            </Text>
            <Text style={styles.bottomSheetInfo}>
              Slots Left: {selectedEvent.totalSlots - selectedEvent.registeredCount}
            </Text>

            {/* Join Free Event Button */}
            {selectedEvent.cost === 0 && (
              <Button
                title="Join Free Event"
                type="outline"
                buttonStyle={styles.joinButton}
                onPress={() => handleJoinEvent(selectedEvent)}
                accessibilityLabel="Join Free Event"
                accessibilityHint="Registers you for the selected free event"
              />
            )}
          </View>
        </BottomSheet>
      )}

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
                    <Text>No saved payment methods. Please add one in your profile.</Text>
                  )}

                  {/* Option to Add New Payment Method */}
                  <Button
                    title="Add New Payment Method"
                    onPress={() => {
                      setModalVisible(false);
                      // Navigate to Payment Methods screen
                      navigation.push('Payments', {
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
                    titleStyle={{ color: '#FF3B30' }}
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
    paddingTop: 40,
  },
  searchContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchInputContainer: {
    backgroundColor: '#EFEFEF',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginVertical: 8,
    padding: 10,
    elevation: 2, // For Android
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 2 }, // For iOS
    shadowOpacity: 0.1, // For iOS
    shadowRadius: 5, // For iOS
  },
  eventImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  eventDetails: {
    flex: 1,
    paddingLeft: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 5,
  },
  eventInfo: {
    fontSize: 12,
    color: '#777777',
  },
  eventActions: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  purchaseButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 5,
  },
  joinButton: {
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 10,
  },
  registeredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatIcon: {
    marginLeft: 10,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bottomSheetDescription: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 10,
  },
  bottomSheetInfo: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 5,
  },
  bottomSheetImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
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
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalEventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
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
  },
  addPaymentButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginTop: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EventsScreen;
