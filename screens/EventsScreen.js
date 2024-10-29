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
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SearchBar, Button, ListItem, Icon } from 'react-native-elements';
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

// Define categories with flat icons
const categories = [
  { id: 'all', label: 'All', icon: 'calendar' },
  { id: 'sports', label: 'Sports', icon: 'futbol-o' },
  { id: 'beer', label: 'Beer', icon: 'beer' },
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'food', label: 'Food', icon: 'cutlery' },
  { id: 'art', label: 'Art', icon: 'paint-brush' },
  // Add more categories as needed
];

const EventsScreen = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchaseEvent, setPurchaseEvent] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const bottomSheetRef = useRef(null);
  const { confirmPayment } = useStripe();
  const navigation = useNavigation();
  const mapRef = useRef(null);

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

  useEffect(() => {
    applyFilters();
  }, [search, selectedCategory, events]);

  const fetchEvents = async (options = {}) => {
    const { search = '', type = 'all', sortBy = 'date', order = 'asc', page = 1, limit = 10 } = options;
    setLoading(true);
    try {
      const response = await axiosInstance.get('/events', {
        params: { search, type, sortBy, order, page, limit },
      });
      const fetchedEvents = response.data.events;
      if (page === 1) {
        setEvents(fetchedEvents);
      } else {
        setEvents(prevEvents => [...prevEvents, ...fetchedEvents]);
      }
      setFilteredEvents(fetchedEvents);
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
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const applyFilters = () => {
    let updatedEvents = [...events];

    // Filter by category
    if (selectedCategory !== 'all') {
      updatedEvents = updatedEvents.filter(
        (event) => event.category && event.category.toLowerCase() === selectedCategory
      );
    }

    // Filter by search text
    if (search.trim() !== '') {
      const lowerSearch = search.toLowerCase();
      updatedEvents = updatedEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(lowerSearch) ||
          event.description.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredEvents(updatedEvents);
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
      const response = await axiosInstance.post('/purchaseTicket', {
        eventId: purchaseEvent.id,
        paymentMethodId: selectedPaymentMethod.id,
      });

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
      const response = await axiosInstance.post('/registerForEvent', { eventId: event.id });

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

  const renderEventCard = ({ item, index }) => {
    const isRegistered = registeredEvents.includes(item.id);

    return (
      <View style={styles.cardContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          accessibilityLabel={`Image for ${item.title}`}
        />
        <View style={styles.cardDetails}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardInfo}>
            Date & Time: {new Date(item.date.seconds * 1000).toLocaleString()}
          </Text>
          <Text style={styles.cardInfo}>Location: {item.location.name}</Text>
          <Text style={styles.cardInfo}>
            Cost: {item.cost > 0 ? `$${item.cost}` : 'Free'}
          </Text>
          <Text style={styles.cardInfo}>
            Slots Left: {item.totalSlots - item.registeredCount}
          </Text>
          <View style={styles.cardActions}>
            {isRegistered ? (
              <View style={styles.registeredContainer}>
                <Icon
                  name="check-circle"
                  type="font-awesome"
                  color="#4CAF50"
                  size={20}
                  accessibilityLabel="Registered Successfully"
                />
                <TouchableOpacity
                  onPress={() => navigateToGroupChat(item)}
                  style={styles.chatIcon}
                  accessibilityLabel="Open Group Chat"
                  accessibilityHint={`Opens group chat for ${item.title}`}
                >
                  <Icon name="comments" type="font-awesome" color="#4CAF50" size={20} />
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
      </View>
    );
  };

  const navigateToGroupChat = (event) => {
    const chatData = {
      chatId: event.chatId, // Assuming event has chatId
      name: event.chatName, // Assuming event has chatName
    };
    navigation.navigate('Chats', { screen: 'Chat', params: { chat: chatData } });
    navigation.navigate('ChatStack', { eventId: event.id, eventTitle: event.title });
  };

  const handleScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;

    // Divide the horizontal offset by the width of the view to see which page is visible
    const pageIndex = Math.round(contentOffset / viewSize);

    const currentEvent = filteredEvents[pageIndex];
    if (currentEvent && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentEvent.location.latitude,
        longitude: currentEvent.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  if (loading || authLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Categories Scroll */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory === category.id && styles.categoryItemSelected,
              ]}
              onPress={() => handleCategorySelect(category.id)}
              accessibilityLabel={`Filter by ${category.label}`}
              accessibilityHint={`Filters events to show ${category.label} events`}
            >
              <Icon
                name={category.icon}
                type="font-awesome"
                color={selectedCategory === category.id ? '#FFFFFF' : '#555555'}
                size={20}
                containerStyle={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === category.id && styles.categoryLabelSelected,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar and Toggle Button */}
      <View style={styles.searchAndToggleContainer}>
        <SearchBar
          placeholder="Search Events..."
          onChangeText={handleSearch}
          value={search}
          lightTheme
          round
          containerStyle={styles.searchContainer}
          inputContainerStyle={styles.searchInputContainer}
          inputStyle={styles.searchInput}
          accessibilityLabel="Search Events"
          accessibilityHint="Enter text to search for events"
        />
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => navigation.navigate('EventsList')}
          accessibilityLabel="Switch to List View"
          accessibilityHint="Navigates to the list view of events"
        >
          <Icon name="th-list" type="font-awesome" color="#FF5A5F" size={24} />
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
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

      {/* Horizontally Scrollable Event Cards */}
      <View style={styles.cardsContainer}>
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsList}
          onMomentumScrollEnd={handleScrollEnd}
          accessibilityLabel="Events Cards List"
        />
      </View>

      {/* Bottom Sheet for Free Event Details */}
      {selectedEvent && (
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
    paddingTop: 40,
  },
  categoriesContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  categoriesScroll: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 1 }, // For iOS
    shadowOpacity: 0.1, // For iOS
    shadowRadius: 2, // For iOS
    elevation: 2, // For Android
  },
  categoryItemSelected: {
    backgroundColor: '#FF5A5F',
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#555555',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 5,
  },
  searchContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  searchInputContainer: {
    backgroundColor: '#EFEFEF',
    borderRadius: 20,
    height: 40,
  },
  searchInput: {
    fontSize: 14,
  },
  toggleButton: {
    marginLeft: 10,
    padding: 5,
  },
  map: {
    width: width,
    height: height * 0.3,
  },
  cardsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingVertical: 10,
  },
  cardsList: {
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginRight: 15,
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 2 }, // For iOS
    shadowOpacity: 0.1, // For iOS
    shadowRadius: 5, // For iOS
    elevation: 3, // For Android
  },
  cardImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cardDetails: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 5,
  },
  cardInfo: {
    fontSize: 12,
    color: '#999999',
  },
  cardActions: {
    marginTop: 10,
  },
  purchaseButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  joinButton: {
    borderColor: '#FF5A5F',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
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
    backgroundColor: '#FFFFFF',
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
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
    height: 180,
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EventsScreen;
