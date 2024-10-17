import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Button } from 'react-native-elements';
import axiosInstance from '../api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const PaymentMethodsScreen = () => {
  const { createPaymentMethod } = useStripe();
  const { userToken } = useContext(AuthContext);
  const navigation = useNavigation();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState();

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const storedPaymentMethods = await AsyncStorage.getItem('paymentMethods');
      if (storedPaymentMethods) {
        setPaymentMethods(JSON.parse(storedPaymentMethods));
      }
      const response = await axiosInstance.get('/payment-methods');
      if (response.data.paymentMethods) {
        setPaymentMethods(response.data.paymentMethods);
        await AsyncStorage.setItem('paymentMethods', JSON.stringify(response.data.paymentMethods));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', 'Failed to fetch payment methods.');
    } finally {
      setLoading(false);
    }
  };

  // Add payment method
  const handleAddPaymentMethod = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Incomplete Details', 'Please enter complete card details.');
      return;
    }
    setLoading(true);
    try {
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        card: cardDetails,
      });

      if (error) {
        Alert.alert('Payment Method Error', error.message);
        setLoading(false);
        return;
      }

      if (paymentMethod) {
        const response = await axiosInstance.post(
          '/save-payment-method',
          { paymentMethodId: paymentMethod.id },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );

        if (response.status === 200) {
          Alert.alert('Success', 'Payment Method added successfully.');
          fetchPaymentMethods();
        } else {
          Alert.alert('Error', response.data.error || 'Failed to add Payment Method.');
        }
      }
    } catch (err) {
      console.error('Error adding payment method:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Delete payment method
  const deletePaymentMethod = async (paymentMethodId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await axiosInstance.delete(`/payment-methods/${paymentMethodId}`);
              const updatedPaymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethodId);
              setPaymentMethods(updatedPaymentMethods);
              await AsyncStorage.setItem('paymentMethods', JSON.stringify(updatedPaymentMethods));
              Alert.alert('Success', 'Payment method deleted successfully.');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchPaymentMethods();
    }, [])
  );

  const renderPaymentMethod = ({ item }) => (
    <View style={styles.paymentMethodItem}>
      <View>
        <Text style={styles.cardBrand}>{item.card.brand.toUpperCase()}</Text>
        <Text>**** **** **** {item.card.last4}</Text>
        <Text>Expires: {item.card.exp_month}/{item.card.exp_year}</Text>
      </View>
      <TouchableOpacity onPress={() => deletePaymentMethod(item.id)} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.header}>Your Payment Methods</Text>
        <CardField
          postalCodeEnabled={false}
          placeholder={{ number: '4242 4242 4242 4242' }}
          cardStyle={styles.card}
          style={styles.cardContainer}
          onCardChange={(card) => setCardDetails(card)}
          accessible
        />
        <Button
          title="Add Payment Method"
          onPress={handleAddPaymentMethod}
          buttonStyle={styles.addButton}
          accessibilityLabel="Add Payment Method"
        />
        {loading ? (
          <ActivityIndicator size="large" color="#FF3B30" style={styles.loader} />
        ) : (
          <FlatList
            data={paymentMethods}
            keyExtractor={(item) => item.id}
            renderItem={renderPaymentMethod}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.noMethodsText}>No payment methods found.</Text>}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
  },
  cardContainer: {
    height: 50,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e6e6fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  cardBrand: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
  },
  noMethodsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#555',
  },
  loader: {
    marginTop: 20,
  },
});

export default PaymentMethodsScreen;
