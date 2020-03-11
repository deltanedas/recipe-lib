// Set LOAD_EXAMPLE to true in main.js to load.

print("### Loaded example, make sure to disable before committing!");

// Code in readme below
const recipeLib = this.global.recipeLib;
const factory = recipeLib.extend(GenericSmelter, "scrap-factory", {
	crafted(tile, i) {
		const recipe = recipes[i];
		printf("Scrap Factory crafted " + (recipe.output.item || recipe.output.liquid));
	}
}, [ /* Recipes */
	// Scrap to slag mode
	{
		input: {items: [Items.scrap]},
		output: {item: Items.coal},
		time: 30
	},
	// Scrap to slag mode
	{
		input: {items: [Items.scrap], power: 0.5}, // Make it 2x cheaper than a melter
		output: {liquid: Liquids.slag},
		time: 15 // ... but 1.5x slower
	}
]);
factory.category = Category.crafting;
factory.buildVisibility = BuildVisibility.sandboxOnly;
factory.localizedName = "Scrap Factory";
factory.description = "Turns scrap into Coal, or melts it into slag.";