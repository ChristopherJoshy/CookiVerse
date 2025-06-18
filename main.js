// Main application logic
import {
    signInWithGoogle,
    handleRedirectResult,
    signOutUser,
    onAuthStateChange,
    saveRecipe,
    updateRecipe,
    deleteRecipe,
    getPublicRecipes,
    getUserRecipes,
    saveBookmark,
    removeBookmark,
    getUserBookmarksWithRecipes,
    isRecipeBookmarked
} from './auth-manager.js';

// Application state
let currentUser = null;
let currentRecipes = [];
let currentView = 'feed'; // 'feed', 'bookmarks', 'myRecipes', 'savedMealPlans'
let selectedRecipe = null;
let isEditing = false;
let feedRefreshInterval = null;
let savedMealPlans = [];

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyCSxpqO4icaYpS48fGNG8sbfdXT9zjMnfk";
const GEMINI_API_URL = '/api/gemini';

// DOM elements
const elements = {
    // Login screen
    loginScreen: document.getElementById('loginScreen'),
    loginScreenBtn: document.getElementById('loginScreenBtn'),
    
    // App container
    appContainer: document.getElementById('appContainer'),
    
    // Navigation
    homeBtn: document.getElementById('homeBtn'),
    bookmarksBtn: document.getElementById('bookmarksBtn'),
    mealPlanBtn: document.getElementById('mealPlanBtn'),
    savedMealPlansBtn: document.getElementById('savedMealPlansBtn'),
    
    // User profile
    profileInfo: document.getElementById('profileInfo'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    
    // Authentication
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    
    // Recipe feed
    feedContainer: document.getElementById('feedContainer'),
    feedTitle: document.getElementById('feedTitle'),
    recipeGrid: document.getElementById('recipeGrid'),
    emptyState: document.getElementById('emptyState'),
    
    // Loading
    loadingSpinner: document.getElementById('loadingSpinner'),
    loadingMessage: document.getElementById('loadingMessage'),
    
    // Recipe generation
    ingredientInputs: document.getElementById('ingredientInputs'),
    addIngredientBtn: document.getElementById('addIngredientBtn'),
    generateRecipeBtn: document.getElementById('generateRecipeBtn'),
    
    // Quick actions
    viewAllRecipesBtn: document.getElementById('viewAllRecipesBtn'),
    myRecipesBtn: document.getElementById('myRecipesBtn'),
    generateMealPlanBtn: document.getElementById('generateMealPlanBtn'),
    shareRecipeBtn: document.getElementById('shareRecipeBtn'),
    
    // Recipe modal
    recipeModal: document.getElementById('recipeModal'),
    modalRecipeTitle: document.getElementById('modalRecipeTitle'),
    modalCookTime: document.getElementById('modalCookTime'),
    modalAuthor: document.getElementById('modalAuthor'),
    modalTags: document.getElementById('modalTags'),
    modalIngredients: document.getElementById('modalIngredients'),
    modalInstructions: document.getElementById('modalInstructions'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    healthifyBtn: document.getElementById('healthifyBtn'),
    saveRecipeBtn: document.getElementById('saveRecipeBtn'),
    editRecipeBtn: document.getElementById('editRecipeBtn'),
    deleteRecipeBtn: document.getElementById('deleteRecipeBtn'),
    
    // Share recipe modal
    shareModal: document.getElementById('shareModal'),
    shareModalTitle: document.getElementById('shareModalTitle'),
    shareRecipeForm: document.getElementById('shareRecipeForm'),
    shareTitle: document.getElementById('shareTitle'),
    shareIngredients: document.getElementById('shareIngredients'),
    shareInstructions: document.getElementById('shareInstructions'),
    shareCookTime: document.getElementById('shareCookTime'),
    shareTags: document.getElementById('shareTags'),
    shareSubmitBtn: document.getElementById('shareSubmitBtn'),
    closeShareModalBtn: document.getElementById('closeShareModalBtn'),
    cancelShareBtn: document.getElementById('cancelShareBtn'),
    
    // Meal plan modal
    mealPlanModal: document.getElementById('mealPlanModal'),
    mealPlanGrid: document.getElementById('mealPlanGrid'),
    closeMealPlanBtn: document.getElementById('closeMealPlanBtn'),
    bookmarkCount: document.getElementById('bookmarkCount')
};

// Animation Helper Functions
const fadeIn = (element, duration = 300) => {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        element.style.opacity = Math.min(progress / duration, 1);
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
};

const fadeOut = (element, duration = 300) => {
    return new Promise(resolve => {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            element.style.opacity = Math.max(1 - (progress / duration), 0);
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                resolve();
            }
        };
        requestAnimationFrame(animate);
    });
};

const slideIn = (element, direction = 'right', duration = 300) => {
    element.style.opacity = 0;
    element.style.transform = direction === 'right' ? 'translateX(20px)' : 'translateX(-20px)';
    element.style.display = 'block';
    
    let start = null;
    const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percent = Math.min(progress / duration, 1);
        
        element.style.opacity = percent;
        element.style.transform = `translateX(${direction === 'right' ? 20 - (percent * 20) : -20 + (percent * 20)}px)`;
        
        if (progress < duration) {
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('CookiVerse application starting...');
    
    // Set up authentication state listener
    onAuthStateChange((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        currentUser = user;
        
        if (user) {
            console.log('User authenticated:', user.displayName);
            // Show main app, hide login screen
            elements.loginScreen.style.display = 'none';
            elements.appContainer.style.display = 'block';
            
            // Update UI with user info
            if (elements.profileInfo) {
                elements.profileInfo.style.display = 'flex';
                
                if (elements.userAvatar) {
                    elements.userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
                }
                
                if (elements.userName) {
                    elements.userName.textContent = user.displayName || 'User';
                }
            }
            
            // Load initial data
            loadRecipeFeed();
            
            // Start automatic feed refresh
            startFeedRefresh();
        } else {
            console.log('User not authenticated');
            // Show login screen, hide main app
            elements.loginScreen.style.display = 'flex';
            elements.appContainer.style.display = 'none';
            
            // Hide user profile info
            if (elements.profileInfo) {
                elements.profileInfo.style.display = 'none';
            }
            
            // Stop feed refresh if running
            stopFeedRefresh();
        }
        
        // Update UI state
        updateUI();
    });
    
    // Handle redirect result from Google sign-in
    try {
        const result = await handleRedirectResult();
        if (result) {
            console.log('Redirect result handled successfully');
        }
    } catch (error) {
        console.error('Authentication redirect error:', error);
        showError('Authentication failed. Please try again.');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Set active navigation
    setActiveNavigation('home');
});

// Set up all event listeners
function setupEventListeners() {
    // Authentication
    elements.loginScreenBtn?.addEventListener('click', handleLogin);
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Navigation
    elements.homeBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.homeBtn);
        switchView('feed');
    });
    elements.bookmarksBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.bookmarksBtn);
        switchView('bookmarks');
    });
    elements.mealPlanBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.mealPlanBtn);
        generateMealPlan();
    });
    elements.savedMealPlansBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.savedMealPlansBtn);
        switchView('savedMealPlans');
    });
    
    // Search
    elements.searchInput?.addEventListener('input', handleSearch);
    
    // Ingredient management
    elements.addIngredientBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.addIngredientBtn);
        addIngredientInput();
    });
    elements.ingredientInputs?.addEventListener('click', handleIngredientInputClick);
    
    // Recipe generation
    elements.generateRecipeBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.generateRecipeBtn);
        generateRecipeFromIngredients();
    });
    
    // Quick actions
    elements.viewAllRecipesBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.viewAllRecipesBtn);
        switchView('feed');
    });
    elements.myRecipesBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.myRecipesBtn);
        switchView('myRecipes');
    });
    elements.generateMealPlanBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.generateMealPlanBtn);
        generateMealPlan();
    });
    
    // Share recipe
    elements.shareRecipeBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.shareRecipeBtn);
        openModal('shareModal');
    });
    elements.shareRecipeForm?.addEventListener('submit', handleShareRecipe);
    
    // Modal controls
    elements.closeModalBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.closeModalBtn);
        closeModal('recipeModal');
    });
    elements.closeShareModalBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.closeShareModalBtn);
        closeModal('shareModal');
    });
    elements.cancelShareBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.cancelShareBtn);
        closeModal('shareModal');
    });
    elements.closeMealPlanBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.closeMealPlanBtn);
        closeModal('mealPlanModal');
    });
    
    // Recipe modal actions
    elements.healthifyBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.healthifyBtn);
        healthifyCurrentRecipe();
    });
    elements.saveRecipeBtn?.addEventListener('click', () => {
        showButtonFeedback(elements.saveRecipeBtn);
        toggleBookmarkCurrentRecipe();
    });
    elements.editRecipeBtn?.addEventListener('click', handleEditRecipe);
    elements.deleteRecipeBtn?.addEventListener('click', handleDeleteRecipe);
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Button feedback function
function showButtonFeedback(button) {
    if (!button) return;
    
    // Add loading state
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    button.disabled = true;
    
    // Remove loading state after a short delay
    setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
    }, 500);
}

// Authentication handlers
async function handleLogin() {
    console.log('Login button clicked');
    try {
        // Show loading state
        const loginBtn = elements.loginScreenBtn || elements.loginBtn;
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        loginBtn.disabled = true;
        
        console.log('Attempting Google sign-in...');
        const user = await signInWithGoogle();
        console.log('Sign-in successful:', user.displayName);
        
        // Update UI immediately since we're using popup
        currentUser = user;
        elements.loginScreen.style.display = 'none';
        elements.appContainer.style.display = 'block';
        elements.userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        elements.userName.textContent = user.displayName || 'User';
        updateUI();
        
        // Load initial data
        await loadRecipeFeed();
        
        // Reset button state
        loginBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
        loginBtn.disabled = false;
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to sign in. Please try again.');
        
        // Reset button state
        const loginBtn = elements.loginScreenBtn || elements.loginBtn;
        loginBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
        loginBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        await signOutUser();
        currentUser = null;
        currentRecipes = [];
        updateUI();
        showEmptyState();
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to sign out. Please try again.');
    }
}

// UI update functions
function updateUI() {
    if (currentUser) {
        // User is logged in
        elements.appContainer.style.display = 'block';
        elements.loginScreen.style.display = 'none';
        elements.loginBtn.style.display = 'none';
        elements.logoutBtn.style.display = 'flex';
        
        // Show user profile info
        if (elements.profileInfo) {
            elements.profileInfo.style.display = 'flex';
            
            // Set user avatar and name
            if (elements.userAvatar) {
                elements.userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';
            }
            
            if (elements.userName) {
                elements.userName.textContent = currentUser.displayName || 'User';
            }
        }

        // Load data based on current view
        if (currentView === 'feed') {
            loadRecipeFeed();
        } else if (currentView === 'bookmarks') {
            loadBookmarkedRecipes();
        } else if (currentView === 'myRecipes') {
            loadUserRecipes();
        } else if (currentView === 'savedMealPlans') {
            loadSavedMealPlans();
        }

        // Initialize bookmark count
        updateBookmarkCount();
        
        // Load meal plans from storage
        loadMealPlansFromStorage();
        
        // Start auto-refresh for feed
        startFeedRefresh();
    } else {
        // User is logged out
        stopFeedRefresh();
        elements.appContainer.style.display = 'none';
        elements.loginScreen.style.display = 'flex';
        elements.loginBtn.style.display = 'flex';
        elements.logoutBtn.style.display = 'none';
        
        // Hide user profile info
        if (elements.profileInfo) {
            elements.profileInfo.style.display = 'none';
        }
    }
}

function setActiveNavigation(active) {
    const navButtons = [elements.homeBtn, elements.bookmarksBtn, elements.savedMealPlansBtn];
    navButtons.forEach(btn => btn?.classList.remove('active'));
    
    switch(active) {
        case 'home':
            elements.homeBtn?.classList.add('active');
            break;
        case 'bookmarks':
            elements.bookmarksBtn?.classList.add('active');
            break;
        case 'savedMealPlans':
            elements.savedMealPlansBtn?.classList.add('active');
            break;
    }
}

// View switching
async function switchView(view) {
    if (currentView === view) return;
    
    // Fade out current content
    await fadeOut(elements.recipeGrid);
    
    // Update current view
    currentView = view;
    
    // Update feed title based on view
    switch (view) {
            case 'feed':
                elements.feedTitle.textContent = 'Recipe Feed';
                await loadRecipeFeed();
            startFeedRefresh(); // Start auto-refresh when viewing the feed
                break;
            case 'bookmarks':
            elements.feedTitle.textContent = 'Bookmarked Recipes';
                await loadBookmarkedRecipes();
            stopFeedRefresh(); // Stop auto-refresh when not on feed
                break;
            case 'myRecipes':
                elements.feedTitle.textContent = 'My Recipes';
                await loadUserRecipes();
            stopFeedRefresh(); // Stop auto-refresh when not on feed
            break;
        case 'savedMealPlans':
            elements.feedTitle.textContent = 'Saved Meal Plans';
            await loadSavedMealPlans();
            stopFeedRefresh(); // Stop auto-refresh when not on feed
                break;
        }
    
    // Update active navigation
    setActiveNavigation(view);
    
    // Fade in new content
    fadeIn(elements.recipeGrid);
}

// Recipe loading functions
async function loadRecipeFeed(silentRefresh = false) {
    if (!silentRefresh) {
        showLoading(true, 'Loading recipes...');
    }
    
    try {
        // Get recipes from Firebase or local storage
        const recipes = await getPublicRecipes();
        currentRecipes = recipes;
        
        if (recipes.length === 0) {
            // Check if there are any recipes in local storage
            const localRecipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
            
            if (localRecipes.length > 0) {
                // Use local recipes if available
                currentRecipes = localRecipes;
                renderRecipes(localRecipes);
            } else {
                // Show empty state if no recipes are found
                showEmptyState();
            }
        } else {
            // Render recipes from Firebase
            renderRecipes(recipes);
            
            // Also save to local storage for offline access
            localStorage.setItem('cookiverse-recipes', JSON.stringify(recipes));
        }
    } catch (error) {
        console.error('Error loading recipe feed:', error);
        
        // Try to load from local storage as fallback
        const localRecipes = JSON.parse(localStorage.getItem('cookiverse-recipes') || '[]');
        
        if (localRecipes.length > 0) {
            currentRecipes = localRecipes;
            renderRecipes(localRecipes);
            showSuccess('Loaded recipes from local storage');
        } else {
            showError('Failed to load recipes. Please try again.');
            showEmptyState();
        }
    } finally {
        if (!silentRefresh) {
            showLoading(false);
        }
    }
}

async function loadBookmarkedRecipes() {
    showLoading(true, 'Loading your bookmarked recipes...');
    
    try {
        if (!currentUser) {
            showError('Please sign in to view bookmarks');
            return;
        }
        
        const bookmarkedRecipes = await getUserBookmarksWithRecipes();
        
        if (bookmarkedRecipes.length === 0) {
            elements.recipeGrid.innerHTML = `
                <div class="empty-state" style="display: block;">
                    <i class="fas fa-bookmark"></i>
                    <h3>No bookmarked recipes yet</h3>
                    <p>Start exploring recipes and bookmark your favorites!</p>
                    <button class="action-btn" id="exploreRecipesBtn">
                        <i class="fas fa-compass"></i>
                        Explore Recipes
                    </button>
                </div>
            `;
            
            // Add event listener to return to feed
            document.getElementById('exploreRecipesBtn')?.addEventListener('click', () => {
                switchView('feed');
            });
        } else {
            // Group recipes by categories
            const categorized = categorizeRecipes(bookmarkedRecipes);
            
            const headerHtml = `
                <div class="bookmarks-header">
                    <h3>
                        <i class="fas fa-bookmark"></i>
                        Your Bookmarked Recipes (${bookmarkedRecipes.length})
                    </h3>
                    <div class="bookmark-filters">
                        <button class="bookmark-filter active" data-filter="all">All</button>
                        ${categorized.categories.map(cat => 
                            `<button class="bookmark-filter" data-filter="${cat}">${cat} (${categorized.byCategory[cat].length})</button>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            elements.recipeGrid.innerHTML = headerHtml;
            
            // Create a container for recipes
            const recipesContainer = document.createElement('div');
            recipesContainer.classList.add('recipe-grid');
            recipesContainer.id = 'bookmarkedRecipesContainer';
            
            // Append recipes to the container
            bookmarkedRecipes.forEach(recipe => {
                recipesContainer.appendChild(createRecipeCard(recipe, true));
            });
            
            elements.recipeGrid.appendChild(recipesContainer);
            
            // Add filter functionality
            document.querySelectorAll('.bookmark-filter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    
                    // Update active state
                    document.querySelectorAll('.bookmark-filter').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Filter recipes
                    if (filter === 'all') {
                        renderBookmarkedRecipes(bookmarkedRecipes);
                    } else {
                        const filtered = categorized.byCategory[filter] || [];
                        renderBookmarkedRecipes(filtered);
                    }
                });
            });
        }
        
        // Update bookmark count in the navigation
        updateBookmarkCount();
        
    } catch (error) {
        console.error('Error loading bookmarked recipes:', error);
        showError('Failed to load bookmarked recipes');
    } finally {
        showLoading(false);
    }
}

// Render bookmarked recipes
function renderBookmarkedRecipes(recipes) {
    const container = document.getElementById('bookmarkedRecipesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    recipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, true));
    });
}

// Categorize recipes by tags
function categorizeRecipes(recipes) {
    const byCategory = {};
    const categories = new Set();
    
    recipes.forEach(recipe => {
        // Extract main category from tags or use default
        let category = 'Uncategorized';
        if (recipe.tags && recipe.tags.length > 0) {
            category = recipe.tags[0].charAt(0).toUpperCase() + recipe.tags[0].slice(1);
        }
        
        categories.add(category);
        
        if (!byCategory[category]) {
            byCategory[category] = [];
        }
        byCategory[category].push(recipe);
    });
    
    return {
        byCategory,
        categories: Array.from(categories)
    };
}

// Update bookmark count in navigation
function updateBookmarkCount() {
    if (!elements.bookmarkCount) return;
    
    firebase.firestore().collection('bookmarks')
        .where('userId', '==', currentUser?.uid)
        .get()
        .then(snapshot => {
            const count = snapshot.size;
            elements.bookmarkCount.textContent = count;
            elements.bookmarkCount.style.display = count > 0 ? 'flex' : 'none';
        })
        .catch(error => {
            console.error('Error counting bookmarks:', error);
        });
}

async function loadUserRecipes() {
    showLoading(true, 'Loading your recipes...');
    
    try {
        const recipes = await getUserRecipes(currentUser.uid);
        currentRecipes = recipes;
        renderRecipes(recipes);
    } catch (error) {
        console.error('Error loading user recipes:', error);
        showError('Unable to load your recipes.');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

// Recipe rendering
function renderRecipes(recipes, isBookmarked = false) {
    if (!recipes || recipes.length === 0) {
        showEmptyState();
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.recipeGrid.innerHTML = '';
    
    recipes.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe, isBookmarked);
        elements.recipeGrid.appendChild(recipeCard);
    });
}

// Create a recipe card element
function createRecipeCard(recipe, isBookmarked = false) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.setAttribute('data-recipe-id', recipe.id);
    
    // Check if recipe has isBookmarked property or use the parameter
    isBookmarked = recipe.isBookmarked || isBookmarked;
    
    // Create tags HTML if recipe has tags
    const tagsHtml = recipe.tags && recipe.tags.length > 0
        ? `<div class="recipe-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';
    
    const bookmarkIcon = isBookmarked 
        ? '<i class="fas fa-bookmark bookmark-icon active"></i>' 
        : '<i class="far fa-bookmark bookmark-icon"></i>';
    
    card.innerHTML = `
        <div class="recipe-card-header">
            <div class="recipe-bookmark-btn" data-recipe-id="${recipe.id}">
                ${bookmarkIcon}
            </div>
            <h3 class="recipe-title">${recipe.title}</h3>
            ${tagsHtml}
        </div>
        <div class="recipe-details">
            <div class="recipe-meta">
                <span class="cook-time"><i class="far fa-clock"></i> ${recipe.cookTime}</span>
                <span class="ingredients-count">
                    <i class="fas fa-list"></i> 
                    ${recipe.ingredients ? recipe.ingredients.length : 0} ingredients
                </span>
            </div>
            <div class="recipe-footer">
                <span class="recipe-date">${formatDate(recipe.createdAt)}</span>
                ${recipe.authorId === currentUser?.uid ? 
                    `<div class="recipe-actions">
                        <button class="edit-recipe-btn" data-recipe-id="${recipe.id}">
                            <i class="fas fa-edit"></i>
                    </button>
                        <button class="delete-recipe-btn" data-recipe-id="${recipe.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>` : ''}
            </div>
        </div>
    `;
    
    // Add click event to open the recipe modal
    card.addEventListener('click', (e) => {
        // Skip if bookmark button or action buttons were clicked
        if (e.target.closest('.recipe-bookmark-btn') || e.target.closest('.recipe-actions')) {
            return;
        }
        
        openRecipeModal(recipe);
    });
    
    // Add bookmark functionality
    card.querySelector('.recipe-bookmark-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            await toggleBookmark(recipe.id);
            
            // Update visual state immediately for better UX
            const bookmarkBtn = e.currentTarget;
            const isNowBookmarked = await isRecipeBookmarked(recipe.id);
            
            // Update the icon
            bookmarkBtn.innerHTML = isNowBookmarked
                ? '<i class="fas fa-bookmark bookmark-icon active"></i>'
                : '<i class="far fa-bookmark bookmark-icon"></i>';
                
            // Update the recipe object
            recipe.isBookmarked = isNowBookmarked;
            
            // If we're in bookmarks view and unbookmarking, remove the card with animation
            if (currentView === 'bookmarks' && !isNowBookmarked) {
                fadeOut(card, 300);
                setTimeout(() => {
                    card.remove();
                    
                    // If no more bookmarks, show empty state
                    if (document.querySelectorAll('.recipe-card').length === 0) {
                        loadBookmarkedRecipes();
                    } else {
                        // Update the count in the header
                        const countElement = document.querySelector('.bookmarks-header h3');
                        if (countElement) {
                            const currentCount = parseInt(countElement.textContent.match(/\d+/) || '0');
                            countElement.innerHTML = `
                                <i class="fas fa-bookmark"></i>
                                Your Bookmarked Recipes (${currentCount - 1})
                            `;
                        }
                    }
                }, 300);
            }
            
            // Update navigation bookmark count
            updateBookmarkCount();
            
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            showError('Failed to update bookmark status');
        }
    });
    
    // Add edit/delete functionality if user is the author
    if (recipe.authorId === currentUser?.uid) {
        // Edit button
        card.querySelector('.edit-recipe-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isEditing = true;
            selectedRecipe = recipe;
            
            // Open the share recipe form with the recipe data
            elements.shareTitle.value = recipe.title;
            elements.shareIngredients.value = recipe.ingredients.join('\n');
            elements.shareInstructions.value = recipe.instructions.join('\n');
            elements.shareCookTime.value = recipe.cookTime;
            elements.shareTags.value = recipe.tags ? recipe.tags.join(', ') : '';
            elements.shareRecipeForm.dataset.editingId = recipe.id;
            
            elements.shareModalTitle.textContent = 'Edit Recipe';
            elements.shareSubmitBtn.textContent = 'Save Changes';
            openModal('shareRecipeModal');
        });
        
        // Delete button
        card.querySelector('.delete-recipe-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectedRecipe = recipe;
            
            if (confirm('Are you sure you want to delete this recipe?')) {
                handleDeleteRecipe();
            }
        });
    }
    
    return card;
}

// Recipe modal functions
function openRecipeModal(recipe) {
    selectedRecipe = recipe;
    
    elements.modalRecipeTitle.textContent = recipe.title;
    elements.modalCookTime.innerHTML = `<i class="fas fa-clock"></i> ${recipe.cookTime || 'Not specified'}`;
    elements.modalAuthor.innerHTML = recipe.authorName 
        ? `<i class="fas fa-user"></i> by ${recipe.authorName}`
        : '<i class="fas fa-robot"></i> AI Generated';
    
    // Render tags
    const tags = recipe.tags || [];
    elements.modalTags.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    // Render ingredients
    const ingredients = recipe.ingredients || [];
    elements.modalIngredients.innerHTML = ingredients.map(ingredient => 
        `<li>${ingredient}</li>`
    ).join('');
    
    // Render instructions
    const instructions = recipe.instructions || [];
    elements.modalInstructions.innerHTML = instructions.map(instruction => 
        `<li>${instruction}</li>`
    ).join('');
    
    // Update save button state
    updateSaveButtonState(recipe.id);

    // Show/hide edit/delete buttons based on authorship
    const isUserRecipe = currentUser && recipe.authorId === currentUser.uid;
    console.log("Checking recipe ownership - Current user:", currentUser?.uid, "Recipe author:", recipe.authorId, "Is owner:", isUserRecipe);
    
    if (isUserRecipe) {
        // User owns this recipe
        elements.editRecipeBtn.style.display = 'flex';
        elements.deleteRecipeBtn.style.display = 'flex';
    } else {
        // Not the owner of the recipe
        elements.editRecipeBtn.style.display = 'none';
        elements.deleteRecipeBtn.style.display = 'none';
    }
    
    openModal('recipeModal');
}

async function updateSaveButtonState(recipeId) {
    if (!currentUser) {
        elements.saveRecipeBtn.innerHTML = '<i class="fas fa-bookmark"></i> Save Recipe';
        return;
    }
    
    try {
        const isBookmarked = await isRecipeBookmarked(recipeId);
        elements.saveRecipeBtn.innerHTML = isBookmarked 
            ? '<i class="fas fa-bookmark-slash"></i> Remove Bookmark'
            : '<i class="fas fa-bookmark"></i> Save Recipe';
        elements.saveRecipeBtn.classList.toggle('saved', isBookmarked);
    } catch (error) {
        console.error('Error checking bookmark status:', error);
    }
}

// Ingredient input management
function addIngredientInput() {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'ingredient-input-group';
    inputGroup.style.opacity = 0;
    
    inputGroup.innerHTML = `
        <input type="text" placeholder="e.g., chicken" class="ingredient-input">
        <button class="remove-ingredient-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.ingredientInputs.appendChild(inputGroup);
    fadeIn(inputGroup);
    
    const removeBtn = inputGroup.querySelector('.remove-ingredient-btn');
    removeBtn.addEventListener('click', async () => {
        await fadeOut(inputGroup);
        inputGroup.remove();
        updateRemoveButtons();
    });
    
    updateRemoveButtons();
}

function handleIngredientInputClick(e) {
    if (e.target.closest('.remove-ingredient-btn')) {
        const inputGroup = e.target.closest('.ingredient-input-group');
        inputGroup.remove();
        updateRemoveButtons();
    }
}

function updateRemoveButtons() {
    const inputGroups = document.querySelectorAll('.ingredient-input-group');
    const removeButtons = document.querySelectorAll('.remove-ingredient-btn');
    
    // Show remove buttons only if there's more than one input
    removeButtons.forEach(btn => {
        btn.style.display = inputGroups.length > 1 ? 'block' : 'none';
    });
}

// Recipe generation
async function generateRecipeFromIngredients() {
    const ingredientInputs = document.querySelectorAll('.ingredient-input');
    const ingredients = Array.from(ingredientInputs)
        .map(input => input.value.trim())
        .filter(value => value);
    
    if (ingredients.length === 0) {
        showError('Please enter at least one ingredient.');
        disableGenerateButton(false);
        return;
    }
    
    const generateBtn = document.getElementById('generateRecipeBtn');
    if (generateBtn) {
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }
    
    showLoading(true, 'Generating your recipe...');
    disableGenerateButton(true);
    
    try {
        const recipe = await callGeminiAPI(createRecipePrompt(ingredients));
        const parsedRecipe = parseRecipeResponse(recipe);
        
        // Validate parsed recipe
        if (!parsedRecipe.title || parsedRecipe.title === 'Generated Recipe') {
            throw new Error('Failed to generate a valid recipe. Please try again.');
        }
        
        if (parsedRecipe.ingredients.length === 0 || parsedRecipe.instructions.length === 0) {
            throw new Error('Generated recipe is incomplete. Please try again.');
        }
        
        // Clear ingredient inputs
        const ingredientInputs = document.getElementById('ingredientInputs');
        ingredientInputs.innerHTML = `
            <div class="ingredient-input-group">
                <input type="text" placeholder="e.g., chicken" class="ingredient-input">
                <button class="remove-ingredient-btn" style="display: none;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Show the generated recipe
        openRecipeModal(parsedRecipe);

        // Save the recipe to Firestore
        try {
            const savedRecipeId = await saveRecipe(parsedRecipe);
            console.log(`Recipe saved with ID: ${savedRecipeId}`);
            showSuccess('Recipe generated and saved successfully!');
        } catch (saveError) {
            console.error('Failed to save the generated recipe:', saveError);
            showError('Recipe generated, but failed to save. You can save it manually from the recipe view.');
        }
        
    } catch (error) {
        console.error('Error generating recipe:', error);
        showError(error.message || 'Failed to generate recipe. Please try again later.');
    } finally {
        showLoading(false);
        disableGenerateButton(false);
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Recipe';
        }
    }
}

// Helper function to disable/enable generate button
function disableGenerateButton(disabled) {
    const generateBtn = document.getElementById('generateRecipeBtn');
    if (generateBtn) {
        generateBtn.disabled = disabled;
        generateBtn.style.opacity = disabled ? '0.5' : '1';
        generateBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
}

async function healthifyCurrentRecipe() {
    if (!selectedRecipe) return;
    
    showLoading(true, 'Creating a healthier version...');
    
    try {
        const healthyRecipe = await callGeminiAPI(createHealthifyPrompt(selectedRecipe));
        const parsedRecipe = parseRecipeResponse(healthyRecipe);
        
        // Update the modal with the healthier version
        openRecipeModal({
            ...parsedRecipe,
            title: `${parsedRecipe.title} (Healthier Version)`,
            id: `healthy_${Date.now()}`
        });
        
    } catch (error) {
        console.error('Error healthifying recipe:', error);
        showError('Failed to create healthier version. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Meal plan functions
async function generateMealPlan() {
    showLoading(true, 'Generating your meal plan...');
    
    try {
        const mealPlanPrompt = createMealPlanPrompt();
        console.log("Sending meal plan prompt to Gemini API:", mealPlanPrompt);
        
        const mealPlan = await callGeminiAPI(mealPlanPrompt);
        console.log("Received meal plan response:", mealPlan);
        
        const parsedMealPlan = parseMealPlanResponse(mealPlan);
        console.log("Parsed meal plan:", parsedMealPlan);
        
        // Save the current meal plan to local storage for persistence
        localStorage.setItem('cookiverse-current-mealplan', JSON.stringify({
            plan: parsedMealPlan,
            timestamp: new Date().toISOString()
        }));
        
        renderMealPlan(parsedMealPlan, false);
        openModal('mealPlanModal');
        
    } catch (error) {
        console.error('Error generating meal plan:', error);
        showError('Failed to generate meal plan. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Save a meal plan with a name
function saveMealPlan(mealPlan, name) {
    if (!currentUser) {
        showError("Please sign in to save meal plans");
        return false;
    }
    
    try {
        // Load existing saved meal plans
        loadMealPlansFromStorage();
        
        const newMealPlan = {
            id: `mealplan_${Date.now()}`,
            name: name || `Meal Plan ${savedMealPlans.length + 1}`,
            plan: mealPlan,
            timestamp: new Date().toISOString(),
            userId: currentUser.uid
        };
        
        // Add new meal plan
        savedMealPlans.push(newMealPlan);
        
        // Save to local storage
        saveMealPlansToStorage();
        
        showSuccess("Meal plan saved successfully!");
        return true;
    } catch (error) {
        console.error("Error saving meal plan:", error);
        showError("Failed to save meal plan. Please try again.");
        return false;
    }
}

// Load saved meal plans from storage
function loadMealPlansFromStorage() {
    try {
        const storedPlans = localStorage.getItem('cookiverse-mealplans');
        if (storedPlans) {
            savedMealPlans = JSON.parse(storedPlans).filter(plan => 
                plan.userId === currentUser?.uid
            );
        }
    } catch (error) {
        console.error("Error loading saved meal plans:", error);
        savedMealPlans = [];
    }
}

// Save meal plans to local storage
function saveMealPlansToStorage() {
    try {
        localStorage.setItem('cookiverse-mealplans', JSON.stringify(savedMealPlans));
    } catch (error) {
        console.error("Error saving meal plans to storage:", error);
    }
}

// Load saved meal plans
async function loadSavedMealPlans() {
    showLoading(true, 'Loading your saved meal plans...');
    
    try {
        loadMealPlansFromStorage();
        
        if (savedMealPlans.length === 0) {
            elements.recipeGrid.innerHTML = `
                <div class="empty-state" style="display: block;">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>No saved meal plans</h3>
                    <p>Generate a meal plan and save it for future reference!</p>
                    <button class="action-btn" id="generateNewMealPlanBtn">
                        <i class="fas fa-calendar-plus"></i>
                        Generate New Meal Plan
                    </button>
                </div>
            `;
            
            // Add event listener to the new button
            document.getElementById('generateNewMealPlanBtn')?.addEventListener('click', generateMealPlan);
            
        } else {
            elements.recipeGrid.innerHTML = `
                <div class="saved-plans-header">
                    <h3><i class="fas fa-calendar-check"></i> Your Saved Meal Plans</h3>
                    <button class="meal-plan-action-btn" id="generateNewMealPlanBtn">
                        <i class="fas fa-calendar-plus"></i> Create New
                    </button>
                </div>
                <div class="saved-plans-container">
                    ${savedMealPlans.map((savedPlan, index) => `
                        <div class="saved-plan-card" data-plan-id="${savedPlan.id}">
                            <div class="saved-plan-header">
                                <h3>${savedPlan.name}</h3>
                                <span class="saved-date">Saved on ${new Date(savedPlan.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div class="saved-plan-preview">
                                <div class="preview-day">
                                    <h4>Day 1</h4>
                                    <p>${getMealTitle(savedPlan.plan.day1.breakfast)}</p>
                                    <p>${getMealTitle(savedPlan.plan.day1.lunch)}</p>
                                    <p>${getMealTitle(savedPlan.plan.day1.dinner)}</p>
                                </div>
                            </div>
                            <div class="saved-plan-actions">
                                <button class="view-plan-btn" data-index="${index}">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="delete-plan-btn" data-index="${index}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Add event listeners for saved plan actions
            document.getElementById('generateNewMealPlanBtn')?.addEventListener('click', generateMealPlan);
            document.querySelectorAll('.view-plan-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('.view-plan-btn').dataset.index);
                    renderMealPlan(savedMealPlans[index].plan, true, savedMealPlans[index].name);
                    openModal('mealPlanModal');
                });
            });
            
            document.querySelectorAll('.delete-plan-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('.delete-plan-btn').dataset.index);
                    if (confirm(`Are you sure you want to delete "${savedMealPlans[index].name}"?`)) {
                        savedMealPlans.splice(index, 1);
                        saveMealPlansToStorage();
                        loadSavedMealPlans();
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error loading saved meal plans:', error);
        showError('Failed to load saved meal plans');
    } finally {
        elements.emptyState.style.display = 'none';
        showLoading(false);
    }
}

// Meal plan rendering
function renderMealPlan(mealPlan, isSavedPlan = false, savedPlanName = '') {
    // Get saved date if available
    const currentPlan = localStorage.getItem('cookiverse-current-mealplan');
    const savedDate = currentPlan ? new Date(JSON.parse(currentPlan).timestamp) : new Date();
    const formattedDate = savedDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Prepare save UI
    let savePlanUI = '';
    if (!isSavedPlan) {
        savePlanUI = `
            <div class="save-plan-container">
                <input type="text" id="mealPlanNameInput" placeholder="Enter a name for this meal plan">
                <button class="meal-plan-action-btn" id="saveMealPlanBtn">
                    <i class="fas fa-save"></i> Save Plan
                </button>
            </div>
        `;
    }
    
    const headerHtml = `
        <div class="meal-plan-header">
            <div class="meal-plan-info">
                <h3>${isSavedPlan ? savedPlanName : 'Your 3-Day Meal Plan'}</h3>
                <p class="meal-plan-date">${isSavedPlan ? 'Saved plan' : `Generated on ${formattedDate}`}</p>
            </div>
            <div class="meal-plan-header-actions">
                ${savePlanUI}
                <button class="meal-plan-action-btn" id="regenerateMealPlanBtn" ${isSavedPlan ? 'style="display:none;"' : ''}>
                    <i class="fas fa-sync-alt"></i> Regenerate
                </button>
            </div>
        </div>
    `;
    
    elements.mealPlanGrid.innerHTML = headerHtml + `
        <div class="day-plan">
            <h3><i class="fas fa-sun"></i> Day 1</h3>
            <div class="meal">
                <h4>🌅 Breakfast</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day1.breakfast)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day1.breakfast)}</div>
            </div>
            <div class="meal">
                <h4>🌞 Lunch</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day1.lunch)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day1.lunch)}</div>
            </div>
            <div class="meal">
                <h4>🌙 Dinner</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day1.dinner)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day1.dinner)}</div>
            </div>
        </div>
        <div class="day-plan">
            <h3><i class="fas fa-cloud-sun"></i> Day 2</h3>
            <div class="meal">
                <h4>🌅 Breakfast</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day2.breakfast)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day2.breakfast)}</div>
            </div>
            <div class="meal">
                <h4>🌞 Lunch</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day2.lunch)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day2.lunch)}</div>
            </div>
            <div class="meal">
                <h4>🌙 Dinner</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day2.dinner)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day2.dinner)}</div>
            </div>
        </div>
        <div class="day-plan">
            <h3><i class="fas fa-cloud"></i> Day 3</h3>
            <div class="meal">
                <h4>🌅 Breakfast</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day3.breakfast)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day3.breakfast)}</div>
            </div>
            <div class="meal">
                <h4>🌞 Lunch</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day3.lunch)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day3.lunch)}</div>
            </div>
            <div class="meal">
                <h4>🌙 Dinner</h4>
                <div class="meal-title">${getMealTitle(mealPlan.day3.dinner)}</div>
                <div class="meal-description">${getMealDescription(mealPlan.day3.dinner)}</div>
            </div>
        </div>
    `;
    
    // Add event listeners for buttons
    document.getElementById('regenerateMealPlanBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('mealPlanModal');
        setTimeout(() => {
            generateMealPlan();
        }, 300);
    });
    
    // Add save functionality
    document.getElementById('saveMealPlanBtn')?.addEventListener('click', () => {
        const planName = document.getElementById('mealPlanNameInput').value.trim() || `Meal Plan ${savedMealPlans.length + 1}`;
        if (saveMealPlan(mealPlan, planName)) {
            // Show success and disable save button
            document.getElementById('saveMealPlanBtn').disabled = true;
            document.getElementById('saveMealPlanBtn').innerHTML = '<i class="fas fa-check"></i> Saved';
        }
    });
}

function getMealTitle(mealText) {
    if (!mealText) return 'Not specified';
    const parts = mealText.split(' - ');
    return parts[0] || mealText;
}

function getMealDescription(mealText) {
    if (!mealText) return '';
    const parts = mealText.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : '';
}

// Bookmark functions
async function toggleBookmark(recipeId) {
    if (!currentUser) {
        showError('Please sign in to bookmark recipes.');
        return;
    }
    
    try {
        const isBookmarked = await isRecipeBookmarked(recipeId);
        
        if (isBookmarked) {
            await removeBookmark(recipeId);
            showSuccess('Recipe removed from bookmarks');
        } else {
            await saveBookmark(recipeId);
            showSuccess('Recipe bookmarked successfully');
        }
        
        // Update UI if we're viewing bookmarks
        if (currentView === 'bookmarks') {
            await loadBookmarkedRecipes();
        }
        
        // Update save button if this is the current recipe in modal
        if (selectedRecipe && selectedRecipe.id === recipeId) {
            await updateSaveButtonState(recipeId);
        }
        
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        showError('Failed to update bookmark. Please try again.');
    }
}

async function toggleBookmarkCurrentRecipe() {
    if (!selectedRecipe) return;
    await toggleBookmark(selectedRecipe.id);
}

// Share recipe functionality
async function handleShareRecipe(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showError('Please sign in to share recipes.');
        return;
    }
    
    const recipeData = {
        title: elements.shareTitle.value.trim(),
        ingredients: elements.shareIngredients.value.trim().split('\n').map(i => i.trim()).filter(i => i),
        instructions: elements.shareInstructions.value.trim().split('\n').map(i => i.trim()).filter(i => i),
        cookTime: elements.shareCookTime.value.trim() || 'Not specified',
        tags: elements.shareTags.value.trim().split(',').map(t => t.trim()).filter(t => t),
        isPublic: true
    };
    
    if (!recipeData.title || recipeData.ingredients.length === 0 || recipeData.instructions.length === 0) {
        showError('Please fill in all required fields.');
        return;
    }
    
    try {
        const isEdit = isEditing && elements.shareRecipeForm.dataset.editingId;
        showLoading(true, isEdit ? 'Updating recipe...' : 'Sharing recipe...');
        
        // Check if we're editing an existing recipe
        const recipeId = elements.shareRecipeForm.dataset.editingId;
        
        if (isEditing && recipeId) {
            await updateRecipe(recipeId, recipeData);
            showSuccess('Recipe updated successfully!');
            
            // Update the selected recipe if it's still open
            if (selectedRecipe && selectedRecipe.id === recipeId) {
                selectedRecipe = { ...selectedRecipe, ...recipeData };
            }
        } else {
            await saveRecipe(recipeData);
            showSuccess('Recipe shared successfully!');
        }
        
        closeModal('shareModal');
        elements.shareRecipeForm.reset();
        delete elements.shareRecipeForm.dataset.editingId;
        
        // Reload the current view to show the new or updated recipe
        await switchView(currentView);
        
    } catch (error) {
        console.error('Error saving recipe:', error);
        showError(error.message || 'Failed to save recipe. Please try again.');
    } finally {
        showLoading(false);
        isEditing = false;
    }
}

function handleEditRecipe() {
    if (!selectedRecipe) return;

    isEditing = true;
    
    elements.shareModalTitle.textContent = 'Edit Recipe';
    elements.shareTitle.value = selectedRecipe.title || '';
    elements.shareCookTime.value = selectedRecipe.cookTime || '';
    elements.shareIngredients.value = (selectedRecipe.ingredients || []).join('\n');
    elements.shareInstructions.value = (selectedRecipe.instructions || []).join('\n');
    elements.shareTags.value = (selectedRecipe.tags || []).join(', ');

    openModal('shareModal');
    
    // Make sure the form submit handler knows we're in edit mode
    elements.shareRecipeForm.dataset.editingId = selectedRecipe.id;
}

async function handleDeleteRecipe() {
    if (!selectedRecipe) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete the recipe "${selectedRecipe.title}"? This action cannot be undone.`);

    if (confirmDelete) {
        try {
            showLoading(true, 'Deleting recipe...');
            await deleteRecipe(selectedRecipe.id);
            showSuccess('Recipe deleted successfully!');
            closeModal('recipeModal');
            await switchView(currentView);
        } catch (error) {
            console.error('Error deleting recipe:', error);
            showError(error.message || 'Failed to delete recipe. Please try again.');
        } finally {
            showLoading(false);
        }
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderRecipes(currentRecipes);
        return;
    }
    
    const filteredRecipes = currentRecipes.filter(recipe => 
        recipe.title.toLowerCase().includes(searchTerm) ||
        (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
        (recipe.ingredients && recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm)))
    );
    
    renderRecipes(filteredRecipes);
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Utility functions
function showLoading(show, message = 'Processing your request...') {
    elements.loadingSpinner.style.display = show ? 'flex' : 'none';
    
    // Update loading message if element exists
    if (elements.loadingMessage) {
        elements.loadingMessage.textContent = message;
    }
}

function showEmptyState() {
    elements.emptyState.style.display = 'block';
    elements.recipeGrid.innerHTML = '';
}

function showError(message) {
    // Create error element if it doesn't exist
    let errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'errorMessage';
        errorElement.className = 'error-message';
        document.querySelector('.login-card').appendChild(errorElement);
    }
    
    // Show error message
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    // Create a simple success toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        font-weight: 500;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    
    // Handle Firebase Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}

// Start automatic feed refresh
function startFeedRefresh() {
    // Clear any existing interval first
    stopFeedRefresh();
    
    // Set up new refresh interval (2 seconds)
    feedRefreshInterval = setInterval(async () => {
        // Only refresh if we're in the feed view
        if (currentView === 'feed' && currentUser) {
            console.log('Auto-refreshing recipe feed...');
            await loadRecipeFeed(true); // true = silent refresh (no loading spinner)
        }
    }, 2000);
    
    console.log('Feed auto-refresh started');
}

// Stop automatic feed refresh
function stopFeedRefresh() {
    if (feedRefreshInterval) {
        clearInterval(feedRefreshInterval);
        feedRefreshInterval = null;
        console.log('Feed auto-refresh stopped');
    }
}

// Export functions for global access if needed
window.CookiVerse = {
    toggleBookmark,
    openRecipeModal,
    generateRecipeFromIngredients,
    generateMealPlan
};

// Gemini API functions
async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || 
            !data.candidates[0].content.parts || !data.candidates[0].content.parts[0] || 
            !data.candidates[0].content.parts[0].text) {
            throw new Error('Invalid response format from Gemini API');
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to generate content. Please try again later.');
    }
}

function createMealPlanPrompt() {
    return `Create a 3-day meal plan with breakfast, lunch, and dinner for each day. 
    Format your response exactly like this:

    DAY_1:
    BREAKFAST: [Meal Name] - [Brief description]
    LUNCH: [Meal Name] - [Brief description]
    DINNER: [Meal Name] - [Brief description]

    DAY_2:
    BREAKFAST: [Meal Name] - [Brief description]
    LUNCH: [Meal Name] - [Brief description]
    DINNER: [Meal Name] - [Brief description]

    DAY_3:
    BREAKFAST: [Meal Name] - [Brief description]
    LUNCH: [Meal Name] - [Brief description]
    DINNER: [Meal Name] - [Brief description]

    Make sure each meal is simple and uses common ingredients. Include a variety of proteins, vegetables, and grains.
    Keep descriptions brief but informative.`;
}

function parseMealPlanResponse(response) {
    try {
        const days = {
            day1: { breakfast: '', lunch: '', dinner: '' },
            day2: { breakfast: '', lunch: '', dinner: '' },
            day3: { breakfast: '', lunch: '', dinner: '' }
        };
        
        // Split by days
        const dayBlocks = response.split(/DAY_\d+:/g).filter(block => block.trim());
        
        // Process each day (up to 3 days)
        for (let i = 0; i < Math.min(3, dayBlocks.length); i++) {
            const dayBlock = dayBlocks[i];
            const dayKey = `day${i + 1}`;
            
            // Extract meals
            const breakfastMatch = dayBlock.match(/BREAKFAST:\s*(.*?)(?=LUNCH:|$)/s);
            const lunchMatch = dayBlock.match(/LUNCH:\s*(.*?)(?=DINNER:|$)/s);
            const dinnerMatch = dayBlock.match(/DINNER:\s*(.*?)(?=$)/s);
            
            if (breakfastMatch) days[dayKey].breakfast = breakfastMatch[1].trim();
            if (lunchMatch) days[dayKey].lunch = lunchMatch[1].trim();
            if (dinnerMatch) days[dayKey].dinner = dinnerMatch[1].trim();
        }
        
        return days;
    } catch (error) {
        console.error('Error parsing meal plan response:', error);
        throw new Error('Failed to parse meal plan. Please try again.');
    }
}

function createRecipePrompt(ingredients) {
    return `Create a recipe using some or all of these ingredients: ${ingredients.join(', ')}. 
    Format your response exactly like this:

    TITLE: [Recipe Title]
    COOK_TIME: [Cooking Time]
    TAGS: [comma-separated tags like healthy, quick, vegetarian, etc]
    
    INGREDIENTS:
    - [Ingredient 1 with quantity]
    - [Ingredient 2 with quantity]
    - [etc.]
    
    INSTRUCTIONS:
    1. [Step 1]
    2. [Step 2]
    3. [etc.]
    
    Be creative but practical. Make sure the recipe is delicious and achievable for a home cook.`;
}

function parseRecipeResponse(response) {
    try {
        const recipe = {
            id: `recipe_${Date.now()}`,
            title: 'Generated Recipe',
            cookTime: '',
            ingredients: [],
            instructions: [],
            tags: [],
            createdAt: new Date(),
            isGenerated: true
        };
        
        // Extract title
        const titleMatch = response.match(/TITLE:\s*(.*?)(?=\n|$)/);
        if (titleMatch) recipe.title = titleMatch[1].trim();
        
        // Extract cook time
        const cookTimeMatch = response.match(/COOK_TIME:\s*(.*?)(?=\n|$)/);
        if (cookTimeMatch) recipe.cookTime = cookTimeMatch[1].trim();
        
        // Extract tags
        const tagsMatch = response.match(/TAGS:\s*(.*?)(?=\n|$)/);
        if (tagsMatch) {
            recipe.tags = tagsMatch[1].split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        
        // Extract ingredients
        const ingredientsMatch = response.match(/INGREDIENTS:([\s\S]*?)(?=INSTRUCTIONS:|$)/);
        if (ingredientsMatch) {
            recipe.ingredients = ingredientsMatch[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith('-'))
                .map(line => line.substring(1).trim());
        }
        
        // Extract instructions
        const instructionsMatch = response.match(/INSTRUCTIONS:([\s\S]*?)(?=$)/);
        if (instructionsMatch) {
            recipe.instructions = instructionsMatch[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => /^\d+\./.test(line))
                .map(line => line.replace(/^\d+\.\s*/, '').trim());
        }
        
        return recipe;
    } catch (error) {
        console.error('Error parsing recipe response:', error);
        throw new Error('Failed to parse recipe. Please try again.');
    }
}

function createHealthifyPrompt(recipe) {
    return `Create a healthier version of this recipe:
    
    Original Recipe: ${recipe.title}
    
    Original Ingredients:
    ${recipe.ingredients.map(ing => `- ${ing}`).join('\n')}
    
    Original Instructions:
    ${recipe.instructions.map((step, i) => `${i+1}. ${step}`).join('\n')}
    
    Please create a healthier version with lower calories, less fat, and/or more nutrients.
    Format your response exactly like this:
    
    TITLE: [Healthier Recipe Title]
    COOK_TIME: [Cooking Time]
    TAGS: [comma-separated tags like healthy, low-fat, etc]
    
    INGREDIENTS:
    - [Ingredient 1 with quantity]
    - [Ingredient 2 with quantity]
    - [etc.]
    
    INSTRUCTIONS:
    1. [Step 1]
    2. [Step 2]
    3. [etc.]
    
    Explain briefly at the end what makes this version healthier.`;
}

console.log('CookiVerse main.js loaded successfully');
