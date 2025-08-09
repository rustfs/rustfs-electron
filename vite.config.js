import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    base: './',
    build: {
        outDir: 'dist',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html')
            },
            output: {
                manualChunks: {
                    'vue-i18n': ['vue-i18n']
                    // 移除 i18n-messages 手动分块，让 Vite 自动处理
                },
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        commonjsOptions: {
            include: [/node_modules/, /src/],
            transformMixedEsModules: true
        },
        target: 'es2015',
        chunkSizeWarningLimit: 1000
    },
    server: {
        port: 5173,
        host: '0.0.0.0', // 或者使用 'localhost' 
        open: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    define: {
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: false,
        __INTLIFY_PROD_DEVTOOLS__: false
    },
    optimizeDeps: {
        include: ['vue-i18n', 'element-plus']
    }
    // 移除 assetsInclude 配置，让 Vite 正常处理 JSON 导入
})