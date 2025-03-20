import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '../firebase';
import Markdown from 'react-native-markdown-display';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export default function BigAshScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [habits, setHabits] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const scrollViewRef = useRef();

  // Load user's habits and profile
  useEffect(() => {
    loadUserData();

    // Cleanup function to clear messages when screen unmounts
    return () => {
      setMessages([]);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No user logged in');
        return;
      }

      console.log('Loading data for user:', currentUser.email);
      
      // Load habits
      const habitsRef = collection(db, 'habits');
      const habitsQuery = query(habitsRef, where('userId', '==', currentUser.uid));
      const habitsSnapshot = await getDocs(habitsQuery);
      console.log('Found habits:', habitsSnapshot.docs.length);
      setHabits(habitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Load user profile
      const userRef = collection(db, 'users');
      const userQuery = query(userRef, where('id', '==', currentUser.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        console.log('Found user profile:', userData);
        setUserProfile(userData);
        
        // Generate welcome message after loading user data
        const welcomeMessage = generateWelcomeMessage(userData, habitsSnapshot.docs);
        setMessages([{ text: welcomeMessage, isUser: false }]);
      } else {
        console.log('No user profile found, creating one...');
        // Create a new user profile if it doesn't exist
        const newUserProfile = {
          id: currentUser.uid,
          email: currentUser.email,
          firstName: '',
          age: '',
          createdAt: new Date().toISOString()
        };
        await addDoc(userRef, newUserProfile);
        setUserProfile(newUserProfile);
        
        // Welcome message for new users
        const welcomeMessage = generateWelcomeMessage(newUserProfile, []);
        setMessages([{ text: welcomeMessage, isUser: false }]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      Alert.alert(
        'Error',
        'Failed to load user data. Please try again later.'
      );
    }
  };

  const generateWelcomeMessage = (userData, habitDocs) => {
    console.log('Generating welcome message with user data:', userData);
    const name = userData.firstName || 'there';
    console.log('Using name:', name);
    
    const habitsList = habitDocs.map(doc => doc.data());
    const completedHabits = habitsList.filter(h => h.completed).length;
    const totalHabits = habitsList.length;

    if (totalHabits === 0) {
      return `Hi ${name}! I'm Coach Ash, and I'm here to help you build and maintain great habits. I see you haven't set up any habits yet. Would you like to start by creating your first habit?`;
    }

    if (completedHabits === 0) {
      return `Welcome back, ${name}! I see you have ${totalHabits} habit${totalHabits > 1 ? 's' : ''} set up. Ready to start marking some as complete? I'm here to support you!`;
    }

    if (completedHabits === totalHabits) {
      return `Amazing work, ${name}! 🎉 You've completed all ${totalHabits} of your habits today. That's incredible dedication! Is there anything specific you'd like to discuss about your progress?`;
    }

    return `Welcome back, ${name}! You're making great progress - you've completed ${completedHabits} out of ${totalHabits} habits today. Keep up the great work! How can I help you stay on track?`;
  };

  const generateCoachResponse = async (userMessage) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Gemini API key is missing');
        return "I apologize, but I'm having trouble connecting to my AI model right now. Please try again later.";
      }

      console.log('Initializing Gemini with API key:', apiKey ? 'Present' : 'Missing');
      
      // Create context about the user and their habits
      const habitsContext = habits.length > 0 
        ? `Current habits: ${habits.map(h => `${h.name} (${h.completed ? 'completed' : 'not completed'})`).join(', ')}`
        : 'No habits set yet';

      const userContext = userProfile?.firstName 
        ? `User's name is ${userProfile.firstName}.`
        : '';

      // Create chat history context
      const chatHistory = messages.map(msg => 
        `${msg.isUser ? 'User' : 'Coach Ash'}: ${msg.text}`
      ).join('\n');

      const prompt = `You are Coach Ash, a friendly and supportive AI coach. ${userContext} The user's ${habitsContext}.

Previous conversation:
${chatHistory}

User's latest message: "${userMessage}"

Respond to the user's message in a supportive and encouraging way. Keep responses concise and focused on helping them achieve their goals. Always format your response in markdown for better readability. Use:
- **Bold** for emphasis
- Bullet points for lists
- Line breaks between sections
- Emojis sparingly and appropriately
- Code blocks for any technical content
- Headers (##) for main sections if needed

Make your response visually appealing and easy to read.`;

      console.log('Sending prompt to Gemini:', prompt);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Received response from Gemini:', text);
      return text;
    } catch (error) {
      console.error('Detailed error in generateCoachResponse:', error);
      return "I apologize, but I'm having trouble processing your message right now. Please try again later.";
    }
  };

  const handleSend = async () => {
    if (message.trim()) {
      const userMessage = { text: message, isUser: true };
      setMessages(prev => [...prev, userMessage]);
      setMessage('');
      
      // Generate and add coach's response
      const coachResponse = await generateCoachResponse(message);
      setMessages(prev => [...prev, { text: coachResponse, isUser: false }]);
      
      // Scroll to bottom after messages are added
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>Clear Chat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.chatContainer}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((chat, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageContainer,
                  chat.isUser ? styles.userMessage : styles.coachMessage
                ]}
              >
                <Markdown 
                  style={[
                    styles.messageText,
                    chat.isUser ? styles.userMessageText : styles.coachMessageText
                  ]}
                >
                  {chat.text}
                </Markdown>
              </View>
            ))}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Coach Ash is thinking...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          blurOnSubmit={true}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          onKeyPress={(e) => {
            if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={24} color={message.trim() ? "#007AFF" : "#999"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  headerSpacer: {
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 12,
    borderRadius: 15,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  coachMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#fff',
  },
  coachMessageText: {
    color: '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    alignSelf: 'flex-start',
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}); 