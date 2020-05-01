const defs = require("recipe-lib/defs");

const _extend = (Block, Entity, name, def, recipes) => {
	const block = Object.create(defs.Block);
	Object.assign(block, def || {}); // Merge def argument on top of default.

	const ret = extendContent(Block, name, block);
	ret.configurable = true;
	ret.recipes = recipes;
	ret.entityType = prov(() => {
		const ent = extend(Entity, defs.TileEntity);

		// Make recipes work, recreate entire consumemodule to use recipes
		ent.cons = extendContent(ConsumeModule, ent, defs.ConsumeModule);
		return ent;
	});

	// Make block respect the entity recipes modfication
	ret.consumes.add(extend(ConsumeItems, defs.ConsumeItems));
	ret.consumes.add(extend(ConsumePower, defs.ConsumePower(ret)));
	// FIXME: Multiple liquids break everything oh no
	//ret.consumes.add(extendContent(ConsumeLiquidBase, 0, defs.ConsumeLiquids(ret)));
	return ret;
}

module.exports = {
	extend: _extend
}

