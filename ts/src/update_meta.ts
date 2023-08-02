/** Update meta is description of change made to value of a box.
 * Sometimes this library has more precise data on what's changed, rathen than "something changed";
 * it's called update meta.
 *
 * Having this data allows to skip sending useless updates to some subscribers,
 * which can lead to significant performance boost in some scenarios
 *
 * Sending no meta when there is meta won't lead to catastrophe, but sending wrong meta can. */
export type UpdateMeta = {
	type: "property_update"
	propName: unknown
} | {
	type: "array_item_update"
	index: number
} | {
	type: "array_item_insert"
	index: number
} | {
	type: "array_item_delete"
	index: number
	value: unknown
}