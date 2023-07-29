interface PerfEntry {
	name: string
	lastStart: number
	totalTime: number
	children: Record<string, PerfEntry>
}

const makeEntry = (name: string) => ({name, lastStart: 0, totalTime: 0, children: {}})

const root: PerfEntry = makeEntry("root")
const stack = [root]

export const perfStart = (name: string): void => {
	const stackTop = stack[stack.length - 1]!
	const entry = (stackTop.children[name] ||= makeEntry(name))
	entry.lastStart = performance.now()
	stack.push(entry)
}

export const perfEnd = (): void => {
	const stackTop = stack.pop()!
	stackTop.totalTime += performance.now() - stackTop.lastStart
}

export const perfEndStart = (name: string): void => {
	perfEnd()
	perfStart(name)
}

const depthOffsetStr = "  "
const columnSeparator = " | "

export const perfFormat = (): string => {
	return formatTable(entryToTable(root))
}

const formatTable = (table: string[][]): string => {
	if(table.length < 1){
		return ""
	}

	const colSizes: number[] = table[0]!.map(() => 0)
	for(const line of table){
		for(let i = 0; i < line.length; i++){
			colSizes[i] = Math.max(colSizes[i]!, line[i]!.length)
		}
	}

	return table.map(line =>
		line.map((cell, colIndex) =>
			whitePad(cell, colSizes[colIndex]!)
		).join(columnSeparator)
	).join("\n")
}

const entryToTable = (entry: PerfEntry, depth = 0, result: string[][] = []): string[][] => {
	result.push([
		new Array(depth + 1).fill(depthOffsetStr).join("") + entry.name,
		formatTime(entry.totalTime)
	])
	for(const child of Object.values(entry.children)){
		entryToTable(child, depth + 1, result)
	}
	return result
}

const formatTime = (time: number): string => time.toFixed(2) + "ms"

const whitePad = (str: string, length: number): string => {
	while(str.length < length){
		str += " "
	}
	return str
}