const defaults = require("recipe-lib/defaults");
var val = {};

val.stack = (input, Type, Stack, contentType) => {
	if (input !== undefined) {
		if (typeof(input) == "string") {
			// Syntax is like json "item amount" but amount is optional.
			const match = input.match(/([a-z\-_]+)(?:\/(\d+?))?/);
			if (match === null) {
				throw "Invalid string for " + Stack + ": '" + input + "'";
			}

			const name = match[1], amount = match[2];
			const item = Vars.content.getByName(contentType, name);
			if (item === null) {
				throw "Unknown item '" + name + "'";
			}
			return new Stack(item, amount || 1)
		} else if (input instanceof Stack) {
			return input;
		} else if (input instanceof Type) {
			return new Stack(input, 1);
		}
		throw "Invalid type " + input + ", expected String, " + Type + " or " + Stack;
	}
};

val.array = (arr, Type, Stack, contentType) => {
	if (arr !== undefined) {
		for (var i = 0; i < arr.length; i++) {
			arr[i] = val.stack(arr[i], Type, Stack, contentType);
		}
	}
};

val.effects = (recipe, effects) => {
	for (var i in effects) {
		const effect = effects[i] + "Effect";
		recipe[effect] = recipe[effect] || Fx.none;
	}
};

val.recipe = (block, recipes, i) => {
	const err = "Recipe " + (i + 1) + " of " + block.name + " ";
	const recipe = recipes[i];
	if (typeof(recipe) !== "object") throw err + "is not an object";

	const input = recipe.input;
	if (typeof(input) !== "object") throw err + "has invalid input";

	const output = recipe.output;
	if (typeof(output) !== "object") throw err + "has invalid output";

	// Validate input
	input.power = input.power || defaults.power;
	val.array(input.items, Item, ItemStack, ContentType.item);
	val.array(input.liquids, Liquid, LiquidStack, ContentType.liquid);

	/* TODO: Add multiple <type> outputs support
	// Validate outputs
	val.array(output.items, Item, ItemStack, ContentType.item);
	val.array(output.liquids, Liquid, LiquidStack, ContentType.liquid);
	*/

	output.item = val.stack(recipe.output.item, Item, ItemStack, ContentType.item);
	output.liquid = val.stack(recipe.output.liquid, Liquid, LiquidStack, ContentType.liquid);

	// Make life easier
	if (input.power > 0) block.hasPower = true;
	if (input.items || output.item) block.hasItems = true;
	if (input.liquids || output.liquid) block.hasLiquids = true;
	if (output.liquid) block.outputsLiquid = true;

	val.effects(recipe, ["update", "craft"]);
	recipe.updateChance = recipe.updateChance || 0.04;
};

val.recipes = block => {
	const recipes = block.recipes;
	if (!recipes || recipes.length == 0) {
		throw "There must be at least 1 recipe for " + block.name;
	}

	for (var i in recipes) {
		val.recipe(block, recipes, i);
	}
}

module.exports = val;
