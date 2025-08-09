<template>
  <div id="app">
    <el-container class="app-container">
      <!-- Header -->
      <el-header class="app-header">
        <div class="header-left">
          <h2>{{ $t('app.title') }}</h2>
        </div>
        <div class="header-right">
          <el-button 
            :icon="Setting" 
            circle 
            @click="showSettings = true"
            :title="$t('common.settings')"
          />
          <el-dropdown @command="changeLanguage">
            <el-button :icon="Switch" circle />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="zh">中文</el-dropdown-item>
                <el-dropdown-item command="en">English</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- Main Content -->
      <el-main class="app-main">
        <MainDashboard 
          v-if="currentView === 'dashboard'"
          @show-settings="showSettings = true"
        />
      </el-main>
    </el-container>

    <!-- Settings Dialog -->
    <el-dialog 
      v-model="showSettings" 
      :title="$t('common.settings')"
      width="600px"
      :before-close="handleSettingsClose"
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="$t('settings.service')" name="service">
          <ServiceSettings @close="showSettings = false" />
        </el-tab-pane>
        <el-tab-pane :label="$t('settings.user')" name="user">
          <UserSettings @close="showSettings = false" />
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Setting, Switch } from '@element-plus/icons-vue'
import MainDashboard from './components/MainDashboard.vue'
import ServiceSettings from './components/ServiceSettings.vue'
import UserSettings from './components/UserSettings.vue'

const { locale, t } = useI18n()

// 响应式变量定义
const showSettings = ref(false)
const currentView = ref('dashboard')
const activeTab = ref('service')
const currentLanguage = ref(localStorage.getItem('language') || 'zh')

// 改进语言切换函数
const changeLanguage = (lang) => {
  console.log('Switching language to:', lang)
  currentLanguage.value = lang
  locale.value = lang
  localStorage.setItem('language', lang)
  
  // 强制重新渲染以确保翻译生效
  nextTick(() => {
    console.log('Language switched, current locale:', locale.value)
    console.log('Test translation:', t('app.title'))
  })
}

// 设置对话框关闭处理
const handleSettingsClose = (done) => {
  done()
}

onMounted(() => {
  // 确保语言设置一致
  const savedLang = localStorage.getItem('language') || 'zh'
  currentLanguage.value = savedLang
  locale.value = savedLang
  console.log('App mounted, current language:', savedLang)
  console.log('Test translation on mount:', t('app.title'))
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
  background: #f5f5f5;
}

.app-container {
  height: 100vh;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left h2 {
  color: #409eff;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.app-main {
  padding: 20px;
  background: #f5f5f5;
}
</style>