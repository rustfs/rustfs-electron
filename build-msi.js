const { MSICreator } = require('electron-wix-msi');
const path = require('path');

// 创建 MSI 安装包
async function createMSI() {
  // Step 1: 实例化 MSICreator
  const msiCreator = new MSICreator({
    // 应用目录（electron-builder 的输出目录）
    appDirectory: path.join(__dirname, 'release/win-unpacked'),
    
    // 基本信息
    description: 'RustFS Management GUI',
    exe: 'RustFS Manager',  // 可执行文件名（不含 .exe）
    name: 'RustFS Manager',
    manufacturer: 'RustFS Technologies',
    version: '1.0.0',
    
    // 输出目录
    outputDirectory: path.join(__dirname, 'release/msi'),
    
    // 可选配置
    icon: path.join(__dirname, 'build/icon.ico'),
    arch: 'x64',  // 或 'x86'
    
    // UI 配置
    ui: {
      enabled: true,
      chooseDirectory: true,  // 允许用户选择安装目录
      images: {
        background: path.join(__dirname, 'build/installer-bg.jpg'), // 493x312
        banner: path.join(__dirname, 'build/installer-banner.jpg')   // 493x58
      }
    },
    
    // 新功能
    features: {
      autoUpdate: false,  // 自动更新功能
      autoLaunch: false   // 开机自启功能
    }
  });

  // Step 2: 创建 .wxs 模板文件
  console.log('Creating MSI template...');
  const supportBinaries = await msiCreator.create();
  
  // Step 2a: 可选的二进制文件签名
  // supportBinaries.forEach(async (binary) => {
  //   await signFile(binary);
  // });

  // Step 3: 编译生成 .msi 文件
  console.log('Compiling MSI...');
  await msiCreator.compile();
  
  console.log('MSI created successfully!');
}

// 运行
createMSI().catch(console.error);