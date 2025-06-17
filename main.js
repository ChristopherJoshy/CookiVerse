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
let currentView = 'feed'; // 'feed', 'bookmarks', 'myRecipes'
let selectedRecipe = null;
let isEditing = false;

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyCSxpqO4icaYpS48fGNG8sbfdXT9zjMnfk";
const GEMINI_API_URL = '/api/gemini';

// DOM elements
const elements = {
    // Login screen
    loginScreen: document.getElementById('loginScreen'),
    loginScreenBtn: document.getElementById('loginScreenBtn'),
    appContainer: document.getElementById('appContainer'),
    
    // Navigation
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    profileInfo: document.getElementById('profileInfo'),
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    
    // Navigation
    homeBtn: document.getElementById('homeBtn'),
    bookmarksBtn: document.getElementById('bookmarksBtn'),
    mealPlanBtn: document.getElementById('mealPlanBtn'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
    
    // Ingredient search
    ingredient1: document.getElementById('ingredient1'),
    ingredient2: document.getElementById('ingredient2'),
    ingredient3: document.getElementById('ingredient3'),
    generateRecipeBtn: document.getElementById('generateRecipeBtn'),
    
    // Quick actions
    viewAllRecipesBtn: document.getElementById('viewAllRecipesBtn'),
    myRecipesBtn: document.getElementById('myRecipesBtn'),
    generateMealPlanBtn: document.getElementById('generateMealPlanBtn'),
    
    // Feed
    feedContainer: document.getElementById('feedContainer'),
    feedTitle: document.getElementById('feedTitle'),
    shareRecipeBtn: document.getElementById('shareRecipeBtn'),
    emptyState: document.getElementById('emptyState'),
    recipeGrid: document.getElementById('recipeGrid'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    
    // Modals
    recipeModal: document.getElementById('recipeModal'),
    shareModal: document.getElementById('shareModal'),
    mealPlanModal: document.getElementById('mealPlanModal'),
    
    // Recipe modal elements
    modalRecipeTitle: document.getElementById('modalRecipeTitle'),
    modalCookTime: document.getElementById('modalCookTime'),
    modalAuthor: document.getElementById('modalAuthor'),
    modalTags: document.getElementById('modalTags'),
    modalIngredients: document.getElementById('modalIngredients'),
    modalInstructions: document.getElementById('modalInstructions'),
    healthifyBtn: document.getElementById('healthifyBtn'),
    saveRecipeBtn: document.getElementById('saveRecipeBtn'),
    editRecipeBtn: document.getElementById('editRecipeBtn'),
    deleteRecipeBtn: document.getElementById('deleteRecipeBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    
    // Share modal elements
    shareModalTitle: document.querySelector('#shareModal .modal-header h2'),
    shareRecipeForm: document.getElementById('shareRecipeForm'),
    shareTitle: document.getElementById('shareTitle'),
    shareIngredients: document.getElementById('shareIngredients'),
    shareInstructions: document.getElementById('shareInstructions'),
    shareCookTime: document.getElementById('shareCookTime'),
    shareTags: document.getElementById('shareTags'),
    closeShareModalBtn: document.getElementById('closeShareModalBtn'),
    cancelShareBtn: document.getElementById('cancelShareBtn'),
    
    // Meal plan modal
    mealPlanGrid: document.getElementById('mealPlanGrid'),
    closeMealPlanBtn: document.getElementById('closeMealPlanBtn')
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
            elements.userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
            elements.userName.textContent = user.displayName || 'User';
            
            // Load initial data
            loadRecipeFeed();
        } else {
            console.log('User not authenticated');
            // Show login screen, hide main app
            elements.loginScreen.style.display = 'flex';
            elements.appContainer.style.display = 'none';
            
            // Reset UI elements
            elements.userAvatar.src = '';
            elements.userName.textContent = '';
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
    
    // Search
    elements.searchInput?.addEventListener('input', handleSearch);
    
    // Ingredient management
    document.getElementById('addIngredientBtn')?.addEventListener('click', () => {
        showButtonFeedback(document.getElementById('addIngredientBtn'));
        addIngredientInput();
    });
    document.getElementById('ingredientInputs')?.addEventListener('click', handleIngredientInputClick);
    
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
        // Show authenticated state
        elements.loginBtn.style.display = 'none';
        elements.logoutBtn.style.display = 'flex';
        elements.profileInfo.style.display = 'flex';
        elements.userAvatar.src = currentUser.photoURL || 'https://via.placeholder.com/32';
        elements.userName.textContent = currentUser.displayName || 'User';
        elements.shareRecipeBtn.style.display = 'flex';
    } else {
        // Show unauthenticated state
        elements.loginBtn.style.display = 'flex';
        elements.logoutBtn.style.display = 'none';
        elements.profileInfo.style.display = 'none';
        elements.shareRecipeBtn.style.display = 'none';
    }
}

function setActiveNavigation(active) {
    const navButtons = [elements.homeBtn, elements.bookmarksBtn];
    navButtons.forEach(btn => btn?.classList.remove('active'));
    
    switch(active) {
        case 'home':
            elements.homeBtn?.classList.add('active');
            break;
        case 'bookmarks':
            elements.bookmarksBtn?.classList.add('active');
            break;
    }
}

// View switching
async function switchView(view) {
    currentView = view;
    showLoading(true);
    
    try {
        switch(view) {
            case 'feed':
                setActiveNavigation('home');
                elements.feedTitle.textContent = 'Recipe Feed';
                await loadRecipeFeed();
                break;
            case 'bookmarks':
                if (!currentUser) {
                    showError('Please sign in to view bookmarked recipes.');
                    return;
                }
                setActiveNavigation('bookmarks');
                elements.feedTitle.textContent = 'Saved Recipes';
                await loadBookmarkedRecipes();
                break;
            case 'myRecipes':
                if (!currentUser) {
                    showError('Please sign in to view your recipes.');
                    return;
                }
                setActiveNavigation('home');
                elements.feedTitle.textContent = 'My Recipes';
                await loadUserRecipes();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${view}:`, error);
        showError(`Failed to load ${view}. Please try again.`);
    } finally {
        showLoading(false);
    }
}

// Recipe loading functions
async function loadRecipeFeed() {
    try {
        const recipes = await getPublicRecipes();
        currentRecipes = recipes;
        renderRecipes(recipes);
    } catch (error) {
        console.error('Error loading recipe feed:', error);
        showError('Unable to load recipes. Please check your connection.');
        showEmptyState();
    }
}

async function loadBookmarkedRecipes() {
    try {
        const recipes = await getUserBookmarksWithRecipes(currentUser.uid);
        currentRecipes = recipes;
        renderRecipes(recipes);
    } catch (error) {
        console.error('Error loading bookmarked recipes:', error);
        showError('Unable to load bookmarked recipes.');
        showEmptyState();
    }
}

async function loadUserRecipes() {
    try {
        const recipes = await getUserRecipes(currentUser.uid);
        currentRecipes = recipes;
        renderRecipes(recipes);
    } catch (error) {
        console.error('Error loading user recipes:', error);
        showError('Unable to load your recipes.');
        showEmptyState();
    }
}

// Recipe rendering
function renderRecipes(recipes) {
    if (!recipes || recipes.length === 0) {
        showEmptyState();
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.recipeGrid.innerHTML = '';
    
    recipes.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        elements.recipeGrid.appendChild(recipeCard);
    });
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.setAttribute('data-aos', 'fade-up');
    card.onclick = () => openRecipeModal(recipe);
    
    const preview = recipe.ingredients && recipe.ingredients.length > 0 
        ? `Ingredients: ${recipe.ingredients.slice(0, 3).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}`
        : recipe.description || 'Click to view full recipe';
    
    const tags = recipe.tags || [];
    const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    const authorInfo = recipe.authorName ? `
        <div class="recipe-author">
            <i class="fas fa-user-circle"></i>
            <span>by ${recipe.authorName}</span>
        </div>
    ` : '';
    
    card.innerHTML = `
        <div class="recipe-card-header">
            <h3>${recipe.title}</h3>
            <div class="recipe-meta">
                <span><i class="fas fa-clock"></i> ${recipe.cookTime || 'N/A'}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(recipe.createdAt)}</span>
            </div>
        </div>
        <div class="recipe-card-body">
            <div class="recipe-preview">${preview}</div>
            <div class="recipe-tags">${tagsHtml}</div>
            <div class="recipe-footer">
                ${authorInfo}
                <div class="recipe-actions">
                    <button class="recipe-action-btn bookmark-btn" onclick="event.stopPropagation(); toggleBookmark('${recipe.id}')" title="Save Recipe">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
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
    if (currentUser && currentUser.uid === recipe.authorId) {
        elements.editRecipeBtn.style.display = 'flex';
        elements.deleteRecipeBtn.style.display = 'flex';
    } else {
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
    });
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
    
    showLoading(true);
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
    
    showLoading(true);
    
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

async function generateMealPlan() {
    showLoading(true);
    
    try {
        const mealPlan = await callGeminiAPI(createMealPlanPrompt());
        const parsedMealPlan = parseMealPlanResponse(mealPlan);
        
        renderMealPlan(parsedMealPlan);
        openModal('mealPlanModal');
        
    } catch (error) {
        console.error('Error generating meal plan:', error);
        showError('Failed to generate meal plan. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Gemini API calls
async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error('Failed to generate recipe. Please try again.');
    }
}

// Prompt creation functions
function createRecipePrompt(ingredients) {
    const ingredientList = ingredients.join(', ');
    return `Create a detailed recipe using these ingredients: ${ingredientList}.

Please format your response EXACTLY as follows (including the exact headers and dashes):
TITLE: [Recipe name]
COOK_TIME: [Cooking time in minutes]
TAGS: [3-5 comma-separated tags like healthy, quick, vegetarian]
INGREDIENTS:
- [First ingredient with exact quantity]
- [Second ingredient with exact quantity]
- [Continue for all ingredients]
INSTRUCTIONS:
1. [First step with specific details]
2. [Second step with specific details]
3. [Continue with all steps]

Requirements:
1. Use EXACT quantities for ingredients (e.g., "2 cups", "300g", "3 tablespoons")
2. Include temperature and timing in instructions where needed
3. Make the recipe practical and achievable
4. If only one ingredient is provided, suggest complementary ingredients
5. Include all provided ingredients in the recipe`;
}

function createHealthifyPrompt(recipe) {
    return `Please rewrite this recipe to make it healthier (lower calorie, less fat, more nutritious):

Original Recipe:
Title: ${recipe.title}
Ingredients: ${recipe.ingredients ? recipe.ingredients.join(', ') : 'Not specified'}
Instructions: ${recipe.instructions ? recipe.instructions.join(' ') : 'Not specified'}

Please format your response as follows:
TITLE: [Healthier recipe name]
COOK_TIME: [Cooking time]
TAGS: [Comma-separated tags including 'healthy']
INGREDIENTS:
- [List each healthier ingredient with quantity]
INSTRUCTIONS:
1. [Step by step instructions for healthier version]

Focus on reducing calories, saturated fats, and adding more vegetables, lean proteins, and whole grains.`;
}

function createMealPlanPrompt() {
    return `Create a 3-day meal plan (3 meals per day).

Please format your response as follows:
DAY_1:
BREAKFAST: [Meal name] - [Brief description]
LUNCH: [Meal name] - [Brief description]  
DINNER: [Meal name] - [Brief description]

DAY_2:
BREAKFAST: [Meal name] - [Brief description]
LUNCH: [Meal name] - [Brief description]
DINNER: [Meal name] - [Brief description]

DAY_3:
BREAKFAST: [Meal name] - [Brief description]
LUNCH: [Meal name] - [Brief description]
DINNER: [Meal name] - [Brief description]

Make the meals balanced, practical, and use common ingredients.`;
}

// Response parsing functions
function parseRecipeResponse(response) {
    try {
        const lines = response.split('\n');
        const recipe = {
            title: 'Generated Recipe',
            cookTime: 'Not specified',
            tags: [],
            ingredients: [],
            instructions: [],
            id: `generated_${Date.now()}`
        };
        
        let currentSection = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            if (line.startsWith('TITLE:')) {
                const title = line.replace('TITLE:', '').trim();
                recipe.title = title || 'Generated Recipe';
            } else if (line.startsWith('COOK_TIME:')) {
                recipe.cookTime = line.replace('COOK_TIME:', '').trim() || 'Not specified';
            } else if (line.startsWith('TAGS:')) {
                const tags = line.replace('TAGS:', '').split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag);
                recipe.tags = tags.length > 0 ? tags : ['Generated'];
            } else if (line === 'INGREDIENTS:') {
                currentSection = 'ingredients';
            } else if (line === 'INSTRUCTIONS:') {
                currentSection = 'instructions';
            } else if (currentSection === 'ingredients' && line.startsWith('-')) {
                const ingredient = line.replace('-', '').trim();
                if (ingredient) {
                    recipe.ingredients.push(ingredient);
                }
            } else if (currentSection === 'instructions' && /^\d+\./.test(line)) {
                const instruction = line.replace(/^\d+\.\s*/, '').trim();
                if (instruction) {
                    recipe.instructions.push(instruction);
                }
            }
        }
        
        // Validate the parsed recipe
        if (recipe.ingredients.length === 0) {
            throw new Error('No ingredients found in the generated recipe');
        }
        
        if (recipe.instructions.length === 0) {
            throw new Error('No instructions found in the generated recipe');
        }
        
        return recipe;
    } catch (error) {
        console.error('Error parsing recipe:', error);
        throw new Error('Failed to parse the generated recipe. Please try again.');
    }
}

function parseMealPlanResponse(response) {
    const lines = response.split('\n');
    const mealPlan = {
        day1: { breakfast: '', lunch: '', dinner: '' },
        day2: { breakfast: '', lunch: '', dinner: '' },
        day3: { breakfast: '', lunch: '', dinner: '' }
    };
    
    let currentDay = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        if (line.includes('DAY_1') || line.includes('Day 1')) {
            currentDay = 'day1';
        } else if (line.includes('DAY_2') || line.includes('Day 2')) {
            currentDay = 'day2';
        } else if (line.includes('DAY_3') || line.includes('Day 3')) {
            currentDay = 'day3';
        } else if (line.startsWith('BREAKFAST:') && currentDay) {
            mealPlan[currentDay].breakfast = line.replace('BREAKFAST:', '').trim();
        } else if (line.startsWith('LUNCH:') && currentDay) {
            mealPlan[currentDay].lunch = line.replace('LUNCH:', '').trim();
        } else if (line.startsWith('DINNER:') && currentDay) {
            mealPlan[currentDay].dinner = line.replace('DINNER:', '').trim();
        }
    });
    
    return mealPlan;
}

// Meal plan rendering
function renderMealPlan(mealPlan) {
    elements.mealPlanGrid.innerHTML = `
        <div class="day-plan">
            <h3>Day 1</h3>
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
            <h3>Day 2</h3>
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
            <h3>Day 3</h3>
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
        showLoading(true);
        if (isEditing && selectedRecipe) {
            await updateRecipe(selectedRecipe.id, recipeData);
            showSuccess('Recipe updated successfully!');
        } else {
            await saveRecipe(recipeData);
            showSuccess('Recipe shared successfully!');
        }
        closeModal('shareModal');
        elements.shareRecipeForm.reset();
        
        // Reload the current view to show the new recipe
        await switchView(currentView);
        
    } catch (error) {
        console.error('Error saving recipe:', error);
        showError('Failed to save recipe. Please try again.');
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
}

async function handleDeleteRecipe() {
    if (!selectedRecipe) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete the recipe "${selectedRecipe.title}"? This action cannot be undone.`);

    if (confirmDelete) {
        try {
            showLoading(true);
            await deleteRecipe(selectedRecipe.id);
            showSuccess('Recipe deleted successfully!');
            closeModal('recipeModal');
            await switchView(currentView);
        } catch (error) {
            console.error('Error deleting recipe:', error);
            showError('Failed to delete recipe. Please try again.');
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
function showLoading(show) {
    elements.loadingSpinner.style.display = show ? 'flex' : 'none';
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

// Export functions for global access if needed
window.CookiVerse = {
    toggleBookmark,
    openRecipeModal,
    generateRecipeFromIngredients,
    generateMealPlan
};

console.log('CookiVerse main.js loaded successfully');
