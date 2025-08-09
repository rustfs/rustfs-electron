const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let rustfsProcess = null;
let mainWindow = null;

// 配置文件路径 - 修改为用户数据目录或应用执行目录
const configPath = isDev 
    ? path.join(__dirname, '../config.json')
    : path.join(process.cwd(), 'config.json'); // 或者使用 app.getPath('userData')

// 默认配置
const defaultConfig = {
    host: '127.0.0.1',
    port: 9000,
    storagePath: 'D:\\rustfs-file',
    username: 'rustfsadmin',
    password: 'rustfsadmin'
};

// 读取配置文件
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log('配置文件加载成功:', config);
            return { ...defaultConfig, ...config };
        } else {
            console.log('配置文件不存在，使用默认配置');
            return defaultConfig;
        }
    } catch (error) {
        console.error('读取配置文件失败:', error);
        return defaultConfig;
    }
}

// 保存配置文件
// 保存配置文件
function saveConfig(config) {
    try {
        // 确保目录存在
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        const configData = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configData, 'utf8');
        console.log('配置文件保存成功:', configPath);
        return true;
    } catch (error) {
        console.error('保存配置文件失败:', error);
        console.error('配置文件路径:', configPath);
        console.error('错误详情:', error.message);
        return false;
    }
}

function createWindow() {
    console.log('Creating main window...');
    console.log('isDev:', isDev);

    mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../build/icon.ico')
    });

    // 禁用菜单
    Menu.setApplicationMenu(null);

    if (isDev) {
        console.log('Loading development URL: http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');

        mainWindow.webContents.openDevTools();
    } else {
        console.log('Loading production file');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// 新增：加载配置的IPC处理器
ipcMain.handle('load-config', async () => {
    try {
        const config = loadConfig();
        return { success: true, config };
    } catch (error) {
        console.error('Load config error:', error);
        return { success: false, message: error.message };
    }
});

// 新增：保存配置的IPC处理器
ipcMain.handle('save-config', async (event, config) => {
    try {
        console.log('Saving config:', config);
        
        // 验证配置对象
        if (!config || typeof config !== 'object') {
            return { success: false, message: 'Invalid configuration object' };
        }

        // 确保所有配置值都是正确的类型
        const safeConfig = {
            host: String(config.host || '127.0.0.1'),
            port: Number(config.port || 9000),
            storagePath: String(config.storagePath || 'D:\\rustfs-file'),
            username: String(config.username || 'rustfsadmin'),
            password: String(config.password || '')
        };

        const success = saveConfig(safeConfig);
        if (success) {
            return { success: true, message: 'Configuration saved successfully' };
        } else {
            return { success: false, message: 'Failed to save configuration' };
        }
    } catch (error) {
        console.error('Save config error:', error);
        return { success: false, message: error.message };
    }
});

// IPC 处理器
ipcMain.handle('start-rustfs', async (event, config) => {
    try {
        console.log('Received config:', config);

        if (rustfsProcess) {
            return { success: false, message: 'Service is already running' };
        }

        // 如果没有传入配置，从文件加载
        let finalConfig = config;
        if (!config || typeof config !== 'object') {
            finalConfig = loadConfig();
            console.log('使用从文件加载的配置:', finalConfig);
        } else {
            // 保存传入的配置到文件
            saveConfig(config);
        }

        // 确保所有配置值都是基本类型
        const safeConfig = {
            host: String(finalConfig.host || '127.0.0.1'),
            port: Number(finalConfig.port || 9000),
            storagePath: String(finalConfig.storagePath || 'D:\\rustfs-file'),
            username: String(finalConfig.username || 'rustfsadmin'),
            password: String(finalConfig.password || '')
        };

        const rustfsPath = isDev
            ? path.join(__dirname, '../rustfs.exe')
            : path.join(process.resourcesPath, 'rustfs.exe');

        console.log('RustFS path:', rustfsPath);

        // 检查文件是否存在
        if (!fs.existsSync(rustfsPath)) {
            console.error('RustFS executable not found at:', rustfsPath);
            return { success: false, message: `RustFS executable not found at: ${rustfsPath}` };
        }

        // 构建完整的启动参数，包含必需的 VOLUMES 参数
        const args = [
            '--address', `${safeConfig.host}:${safeConfig.port}`,
            '--access-key', safeConfig.username,
            '--secret-key', safeConfig.password,
            safeConfig.storagePath  // VOLUMES 参数，存储路径
        ];

        console.log('Starting RustFS with args:', args);
        rustfsProcess = spawn(rustfsPath, args);

        rustfsProcess.stdout.on('data', (data) => {
            console.log('RustFS stdout:', data.toString());
        });

        rustfsProcess.stderr.on('data', (data) => {
            const errorMessage = data.toString();
            console.error('RustFS stderr:', errorMessage);
            // 发送stderr信息到前端
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rustfs-stderr', errorMessage);
            }
        });

        rustfsProcess.on('error', (error) => {
            console.error('RustFS process error:', error);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rustfs-error', error.message);
            }
            rustfsProcess = null;
        });

        rustfsProcess.on('exit', (code) => {
            console.log('RustFS process exited with code:', code);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('rustfs-stopped', code);
            }
            rustfsProcess = null;
        });

        // 等待服务启动
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 检测服务是否正常运行
        const isServiceRunning = await checkServiceHealth(safeConfig.host, safeConfig.port);
        
        if (isServiceRunning) {
            // 服务启动成功，弹窗显示信息并打开浏览器
            const serviceUrl = `http://${safeConfig.host}:${safeConfig.port}/`;
            
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'RustFS 服务启动成功',
                message: `RustFS 服务已成功启动！\n\n服务地址: ${serviceUrl}\n用户名: ${safeConfig.username}\n密码: ${safeConfig.password}`,
                buttons: ['打开浏览器', '稍后访问'],
                defaultId: 0,
                cancelId: 1
            });
            
            if (response.response === 0) {
                // 用户选择打开浏览器
                shell.openExternal(serviceUrl);
            }
            
            return { 
                success: true, 
                message: 'Service started successfully',
                serviceUrl: serviceUrl,
                defaultCredentials: {
                    username: safeConfig.username,
                    password: safeConfig.password
                }
            };
        } else {
            return { success: false, message: 'Service started but not responding on expected port' };
        }
    } catch (error) {
        console.error('Start RustFS error:', error);
        return { success: false, message: error.message };
    }
});

// 添加服务健康检查函数
async function checkServiceHealth(host, port, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        const isConnected = await new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = 2000;

            socket.setTimeout(timeout);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                resolve(false);
            });

            socket.connect(port, host);
        });
        
        if (isConnected) {
            return true;
        }
        
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
}

ipcMain.handle('stop-rustfs', async () => {
    try {
        if (!rustfsProcess) {
            return { success: false, message: 'Service is not running' };
        }

        rustfsProcess.kill('SIGTERM');
        rustfsProcess = null;

        return { success: true, message: 'Service stopped successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('get-rustfs-status', async () => {
    const processRunning = rustfsProcess !== null && !rustfsProcess.killed
    
    // 如果进程对象存在但实际进程可能已死，进行额外检查
    if (processRunning && rustfsProcess.exitCode !== null) {
        // 进程已退出
        rustfsProcess = null
        return { isRunning: false }
    }
    
    return {
        isRunning: processRunning,
        pid: processRunning ? rustfsProcess.pid : null
    }
})

ipcMain.handle('check-rustfs-port', async (event, host, port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 3000;

        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.connect(port, host);
    });
});

// 在现有的 IPC 处理器后面添加
ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('Failed to open external URL:', error);
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    // 确保配置文件存在
    if (!fs.existsSync(configPath)) {
        saveConfig(defaultConfig);
    }
    createWindow();
});

app.on('window-all-closed', () => {
    // 确保在应用退出时停止 rustfs 进程
    if (rustfsProcess) {
        rustfsProcess.kill('SIGTERM');
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});