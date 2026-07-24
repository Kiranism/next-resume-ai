// Raw-string imports for the resume guidance markdown (bundled via the
// asset/source webpack rule in next.config.js).
declare module '*.md' {
  const content: string;
  export default content;
}
