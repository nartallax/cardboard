import type {BoxInternal, BoxUpdateMeta, CalculatableBox} from "src/internal"

export abstract class BaseDependencyList {

	protected abstract updateKnownDependencies(): void

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox: BoxInternal<unknown> | undefined, meta: BoxUpdateMeta | undefined): void {
		const startingRevision = owner.revision
		const value = owner.calculate(changeSourceBox, meta)
		if(owner.revision === startingRevision){
			if(meta?.type === "recalc_on_get" && meta.owner === owner){
				// meta "recalc_on_get" is related to owner box, and can be propagated
				owner.set(value, changeSourceBox, meta)
			} else {
				// all other metas are related to source box, and should not be propagated
				// because then subscribers will receive meta for wrong box
				owner.set(value, changeSourceBox)
			}
		}

		this.updateKnownDependencies()
	}
}