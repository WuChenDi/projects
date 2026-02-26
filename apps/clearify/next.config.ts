import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'notes-wudi.pages.dev',
      },
    ],
  },
  // webpack: (config) => {
  //   // webpack: (config, { isServer }) => {
  //   // // Enable WebAssembly support
  //   // if (!isServer) {
  //   //   config.experiments = {
  //   //     ...config.experiments,
  //   //     asyncWebAssembly: true
  //   //   }
  //   //   // Handle .wasm files
  //   //   config.module.rules.push({
  //   //     test: /\.wasm$/,
  //   //     type: 'asset/resource',
  //   //     generator: {
  //   //       filename: 'static/wasm/[name].[hash][ext]'
  //   //     }
  //   //   })
  //   // }

  //   // Worker loader
  //   config.module.rules.push({
  //     test: /\.worker\.ts$/, // /\.worker\.(js|mjs)$/
  //     loader: 'worker-loader',
  //     options: {
  //       filename: 'static/[name].[hash].js',
  //       publicPath: '/_next/',
  //     },
  //   })
  //   return config
  // },
}

export default nextConfig
