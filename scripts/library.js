const defs = require("recipe-lib/defs");

const DEFAULT_POWER = 1.0;

function validateStack(input, Type, Stack, contentType) {
	if (input !== undefined) {
		if (typeof(input) == "string") {
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
}

function validateArray(arr, Type, Stack, contentType) {
	if (arr !== undefined) {
		for (var i = 0; i < arr.length; i++) {
			arr[i] = validateStack(arr[i], Type, Stack, contentType);
		}
	}
}

function _validate(block, recipes) {
	if (recipes === undefined || recipes.length == 0) {
		throw new IllegalArgumentException("There must be at least 1 recipe for " + block.name);
	}

	var recipe;
	for (var i = 0; i < recipes.length; i++) {
		const err = "Recipe " + (i + 1) + " of " + block.name + " ";
		recipe = recipes[i];
		if (typeof(recipe) !== "object") {
			throw err + "is not an object";
		}

		if (typeof(recipe.input) !== "object" || (recipe.input.items === undefined && recipe.input.liquid === undefined)) {
			throw err + "has invalid input";
		}

		if (typeof(recipe.output) !== "object") {
			throw err + "has invalid output";
		}

		// Validate input
		recipe.input.power = recipe.input.power || DEFAULT_POWER;
		validateArray(recipe.input.items, Item, ItemStack, ContentType.item);
		recipe.input.liquid = validateStack(recipe.input.liquid, Liquid, LiquidStack, ContentType.liquid);
		// TODO: Add multiple liquid inputs support
		//validateArray(recipe.input.liquids, Liquid, LiquidStack, ContentType.liquid);

		/* TODO: Add multiple <type> outputs support
		 *	// Validate outputs
		 *	validateArray(recipe.output.items, Item, ItemStack, ContentType.item);
		 *	validateArray(recipe.output.liquids, Liquid, LiquidStack, ContentType.liquid);
		 */

		recipe.output.item = validateStack(recipe.output.item, Item, ItemStack, ContentType.item);
		recipe.output.liquid = validateStack(recipe.output.liquid, Liquid, LiquidStack, ContentType.liquid);

		// Make life easier
		block.hasPower = true;
		if (recipe.input.items || recipe.output.item) {
			block.hasItems = true;
		}
		if (recipe.input.liquid || recipe.output.liquid) {
			block.hasLiquids = true;
		}

		recipe.updateEffect = recipe.updateEffect || Fx.none;
		recipe.craftEffect = recipe.craftEffect || Fx.none;
		recipe.updateChance = recipe.updateChance || 0.04;
	}
	return recipes;
}

function _extend(Base, Entity, name, def, recipes) {
	const block = Object.create(defs.Block);
	Object.assign(block, def || {}); // Merge def argument on top of default.

	const ret = extendContent(Base, name, block);
	ret.configurable = true;
	ret.recipes = _validate(ret, recipes);
	ret.entityType = prov(() => {
		const ent = extend(Entity, defs.TileEntity);

		// Make recipes work, recreate entire consumemodule to use recipes
		ent.cons = extendContent(ConsumeModule, ent, defs.ConsumeModule);
		return ent;
	});

	// Make block respect the entity recipes modfication
	ret.consumes.add(extend(ConsumeItems, defs.ConsumeItems));
	return ret;
}

module.exports = {
	validate: _validate,
	extend: _extend
}