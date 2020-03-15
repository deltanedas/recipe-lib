# Recipe Lib

Adds a field `this.global.recipeLib`.

You can extend crafter blocks and add multiple recipes.

The current recipe is set in the configuration menu.

# How to use

Add `recipe-lib` to your `dependencies: []` in **mod.hjson**.

You may extend any function in the definition except:
* `update`: use `onUpdate`
* `configured`: use `onConfigured`
* `buildConfiguration`: use `onBuildConfiguration`

All of these functions may return false to cancel the default operation (setting recipe, processing it, etc.)

The configuration menu is a table of `<Output Item><Output Liquid> <space> <inputs>`
Any of the icons on one row will set the same recipe.

# Functions, fields and types

## `recipeLib#extend(Base extends Block, Entity extends TileEntity String name, Object def, Recipe[] recipes)`
	Like vanilla `extendContent(Base, name, def)`, but it also adds the multi recipe logic.
	If `def` is not `undefined` its functions are added **after** the base definition.
	It will validate the recipes array which must contain at least 1 recipe.

## `recipes`
	In the returned `Block` from extend(), it is an array of validated Recipes.
	**Set it in the `extend` function or you will need to validate it yourself!**

## `Block#crafted(Tile tile, int recipe)`
	Called when a recipe is crafted.
	To get the recipe object, use `this.recipes[recipe]`.
	Only called if not undefined.

## Recipe
	An object containing:
	* `Effect craftEffect = Fx.none`: created when a recipe is crafted.
	* `Effect updateEffect = Fx.none`: created randomly depending on `updateChance` when active.
	* `float updateChance = 0.04`: 0 to 1 of how often `updateEffect` should be created.
		Use `1 / 60` for roughly one effect per second active.
	* `float time = 80`: how long is takes, in ticks, to craft.
	* `Output output`: An object containing any one of:
		* `ItemStack item`
		* `LiquidStack liquid`
		It is required, but may be empty.
	* `Input input`: An object containing any one of:
		* `ItemStack[] items`
		* `LiquidStack liquid`
		* `float power = 1`: 60 power/second by default
		tile.entity.cons is created from this in `Block#configured`.
		It is required and **will throw an exception** during configuration if it is not an object or empty.

	Effects are only created if the chance (if any) is above 0 and it is not `undefined` or `Fx.none`.
	Like in JSON, you may define <type>Stacks with a String of "name/amount", or just "name" (not in JSON).
	Additionally, if it just a <type> it will be treated as a stack of 1.

See example code below:
```js
const recipeLib = this.global.recipeLib;
const factory = recipeLib.extend(GenericSmelter, GenericCrafter.GenericCrafterEntity, "scrap-factory", {
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
```
(set LOAD_EXAMPLE in main.js to `true` to run it)