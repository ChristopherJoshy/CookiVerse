// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    where,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    initializeFirestore,
    enableIndexedDbPersistence,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1QrF1620Ox_yQE5W3kJOTIaC3fyHXx-I",
    authDomain: "cookiverse-1cb11.firebaseapp.com",
    projectId: "cookiverse-1cb11",
    storageBucket: "cookiverse-1cb11.firebasestorage.app",
    appId: "1:425145384421:web:06453b55bfae908994c30c"
};

// Initialize Firebase
console.log('Initializing Firebase with config:', firebaseConfig);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Firestore settings
const firestoreSettings = {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
    cacheSizeBytes: 50 * 1024 * 1024, // 50 MB cache
    ignoreUndefinedProperties: true,
    merge: true
};

let db;
try {
    // Initialize Firestore with settings
    db = initializeFirestore(app, firestoreSettings);
    
    // Enable offline persistence
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

    // Add connection state listener
    onSnapshot(db, (snapshot) => {
        console.log('Firestore connection state:', snapshot.metadata.fromCache ? 'offline' : 'online');
    });

    console.log('Firestore initialized with settings:', firestoreSettings);
} catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
}

const provider = new GoogleAuthProvider();

// Configure Google Auth Provider
provider.addScope('email');
provider.addScope('profile');

console.log('Firebase initialized successfully');

// Authentication functions
export const signInWithGoogle = () => {
    console.log('signInWithGoogle called');
    try {
        signInWithRedirect(auth, provider);
        console.log('signInWithRedirect executed');
    } catch (error) {
        console.error('Error in signInWithGoogle:', error);
        throw error;
    }
};

export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            const user = result.user;
            console.log('User signed in:', user.displayName);
            return user;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

export const signOutUser = async () => {
    try {
        await signOut(auth);
        console.log('User signed out');
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
};

export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Firestore functions
export const saveRecipe = async (recipeData) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to save recipes');
        }

        const docRef = await addDoc(collection(db, 'recipes'), {
            ...recipeData,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL,
            createdAt: serverTimestamp(),
            isPublic: true
        });
        
        console.log('Recipe saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving recipe:', error);
        throw error;
    }
};

export const getPublicRecipes = async (limit = 20) => {
    try {
        const q = query(
            collection(db, 'recipes'), 
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc')
            // Note: limit(limit) can be added here if needed
        );
        
        const querySnapshot = await getDocs(q);
        const recipes = [];
        
        querySnapshot.forEach((doc) => {
            recipes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return recipes;
    } catch (error) {
        console.error('Error getting recipes:', error);
        throw error;
    }
};

export const getUserRecipes = async (userId) => {
    try {
        const q = query(
            collection(db, 'recipes'), 
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const recipes = [];
        
        querySnapshot.forEach((doc) => {
            recipes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return recipes;
    } catch (error) {
        console.error('Error getting user recipes:', error);
        throw error;
    }
};

export const saveBookmark = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to bookmark recipes');
        }

        await setDoc(doc(db, 'bookmarks', `${user.uid}_${recipeId}`), {
            userId: user.uid,
            recipeId: recipeId,
            createdAt: serverTimestamp()
        });
        
        console.log('Recipe bookmarked');
    } catch (error) {
        console.error('Error bookmarking recipe:', error);
        throw error;
    }
};

export const removeBookmark = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to remove bookmarks');
        }

        await deleteDoc(doc(db, 'bookmarks', `${user.uid}_${recipeId}`));
        console.log('Bookmark removed');
    } catch (error) {
        console.error('Error removing bookmark:', error);
        throw error;
    }
};

export const getUserBookmarksWithRecipes = async (userId) => {
    try {
        const bookmarksQuery = query(
            collection(db, 'bookmarks'),
            where('userId', '==', userId)
        );
        
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        const bookmarkedRecipeIds = [];
        
        bookmarksSnapshot.forEach((doc) => {
            bookmarkedRecipeIds.push(doc.data().recipeId);
        });
        
        if (bookmarkedRecipeIds.length === 0) {
            return [];
        }

        // Get all bookmarked recipes
        const recipesQuery = query(collection(db, 'recipes'));
        const recipesSnapshot = await getDocs(recipesQuery);
        const bookmarkedRecipes = [];
        
        recipesSnapshot.forEach((doc) => {
            if (bookmarkedRecipeIds.includes(doc.id)) {
                bookmarkedRecipes.push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        });
        
        return bookmarkedRecipes;
    } catch (error) {
        console.error('Error getting bookmarked recipes:', error);
        throw error;
    }
};

export const isRecipeBookmarked = async (recipeId) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            return false;
        }

        const bookmarkDoc = doc(db, 'bookmarks', `${user.uid}_${recipeId}`);
        const bookmarkSnapshot = await getDocs(query(collection(db, 'bookmarks'), where('userId', '==', user.uid), where('recipeId', '==', recipeId)));
        
        return !bookmarkSnapshot.empty;
    } catch (error) {
        console.error('Error checking bookmark status:', error);
        return false;
    }
};

// Export Firebase instances
export { 
    app,
    auth,
    db,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
};
