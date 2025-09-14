import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
		  '/api': {
			target: 'http://localhost:3000', // 백엔드 서버 주소
			changeOrigin: true,
			secure: false,
		  }
		}
	  }
});
