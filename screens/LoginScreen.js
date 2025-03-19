import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup } = useAuth();

  const handleEmailChange = (text) => {
    console.log('Email change:', text);
    setEmail(text);
  };

  const handlePasswordChange = (text) => {
    console.log('Password change:', text);
    setPassword(text);
  };

  async function handleSubmit() {
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert(error.message);
      } else {
        Alert.alert(
          'Error',
          error.message
        );
      }
    }
  }

  const content = (
    <View style={styles.innerContainer}>
      <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>
      
      <TextInput
        style={[styles.input, Platform.OS === 'web' && styles.webInput]}
        placeholder="Email"
        value={email}
        onChangeText={handleEmailChange}
        onChange={e => Platform.OS === 'web' && handleEmailChange(e.target.value)}
        autoCapitalize="none"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
      />
      
      <TextInput
        style={[styles.input, Platform.OS === 'web' && styles.webInput]}
        placeholder="Password"
        value={password}
        onChangeText={handlePasswordChange}
        onChange={e => Platform.OS === 'web' && handlePasswordChange(e.target.value)}
        secureTextEntry
        autoComplete="current-password"
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.switchButton}
        onPress={() => setIsLogin(!isLogin)}
      >
        <Text style={styles.switchButtonText}>
          {isLogin 
            ? "Don't have an account? Sign Up" 
            : "Already have an account? Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {content}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {content}
      </TouchableWithoutFeedback>
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  webInput: {
    outlineStyle: 'none',
    cursor: 'text',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
}); 