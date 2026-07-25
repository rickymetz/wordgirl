import type { PuzzleDef } from "../engine/types";

interface Props {
  puzzle: PuzzleDef;
  /** Wrapper class — sets the credit's colour and size. */
  className?: string;
  /** Class for the author line, which sits under the title. */
  authorClass?: string;
}

/**
 * The poem's credit above the board: the title, whether the phrase is
 * the whole poem or a piece of it, and the poet.
 *
 * A title that would give the phrase away is withheld — a poem cited by
 * its first line prints the answer otherwise. What is left is still
 * true: "from a poem by Dickinson".
 */
export function PoemCredit({ puzzle, className, authorClass }: Props) {
  const source = puzzle.titleSpoils ? (
    puzzle.excerpt ? "from a poem" : null
  ) : (
    <>
      {puzzle.excerpt && "from "}
      <span className="italic">&ldquo;{puzzle.title}&rdquo;</span>
    </>
  );

  return (
    <div className={className}>
      {source && <div>{source}</div>}
      <div className={authorClass}>
        by <em>{puzzle.author}</em>
      </div>
    </div>
  );
}
