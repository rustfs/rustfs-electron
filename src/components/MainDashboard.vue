<template>
    <div class="dashboard">
        <div class="status-card">
            <div class="logo-section">
                <div class="logo-circle">
                    <span class="logo-text">RUSTFS</span>
                </div>
            </div>

            <div class="status-info">
                <h3>{{ $t('dashboard.serviceStatus') }}</h3>
                <el-link @click="handleServiceAddressClick" type="primary" class="service-address-link"
                    :class="{ 'service-running': isRunning, 'service-stopped': !isRunning }">
                    {{ serviceAddress }}
                </el-link>
            </div>

            <div class="control-section">
                <el-button :type="isRunning ? 'danger' : 'primary'" size="large" @click="toggleService"
                    :loading="isLoading" class="control-button">
                    <el-icon>
                        <VideoPlay v-if="!isRunning" />
                        <VideoPause v-else />
                    </el-icon>
                    {{ isRunning ? $t('dashboard.serviceRunning') : $t('dashboard.startService') }}
                </el-button>
            </div>
        </div>

        <div class="footer-links">
            <el-link @click="openExternalLink('https://rustfs.com/')" type="primary">{{ $t('footer.website')
            }}</el-link>
            <el-link @click="openExternalLink('https://rustfs.com/docs')" type="primary">{{ $t('footer.documentation')
            }}</el-link>
            <el-link @click="openExternalLink('#')" type="primary">Github</el-link>
            <el-link @click="openExternalLink('#')" type="primary">License</el-link>
        </div>

        <div class="footer-copyright">
            <p>© rustfs.com 2025, All rights reserved.</p>
            <p>version v1.0.0</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const isRunning = ref(false)
const isLoading = ref(false)
const serviceAddress = ref('127.0.0.1:9000')
const statusInterval = ref(null) // Add this line to declare statusInterval

const config = ref({
    host: '127.0.0.1',
    port: 9000,
    storagePath: 'D:\\rustfs-file',
    username: 'rustfsadmin',
    password: ''
})

// 加载配置并更新服务地址显示
const loadConfigAndUpdateDisplay = async () => {
    try {
        const configResult = await window.electronAPI.loadConfig()
        if (configResult.success) {
            config.value = configResult.config
            serviceAddress.value = `${config.value.host}:${config.value.port}`
            console.log('Config loaded and display updated:', config.value)
        } else {
            console.error('Failed to load config:', configResult.message)
            // 使用默认配置更新显示
            serviceAddress.value = `${config.value.host}:${config.value.port}`
        }
    } catch (error) {
        console.error('Error loading config:', error)
        serviceAddress.value = `${config.value.host}:${config.value.port}`
    }
}

const checkServiceStatus = async () => {
    try {
        // 添加防御性检查
        if (!window.electronAPI) {
            console.error('Electron API not available')
            return
        }

        const status = await window.electronAPI.getRustFSStatus()
        const wasRunning = isRunning.value
        
        // 首先检查进程状态
        if (status.isRunning) {
            // 进程存在时，进一步检查端口是否可用
            const isPortOpen = await window.electronAPI.checkRustFSPort(config.value.host, config.value.port)
            isRunning.value = isPortOpen
            
            if (isPortOpen && !wasRunning) {
                // 服务刚刚启动，显示提示
                ElMessage({
                    message: 'RustFS 服务已检测到正在运行',
                    type: 'success',
                    duration: 3000,
                    showClose: true
                })
            }
        } else {
            // 进程不存在，服务肯定未运行
            isRunning.value = false
        }
        
        // 如果状态发生变化，强制更新配置显示
        if (wasRunning !== isRunning.value) {
            await loadConfigAndUpdateDisplay()
        }
    } catch (error) {
        console.error('Failed to check service status:', error)
        // 出错时保守地设置为未运行状态
        isRunning.value = false
    }
}

const toggleService = async () => {
    if (!window.electronAPI) {
        ElMessage.error('Electron API 不可用')
        return
    }

    isLoading.value = true

    try {
        if (isRunning.value) {
            // 停止服务前确认
            const confirmResult = await ElMessageBox.confirm(
                '确定要停止 RustFS 服务吗？',
                '确认操作',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            )
            
            if (confirmResult === 'confirm') {
                const result = await window.electronAPI.stopRustFS()
                if (result.success) {
                    isRunning.value = false
                    ElMessage.success(t('messages.serviceStopped'))
                } else {
                    ElMessage.error(result.message)
                }
            }
        } else {
            // 启动服务前检查是否已经有进程在运行
            const currentStatus = await window.electronAPI.getRustFSStatus()
            if (currentStatus.isRunning) {
                // 服务已经在运行，询问是否关闭设置窗体
                const confirmResult = await ElMessageBox.confirm(
                    'RustFS 服务已经在运行中。是否关闭参数设置窗体？',
                    '服务已启动',
                    {
                        confirmButtonText: '关闭设置窗体',
                        cancelButtonText: '保持打开',
                        type: 'info',
                    }
                )
                
                isRunning.value = true
                ElMessage.success('RustFS 服务已在运行中')
                
                if (confirmResult === 'confirm') {
                    // 发送事件关闭设置窗体（如果有的话）
                    if (window.electronAPI.closeSettingsWindow) {
                        await window.electronAPI.closeSettingsWindow()
                    }
                }
                return
            }

            // 启动服务前从config.json获取最新配置
            const configResult = await window.electronAPI.loadConfig()
            let latestConfig = {
                host: '127.0.0.1',
                port: 9000,
                storagePath: 'D:\\rustfs-file',
                username: 'rustfsadmin',
                password: ''
            }

            if (configResult.success) {
                latestConfig = configResult.config
                // 更新本地配置和显示
                config.value = latestConfig
                serviceAddress.value = `${latestConfig.host}:${latestConfig.port}`
                console.log('从config.json加载的配置:', latestConfig)
            } else {
                console.error('加载配置失败，使用默认配置:', configResult.message)
            }

            // 启动服务
            const result = await window.electronAPI.startRustFS(latestConfig)
            if (result.success) {
                isRunning.value = true
                ElMessage.success(t('messages.serviceStarted'))
            } else {
                ElMessage.error(result.message)
            }
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('切换服务状态时发生错误:', error)
            ElMessage.error(error.message || '操作失败')
        }
    } finally {
        isLoading.value = false
    }
}

// 处理服务地址点击事件
const handleServiceAddressClick = async () => {
    console.log('handleServiceAddressClick 被调用')
    console.log('当前服务状态 isRunning:', isRunning.value)

    if (!isRunning.value) {
        console.log('服务未运行，显示警告消息')
        // 服务未运行时的提示
        try {
            ElMessage({
                message: '服务未启动，请先启动 RustFS 服务',
                type: 'warning',
                duration: 3000,
                showClose: true
            })
            console.log('警告消息已发送')
        } catch (error) {
            console.error('ElMessage 错误:', error)
            // 备用提示方式
            alert('服务未启动，请先启动 RustFS 服务')
        }
        return
    }

    console.log('服务正在运行，准备打开浏览器')
    try {
        // 服务运行时，构建完整的服务URL
        const serviceUrl = `http://${config.value.host}:${config.value.port}`

        // 显示用户名和密码信息
        const credentials = `用户名: ${config.value.username}\n密码: ${config.value.password || '(未设置)'}`

        // 显示凭据信息和服务地址
        ElMessage({
            message: `正在打开 RustFS 服务...\n\n服务地址: ${serviceUrl}\n${credentials}\n\n请在浏览器中使用以上凭据登录`,
            type: 'info',
            duration: 6000,
            showClose: true,
            dangerouslyUseHTMLString: false
        })

        // 延迟一下再打开浏览器，让用户看到提示信息
        setTimeout(async () => {
            if (window.electronAPI) {
                const result = await window.electronAPI.openExternal(serviceUrl)
                if (!result.success) {
                    console.error('Failed to open service URL:', result.error)
                    ElMessage.error('无法打开浏览器，请手动访问: ' + serviceUrl)
                }
            } else {
                // 浏览器环境（开发模式）
                window.open(serviceUrl, '_blank')
            }
        }, 1000)

    } catch (error) {
        console.error('Error opening service URL:', error)
        ElMessage.error('打开服务地址时发生错误')
    }
}

// 打开外部链接的方法
const openExternalLink = async (url) => {
    if (url === '#') {
        console.log('Link not configured yet')
        return
    }

    if (window.electronAPI) {
        // Electron 环境
        try {
            const result = await window.electronAPI.openExternal(url)
            if (!result.success) {
                console.error('Failed to open external link:', result.error)
            }
        } catch (error) {
            console.error('Error opening external link:', error)
        }
    } else {
        // 浏览器环境（开发模式）
        window.open(url, '_blank')
    }
}

// 在onMounted中添加配置变化监听
onMounted(() => {
    setTimeout(async () => {
        if (window.electronAPI) {
            await loadConfigAndUpdateDisplay()
            checkServiceStatus()
            // 减少检查间隔，提高响应性
            statusInterval.value = setInterval(checkServiceStatus, 2000)

            // 监听服务错误事件
            window.electronAPI.onRustFSError((event, error) => {
                ElMessage.error(`Service error: ${error}`)
                isRunning.value = false
            })

            // 监听服务停止事件
            window.electronAPI.onRustFSStopped((event, code) => {
                ElMessage.warning(`Service stopped with code: ${code}`)
                isRunning.value = false
            })

            // 监听RustFS stderr输出
            window.electronAPI.onRustFSStderr((event, stderrMessage) => {
                console.error('RustFS stderr:', stderrMessage)
                ElMessage({
                    message: `RustFS stderr: ${stderrMessage.trim()}`,
                    type: 'error',
                    duration: 8000,
                    showClose: true,
                    dangerouslyUseHTMLString: false
                })
            })
            
            // 添加配置变化监听
            window.addEventListener('focus', async () => {
                // 窗口获得焦点时重新检查状态
                await loadConfigAndUpdateDisplay()
                await checkServiceStatus()
            })

        } else {
            console.error('Electron API not available - running in browser mode')
            ElMessage.warning('应用程序需要在 Electron 环境中运行')
        }
    }, 100)
})

onUnmounted(() => {
    if (statusInterval.value) {
        clearInterval(statusInterval.value)
    }

    if (window.electronAPI) {
        window.electronAPI.removeAllListeners('rustfs-error')
        window.electronAPI.removeAllListeners('rustfs-stopped')
        window.electronAPI.removeAllListeners('rustfs-stderr')
    }
})
</script>

<style scoped>
.dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    text-align: center;
}

.status-card {
    background: white;
    border-radius: 12px;
    padding: 40px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 40px;
    min-width: 400px;
}

.logo-section {
    margin-bottom: 30px;
}

.logo-circle {
    width: 120px;
    height: 120px;
    border: 3px solid #409eff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    background: white;
}

.logo-text {
    font-size: 18px;
    font-weight: bold;
    color: #409eff;
    letter-spacing: 1px;
}

.status-info {
    margin-bottom: 30px;
}

.status-info h3 {
    font-size: 18px;
    color: #333;
    margin-bottom: 10px;
}

.service-address-link {
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
}

.service-address-link.service-running {
    color: #409eff;
}

.service-address-link.service-running:hover {
    color: #66b1ff;
    text-decoration: underline;
}

.service-address-link.service-stopped {
    color: #f56c6c;
}

.service-address-link.service-stopped:hover {
    color: #f78989;
    text-decoration: underline;
}

.control-button {
    min-width: 200px;
    height: 50px;
    font-size: 16px;
    border-radius: 25px;
}

.footer-links {
    display: flex;
    gap: 30px;
    margin-bottom: 20px;
}

.footer-copyright {
    color: #999;
    font-size: 14px;
    line-height: 1.5;
}
</style>
