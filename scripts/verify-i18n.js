/*
 * @Author: defineconst
 * @Date: 2025-07-27 13:20:01
 * @LastEditors: defineconst
 * @LastEditTime: 2025-07-27 13:38:37
 * @Description: 
 */
const fs = require('fs')
const path = require('path')

// 检查构建后的文件是否包含翻译数据
const distPath = path.join(__dirname, '../dist')
const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8')

let translationsFound = false

// 查找main.js文件
const mainMatches = indexHtml.match(/main-[a-f0-9]+\.js/)
if (mainMatches) {
  const mainFile = path.join(distPath, 'assets', mainMatches[0])
  const content = fs.readFileSync(mainFile, 'utf8')
  
  // 检查是否包含翻译数据的关键字符串
  const hasChineseTranslations = content.includes('RustFS 管理器') || content.includes('设置') || content.includes('服务运行在')
  const hasEnglishTranslations = content.includes('RustFS Manager') || content.includes('Settings') || content.includes('Service is running')
  
  if (hasChineseTranslations && hasEnglishTranslations) {
    console.log('✅ I18n messages found in main bundle')
    console.log('✅ Both Chinese and English translations detected')
    translationsFound = true
  } else {
    console.log('ℹ️ Checking main bundle:')
    console.log(`  Chinese translations: ${hasChineseTranslations ? '✅' : '❌'}`)
    console.log(`  English translations: ${hasEnglishTranslations ? '✅' : '❌'}`)
  }
} else {
  console.error('❌ Main JS file not found')
}

// 查找所有JS文件中的翻译数据
const assetsDir = path.join(distPath, 'assets')
const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'))

for (const jsFile of jsFiles) {
  const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8')
  const hasChineseTranslations = content.includes('RustFS 管理器') || content.includes('设置') || content.includes('服务运行在')
  const hasEnglishTranslations = content.includes('RustFS Manager') || content.includes('Settings') || content.includes('Service is running')
  
  if (hasChineseTranslations && hasEnglishTranslations) {
    console.log(`✅ I18n messages found in ${jsFile}`)
    console.log('✅ Both Chinese and English translations detected')
    translationsFound = true
    break
  } else if (hasChineseTranslations || hasEnglishTranslations) {
    console.log(`ℹ️ Partial translations found in ${jsFile}:`)
    console.log(`  Chinese: ${hasChineseTranslations ? '✅' : '❌'}`)
    console.log(`  English: ${hasEnglishTranslations ? '✅' : '❌'}`)
  }
}

if (!translationsFound) {
  console.error('❌ I18n messages missing in build')
  process.exit(1)
} else {
  console.log('🎉 I18n verification passed!')
}