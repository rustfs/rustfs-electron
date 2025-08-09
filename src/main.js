import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

// 直接导入JSON文件确保构建时被正确处理
import zh from './i18n/zh.json'
import en from './i18n/en.json'

// 获取保存的语言设置
const savedLanguage = localStorage.getItem('language')
const browserLanguage = navigator.language.startsWith('zh') ? 'zh' : 'en'
const defaultLanguage = savedLanguage || browserLanguage || 'zh'

console.log('Language detection:', {
  saved: savedLanguage,
  browser: browserLanguage,
  final: defaultLanguage
})

// 创建 i18n 实例 - 使用Vue3推荐配置
const i18n = createI18n({
  legacy: false, // 使用Composition API模式
  locale: defaultLanguage,
  fallbackLocale: 'zh',
  messages: {
    zh,
    en
  },
  // 生产环境优化
  globalInjection: true,
//   silentTranslationWarn: process.env.NODE_ENV === 'production',
//   silentFallbackWarn: process.env.NODE_ENV === 'production'
})

// 验证翻译数据
console.log('I18n instance created:', {
  locale: i18n.global.locale.value,
  availableLocales: i18n.global.availableLocales,
  hasZhMessages: !!i18n.global.messages.value.zh,
  hasEnMessages: !!i18n.global.messages.value.en
})

// 测试翻译
const testTranslation = i18n.global.t('app.title')
console.log('Test translation result:', testTranslation)

if (testTranslation === 'app.title') {
  console.error('Translation failed - key not resolved!')
  console.log('Available message keys:', Object.keys(i18n.global.messages.value[defaultLanguage] || {}))
}

const app = createApp(App)
app.use(ElementPlus)
app.use(i18n)

app.mount('#app')

// 生产环境调试
if (process.env.NODE_ENV === 'production') {
  console.log('Production i18n debug:', {
    locale: i18n.global.locale.value,
    messages: Object.keys(i18n.global.messages.value),
    testTranslation: i18n.global.t('app.title')
  })
}

console.log('App mounted, current language:', i18n.global.locale.value)
console.log('Test translation on mount:', i18n.global.t('app.title'))