const DEFAULT_POWER = 1.0;

const common = {
	update(tile) {
		if (this.onUpdate !== undefined && !this.onUpdate(tile)) {
			return;
		}

		const entity = tile.ent();
		const recipe = this.recipes[entity.recipe];
		const outputItem = recipe.output.item;
		const outputLiquid = recipe.output.liquid;

		if (entity.cons.valid()) {

			entity.progress += this.getProgressIncrease(entity, recipe.craftTime);
			entity.totalProgress += entity.delta();
			entity.warmup = Mathf.lerpDelta(entity.warmup, 1, 0.02);

			// Only create effects if needed
			if (recipe.updateEffect !== null && recipe.updateEffect !== Fx.none && recipe.updateChance > 0) {
				if(Mathf.chance(Time.delta() * recipe.updateChance)){
					Effects.effect(recipe.updateEffect, entity.x + Mathf.range(this.size * 4), entity.y + Mathf.range(this.size * 4));
				}
			}
		} else {
			entity.warmup = Mathf.lerp(entity.warmup, 0, 0.02);
		}

		if (entity.progress >= 1) {
			entity.cons.trigger();

			if (outputItem !== undefined) {
				this.useContent(tile, outputItem.item);
				for (var i = 0; i < outputItem.amount; i++){
					this.offloadNear(tile, outputItem.item);
				}
			}

			if (outputLiquid !== undefined){
				this.useContent(tile, outputLiquid.liquid);
				this.handleLiquid(tile, tile, outputLiquid.liquid, outputLiquid.amount);
			}

			if (recipe.craftEffect !== undefined && recipe.craftEffect !== Fx.none) {
				Effects.effect(recipe.craftEffect, tile.drawx(), tile.drawy());
			}
			entity.progress = 0;
			if (this.crafted !== undefined) {
				this.crafted(tile, entity.recipe);
			}
		}

		if (outputItem !== undefined && tile.entity.timer.get(this.timerDump, this.dumpTime)) {
			this.tryDump(tile, outputItem.item);
		}

		if (outputLiquid !== undefined) {
			this.tryDumpLiquid(tile, outputLiquid.liquid);
		}
	}
};

function validateStack(input, Type, Stack, contentType) {
	if (input !== undefined) {
		if (typeof(input) == "string") {
			const name, amount = input.match(/([a-z\-]+)(?:\/\d+)?/);
			if (name === undefined) {
				throw "Invalid string for " + Stack + ": '" + input + "'";
			}

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

function validate(block, recipes) {
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
		// Validate outputs
		validateArray(recipe.output.items, Item, ItemStack, ContentType.item);
		validateArray(recipe.output.liquids, Liquid, LiquidStack, ContentType.liquid);
		*/

		recipe.output.item = validateStack(recipe.output.item, Item, ItemStack, ContentType.item);
		recipe.output.liquid = validateStack(recipe.output.liquid, Liquid, LiquidStack, ContentType.liquid);

		// Make life easier
		block.hasPower = true;
		if (recipe.input.items !== undefined) {
			block.hasItems = true;
		}
		if (recipe.input.liquid !== undefined) {
			block.hasLiquids = true;
		}
	}
}

this.global.recipeLib.common = common
this.global.recipeLib.validate = validate;