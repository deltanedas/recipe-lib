module.exports = {
	ConsumeModule: {
		update() {
			// Everything is valid here
			const prevValid = valid();
			this._valid = true
			this._optionalValid = true;
			if(ent.tile.isEnemyCheat()){
				return;
			}

			const docons = ret.shouldConsume(ent.tile) && ret.productionValid(ent.tile);

			// FIXME: make it work
			var cons
			for (var i in ret.consumes.all()) {
				cons = ret.consumes.all()[i];
				if(cons.isOptional()) continue;

				if(docons && cons.isUpdate() && prevValid && cons.valid(entity)){
					cons.update(entity);
				}

				valid &= cons.valid(entity);
			}

			for (var i in ret.consumes.optionals()) {
				cons = ret.consumes.optionals()[i];
				if (docons && cons.isUpdate() && prevValid && cons.valid(entity)) {
					cons.update(entity);
				}

				optionalValid &= cons.valid(entity);
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
	TileEntity: {
		getRecipe() {
			print("Recipe of " + this.tile + " is " + this._recipe)
			return this._recipe;
		},
		setRecipe(set) {
			print("Set recipe for " + this.tile + " to " + set)
			this._recipe = set;
		},

		write(stream) {
			this._recipe = stream.readByte();
		},
		read(stream) {
			stream.writeByte(this._recipe);
		},
		_recipe: 0 // Index of `recipes` to craft
	},
	Block: {
		init() {
			this.super$init();
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
			if (this.onUpdate !== undefined && !this.onUpdate(tile)) {
				return;
			}

			const entity = tile.ent();
			const recipe = this.recipes[entity.recipe];
			const outputItem = recipe.output.item;
			const outputLiquid = recipe.output.liquid;

			if (entity.cons.valid()) {

				entity.progress += this.getProgressIncrease(entity, recipe.time);
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

				if (recipe.craftEffect !== Fx.none) {
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
		},

		// FIXME: black background around outputs texture
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
			var recipe
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
				if (recipe.input.liquid) {
					this.addInputImage(recipe.input.liquid.liquid, table);
				}
				table.row();
			}
		},

		configured(tile, player, recipe) {
			if (recipe == -1) {
				print("FIXME: recipe cannot be deselected")
				return;
			}

			if (recipe < 0 || recipe > this.recipes.length) {
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
		}
	}
}