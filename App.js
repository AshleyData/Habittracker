import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState('');
  const [habits, setHabits] = useState([]);

  // Load habits when app starts
  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'habits'));
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
          createdAt: new Date()
        });
        
        setHabits([...habits, { id: docRef.id, name: newHabit, completed: false }]);
        setNewHabit('');
        setShowForm(false);
      } catch (error) {
        console.error('Error adding habit:', error);
      }
    }
  };

  const handleToggleHabit = async (habit) => {
    try {
      const habitRef = doc(db, 'habits', habit.id);
      await updateDoc(habitRef, {
        completed: !habit.completed
      });
      
      setHabits(habits.map(h => 
        h.id === habit.id ? { ...h, completed: !h.completed } : h
      ));
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await deleteDoc(doc(db, 'habits', habitId));
      setHabits(habits.filter(h => h.id !== habitId));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Habit Tracker</Text>
      </View>
      <ScrollView style={styles.content}>
        {habits.length === 0 ? (
          <Text style={styles.subtitle}>Your habits will appear here</Text>
        ) : (
          habits.map(habit => (
            <View key={habit.id} style={styles.habitItem}>
              <TouchableOpacity 
                style={styles.habitContent}
                onPress={() => handleToggleHabit(habit)}
              >
                <View style={[styles.checkbox, habit.completed && styles.checked]} />
                <Text style={[styles.habitText, habit.completed && styles.completedText]}>
                  {habit.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteHabit(habit.id)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      {showForm ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Enter new habit"
            value={newHabit}
            onChangeText={setNewHabit}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={() => setShowForm(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.addButton]} 
              onPress={handleAddHabit}
            >
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.addButton]} 
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.buttonText}>Add New Habit</Text>
        </TouchableOpacity>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    margin: 10,
    alignItems: 'center',
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
    fontWeight: '600',
  },
  form: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  habitItem: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 10,
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  habitText: {
    fontSize: 16,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
