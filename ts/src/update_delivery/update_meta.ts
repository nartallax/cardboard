/** Update meta is description of change made to value of a box.
 * Sometimes this library has more precise data on what's changed, rathen than "something changed";
 * it's called update meta.
 *
 * Having this data allows to skip sending useless updates to some subscribers,
 * which can lead to significant performance boost in some scenarios
 *
 * Sending no meta when there is meta won't lead to catastrophe, but sending wrong meta can. */
export type BoxUpdateMeta = {
	readonly type: "property_update"
	readonly propName: unknown
} | {
	readonly type: "array_item_update"
	readonly index: number
} | {
	readonly type: "array_items_insert"
	readonly index: number
	readonly count: number
} | {
	readonly type: "array_items_delete"
	readonly indexValuePairs: readonly {
		readonly index: number
		readonly value: unknown
	}[]
} | {
	readonly type: "array_items_delete_all"
}