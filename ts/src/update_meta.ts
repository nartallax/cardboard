export type UpdateMeta = {
	type: "array_item_update"
	index: number
} | {
	type: "property_update"
	propName: unknown
}