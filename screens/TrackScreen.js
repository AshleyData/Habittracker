import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export default function TrackScreen() {
  const [habits, setHabits] = useState([]);
  const { currentUser } = useAuth();

  const calculateStreak = (completionDates) => {
    if (!completionDates || completionDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = today;
    
    // Convert completion dates from timestamps to Date objects and sort them
    const dates = completionDates
      .map(date => {
        const d = new Date(date.toDate());
        d.setHours(0, 0, 0, 0);
        return d;
      })
      .sort((a, b) => b - a); // Sort in descending order
    
    // Check if the habit was completed today
    const wasCompletedToday = dates.some(date => date.getTime() === today.getTime());
    if (!wasCompletedToday) return 0;
    
    // Calculate streak
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      if (dates.some(date => date.getTime() === expectedDate.getTime())) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const loadHabits = async () => {
    try {
      const habitsRef = collection(db, 'habits');
      const q = query(habitsRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const habitsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        streak: calculateStreak(doc.data().completionDates || [])
      }));
      setHabits(habitsList);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  // Load habits when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadCurrentHabits = async () => {
        try {
          const habitsRef = collection(db, 'habits');
          const q = query(habitsRef, where('userId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          if (!isActive) return;
          
          const habitsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            streak: calculateStreak(doc.data().completionDates || [])
          }));
          setHabits(habitsList);
        } catch (error) {
          console.error('Error loading habits:', error);
        }
      };

      loadCurrentHabits();

      return () => {
        isActive = false;
      };
    }, [currentUser])
  );

  const handleToggleHabit = async (habit) => {
    try {
      const habitRef = doc(db, 'habits', habit.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let newCompletionDates = [...(habit.completionDates || [])];
      
      if (!habit.completed) {
        // Add today's date if completing the habit
        newCompletionDates.push(today);
      } else {
        // Remove today's date if uncompleting the habit
        newCompletionDates = newCompletionDates.filter(date => {
          const d = new Date(date.toDate());
          d.setHours(0, 0, 0, 0);
          return d.getTime() !== today.getTime();
        });
      }

      // Update Firestore first
      await updateDoc(habitRef, {
        completed: !habit.completed,
        completionDates: newCompletionDates
      });
      
      // Then update local state immediately
      const newStreak = calculateStreak(newCompletionDates);
      setHabits(prevHabits => 
        prevHabits.map(h => 
          h.id === habit.id 
            ? { 
                ...h, 
                completed: !h.completed, 
                completionDates: newCompletionDates,
                streak: newStreak
              } 
            : h
        )
      );
    } catch (error) {
      console.error('Error updating habit:', error);
      // If there's an error, reload habits to ensure consistency
      loadHabits();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Habits</Text>
      <ScrollView style={styles.content}>
        {habits.length === 0 ? (
          <Text style={styles.subtitle}>No habits to track yet</Text>
        ) : (
          habits.map(habit => (
            <TouchableOpacity 
              key={habit.id} 
              style={styles.habitItem}
              onPress={() => handleToggleHabit(habit)}
            >
              <View style={[styles.checkbox, habit.completed && styles.checked]} />
              <View style={styles.habitInfo}>
                <Text style={[styles.habitText, habit.completed && styles.completedText]}>
                  {habit.name}
                </Text>
                {habit.streak > 0 && (
                  <Text style={styles.streakText}>
                    {habit.streak} day{habit.streak !== 1 ? 's' : ''} streak
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
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
  habitInfo: {
    flex: 1,
  },
  habitText: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
}); 