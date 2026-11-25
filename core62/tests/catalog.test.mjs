import assert from "node:assert/strict";
import {categoryOptions,sourceOptions,DEFAULT_CATEGORIES} from "../app/catalog.mjs";
assert.equal(new Map(categoryOptions([{id:"food",name:"مطاعم خاصة"}],["new"])).get("food"),"مطاعم خاصة");assert.equal(new Map(categoryOptions([],["new"])).get("new"),"new");assert.equal(new Map(sourceOptions()).get("social"),"الضمان الاجتماعي");assert.equal(DEFAULT_CATEGORIES.length,11);console.log("Established category and income source catalog passed.");
