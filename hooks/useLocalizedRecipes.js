// hooks/useLocalizedRecipes.js
import { useLanguage } from '../contexts/LanguageContext';

export const useLocalizedRecipes = () => {
  const { locale } = useLanguage();

  const getLocalizedRecipe = (recipe) => {
    if (!recipe) return null;

    // If recipe has multi-language structure
    if (recipe.title && typeof recipe.title === 'object') {
      return {
        ...recipe,
        title: recipe.title[locale] || recipe.title.en || recipe.title,
        description: recipe.description ? 
          (recipe.description[locale] || recipe.description.en || recipe.description) : '',
        ingredients: recipe.ingredients ? 
          (recipe.ingredients[locale] || recipe.ingredients.en || recipe.ingredients) : '',
        steps: recipe.steps ? 
          (recipe.steps[locale] || recipe.steps.en || recipe.steps) : '',
        category: recipe.category ? 
          (recipe.category[locale] || recipe.category.en || recipe.category) : 'Unknown',
      };
    }

    // If recipe has old structure (single language), return as is
    return recipe;
  };

  const getLocalizedRecipes = (recipes) => {
    return recipes.map(recipe => getLocalizedRecipe(recipe));
  };

  return {
    getLocalizedRecipe,
    getLocalizedRecipes,
  };
};