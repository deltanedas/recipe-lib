// To load example from README.md
const LOAD_EXAMPLE = true;

if (this.global.recipeLib === undefined) {
	this.global.recipeLib = require("recipe-lib/library");
	if (LOAD_EXAMPLE) {
		require("example");
	}
}