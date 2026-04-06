// middlewareClientMaxBodySize is a valid Next.js 16 config key not yet in the TS types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextConfig: any = {
  middlewareClientMaxBodySize: "50mb",
};

export default nextConfig;
