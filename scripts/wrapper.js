const recipeLib = this.global.recipeLib;

function _extend(Base, name, def, recipes){
	const block = Object.create(recipeLib.common);
	Object.assign(block, def || {}); // Merge def argument on top of default.

	const ret = extendContent(Base, name, def);
	const oldType = ret.entityType;
	ret.recipes = recipeLib.validate(ret, recipes);
	ret.entityType = prov(() => {
		const ent = Object.create(oldType.get().getClass()); // Work for any tile entity
		Object.assign(ent, {
			recipe: 0 // Index of `recipes` to craft
		});

		// Make recipes work, recreate entire consumemodule to use recipes
		print("ConsumeModule is " + ConsumeModule)
		ent.cons = extendContent(ConsumeModule, ent, {
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
				for (var cons in ret.consumes.all()) {
					if(cons.isOptional()) continue;

					if(docons && cons.isUpdate() && prevValid && cons.valid(entity)){
						cons.update(entity);
					}

					valid &= cons.valid(entity);
				}

				for (var cons in ret.consumes.optionals()) {
					if (docons && cons.isUpdate() && prevValid && cons.valid(entity)) {
						cons.update(entity);
					}

					optionalValid &= cons.valid(entity);
				}
			},

			trigger(){
				for (var cons in ret.consumes.all()) {
					cons.trigger(ent);
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
			}
		});
		ent.cons._valid = false;
		ent.cons._optionalValid = false;
		return ent;
	});

	// Make block respect the entity recipes modfication
	ret.consumes.add(extend(ConsumeItems, {
		trigger(entity) {
			const items = this.recipes[entity.recipe].input.items
			for (var i = 0; i < items.length; i++){
				entity.items.remove(items[i]);
			}
		},

		valid(entity) {
			return entity.items !== null && entity.items.has(this.recipes[entity.recipe].input.items);
		}
	}));
	return ret;
}

this.global.recipeLib.extend = _extend