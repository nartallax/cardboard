import type {BoxInternal, BoxUpdateMeta, CalculatableBox} from "src/internal"

export abstract class BaseDependencyList {

	protected abstract updateKnownDependencies(): void

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox: BoxInternal<unknown> | undefined, meta: BoxUpdateMeta | undefined): void {
		const startingRevision = owner.revision
		const value = owner.calculate(changeSourceBox, meta)
		if(owner.revision === startingRevision){
			owner.set(value, changeSourceBox)
		}

		this.updateKnownDependencies()
	}
}