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
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

export default function SettingsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState('');
  const [habits, setHabits] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);
  const { currentUser, logout } = useAuth();

  // User profile state
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [originalFirstName, setOriginalFirstName] = useState('');
  const [originalAge, setOriginalAge] = useState('');

  useEffect(() => {
    loadHabits();
    loadUserProfile();
  }, [currentUser]);

  const loadUserProfile = async () => {
    try {
      const userRef = collection(db, 'users');
      const userQuery = query(userRef, where('id', '==', currentUser.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setFirstName(userData.firstName || '');
        setAge(userData.age ? userData.age.toString() : '');
        setOriginalFirstName(userData.firstName || '');
        setOriginalAge(userData.age ? userData.age.toString() : '');
      } else {
        // Create a new user profile if it doesn't exist
        const newUserProfile = {
          id: currentUser.uid,
          email: currentUser.email,
          firstName: '',
          age: '',
          createdAt: new Date().toISOString()
        };
        await addDoc(userRef, newUserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      // Validate age if provided
      if (age && (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 200)) {
        Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 200');
        return;
      }

      // Update user profile in Firestore
      const userRef = collection(db, 'users');
      const userQuery = query(userRef, where('id', '==', currentUser.uid));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        // Update existing profile
        const docRef = userSnapshot.docs[0].ref;
        await updateDoc(docRef, {
          firstName,
          age: age ? parseInt(age) : null,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new profile
        await addDoc(userRef, {
          id: currentUser.uid,
          email: currentUser.email,
          firstName,
          age: age ? parseInt(age) : null,
          createdAt: new Date().toISOString()
        });
      }

      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(
        'Error',
        'Failed to save profile. Please try again later.'
      );
    }
  };

  const cancelProfileEdit = () => {
    setFirstName(originalFirstName);
    setAge(originalAge);
    setIsEditingProfile(false);
  };

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

  const handleFirstNameChange = (text) => {
    console.log('First name change:', text);
    setFirstName(text);
  };

  const handleAgeChange = (text) => {
    console.log('Age change:', text);
    // Only allow numbers and validate range
    const numValue = parseInt(text);
    if (text === '') {
      setAge('');
    } else if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
      setAge(text);
    }
  };

  const handleEditPress = () => {
    console.log('Edit button pressed, current state:', { firstName, age, isEditingProfile });
    setIsEditingProfile(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={[
              styles.profileForm,
              Platform.OS === 'web' && styles.webProfileForm
            ]}>
              <View style={[
                styles.inputContainer,
                Platform.OS === 'web' && styles.webInputContainer
              ]}>
                <View style={[
                  styles.inputGroup,
                  Platform.OS === 'web' && styles.webInputGroup
                ]}>
                  <Text style={styles.inputLabel}>First Name:</Text>
                  <TextInput
                    style={[
                      styles.input,
                      Platform.OS === 'web' && styles.webInput,
                      Platform.OS === 'web' && !isEditingProfile && styles.webInputDisabled
                    ]}
                    placeholder="Enter your first name"
                    value={firstName}
                    onChangeText={handleFirstNameChange}
                    onChange={e => Platform.OS === 'web' && handleFirstNameChange(e.target.value)}
                    editable={isEditingProfile}
                  />
                </View>

                <View style={[
                  styles.inputGroup,
                  Platform.OS === 'web' && styles.webInputGroup
                ]}>
                  <Text style={styles.inputLabel}>Age:</Text>
                  <TextInput
                    style={[
                      styles.input,
                      Platform.OS === 'web' && styles.webInput,
                      Platform.OS === 'web' && !isEditingProfile && styles.webInputDisabled
                    ]}
                    placeholder=""
                    value={age}
                    onChangeText={handleAgeChange}
                    onChange={e => Platform.OS === 'web' && handleAgeChange(e.target.value)}
                    keyboardType="numeric"
                    inputMode="numeric"
                    editable={isEditingProfile}
                  />
                </View>

                {Platform.OS === 'web' && (
                  <View style={styles.webEditButtonContainer}>
                    {isEditingProfile ? (
                      <View style={styles.webEditButtons}>
                        <TouchableOpacity 
                          style={styles.webIconButton} 
                          onPress={cancelProfileEdit}
                        >
                          <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.webIconButton} 
                          onPress={handleSaveProfile}
                        >
                          <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.webIconButton}
                        onPress={handleEditPress}
                      >
                        <Ionicons name="pencil-outline" size={24} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {Platform.OS !== 'web' && (
                isEditingProfile ? (
                  <View style={styles.profileButtons}>
                    <TouchableOpacity 
                      style={[styles.button, styles.cancelButton]} 
                      onPress={cancelProfileEdit}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.button, styles.saveButton]} 
                      onPress={handleSaveProfile}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.button, styles.editButton]} 
                    onPress={handleEditPress}
                  >
                    <Text style={styles.buttonText}>Edit Profile</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Habits Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage Habits</Text>
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
          </View>
        </ScrollView>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.bottomContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
      </KeyboardAvoidingView>

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
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileForm: {
    marginBottom: 20,
  },
  webProfileForm: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  webInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  webInputGroup: {
    flex: 1,
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  webInput: {
    outlineStyle: 'none',
    padding: 10,
    fontSize: 14,
  },
  webInputDisabled: {
    backgroundColor: '#f5f5f5',
    cursor: 'default',
    color: '#666',
  },
  profileButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  logoutButton: {
    padding: 8,
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
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
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
  webEditButtonContainer: {
    justifyContent: 'center',
    paddingLeft: 10,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  webEditButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  webIconButton: {
    padding: 5,
    cursor: 'pointer',
  },
}); 