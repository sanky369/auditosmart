import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  organization?: string;
  role?: string;
}

export const signUp = async (
  email: string, 
  password: string, 
  displayName: string,
  organization?: string
): Promise<UserCredential> => {
  try {
    console.log('Starting signup process...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile in Firebase Auth
    if (userCredential.user) {
      console.log('User created in Auth:', userCredential.user.uid);
      await updateProfile(userCredential.user, { 
        displayName: displayName 
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        organization,
        role: 'user',
        createdAt: new Date().toISOString()
      });
      console.log('User document created in Firestore');
    }
    
    return userCredential;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(error.message || 'Failed to create account');
  }
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists() && userCredential.user) {
      const userData = userDoc.data();
      // Update the user profile if needed
      if (userData.displayName && !userCredential.user.displayName) {
        await updateProfile(userCredential.user, {
          displayName: userData.displayName
        });
      }
    }
    
    return userCredential;
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    }
    throw new Error(error.message || 'Failed to sign in');
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};
