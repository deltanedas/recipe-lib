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

		trigger(){
			const arr = ret.consumes.all();
			for (var i in arr) {
				arr.trigger(ent);
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
			const items = this.recipes[entity.recipe].input.items
			for (var i = 0; i < items.length; i++){
				entity.items.remove(items[i]);
			}
		},

		valid(entity) {
			print("I am " + this + " - " + entity.tile);
			print("MY recipes are " + this.recipes);
			print("Entity recipe is " + entity.recipe);
			return entity.items !== null && entity.items.has(this.recipes[entity.recipe].input.items);
		}
	},
	TileEntity: {
		getRecipe() {
			return this._recipe;
		},
		setRecipe(set) {
			this._recipe = set;
		},
		_recipe: 0 // Index of `recipes` to craft
	}
}