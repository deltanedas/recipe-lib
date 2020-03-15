const defs = require ("recipe-lib/defs");
const lib = require ("recipe-lib/library");

module.exports = {
	extend(Base, Entity, name, def, recipes){
		const block = Object.create(lib.common);
		Object.assign(block, def || {}); // Merge def argument on top of default.

		const ret = extendContent(Base, name, def);
		const oldType = ret.entityType;
		ret.recipes = lib.validate(ret, recipes);
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
}