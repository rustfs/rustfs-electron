<template>
  <div class="service-settings">
    <el-form :model="form" label-width="120px" @submit.prevent>
      <el-form-item :label="$t('settings.serviceAddress')">
        <div class="address-inputs">
          <el-input 
            v-model="form.host" 
            :placeholder="$t('settings.hostPlaceholder')"
            style="width: 200px;"
          />
          <span class="separator">:</span>
          <el-input 
            v-model.number="form.port" 
            type="number"
            :placeholder="$t('settings.portPlaceholder')"
            style="width: 100px;"
          />
        </div>
        <div class="help-text">
          {{ $t('settings.serviceAddressHelp') }}
        </div>
      </el-form-item>
      
      <el-form-item :label="$t('settings.storagePath')">
        <el-input 
          v-model="form.storagePath" 
          :placeholder="$t('settings.storagePathPlaceholder')"
        />
        <div class="help-text">
          {{ $t('settings.storagePathHelp') }}
        </div>
      </el-form-item>
      
      <div class="form-actions">
        <el-button @click="goBack">{{ $t('common.back') }}</el-button>
        <el-button @click="resetForm">{{ $t('common.reset') }}</el-button>
        <el-button type="primary" @click="saveSettings">{{ $t('common.saveAndRestart') }}</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 定义事件发射器
const emit = defineEmits(['close'])

const form = ref({
  host: '127.0.0.1',
  port: 9000,
  storagePath: 'D:\\rustfs-file'
})

// 返回按钮点击处理 - 隐藏设置窗体
const goBack = () => {
  // 发送关闭事件给父组件
  emit('close')
}

// 保存配置到config.json并智能重启服务
const saveSettings = async () => {
  try {
    // 先获取当前完整配置
    const currentConfigResult = await window.electronAPI.loadConfig()
    let fullConfig = {
      host: '127.0.0.1',
      port: 9000,
      storagePath: 'D:\\rustfs-file',
      username: 'rustfsadmin',
      password: 'rustfsadmin'
    }
    
    if (currentConfigResult.success) {
      fullConfig = currentConfigResult.config
    }
    
    // 更新服务相关配置，保留用户名和密码
    const updatedConfig = {
      ...fullConfig,
      host: form.value.host,
      port: form.value.port,
      storagePath: form.value.storagePath
      // 保持原有的username和password不变
    }
    
    // 保存到config.json
    const result = await window.electronAPI.saveConfig(updatedConfig)
    if (result.success) {
      ElMessage.success(t('messages.settingsSaved'))
      
      // 检查服务是否正在运行
      const status = await window.electronAPI.getRustFSStatus()
      if (status.isRunning) {
        ElMessage.info('正在重启服务以应用新配置...')
        
        // 停止当前服务
        const stopResult = await window.electronAPI.stopRustFS()
        if (stopResult.success) {
          // 等待一小段时间确保服务完全停止
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // 使用新配置启动服务
          const startResult = await window.electronAPI.startRustFS(updatedConfig)
          if (startResult.success) {
            ElMessage.success('服务已使用新配置重启')
          } else {
            ElMessage.error(`重启服务失败: ${startResult.message}`)
          }
        } else {
          ElMessage.error(`停止服务失败: ${stopResult.message}`)
        }
      } else {
        // 如果服务没有启动，基于保存的参数启动服务
        ElMessage.info('正在使用新配置启动服务...')
        const startResult = await window.electronAPI.startRustFS(updatedConfig)
        if (startResult.success) {
          ElMessage.success('服务已使用新配置启动')
        } else {
          ElMessage.error(`启动服务失败: ${startResult.message}`)
        }
      }
    } else {
      ElMessage.error(result.message || '保存配置失败')
    }
  } catch (error) {
    console.error('保存设置时发生错误:', error)
    ElMessage.error('保存配置时发生错误')
  }
}

// 重置表单 - 包含完整的默认配置
const resetForm = () => {
  form.value = {
    host: '127.0.0.1',
    port: 9000,
    storagePath: 'D:\\rustfs-file'
  }
}

// 组件挂载时加载配置
onMounted(async () => {
  try {
    const result = await window.electronAPI.loadConfig()
    if (result.success) {
      // 只更新服务相关的配置项
      form.value = {
        host: result.config.host || '127.0.0.1',
        port: result.config.port || 9000,
        storagePath: result.config.storagePath || 'D:\\rustfs-file'
      }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
})
</script>

<style scoped>
.service-settings {
  padding: 20px 0;
}

.address-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.separator {
  font-weight: bold;
  color: #666;
}

.help-text {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
</style>