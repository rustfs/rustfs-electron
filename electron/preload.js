const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  startRustFS: (config) => {
    console.log('Preload: startRustFS called with:', config);
    const cleanConfig = JSON.parse(JSON.stringify(config));
    return ipcRenderer.invoke('start-rustfs', cleanConfig);
  },
  stopRustFS: () => ipcRenderer.invoke('stop-rustfs'),
  getRustFSStatus: () => ipcRenderer.invoke('get-rustfs-status'),
  checkRustFSPort: (host, port) => ipcRenderer.invoke('check-rustfs-port', String(host), Number(port)),
  
  // 新增：配置文件操作
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // 添加打开外部链接的方法
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  onRustFSError: (callback) => ipcRenderer.on('rustfs-error', callback),
  onRustFSStopped: (callback) => ipcRenderer.on('rustfs-stopped', callback),
  onRustFSStderr: (callback) => ipcRenderer.on('rustfs-stderr', callback),
  
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});