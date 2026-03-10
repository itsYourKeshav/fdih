/** @type {import('next').NextConfig} */
const apiHost = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `${apiHost}/api/:path*`,
			},
		];
	},
};
export default nextConfig;
