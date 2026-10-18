/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers(){return[{source:'/ai-center/sw.js',headers:[{key:'Service-Worker-Allowed',value:'/ai-center'},{key:'Cache-Control',value:'no-store'}]}];},
  images: { unoptimized: true, remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }] },
};
export default nextConfig;
