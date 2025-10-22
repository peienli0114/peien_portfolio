declare module '*.pdf' {
  const src: string;
  export default src;
}

declare const require: {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
  ): {
    keys(): string[];
    <T>(id: string): T;
  };
};
