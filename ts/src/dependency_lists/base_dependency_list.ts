import type {BoxInternal, CalculatableBox} from "src/internal"

export abstract class BaseDependencyList {

	protected abstract updateKnownDependencies(): void

	calculate<T>(owner: CalculatableBox<T>, changeSourceBox?: BoxInternal<unknown>): void {
		const startingRevision = owner.revision
		const value = owner.calculate()
		if(owner.revision === startingRevision){
			owner.set(value, changeSourceBox)
		}

		this.updateKnownDependencies()
	}
}