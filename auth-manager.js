// Authentication manager with Firebase fallback to demo mode
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
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
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let isFirebaseMode = false;
let auth, db, provider;

// Mock user for demo mode
const demoUser = {
    uid: 'demo-user-123',
    displayName: 'Demo Chef',
    email: 'demo@cookiverse.com',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};

// Initialize Firebase or demo mode
try {
    const firebaseConfig = {
        apiKey: "AIzaSyB1QrF1620Ox_yQE5W3kJOTIaC3fyHXx-I",
        authDomain: "cookiverse-1cb11.firebaseapp.com",
        projectId: "cookiverse-1cb11",
        storageBucket: "cookiverse-1cb11.firebasestorage.app",
        appId: "1:425145384421:web:06453b55bfae908994c30c"
    };
    
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    isFirebaseMode = true;
    console.log('Firebase authentication initialized');
    
} catch (error) {
    console.warn('Firebase initialization failed, using demo mode:', error);
    isFirebaseMode = false;
}

// Demo mode storage
let demoCurrentUser = null;
let authStateCallback = null;

// Sample recipes for demo mode
const sampleRecipes = [
    {
        id: 'sample-1',
        title: 'Classic Pasta Carbonara',
        ingredients: ['400g Spaghetti', '200g Pancetta', '4 Large Eggs', '100g Pecorino Romano', 'Black Pepper', 'Salt'],
        instructions: [
            'Bring a large pot of salted water to boil and cook spaghetti until al dente',
            'While pasta cooks, cut pancetta into small cubes and cook in a large pan until crispy',
            'In a bowl, whisk together eggs, grated cheese, and plenty of black pepper',
            'Drain pasta, reserving 1 cup of pasta water',
            'Add hot pasta to the pan with pancetta',
            'Remove from heat and quickly stir in egg mixture, adding pasta water to create a creamy sauce'
        ],
        cookTime: '20 minutes',
        tags: ['Italian', 'Quick', 'Classic', 'Pasta'],
        authorName: 'Chef Marco',
        authorId: 'chef-marco',
        authorPhoto: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91d?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(Date.now() - 86400000),
        isPublic: true
    },
    {
        id: 'sample-2',
        title: 'Healthy Buddha Bowl',
        ingredients: ['1 cup Quinoa', '1 Avocado', '2 Sweet Potatoes', '1 can Chickpeas', '2 cups Spinach', '3 tbsp Tahini', 'Lemon juice', 'Olive oil'],
        instructions: [
            'Preheat oven to 400°F and cook quinoa according to package instructions',
            'Cut sweet potatoes into cubes and roast for 25 minutes',
            'Drain and rinse chickpeas, then roast with sweet potatoes for last 10 minutes',
            'Make tahini dressing by mixing tahini, lemon juice, and olive oil',
            'Massage spinach with a little olive oil and lemon',
            'Assemble bowl with quinoa base, roasted vegetables, spinach, and sliced avocado',
            'Drizzle with tahini dressing and enjoy'
        ],
        cookTime: '35 minutes',
        tags: ['Healthy', 'Vegan', 'Bowl', 'Nutritious'],
        authorName: 'Wellness Sarah',
        authorId: 'wellness-sarah',
        authorPhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b15c?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(Date.now() - 172800000),
        isPublic: true
    },
    {
        id: 'sample-3',
        title: 'Spicy Thai Basil Chicken',
        ingredients: ['500g Ground Chicken', '3 Thai Chilies', '4 Garlic Cloves', '1 Onion', 'Thai Basil', 'Fish Sauce', 'Oyster Sauce', 'Jasmine Rice'],
        instructions: [
            'Cook jasmine rice according to package instructions',
            'Mince garlic and chilies, slice onion thinly',
            'Heat oil in wok over high heat',
            'Add garlic and chilies, stir-fry for 30 seconds',
            'Add ground chicken, breaking it up as it cooks',
            'Add onion, fish sauce, and oyster sauce',
            'Stir in fresh Thai basil just before serving',
            'Serve over rice with fried egg on top'
        ],
        cookTime: '15 minutes',
        tags: ['Thai', 'Spicy', 'Quick', 'Asian'],
        authorName: 'Chef Niran',
        authorId: 'chef-niran',
        authorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        createdAt: new Date(Date.now() - 259200000),
        isPublic: true
    }
];

// Initialize demo data
if (!isFirebaseMode) {
    if (!localStorage.getItem('cookiverse-recipes')) {
        localStorage.setItem('cookiverse-recipes', JSON.stringify(sampleRecipes));
    }
}

// Authentication functions
export const signInWithGoogle = async () => {
    if (isFirebaseMode) {
        try {
            // Set persistence to LOCAL to keep user logged in
            await setPersistence(auth, browserLocalPersistence);
            
            // Configure Google provider with additional scopes
            provider.setCustomParameters({
                prompt: 'select_account',
                access_type: 'offline'
            });
            
            // Add additional scopes for better profile information
            provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
            
            // Use signInWithPopup instead of redirect for better control
            const result = await signInWithPopup(auth, provider);
            console.log('Sign in successful:', result.user.displayName);
            return result.user;
        } catch (error) {
            console.error('Firebase auth error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    
    if (!isFirebaseMode) {
        console.log('Demo mode: Simulating Google sign-in');
        return new Promise((resolve) => {
            setTimeout(() => {
                demoCurrentUser = demoUser;
                if (authStateCallback) {
                    authStateCallback(demoUser);
                }
                resolve(demoUser);
            }, 1000);
        });
    }
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
    const errorMessages = {
        'auth/popup-blocked': 'The sign-in popup was blocked by your browser. Please allow popups for this site.',
        'auth/popup-closed-by-user': 'The sign-in popup was closed before completing the sign-in process.',
        'auth/cancelled-popup-request': 'The sign-in popup was cancelled.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/too-many-requests': 'Too many sign-in attempts. Please try again later.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/account-exists-with-different-credential': 'An account already exists with the same email address but different sign-in credentials.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled. Please contact support.',
        'auth/operation-not-supported-in-this-environment': 'Google sign-in is not supported in this environment.',
        'auth/unauthorized-domain': 'This domain is not authorized for Google sign-in.'
    };
    
    return errorMessages[errorCode] || 'An error occurred during sign-in. Please try again.';
};

export const handleRedirectResult = async () => {
    if (isFirebaseMode) {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                // Get additional user profile information
                const user = result.user;
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                
                // Store additional user data in Firestore
                if (user) {
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, {
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        lastLogin: serverTimestamp(),
                        providerId: user.providerData[0].providerId,
                        isNewUser: result.additionalUserInfo?.isNewUser || false
                    }, { merge: true });
                }
                
                return user;
            }
        } catch (error) {
            console.error('Firebase redirect error:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    return null;
};

export const signOutUser = async () => {
    if (isFirebaseMode && auth.currentUser) {
        await signOut(auth);
    } else {
        demoCurrentUser = null;
        if (authStateCallback) {
            authStateCallback(null);
        }
    }
};

export const onAuthStateChange = (callback) => {
    authStateCallback = callback;
    
    if (isFirebaseMode) {
        return onAuthStateChanged(auth, callback);
    } else {
        // For demo mode, call immediately with current state
        callback(demoCurrentUser);
        return () => {
            authStateCallback = null;
        };
    }
};

// Firestore functions with localStorage fallback
export const saveRecipe = async (recipeData) => {
    const user = auth.currentUser;
    const authorData = user ? {
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL
    } : {
        authorId: 'anonymous',
        authorName: 'AI Chef',
        authorPhoto: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=150&h=150&fit=crop&crop=face'
    };

    const fullRecipeData = {
        ...recipeData,
        ...authorData,
        createdAt: serverTimestamp(),
        isPublic: true
    };

    if (isFirebaseMode) {
        try {
            const docRef = await addDoc(collection(db, 'recipes'), fullRecipeData);
            console.log('Recipe saved to Firebase with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error saving recipe to Firebase:', error);
            throw new Error('Could not save recipe to the cloud.');
        }
    } else {
        const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
        const newRecipe = { ...fullRecipeData, id: `demo-${Date.now()}` };
        recipes.unshift(newRecipe);
        localStorage.setItem('cookiverse-recipes', JSON.stringify(recipes));
        console.log('Recipe saved to demo storage with ID:', newRecipe.id);
        return newRecipe.id;
    }
};

export const getPublicRecipes = async () => {
    if (isFirebaseMode) {
        try {
            const q = query(
                collection(db, 'recipes'), 
                where('isPublic', '==', true),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const recipes = [];
            querySnapshot.forEach((doc) => {
                recipes.push({ id: doc.id, ...doc.data() });
            });
            return recipes;
        } catch (error) {
            console.error('Firebase error, using local storage:', error);
        }
    }
    
    return JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
};

export const getUserRecipes = async (userId) => {
    if (isFirebaseMode) {
        try {
            const q = query(
                collection(db, 'recipes'), 
                where('authorId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const recipes = [];
            querySnapshot.forEach((doc) => {
                recipes.push({ id: doc.id, ...doc.data() });
            });
            return recipes;
        } catch (error) {
            console.error('Firebase error:', error);
        }
    }
    
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    return recipes.filter(recipe => recipe.authorId === userId);
};

export const saveBookmark = async (recipeId) => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) {
        throw new Error('User must be authenticated to bookmark recipes');
    }

    if (isFirebaseMode) {
        await setDoc(doc(db, 'bookmarks', `${user.uid}_${recipeId}`), {
            userId: user.uid,
            recipeId: recipeId,
            createdAt: serverTimestamp()
        });
    } else {
        const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
        const bookmarkId = `${user.uid}_${recipeId}`;
        if (!bookmarks.find(b => b.id === bookmarkId)) {
            bookmarks.push({
                id: bookmarkId,
                userId: user.uid,
                recipeId: recipeId,
                createdAt: new Date()
            });
            localStorage.setItem('cookiverse-bookmarks', JSON.stringify(bookmarks));
        }
    }
};

export const removeBookmark = async (recipeId) => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) {
        throw new Error('User must be authenticated to remove bookmarks');
    }

    if (isFirebaseMode) {
        await deleteDoc(doc(db, 'bookmarks', `${user.uid}_${recipeId}`));
    } else {
        const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
        const bookmarkId = `${user.uid}_${recipeId}`;
        const filtered = bookmarks.filter(b => b.id !== bookmarkId);
        localStorage.setItem('cookiverse-bookmarks', JSON.stringify(filtered));
    }
};

export const getUserBookmarksWithRecipes = async () => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) {
        throw new Error('User must be authenticated to view bookmarks');
    }
    
    if (isFirebaseMode) {
        try {
            const bookmarksQuery = query(
                collection(db, 'bookmarks'),
                where('userId', '==', user.uid)
            );
            const bookmarksSnapshot = await getDocs(bookmarksQuery);
            const bookmarkedRecipeIds = [];
            bookmarksSnapshot.forEach((doc) => {
                const bookmarkData = doc.data();
                if (bookmarkData && bookmarkData.recipeId) {
                    bookmarkedRecipeIds.push(bookmarkData.recipeId);
                }
            });
            
            if (bookmarkedRecipeIds.length === 0) return [];

            // Fetch recipes directly using their IDs for better accuracy
            const bookmarkedRecipes = [];
            for (const recipeId of bookmarkedRecipeIds) {
                try {
                    const recipeDoc = doc(db, 'recipes', recipeId);
                    const recipeSnap = await getDoc(recipeDoc);
                    if (recipeSnap.exists()) {
                        bookmarkedRecipes.push({ 
                            id: recipeSnap.id, 
                            ...recipeSnap.data(),
                            isBookmarked: true  // Mark as bookmarked for UI
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching recipe with ID ${recipeId}:`, err);
                }
            }
            
            return bookmarkedRecipes;
        } catch (error) {
            console.error('Firebase error when fetching bookmarks:', error);
            throw new Error('Failed to fetch your bookmarked recipes.');
        }
    }
    
    // Demo mode
    const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    const userBookmarks = bookmarks.filter(b => b.userId === user.uid);
    return recipes.filter(recipe => 
        userBookmarks.some(bookmark => bookmark.recipeId === recipe.id)
    ).map(recipe => ({
        ...recipe,
        isBookmarked: true  // Mark as bookmarked for UI
    }));
};

export const isRecipeBookmarked = async (recipeId) => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) return false;

    if (isFirebaseMode) {
        try {
            const bookmarkQuery = query(
                collection(db, 'bookmarks'), 
                where('userId', '==', user.uid), 
                where('recipeId', '==', recipeId)
            );
            const bookmarkSnapshot = await getDocs(bookmarkQuery);
            return !bookmarkSnapshot.empty;
        } catch (error) {
            console.error('Firebase error checking bookmark status:', error);
            return false;
        }
    } else {
        const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
        return bookmarks.some(b => b.userId === user.uid && b.recipeId === recipeId);
    }
};

export const updateRecipe = async (recipeId, recipeData) => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) {
        throw new Error('User must be authenticated to update recipes');
    }

    if (isFirebaseMode) {
        try {
            const recipeRef = doc(db, 'recipes', recipeId);
            
            // Get current recipe data to check ownership
            const recipeSnap = await getDoc(recipeRef);
            if (!recipeSnap.exists()) {
                throw new Error('Recipe not found');
            }
            
            const recipeData = recipeSnap.data();
            if (recipeData.authorId !== user.uid) {
                throw new Error('You are not authorized to edit this recipe');
            }
            
            // Update with timestamp
            const updatedRecipe = {
                ...recipeData,
                updatedAt: serverTimestamp(),
            };
            
            await setDoc(recipeRef, updatedRecipe, { merge: true });
            console.log('Recipe updated in Firebase with ID:', recipeId);
            return recipeId;
        } catch (error) {
            console.error('Error updating recipe in Firebase:', error);
            throw new Error('Could not update recipe in the cloud: ' + error.message);
        }
    } else {
        const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
        const recipeIndex = recipes.findIndex(r => r.id === recipeId);
        if (recipeIndex > -1) {
            // Ensure the user is the author
            if (recipes[recipeIndex].authorId !== user.uid) {
                throw new Error('You are not authorized to edit this recipe');
            }
            
            recipes[recipeIndex] = { 
                ...recipes[recipeIndex], 
                ...recipeData,
                updatedAt: new Date() 
            };
            localStorage.setItem('cookiverse-recipes', JSON.stringify(recipes));
            console.log('Recipe updated in demo storage with ID:', recipeId);
            return recipeId;
        } else {
            throw new Error('Recipe not found');
        }
    }
};

export const deleteRecipe = async (recipeId) => {
    const user = isFirebaseMode ? auth.currentUser : demoCurrentUser;
    if (!user) {
        throw new Error('User must be authenticated to delete recipes');
    }

    if (isFirebaseMode) {
        try {
            // First check if the user is authorized to delete the recipe
            const recipeRef = doc(db, 'recipes', recipeId);
            const recipeSnap = await getDoc(recipeRef);
            
            if (!recipeSnap.exists()) {
                throw new Error('Recipe not found');
            }
            
            const recipeData = recipeSnap.data();
            if (recipeData.authorId !== user.uid) {
                throw new Error('You are not authorized to delete this recipe');
            }
            
            // Delete the recipe
            await deleteDoc(recipeRef);
            
            // Also delete any bookmarks for this recipe
            const bookmarksQuery = query(
                collection(db, 'bookmarks'), 
                where('recipeId', '==', recipeId)
            );
            const bookmarksSnapshot = await getDocs(bookmarksQuery);
            
            const deletePromises = [];
            bookmarksSnapshot.forEach((bookmarkDoc) => {
                deletePromises.push(deleteDoc(doc(db, 'bookmarks', bookmarkDoc.id)));
            });
            
            await Promise.all(deletePromises);
            
            console.log('Recipe and related bookmarks deleted from Firebase with ID:', recipeId);
        } catch (error) {
            console.error('Error deleting recipe from Firebase:', error);
            throw new Error('Could not delete recipe from the cloud: ' + error.message);
        }
    } else {
        // Demo mode
        let recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
        const recipeIndex = recipes.findIndex(r => r.id === recipeId);
        
        if (recipeIndex === -1) {
            throw new Error('Recipe not found');
        }
        
        if (recipes[recipeIndex].authorId !== user.uid) {
            throw new Error('You are not authorized to delete this recipe');
        }
        
        recipes = recipes.filter(r => r.id !== recipeId);
        localStorage.setItem('cookiverse-recipes', JSON.stringify(recipes));
        
        // Delete any bookmarks for this recipe
        let bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
        bookmarks = bookmarks.filter(b => b.recipeId !== recipeId);
        localStorage.setItem('cookiverse-bookmarks', JSON.stringify(bookmarks));
        
        console.log('Recipe and related bookmarks deleted from demo storage with ID:', recipeId);
    }
};

// Export auth and db for compatibility
export const auth_obj = auth;
export const db_obj = db;

console.log(`Authentication system initialized: ${isFirebaseMode ? 'Firebase' : 'Demo'} mode`);