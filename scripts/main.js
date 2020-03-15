// To load example from README.md
const LOAD_EXAMPLE = true;

if (this.global.recipeLib === undefined) {
	this.global.recipeLib = {};

	Object.assign(this.global.recipeLib, require("recipe-lib/library"));
	Object.assign(this.global.recipeLib, require("wrapper"));
	if (LOAD_EXAMPLE) {
		require("example");
	}
}