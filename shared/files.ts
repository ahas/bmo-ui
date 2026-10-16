// How a name already taken in the folder a change lands in is settled: the change refused, the name
// taken over, the incoming file kept beside it under a new name, or the incoming file left out.
export type FileConflict = "refuse" | "replace" | "rename" | "skip";
