// Fallback authentication system for development
// This simulates Google authentication without requiring Firebase setup

let currentUser = null;
let isAuthenticated = false;

// Mock user data
const mockUser = {
    uid: 'demo-user-123',
    displayName: 'Demo User',
    email: 'demo@cookiverse.com',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};

// Mock authentication functions
export const signInWithGoogle = () => {
    console.log('Using fallback authentication - simulating Google sign-in');
    
    // Simulate authentication delay
    setTimeout(() => {
        currentUser = mockUser;
        isAuthenticated = true;
        
        // Trigger auth state change
        if (window.authStateChangeCallback) {
            window.authStateChangeCallback(currentUser);
        }
        
        console.log('Mock authentication successful');
    }, 1000);
};

export const signOutUser = async () => {
    console.log('Signing out mock user');
    currentUser = null;
    isAuthenticated = false;
    
    if (window.authStateChangeCallback) {
        window.authStateChangeCallback(null);
    }
};

export const onAuthStateChange = (callback) => {
    console.log('Setting up auth state change listener');
    window.authStateChangeCallback = callback;
    
    // Initially call with null (not authenticated)
    callback(currentUser);
    
    return () => {
        window.authStateChangeCallback = null;
    };
};

export const handleRedirectResult = async () => {
    // No redirect handling needed for fallback
    return null;
};

// Mock Firestore functions
export const saveRecipe = async (recipeData) => {
    if (!isAuthenticated) {
        throw new Error('User must be authenticated to save recipes');
    }
    
    const recipeId = 'recipe-' + Date.now();
    const fullRecipe = {
        id: recipeId,
        ...recipeData,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorPhoto: currentUser.photoURL,
        createdAt: new Date(),
        isPublic: true
    };
    
    // Store in localStorage for demo
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    recipes.unshift(fullRecipe);
    localStorage.setItem('cookiverse-recipes', JSON.stringify(recipes));
    
    console.log('Recipe saved to localStorage:', recipeId);
    return recipeId;
};

export const getPublicRecipes = async () => {
    // Get from localStorage
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    
    // Add some sample recipes if none exist
    if (recipes.length === 0) {
        const sampleRecipes = [
            {
                id: 'sample-1',
                title: 'Classic Pasta Carbonara',
                ingredients: ['Pasta', 'Eggs', 'Bacon', 'Parmesan Cheese', 'Black Pepper'],
                instructions: ['Boil pasta', 'Cook bacon', 'Mix eggs and cheese', 'Combine all ingredients'],
                cookTime: '20 minutes',
                tags: ['Italian', 'Quick', 'Classic'],
                authorName: 'Chef Mario',
                authorId: 'chef-mario',
                authorPhoto: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91d?w=150&h=150&fit=crop&crop=face',
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                isPublic: true
            },
            {
                id: 'sample-2',
                title: 'Healthy Buddha Bowl',
                ingredients: ['Quinoa', 'Avocado', 'Sweet Potato', 'Chickpeas', 'Spinach', 'Tahini'],
                instructions: ['Cook quinoa', 'Roast sweet potato', 'Prepare vegetables', 'Make tahini dressing', 'Assemble bowl'],
                cookTime: '35 minutes',
                tags: ['Healthy', 'Vegan', 'Bowl'],
                authorName: 'Wellness Guru',
                authorId: 'wellness-guru',
                authorPhoto: 'https://images.unsplash.com/photo-1494790108755-2616b612b15c?w=150&h=150&fit=crop&crop=face',
                createdAt: new Date(Date.now() - 172800000), // 2 days ago
                isPublic: true
            }
        ];
        
        localStorage.setItem('cookiverse-recipes', JSON.stringify(sampleRecipes));
        return sampleRecipes;
    }
    
    return recipes;
};

export const getUserRecipes = async (userId) => {
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    return recipes.filter(recipe => recipe.authorId === userId);
};

export const saveBookmark = async (recipeId) => {
    if (!isAuthenticated) {
        throw new Error('User must be authenticated to bookmark recipes');
    }
    
    const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
    const bookmarkId = `${currentUser.uid}_${recipeId}`;
    
    if (!bookmarks.find(b => b.id === bookmarkId)) {
        bookmarks.push({
            id: bookmarkId,
            userId: currentUser.uid,
            recipeId: recipeId,
            createdAt: new Date()
        });
        localStorage.setItem('cookiverse-bookmarks', JSON.stringify(bookmarks));
    }
};

export const removeBookmark = async (recipeId) => {
    if (!isAuthenticated) {
        throw new Error('User must be authenticated to remove bookmarks');
    }
    
    const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
    const bookmarkId = `${currentUser.uid}_${recipeId}`;
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    localStorage.setItem('cookiverse-bookmarks', JSON.stringify(filtered));
};

export const getUserBookmarksWithRecipes = async (userId) => {
    const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
    const recipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
    
    const userBookmarks = bookmarks.filter(b => b.userId === userId);
    const bookmarkedRecipes = recipes.filter(recipe => 
        userBookmarks.some(bookmark => bookmark.recipeId === recipe.id)
    );
    
    return bookmarkedRecipes;
};

export const isRecipeBookmarked = async (recipeId) => {
    if (!isAuthenticated) return false;
    
    const bookmarks = JSON.parse(localStorage.getItem('cookiverse-bookmarks') || '[]');
    const bookmarkId = `${currentUser.uid}_${recipeId}`;
    return bookmarks.some(b => b.id === bookmarkId);
};

// Mock auth and db exports
export const auth = { currentUser };
export const db = {};

console.log('Fallback authentication system loaded');