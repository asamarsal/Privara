const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.resolve(__dirname, '..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@privara/shared'],
  webpack: (config, { webpack }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(?:@base-org\/account|@coinbase\/wallet-sdk|@metamask\/connect-evm|porto(?:\/internal)?|@safe-global\/safe-apps-sdk|@safe-global\/safe-apps-provider|@walletconnect\/ethereum-provider|accounts)$/,
      })
    );
    
    return config;
  },
}

module.exports = nextConfig
