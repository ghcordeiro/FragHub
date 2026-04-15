/** uuid package ships its own types in newer versions; this keeps tsc happy across installs. */
declare module 'uuid' {
  export function v4(): string;
}
