import type { CSSProperties, JSX } from 'react';

export interface BoardProps {
  /** A board file, as Paradigm downloads it (.flowboard.json), already parsed. */
  file: unknown;
  /** Called with the new board file after each change (debounced). Leave it out for a board people can only look at. */
  onChange?: (file: unknown) => void;
  /** Show the board without any way to change it. */
  readOnly?: boolean;
  /** false hides the toolbars, leaving the board alone. */
  toolbar?: boolean;
  /** 'en' or 'zh'. Defaults to English. */
  lang?: 'en' | 'zh';
  /** Height of the board's box. Defaults to 480. It always fills the width. */
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export declare function Board(props: BoardProps): JSX.Element;
export default Board;
