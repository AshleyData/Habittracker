import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Modal, 
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function HabitsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState('');
  const [habits, setHabits] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    loadHabits();
  }, [currentUser]);

  const loadHabits = async () => {
    try {
      const habitsRef = collection(db, 'habits');
      const q = query(habitsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const habitsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHabits(habitsList);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const handleAddHabit = async () => {
    if (newHabit.trim()) {
      try {
        const docRef = await addDoc(collection(db, 'habits'), {
          name: newHabit,
          completed: false,
          createdAt: new Date(),
          completionDates: [],
          userId: currentUser.uid
        });
        
        setHabits([...habits, { 
          id: docRef.id, 
          name: newHabit, 
          completed: false,
          completionDates: [],
          userId: currentUser.uid
        }]);
        setNewHabit('');
        setShowForm(false);
      } catch (error) {
        console.error('Error adding habit:', error);
      }
    }
  };

  const handleDeleteHabit = async (habitId, habitName) => {
    if (Platform.OS === 'web') {
      setHabitToDelete({ id: habitId, name: habitName });
      setShowDeleteConfirm(true);
    } else {
      Alert.alert(
        "Delete Habit",
        `Are you sure you want to delete "${habitName}"?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => confirmDelete(habitId)
          }
        ]
      );
    }
  };

  const confirmDelete = async (habitId) => {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
      setHabits(habits.filter(h => h.id !== habitId));
      setShowDeleteConfirm(false);
      setHabitToDelete(null);
    } catch (error) {
      console.error('Error deleting habit:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete habit. Please try again.');
      } else {
        Alert.alert(
          "Error",
          "Failed to delete habit. Please try again."
        );
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Manage Habits</Text>
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.scrollView}>
              {habits.length === 0 ? (
                <Text style={styles.subtitle}>No habits yet</Text>
              ) : (
                habits.map(habit => (
                  <View key={habit.id} style={styles.habitItem}>
                    <Text style={styles.habitText}>{habit.name}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHabit(habit.id, habit.name)}
                    >
                      <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {showForm ? (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter new habit"
            value={newHabit}
            onChangeText={setNewHabit}
            autoFocus={true}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => {
                setShowForm(false);
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.addButton]} 
              onPress={() => {
                handleAddHabit();
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.addButton]} 
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.buttonText}>Add New Habit</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Habit</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{habitToDelete?.name}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.modalCancelButton]} 
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setHabitToDelete(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.modalDeleteButton]} 
                onPress={() => habitToDelete && confirmDelete(habitToDelete.id)}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  habitText: {
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: '#FF3B30',
  },
  modalDeleteButton: {
    backgroundColor: '#007AFF',
  },
}); 