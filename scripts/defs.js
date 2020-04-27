const val = require("recipe-lib/validation");

module.exports = {
	ConsumeModule: {
		update() {
			// Everything is valid here
			const prevValid = this.valid();
			this._valid = true
			this._optionalValid = true;
			if (ent.tile.isEnemyCheat()) {
				return;
			}

			const docons = ret.shouldConsume(ent.tile) && ret.productionValid(ent.tile);

			// FIXME: make it work???
			var cons
			for (var i in ret.consumes.all()) {
				cons = ret.consumes.all()[i];
				if (cons.isOptional()) continue;

				if (docons && cons.isUpdate() && prevValid && cons.valid(entity)) {
					cons.update(entity);
				}

				this._valid &= cons.valid(entity);
			}

			for (var i in ret.consumes.optionals()) {
				cons = ret.consumes.optionals()[i];
				if (docons && cons.isUpdate() && prevValid && cons.valid(entity)) {
					cons.update(entity);
				}

				this._optionalValid &= cons.valid(entity);
			}
		},

		trigger() {
			const arr = ret.consumes.all();
			for (var i in arr) {
				arr[i].trigger(ent);
			}
		},

		valid(){
			return this._valid && ret.shouldConsume(ent.tile);
		},

		optionalValid(){
			return this.valid() && this._optionalValid;
		},

		// FIXME: I'm pretty sure this wastes a byte on the private valid
		write(stream) {
			stream.writeBoolean(this._valid);
		},

		read(stream) {
			this._valid = stream.readBoolean();
		},
		_valid: false,
		_optionalValid: false
	},

	ConsumeItems: {
		// Don't call if recipe is -1
		trigger(entity) {
			const items = entity.block.recipes[entity.recipe].input.items
			for (var i in items){
				entity.items.remove(items[i]);
			}
		},

		valid(entity) {
			const block = entity.block;
			return entity.items !== null && entity.items.has(block.recipes[entity.recipe].input.items);
		}
	},

	// This one is a function, not an object!
	ConsumeLiquids: block => { return {
		// Allow all potential liquids
		applyLiquidFilter(filter) {
			for (var r in block.recipes) {
				const liquids = block.recipes[r].input.liquids;
				for (var l in liquids) {
					filter.or(liquids[l].liquid.id);
				}
			}
		},

		build(tile, table) {
			var liquids = tile.block().recipes[tile.ent().recipe].input.liquids;
			for (var i in liquids || []) {
				var liquid = liquids[i];
				table.add(new ReqImage(liquid.liquid.icon(Cicon.medium), boolp(() => this.isValid(tile.entity, liquid)))).size(8 * 4);
			}
		},

		getIcon: () => "icon-liquid-consume",

		update(entity) {
			var liquids = entity.block.recipes[entity.recipe].input.liquids;
			for (var i in liquids) {
				var liquid = liquids[i];
				entity.liquids.remove(liquids.liquid, Math.min(liquid.amount, entity.liquids.get(liquids.liquid)));
			}
		},

		isValid(entity, stack) {
			if (!entity) return false;

			if (stack) return entity.liquids.get(stack.liquid) >= stack.amount;

			var liquids = entity.block.recipes[entity.recipe].input.liquids;
			for (var i in liquids || []) {
				var liquid = liquids[i];
				if (entity.liquids.get(liquid.liquid) < liquid.amount) return false;
			}
			return true;
		},

		display(stats) {
			// TODO: use entity somehow
			stats.add(this.booster ? BlockStat.booster : BlockStat.input, Liquids.slag, 5 * this.timePeriod, this.timePeriod == 60);
		}
	}; },

	TileEntity: {
		getRecipe: () => this._recipe,
		setRecipe: set => {this._recipe = set;},
		getProgress: () => this._progress,
		setProgress: set => {this._progress = set;},

		read(stream) {
			this._recipe = stream.readByte();

			const recipeCount = stream.readByte();
			for (var i = 0; i < recipeCount; i++) {
				// Store as a byte to save space
				this._progress[i] = stream.readByte() / 255;
			}
		},

		write(stream) {
			stream.writeByte(this._recipe);

			// Support adding recipes in the future
			stream.writeByte(this._progress.length);
			for (var i in this._progress) {
				stream.writeByte(this._progress[i] * 255);
			}
		},
		_recipe: -1, // Index of `recipes` to craft, -1 to disable
		_progress: {} // Map of recipe to progress
	},

	Block: {
		init() {
			this.super$init();
			val.recipes(this, this._recipes);

			this.recipeInputs = {};
			var stack, input, recipe;
			for (var r in this.recipes) {
				recipe = this.recipes[r];
				for (var i in recipe.input.items) {
					stack = recipe.input.items[i];
					input = this.recipeInputs[stack.item.id];
					if (input === undefined || input < stack.amount) {
						this.recipeInputs[stack.item.id] = stack.amount;
					}
				}
			}
		},

		update(tile) {
			if (this.onUpdate && !this.onUpdate(tile)) return;

			const entity = tile.ent();
			const recipe = this.recipes[entity.recipe];
			if (recipe == -1) return;

			const outputItem = recipe.output.item;
			const outputLiquid = recipe.output.liquid;

			if (entity.cons.valid()) {
				entity.progress[recipe] += this.getProgressIncrease(entity, recipe.time);
				entity.totalProgress += entity.delta();
				entity.warmup = Mathf.lerpDelta(entity.warmup, 1, 0.02);

				// Only create effects if needed
				if (recipe.updateEffect !== Fx.none && recipe.updateChance > 0) {
					if(Mathf.chance(Time.delta() * recipe.updateChance)){
						Effects.effect(recipe.updateEffect, entity.x + Mathf.range(this.size * 4), entity.y + Mathf.range(this.size * 4));
					}
				}
			} else {
				entity.warmup = Mathf.lerp(entity.warmup, 0, 0.02);
			}

			if (entity.progress[recipe] >= 1) {
				entity.cons.trigger();

				if (outputItem) {
					this.useContent(tile, outputItem.item);
					for (var i = 0; i < outputItem.amount; i++){
						this.offloadNear(tile, outputItem.item);
					}
				}

				if (outputLiquid) {
					this.useContent(tile, outputLiquid.liquid);
					this.handleLiquid(tile, tile, outputLiquid.liquid, outputLiquid.amount);
				}

				if (recipe.craftEffect !== Fx.none) {
					Effects.effect(recipe.craftEffect, tile.drawx(), tile.drawy());
				}
				entity.progress = 0;
				if (this.crafted) {
					this.crafted(tile, entity.recipe);
				}
			}

			if (outputItem && tile.entity.timer.get(this.timerDump, this.dumpTime)) {
				this.tryDump(tile, outputItem.item);
			}

			if (outputLiquid) {
				this.tryDumpLiquid(tile, outputLiquid.liquid);
			}
		},

		addOutputButton(tile, recipe, output, table) {
			var button = table.addImageButton(Tex.whiteui, Styles.clearToggleTransi, 24, run(() => Vars.control.input.frag.config.hideConfig())).get();
			button.changed(run(() => tile.configure(button.isChecked() ? recipe : -1)));
			button.getStyle().imageUp = new TextureRegionDrawable(output.icon(Cicon.medium));
			button.update(run(() => button.setChecked(recipe == tile.entity.recipe)));
		},

		addInputImage(input, table) {
			table.addImage(input.icon(Cicon.medium));
		},

		buildConfiguration(tile, table) {
			if (this.onBuildConfiguration && !this.onBuildConfiguration(tile, table)) {
				return;
			}

			var recipe;
			for (var r in this.recipes) {
				// TODO: when multiple outputs are supported, show all of them
				recipe = this.recipes[r];

				/* Created output button(s), click to set recipe */
				if (recipe.output.item) {
					this.addOutputButton(tile, r, recipe.output.item.item, table);
				}
				if (recipe.output.liquid) {
					this.addOutputButton(tile, r, recipe.output.liquid.liquid, table);
				}

				/* Create input images */
				table.addImage(Icon.left);
				for (var i in recipe.input.items || []) {
					this.addInputImage(recipe.input.items[i].item, table);
				}
				for (var i in recipe.input.liquids || []) {
					this.addInputImage(recipe.input.liquids[i].liquid, table);
				}

				table.row();
			}
		},

		configured(tile, player, recipe) {
			if (this.onConfigured && !this.onConfigured(tile, player, recipe)) {
				return;
			}

			if (recipe != -1 && recipe < 0 || recipe > this.recipes.length) {
				throw new ValidateException("Invalid recipe for tile " + tile + " configured by " + player + ": " + recipe);
			}
			tile.entity.recipe = recipe;
		},

		getMaximumAccepted(tile, item) {
			return this.recipeInputs[item.id] || 0;
		},
		acceptItem(item, tile, source) {
			return tile.entity.items.get(item) < this.getMaximumAccepted(tile, item);
		},

		getRecipes() {
			return this._recipes;
		},
		setRecipes(set) {
			this._recipes = set;
		},

		// Prevent bait n switching cheap recipes
		placed(tile) {
			if (Vars.net.client()) return;
			this.super$placed(tile);
			tile.entity._progress = {};
			for (var i = 0; i < this._recipes.length; i++) {
				tile.entity._progress[i] = 0;
			}
		}
	}
}
